// packages/content-engine/src/scraping/firecrawl.ts
// ============================================================
// ContentOS Firecrawl Service — Web Scraping Integration
// ============================================================

import { z } from "zod";

// ============================================================
// TYPES
// ============================================================

const FirecrawlScrapeOptionsSchema = z.object({
  url: z.string().url(),
  formats: z
    .array(z.enum(["markdown", "html", "rawHtml", "links", "screenshot"]))
    .optional(),
  onlyMainContent: z.boolean().optional(),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  waitFor: z.number().optional(),
  timeout: z.number().optional(),
});

export type FirecrawlScrapeOptions = z.infer<
  typeof FirecrawlScrapeOptionsSchema
>;

export interface FirecrawlMetadata {
  title?: string;
  description?: string;
  language?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
  ogImage?: string;
  ogSiteName?: string;
  sourceURL: string;
  statusCode: number;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    screenshot?: string;
    metadata: FirecrawlMetadata;
  };
}

export interface FirecrawlErrorResponse {
  success: false;
  error: string;
}

// ============================================================
// SERVICE
// ============================================================

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

export class FirecrawlService {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    if (!config.apiKey) {
      throw new Error("Firecrawl API key is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || FIRECRAWL_API_BASE;
  }

  /**
   * Scrape a single URL and return its content as markdown.
   */
  async scrapeUrl(
    url: string,
    options?: Partial<Omit<FirecrawlScrapeOptions, "url">>
  ): Promise<FirecrawlScrapeResult> {
    const body: Record<string, unknown> = {
      url,
      formats: options?.formats ?? ["markdown"],
      onlyMainContent: options?.onlyMainContent ?? true,
    };

    if (options?.includeTags) body.includeTags = options.includeTags;
    if (options?.excludeTags) body.excludeTags = options.excludeTags;
    if (options?.waitFor) body.waitFor = options.waitFor;
    if (options?.timeout) body.timeout = options.timeout;

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options?.timeout ?? DEFAULT_TIMEOUT_MS
    );

    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.error || `HTTP ${response.status}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorBody.slice(0, 200)}`;
        }
        throw new FirecrawlError(errorMessage, response.status);
      }

      const result = (await response.json()) as FirecrawlScrapeResult;

      if (!result.success) {
        throw new FirecrawlError(
          (result as unknown as FirecrawlErrorResponse).error ||
            "Scrape failed",
          422
        );
      }

      return result;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof FirecrawlError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new FirecrawlError("Request timed out", 408);
      }
      throw new FirecrawlError(
        `Network error: ${error instanceof Error ? error.message : "Unknown"}`,
        0
      );
    }
  }

  /**
   * Scrape multiple URLs concurrently with a concurrency limit.
   * Returns results in the same order as input URLs.
   * Failed URLs return null instead of throwing.
   */
  async scrapeUrls(
    urls: string[],
    options?: Partial<Omit<FirecrawlScrapeOptions, "url">> & {
      maxConcurrency?: number;
    }
  ): Promise<(FirecrawlScrapeResult | null)[]> {
    const { maxConcurrency = 3, ...scrapeOptions } = options || {};
    const results: (FirecrawlScrapeResult | null)[] = new Array(urls.length);

    // Process in batches to respect concurrency limits
    for (let i = 0; i < urls.length; i += maxConcurrency) {
      const batch = urls.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            return await this.scrapeUrl(url, scrapeOptions);
          } catch {
            return null;
          }
        })
      );
      for (let j = 0; j < batchResults.length; j++) {
        results[i + j] = batchResults[j];
      }
    }

    return results;
  }
}

// ============================================================
// ERROR CLASS
// ============================================================

export class FirecrawlError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "FirecrawlError";
    this.statusCode = statusCode;
  }
}
