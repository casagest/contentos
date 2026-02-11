import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ContentAIService } from "@contentos/content-engine";
import type { Platform, Language } from "@contentos/content-engine";
import { getSessionUserWithOrg } from "@/lib/auth";

const VALID_PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"];

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configurare server incompletă. Cheia API lipsește." },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.input?.trim()) {
      return NextResponse.json(
        { error: "Textul nu poate fi gol." },
        { status: 400 }
      );
    }

    if (!body.platforms?.length) {
      return NextResponse.json(
        { error: "Selectează cel puțin o platformă." },
        { status: 400 }
      );
    }

    const platforms = (body.platforms as string[]).filter((p) =>
      VALID_PLATFORMS.includes(p)
    );
    if (!platforms.length) {
      return NextResponse.json(
        { error: "Nicio platformă validă selectată." },
        { status: 400 }
      );
    }

    const { organizationId, supabase } = session;

    let userVoiceDescription: string | undefined;
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single();

    const settings = org?.settings as Record<string, unknown> | null;
    if (settings?.businessProfile) {
      const bp = settings.businessProfile as { description?: string };
      userVoiceDescription = bp.description;
    }

    const service = new ContentAIService({ apiKey });

    const result = await service.generateContent({
      organizationId,
      input: body.input,
      inputType: "text",
      targetPlatforms: platforms as Platform[],
      language: (body.language || "ro") as Language,
      tone: body.tone || "casual",
      includeHashtags: body.includeHashtags ?? true,
      includeEmoji: body.includeEmoji ?? true,
      userVoiceDescription,
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

    console.error("Generate AI Error:", error);
    return NextResponse.json(
      { error: "A apărut o eroare neașteptată. Te rugăm să încerci din nou." },
      { status: 500 }
    );
  }
}
