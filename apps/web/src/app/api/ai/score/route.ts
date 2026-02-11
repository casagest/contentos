import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, ContentType, Language } from "@contentos/content-engine";
import { getSessionUser } from "@/lib/auth";

const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"];

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUser();
    if (session instanceof NextResponse) return session;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configurare server incompletă. Cheia API lipsește." },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "Conținutul nu poate fi gol." },
        { status: 400 }
      );
    }

    if (!body.platform || !VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        { error: "Platformă invalidă." },
        { status: 400 }
      );
    }

    const service = new ContentAIService({ apiKey });

    const result = await service.scoreContent({
      content: body.content,
      platform: body.platform as Platform,
      contentType: (body.contentType || "text") as ContentType,
      language: (body.language || "ro") as Language,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Prea multe cereri. Te rugăm să aștepți câteva secunde." },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Cheie API invalidă. Verifică configurarea." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Eroare API: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    console.error("Score AI Error:", error);
    return NextResponse.json(
      { error: "A apărut o eroare neașteptată. Te rugăm să încerci din nou." },
      { status: 500 }
    );
  }
}
