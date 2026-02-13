import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { scrapeUrlContent } from "@/lib/scrape";
import { expiresAtIso, hashUrl, SCRAPE_CACHE_TTL_MS } from "@/lib/url-cache";

interface ScrapeRequestBody {
  url?: string;
  maxChars?: number;
  forceRefresh?: boolean;
}

type ScrapeCacheRow = {
  url: string;
  title: string | null;
  description: string | null;
  content: string;
  source: "firecrawl" | "fallback";
  metadata: Record<string, unknown> | null;
  fetched_at: string;
  expires_at: string;
};

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: ScrapeRequestBody;
  try {
    body = (await request.json()) as ScrapeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body invalid. Trimite JSON valid." },
      { status: 400 }
    );
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json(
      { error: "URL-ul este obligatoriu." },
      { status: 400 }
    );
  }

  const forceRefresh = body.forceRefresh === true;
  const requestedMaxChars =
    typeof body.maxChars === "number" ? Math.floor(body.maxChars) : 8000;
  const maxChars = Math.min(Math.max(requestedMaxChars, 500), 20_000);
  const minChars = 50;
  const timeoutMs = 10_000;
  const urlHash = hashUrl(url);

  if (!forceRefresh) {
    try {
      const { data: cached } = await session.supabase
        .from("scrape_cache")
        .select("url,title,description,content,source,metadata,fetched_at,expires_at")
        .eq("organization_id", session.organizationId)
        .eq("url_hash", urlHash)
        .gt("expires_at", new Date().toISOString())
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle<ScrapeCacheRow>();

      const cachedRow = cached ?? null;
      if (
        cachedRow &&
        typeof cachedRow.content === "string" &&
        cachedRow.content.length >= minChars
      ) {
        const metadata = (cachedRow.metadata ?? {}) as Record<string, unknown>;
        return NextResponse.json({
          url: cachedRow.url,
          content: cachedRow.content.slice(0, maxChars),
          title: cachedRow.title ?? undefined,
          description: cachedRow.description ?? undefined,
          language:
            typeof metadata.language === "string" ? metadata.language : undefined,
          links: Array.isArray(metadata.links)
            ? metadata.links.filter((value): value is string => typeof value === "string")
            : undefined,
          source: cachedRow.source,
          cached: true,
          cacheAgeMs: Math.max(0, Date.now() - Date.parse(cachedRow.fetched_at)),
          expiresAt: cachedRow.expires_at,
        });
      }
    } catch {
      // If cache table is unavailable, continue without failing the request.
    }
  }

  const scraped = await scrapeUrlContent(url, {
    maxChars,
    minChars,
    timeoutMs,
  });

  if (!scraped) {
    return NextResponse.json(
      {
        error:
          "Nu s-a putut extrage continutul de la URL. Verifica linkul sau incearca alta pagina publica.",
      },
      { status: 422 }
    );
  }

  try {
    await session.supabase.from("scrape_cache").upsert(
      {
        organization_id: session.organizationId,
        created_by: session.user.id,
        url: scraped.url,
        url_hash: urlHash,
        source: scraped.source,
        title: scraped.title ?? null,
        description: scraped.description ?? null,
        content: scraped.content,
        metadata: {
          language: scraped.language ?? null,
          links: scraped.links ?? [],
        },
        fetched_at: new Date().toISOString(),
        expires_at: expiresAtIso(SCRAPE_CACHE_TTL_MS),
      },
      { onConflict: "organization_id,url_hash" }
    );
  } catch {
    // Best-effort cache write.
  }

  return NextResponse.json({
    ...scraped,
    cached: false,
    expiresAt: expiresAtIso(SCRAPE_CACHE_TTL_MS),
  });
}
