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
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const count = Math.min(Math.max(Number(body.count) || 20, 10), 30);

    const { supabase } = session;

    let businessProfile: BusinessProfile | null = null;

    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings?.businessProfile) {
      businessProfile = settings.businessProfile as BusinessProfile;
    }

    const context = businessProfile
      ? `Brand: ${businessProfile.name}, Industrie: ${businessProfile.industry}, Audiență: ${businessProfile.targetAudience}`
      : "";

    const prompt = `Generează ${count} IDEI DE CONȚINUT pentru luna următoare. Fiecare idee = un concept scurt, gata de calendar.

${topic ? `TEMA/DIRECȚIE: ${topic}\n` : ""}${context ? `CONTEXT: ${context}\n` : ""}

Returnează DOAR JSON valid:
{
  "ideas": [
    {
      "id": "i1",
      "title": "Titlu scurt (3-7 cuvinte)",
      "description": "1-2 propoziții despre conținut",
      "type": "educational|testimonial|behind_scenes|promo|faq|trend",
      "platforms": ["instagram", "facebook"],
      "week": 1,
      "prompt": "prompt complet pentru AI (Braindump)"
    }
  ]
}

Distribuie ideile în săptămânile 1-4 (camp). Fie variat: educațional, testimonial, BTS, promo, FAQ, trend. Include platforme relevante.`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content: "Ești strateg de conținut. Returnează DOAR JSON valid.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 3200,
    });

    let parsed: { ideas?: Array<Record<string, unknown>> };
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
        ideas: parsed.ideas || [],
        meta: { provider: aiResult.provider },
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Batch brainstorm error:", err);
    return NextResponse.json(
      { error: "Eroare la generare." },
      { status: 500, ...NO_STORE }
    );
  }
}
