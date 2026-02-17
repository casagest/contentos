import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { ScrapeProviderError, searchWebContent } from "@/lib/scrape";

interface SearchRequestBody {
  query?: string;
  limit?: number;
  lang?: string;
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: SearchRequestBody;
  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body invalid. Trimite JSON valid." },
      { status: 400 }
    );
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json(
      { error: "Query-ul este obligatoriu." },
      { status: 400 }
    );
  }

  if (query.length > 240) {
    return NextResponse.json(
      { error: "Query-ul este prea lung (max 240 caractere)." },
      { status: 400 }
    );
  }

  const limit =
    typeof body.limit === "number" ? Math.floor(body.limit) : undefined;
  const lang = typeof body.lang === "string" ? body.lang.trim() : undefined;

  try {
    const results = await searchWebContent(query, {
      limit,
      lang,
      timeoutMs: 12_000,
    });

    return NextResponse.json({
      results,
      query,
      total: results.length,
    });
  } catch (error) {
    if (error instanceof ScrapeProviderError) {
      if (error.status === 501) {
        return NextResponse.json(
          { error: error.message || "Search indisponibil: configurează FIRECRAWL_API_KEY sau SERPER_API_KEY (serper.dev)." },
          { status: 501 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          { error: "Prea multe cereri catre providerul de search. Incearca din nou." },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Search indisponibil temporar. Incearca din nou in cateva secunde." },
        { status: error.status || 502 }
      );
    }

    return NextResponse.json(
      { error: "A aparut o eroare neasteptata la cautare." },
      { status: 500 }
    );
  }
}
