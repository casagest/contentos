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

    if (!content) {
      return NextResponse.json(
        { error: "Conținutul este obligatoriu." },
        { status: 400, ...NO_STORE }
      );
    }

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
      ? `Brand: ${businessProfile.name}, Tonuri: ${Array.isArray(businessProfile.tones) ? businessProfile.tones.join(", ") : ""}, Evită: ${businessProfile.avoidPhrases || ""}`
      : "";

    const prompt = `Verifică dacă acest conținut e ALINIAT cu brandul și SIGUR de publicat.

CONȚINUT:
"""
${content.slice(0, 3000)}
"""
${context ? `\nCONTEXT BRAND:\n${context}\n` : ""}

Returnează DOAR JSON valid:
{
  "safe": true|false,
  "score": 0-100,
  "issues": ["lista probleme sau []"],
  "suggestions": ["îmbunătățiri sau []"],
  "summary": "1 propoziție"
}

safe=false dacă: ton off-brand, claimuri exagerate, limbaj nepotrivit, mesaj contradictoriu cu brandul.`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content: "Ești expert în brand safety. Returnează DOAR JSON valid.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 400,
    });

    let parsed: { safe?: boolean; score?: number; issues?: string[]; suggestions?: string[]; summary?: string };
    try {
      parsed = JSON.parse(
        aiResult.text.replace(/```json\s*|\s*```/g, "").trim()
      );
    } catch {
      return NextResponse.json(
        { ok: true, safe: true, score: 70, issues: [], suggestions: [], summary: "Verificare incompletă." },
        NO_STORE
      );
    }

    return NextResponse.json(
      {
        ok: true,
        safe: parsed.safe !== false,
        score: parsed.score ?? 70,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        summary: parsed.summary || "",
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Brand safety error:", err);
    return NextResponse.json(
      { error: "Eroare la verificare." },
      { status: 500, ...NO_STORE }
    );
  }
}
