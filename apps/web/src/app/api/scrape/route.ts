import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  FirecrawlService,
  FirecrawlError,
} from "@contentos/content-engine";

const MAX_URLS = 5;

interface ScrapeRequest {
  url?: string;
  urls?: string[];
  formats?: ("markdown" | "html" | "rawHtml" | "links" | "screenshot")[];
  onlyMainContent?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Autentificare necesară." },
        { status: 401 }
      );
    }

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY;
    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Serviciul de scraping nu este configurat." },
        { status: 503 }
      );
    }

    const body: ScrapeRequest = await request.json();

    // Support both single `url` and multiple `urls`
    const urls: string[] = [];
    if (body.url) urls.push(body.url);
    if (body.urls) urls.push(...body.urls);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "Furnizează cel puțin un URL." },
        { status: 400 }
      );
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_URLS} URL-uri per cerere.` },
        { status: 400 }
      );
    }

    const firecrawl = new FirecrawlService({ apiKey: firecrawlApiKey });

    if (urls.length === 1) {
      // Single URL — return directly
      const result = await firecrawl.scrapeUrl(urls[0], {
        formats: body.formats ?? ["markdown"],
        onlyMainContent: body.onlyMainContent ?? true,
      });

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // Multiple URLs — batch scrape
    const results = await firecrawl.scrapeUrls(urls, {
      formats: body.formats ?? ["markdown"],
      onlyMainContent: body.onlyMainContent ?? true,
    });

    const response = urls.map((url, i) => {
      const result = results[i];
      if (!result) {
        return { url, success: false, error: "Failed to scrape" };
      }
      return { url, success: true, data: result.data };
    });

    return NextResponse.json({
      success: true,
      results: response,
    });
  } catch (error: unknown) {
    if (error instanceof FirecrawlError) {
      return NextResponse.json(
        { error: `Eroare scraping: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }

    console.error("Scrape API Error:", error);
    return NextResponse.json(
      { error: "A apărut o eroare neașteptată." },
      { status: 500 }
    );
  }
}
