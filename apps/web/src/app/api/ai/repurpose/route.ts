import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import type { BusinessProfile } from "@contentos/database";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };
const PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"] as const;
type Platform = (typeof PLATFORMS)[number];

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const sourcePlatform =
      typeof body.sourcePlatform === "string" &&
      (PLATFORMS as readonly string[]).includes(body.sourcePlatform)
        ? (body.sourcePlatform as Platform)
        : null;
    const targetPlatforms = Array.isArray(body.targetPlatforms)
      ? body.targetPlatforms.filter((p: unknown): p is Platform =>
          typeof p === "string" && (PLATFORMS as readonly string[]).includes(p)
        )
      : [...PLATFORMS];

    if (!content || targetPlatforms.length === 0) {
      return NextResponse.json(
        { error: "Conținutul și cel puțin o platformă sunt obligatorii." },
        { status: 400, ...NO_STORE }
      );
    }

    const { supabase } = session;

    let businessProfile: BusinessProfile | null = null;
    let brandVoice: Record<string, unknown> | null = null;

    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings?.businessProfile) {
      businessProfile = settings.businessProfile as BusinessProfile;
    }
    if (settings?.brandVoice) {
      brandVoice = settings.brandVoice as Record<string, unknown>;
    }

    const bp = businessProfile;
    const context = [
      bp ? `Brand: ${bp.name}, Industrie: ${bp.industry}` : "",
      brandVoice?.summary ? `Voce: ${brandVoice.summary}` : "",
      Array.isArray(brandVoice?.phrases) && brandVoice.phrases.length > 0
        ? `Fraze tipice: ${brandVoice.phrases.slice(0, 5).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const platformList = targetPlatforms.join(", ");
    const prompt = `Transformă acest conținut pentru platformele: ${platformList}.

CONȚINUT ORIGINAL${sourcePlatform ? ` (de pe ${sourcePlatform})` : ""}:
"""
${content.slice(0, 4000)}
"""
${context ? `\nCONTEXT BRAND:\n${context}\n` : ""}

Generează variante adaptate pentru FIECARE platformă. Returnează DOAR JSON valid:
{
  "platforms": {
    "facebook": { "content": "text post", "hashtags": ["tag1"], "tips": ["sfat"] },
    "instagram": { "caption": "caption", "hashtags": [], "altText": "", "tips": [] },
    "tiktok": { "hook": "prima fraza", "script": "restul textului", "hashtags": [], "tips": [] },
    "youtube": { "title": "titlu", "description": "descriere", "tags": [], "tips": [] }
  }
}

Include DOAR platformele cerute: ${platformList}. Păstrează mesajul, adaptează formatul și lungimea.`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content:
            "Ești expert în repurposing. Returnează DOAR JSON valid, fără markdown.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 2400,
    });

    let parsed: { platforms?: Record<string, unknown> };
    try {
      parsed = JSON.parse(
        aiResult.text.replace(/```json\s*|\s*```/g, "").trim()
      );
    } catch {
      return NextResponse.json(
        { error: "Răspuns invalid de la AI." },
        { status: 500, ...NO_STORE }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        platforms: parsed.platforms || {},
        meta: { provider: aiResult.provider, model: aiResult.model },
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Repurpose error:", err);
    return NextResponse.json(
      { error: "Eroare la repurposing." },
      { status: 500, ...NO_STORE }
    );
  }
}
