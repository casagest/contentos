import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import type { BusinessProfile } from "@contentos/database";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const count = Math.min(Math.max(Number(body.count) || 5, 3), 10);

    if (!content) {
      return NextResponse.json(
        { error: "Conținutul este obligatoriu." },
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

    const context = [
      businessProfile ? `Brand: ${businessProfile.name}, Industrie: ${businessProfile.industry}` : "",
      brandVoice?.summary ? `Voce: ${brandVoice.summary}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Generează ${count} VARIANTE A/B distincte pentru același mesaj. Fiecare variantă trebuie să fie diferită ca unghi (emoțional, rational, provocator, listă, întrebare, poveste etc.) dar să transmită același mesaj.

CONȚINUT ORIGINAL:
"""
${content.slice(0, 2000)}
"""
${context ? `\nCONTEXT:\n${context}\n` : ""}

Returnează DOAR JSON valid:
{
  "variants": [
    {
      "id": "a1",
      "headline": "titlu/fraza principală (max 10-15 cuvinte)",
      "body": "restul textului (1-3 propoziții)",
      "angle": "emotional|rational|provocator|list|question|story",
      "cta": "apel la acțiune scurt"
    }
  ]
}

Generează exact ${count} variante, fiecare cu un unghi diferit.`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content: "Ești expert în copywriting și A/B testing. Returnează DOAR JSON valid.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 1800,
    });

    let parsed: { variants?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(
        aiResult.text.replace(/```json\s*|\s*```/g, "").trim()
      );
    } catch {
      return NextResponse.json(
        { error: "Răspuns invalid." },
        { status: 500, ...NO_STORE }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        variants: parsed.variants || [],
        meta: { provider: aiResult.provider },
      },
      NO_STORE
    );
  } catch (err) {
    console.error("AB variants error:", err);
    return NextResponse.json(
      { error: "Eroare la generare." },
      { status: 500, ...NO_STORE }
    );
  }
}
