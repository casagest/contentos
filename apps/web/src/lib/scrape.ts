import { isUrlSafeForFetch, safeFetch } from "@/lib/url-safety";

export type ScrapeSource = "firecrawl" | "fallback";

export interface ScrapeResult {
  url: string;
  content: string;
  title?: string;
  description?: string;
  language?: string;
  links?: string[];
  source: ScrapeSource;
}

export interface ScrapeOptions {
  maxChars?: number;
  minChars?: number;
  timeoutMs?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchOptions {
  limit?: number;
  lang?: string;
  timeoutMs?: number;
}

export class ScrapeProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly retryable: boolean
  ) {
    super(message);
    this.name = "ScrapeProviderError";
  }
}

const DEFAULT_MAX_CHARS = 5000;
const DEFAULT_MIN_CHARS = 50;
const DEFAULT_TIMEOUT_MS = 10_000;
const FIRECRAWL_TIMEOUT_MS = 15_000;
const FIRECRAWL_MAX_ATTEMPTS = 3;
const FIRECRAWL_RETRY_BASE_MS = 350;

const FIRECRAWL_ENDPOINT = "https://api.firecrawl.dev/v1/scrape";
const FIRECRAWL_SEARCH_ENDPOINT = "https://api.firecrawl.dev/v1/search";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value === null) return null;
  return value as JsonRecord;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length ? items : undefined;
}

function stripHtmlToText(html: string): string {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Clean up Firecrawl markdown output.
 * Even with onlyMainContent:true, Firecrawl sometimes returns JS snippets,
 * cookie banners, HTML tags, and other noise. This function strips them out.
 */
function cleanMarkdownContent(md: string): string {
  let text = md;
  // Remove inline HTML tags that leak through markdown
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, "");
  // Remove JS-like code blocks (var, function, const, let, document., window.)
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/\b(var|let|const|function|document\.|window\.|addEventListener|querySelector|createElement)\b[^.\n]*[;\n]/g, "");
  // Remove cookie consent / GDPR boilerplate
  text = text.replace(/(?:accept(?:ă)?|accept all|cookie|gdpr|privacy policy|terms of service)[\s\S]{0,200}(?:accept|reject|close|dismiss|ok|da|nu)\b/gi, "");
  // Remove URLs that look like asset paths (CSS, JS, images)
  text = text.replace(/https?:\/\/[^\s]+\.(css|js|woff2?|ttf|eot|svg|ico)\b[^\s]*/g, "");
  // Remove lines that are mostly special characters (likely code/markup artifacts)
  text = text.replace(/^[^a-zA-Z\u00C0-\u024F]{20,}$/gm, "");
  // Collapse excessive blank lines
  text = text.replace(/\n{4,}/g, "\n\n\n");
  // Collapse excessive spaces
  text = text.replace(/[ \t]{3,}/g, " ");
  return text.trim();
}

function parseFirecrawlPayload(
  url: string,
  payload: unknown,
  maxChars: number
): ScrapeResult | null {
  const root = asRecord(payload);
  if (!root) return null;

  const success = root.success;
  if (typeof success === "boolean" && !success) return null;

  const data = asRecord(root.data) ?? root;
  const metadata = asRecord(data.metadata) ?? asRecord(root.metadata);

  const markdown =
    asString(data.markdown) ??
    asString(data.content) ??
    asString(root.markdown) ??
    "";

  const cleaned = cleanMarkdownContent(markdown);
  const content = cleaned.slice(0, maxChars);
  if (!content) return null;

  return {
    url,
    content,
    title: asString(metadata?.title) ?? asString(data.title),
    description: asString(metadata?.description) ?? asString(data.description),
    language: asString(metadata?.language),
    links: asStringArray(data.links),
    source: "firecrawl",
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function parseRetryAfterSeconds(headerValue: string | null): number | null {
  if (!headerValue) return null;
  const asNumber = Number(headerValue);
  if (!Number.isNaN(asNumber) && asNumber > 0) return asNumber;

  const target = Date.parse(headerValue);
  if (Number.isNaN(target)) return null;
  const deltaMs = target - Date.now();
  if (deltaMs <= 0) return null;
  return Math.ceil(deltaMs / 1000);
}

function getRetryDelayMs(attempt: number, retryAfterSeconds?: number | null): number {
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 20_000);
  }
  const exponential = FIRECRAWL_RETRY_BASE_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(exponential + jitter, 12_000);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firecrawlPostJson(
  endpoint: string,
  payload: JsonRecord,
  timeoutMs: number
): Promise<unknown> {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new ScrapeProviderError(
      "FIRECRAWL_API_KEY lipseste.",
      501,
      "firecrawl_missing_key",
      false
    );
  }

  let lastError: ScrapeProviderError | null = null;

  for (let attempt = 0; attempt < FIRECRAWL_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: controller.signal,
      });

      if (response.ok) {
        clearTimeout(timeout);
        return (await response.json()) as unknown;
      }

      const retryAfter = parseRetryAfterSeconds(response.headers.get("retry-after"));
      const retryable = isRetryableStatus(response.status);
      const message = `Firecrawl request failed (${response.status}).`;

      if (retryable && attempt < FIRECRAWL_MAX_ATTEMPTS - 1) {
        clearTimeout(timeout);
        await wait(getRetryDelayMs(attempt, retryAfter));
        continue;
      }

      clearTimeout(timeout);
      throw new ScrapeProviderError(message, response.status, "firecrawl_http_error", retryable);
    } catch (error) {
      clearTimeout(timeout);

      const isAbort = error instanceof Error && error.name === "AbortError";
      const retryable = isAbort || !(error instanceof ScrapeProviderError) || error.retryable;

      if (retryable && attempt < FIRECRAWL_MAX_ATTEMPTS - 1) {
        await wait(getRetryDelayMs(attempt));
        continue;
      }

      if (error instanceof ScrapeProviderError) {
        lastError = error;
      } else {
        lastError = new ScrapeProviderError(
          isAbort ? "Firecrawl timeout." : "Firecrawl network error.",
          isAbort ? 504 : 503,
          isAbort ? "firecrawl_timeout" : "firecrawl_network_error",
          retryable
        );
      }
      break;
    }
  }

  if (lastError) throw lastError;
  throw new ScrapeProviderError("Firecrawl unknown error.", 500, "firecrawl_unknown_error", false);
}

async function scrapeWithFirecrawl(
  url: string,
  maxChars: number,
  minChars: number,
  timeoutMs: number
): Promise<ScrapeResult | null> {
  try {
    const payload = (await firecrawlPostJson(
      FIRECRAWL_ENDPOINT,
      {
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      },
      timeoutMs
    )) as unknown;

    const parsed = parseFirecrawlPayload(url, payload, maxChars);
    if (!parsed || parsed.content.length < minChars) return null;
    return parsed;
  } catch (error) {
    if (error instanceof ScrapeProviderError && error.status === 501) {
      return null;
    }
    // For scrape endpoint we still fall back to safeFetch when Firecrawl fails.
    return null;
  }
}

// ---------------------------------------------------------------------------
// Facebook Graph API fallback (for facebook.com URLs that block scrapers)
// ---------------------------------------------------------------------------

const META_GRAPH_API = "https://graph.facebook.com/v21.0";

function parseFacebookPageId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "").replace(/^web\./, "");
    if (host !== "facebook.com" && host !== "fb.com") return null;

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (!segments.length) return null;

    // Skip known non-page paths
    const skip = new Set(["watch", "marketplace", "groups", "events", "stories", "reels", "gaming", "live", "search", "login", "recover", "help"]);
    if (skip.has(segments[0])) return null;

    // Handle /pages/Name/123456 format
    if (segments[0] === "pages" && segments.length >= 3) return segments[2];
    // Handle /profile.php?id=123
    if (segments[0] === "profile.php") {
      return parsed.searchParams.get("id") || null;
    }

    return segments[0];
  } catch {
    return null;
  }
}

async function scrapeWithFacebookAPI(
  url: string,
  pageId: string,
  maxChars: number,
  minChars: number
): Promise<ScrapeResult | null> {
  const appId = process.env.FACEBOOK_APP_ID || process.env.META_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET || process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;

  const accessToken = `${appId}|${appSecret}`;

  try {
    // 1. Fetch page basic info
    const pageRes = await fetch(
      `${META_GRAPH_API}/${pageId}?` +
        new URLSearchParams({
          access_token: accessToken,
          fields: "name,about,description,category,fan_count,talking_about_count,website,general_info,emails,phone",
        }),
      { signal: AbortSignal.timeout(8000) }
    );
    const pageInfo = (await pageRes.json()) as Record<string, unknown>;

    if (pageInfo.error) return null;

    // 2. Try to fetch page feed (public posts)
    let postsContent = "";
    try {
      const feedRes = await fetch(
        `${META_GRAPH_API}/${pageId}/feed?` +
          new URLSearchParams({
            access_token: accessToken,
            fields: "message,created_time,shares,likes.summary(true),comments.summary(true)",
            limit: "25",
          }),
        { signal: AbortSignal.timeout(8000) }
      );
      const feedData = (await feedRes.json()) as {
        data?: Array<{
          message?: string;
          created_time?: string;
          shares?: { count: number };
          likes?: { summary?: { total_count: number } };
          comments?: { summary?: { total_count: number } };
        }>;
        error?: unknown;
      };

      if (feedData.data && Array.isArray(feedData.data)) {
        postsContent = feedData.data
          .filter((post) => post.message)
          .map((post) => {
            const likes = post.likes?.summary?.total_count || 0;
            const comments = post.comments?.summary?.total_count || 0;
            const shares = post.shares?.count || 0;
            const date = post.created_time ? post.created_time.slice(0, 10) : "";
            return `[${date}] ${post.message}\n(${likes} likes, ${comments} comments, ${shares} shares)`;
          })
          .join("\n\n");
      }
    } catch {
      // Feed might require additional permissions, continue with page info only
    }

    // 3. Build content from page info + posts
    const parts: string[] = [];
    const name = typeof pageInfo.name === "string" ? pageInfo.name : "";
    const about = typeof pageInfo.about === "string" ? pageInfo.about : "";
    const description = typeof pageInfo.description === "string" ? pageInfo.description : "";
    const category = typeof pageInfo.category === "string" ? pageInfo.category : "";
    const fanCount = typeof pageInfo.fan_count === "number" ? pageInfo.fan_count : 0;
    const talkingAbout = typeof pageInfo.talking_about_count === "number" ? pageInfo.talking_about_count : 0;
    const website = typeof pageInfo.website === "string" ? pageInfo.website : "";
    const generalInfo = typeof pageInfo.general_info === "string" ? pageInfo.general_info : "";

    if (name) parts.push(`# ${name}`);
    if (category) parts.push(`Categorie: ${category}`);
    if (about) parts.push(`Despre: ${about}`);
    if (description) parts.push(`Descriere: ${description}`);
    if (generalInfo) parts.push(`Info: ${generalInfo}`);
    if (fanCount) parts.push(`Fani/Followers: ${fanCount.toLocaleString()}`);
    if (talkingAbout) parts.push(`Discuta despre asta: ${talkingAbout.toLocaleString()}`);
    if (website) parts.push(`Website: ${website}`);

    if (postsContent) {
      parts.push("\n## Postari Recente\n");
      parts.push(postsContent);
    }

    const content = parts.join("\n").slice(0, maxChars);
    if (content.length < minChars) return null;

    return {
      url,
      content,
      title: name || undefined,
      description: about || description || undefined,
      source: "fallback",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic HTML fallback
// ---------------------------------------------------------------------------

async function scrapeWithFallback(
  url: string,
  maxChars: number,
  minChars: number,
  timeoutMs: number
): Promise<ScrapeResult | null> {
  try {
    const response = await safeFetch(url, { timeoutMs });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    const isTextual =
      contentType.includes("text/html") ||
      contentType.includes("text/plain") ||
      contentType.includes("text/markdown");

    if (!isTextual) return null;

    const html = await response.text();
    const content = stripHtmlToText(html).slice(0, maxChars);
    if (content.length < minChars) return null;

    return {
      url,
      content,
      source: "fallback",
    };
  } catch {
    return null;
  }
}

export async function scrapeUrlContent(
  url: string,
  options?: ScrapeOptions
): Promise<ScrapeResult | null> {
  try {
    const parsedUrl = new URL(url);
    if (!isUrlSafeForFetch(parsedUrl.toString())) return null;
  } catch {
    return null;
  }

  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const minChars = options?.minChars ?? DEFAULT_MIN_CHARS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // For Facebook URLs, try Graph API first (Facebook blocks all scrapers)
  const fbPageId = parseFacebookPageId(url);
  if (fbPageId) {
    const fbResult = await scrapeWithFacebookAPI(url, fbPageId, maxChars, minChars);
    if (fbResult) return fbResult;
  }

  const firecrawlResult = await scrapeWithFirecrawl(
    url,
    maxChars,
    minChars,
    options?.timeoutMs ?? FIRECRAWL_TIMEOUT_MS
  );
  if (firecrawlResult) return firecrawlResult;

  return scrapeWithFallback(url, maxChars, minChars, timeoutMs);
}

function normalizeSearchResult(item: unknown): SearchResult | null {
  const record = asRecord(item);
  if (!record) return null;

  const url = asString(record.url);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) return null;
    if (!isUrlSafeForFetch(parsed.toString())) return null;
  } catch {
    return null;
  }

  return {
    title: asString(record.title) ?? url,
    url,
    snippet: asString(record.description) ?? asString(record.snippet) ?? "",
  };
}

export async function searchWebContent(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const limit = Math.min(Math.max(options?.limit ?? 8, 1), 20);

  const payload = (await firecrawlPostJson(
    FIRECRAWL_SEARCH_ENDPOINT,
    {
      query: cleanQuery,
      limit,
      ...(options?.lang ? { lang: options.lang } : {}),
    },
    options?.timeoutMs ?? FIRECRAWL_TIMEOUT_MS
  )) as unknown;

  const root = asRecord(payload);
  if (!root) {
    throw new ScrapeProviderError(
      "Firecrawl search response invalid.",
      502,
      "firecrawl_invalid_payload",
      false
    );
  }

  const data = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.results)
      ? root.results
      : [];

  return data
    .map(normalizeSearchResult)
    .filter((item): item is SearchResult => item !== null);
}
