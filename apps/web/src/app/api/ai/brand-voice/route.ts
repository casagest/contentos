import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { routeAICall } from "@/lib/ai/multi-model-router";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function POST() {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId, supabase } = session;
    const serviceClient = createServiceClient();

    // Fetch drafts (body) + posts (text_content) from last 90 days
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const sinceStr = since.toISOString();

    const [draftsRes, postsRes] = await Promise.all([
      serviceClient
        .from("drafts")
        .select("body, platform_versions")
        .eq("organization_id", organizationId)
        .gte("created_at", sinceStr)
        .in("status", ["draft", "published", "scheduled"])
        .limit(100),
      serviceClient
        .from("posts")
        .select("text_content, platform")
        .eq("organization_id", organizationId)
        .gte("published_at", sinceStr)
        .limit(100),
    ]);

    const drafts = draftsRes.data || [];
    const posts = postsRes.data || [];

    const sampleTexts: string[] = [];
    for (const d of drafts) {
      if (d.body?.trim()) sampleTexts.push(d.body.trim().slice(0, 800));
      const pv = d.platform_versions as Record<string, unknown> | null;
      if (pv) {
        for (const v of Object.values(pv)) {
          const row = v as Record<string, unknown>;
          const text =
            (row.content as string) ||
            (row.caption as string) ||
            (row.script as string) ||
            (row.title as string) ||
            "";
          if (text?.trim()) sampleTexts.push(String(text).trim().slice(0, 600));
        }
      }
    }
    for (const p of posts) {
      if (p.text_content?.trim()) sampleTexts.push(p.text_content.trim().slice(0, 600));
    }

    const uniqueTexts = [...new Set(sampleTexts)].slice(0, 25);
    const combined = uniqueTexts.join("\n\n---\n\n");

    if (combined.length < 100) {
      return NextResponse.json(
        {
          ok: true,
          message: "Prea puțin conținut pentru analiză. Scrie mai multe postări sau adaugă draft-uri.",
          brandVoice: null,
        },
        NO_STORE
      );
    }

    const prompt = `Analizează aceste exemple de conținut scris de același brand (postări, draft-uri):

"""
${combined}
"""

Extrage și descrie în MAXIM 12-15 fraze scurte (în română):
1. TONUL GENERAL: Cum vorbește brandul? (formal/casual, serios/amuzant, direct/indirect)
2. PATTERN-URI LINGVISTICE: Fraze tipice, formule des întâlnite, structuri preferate
3. CUVINTE/FRAZE FAVORITE: 5-8 cuvinte sau expresii care apar frecvent
4. CUVINTE/FRAZE DE EVITAT: Ce nu folosește niciodată
5. LUNGIMEA MEDIE: Paragrafe scurte/lungi, propoziții simple/complexe
6. CTA-uri preferate: Cum încheie postările
7. EMOȚII DOMINANTE: Ce sentiment transmite (încredere, urgență, cald, profesional etc.)

Răspunde DOAR cu un JSON valid:
{
  "summary": "1-2 propoziții despre vocea brandului",
  "tone": "string",
  "phrases": ["lista cuvinte/fraze tipice"],
  "avoid": ["lista de evitat"],
  "ctaStyle": "string",
  "emotions": ["lista emoții"]
}`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content:
            "Ești un analist de brand voice. Răspunde DOAR cu JSON valid, fără markdown sau text înainte/după.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 800,
    });

    let brandVoice: Record<string, unknown>;
    try {
      const parsed = JSON.parse(
        aiResult.text.replace(/```json\s*|\s*```/g, "").trim()
      );
      brandVoice = {
        summary: parsed.summary,
        tone: parsed.tone,
        phrases: Array.isArray(parsed.phrases) ? parsed.phrases : [],
        avoid: Array.isArray(parsed.avoid) ? parsed.avoid : [],
        ctaStyle: parsed.ctaStyle,
        emotions: Array.isArray(parsed.emotions) ? parsed.emotions : [],
        analyzedAt: new Date().toISOString(),
        sampleCount: uniqueTexts.length,
      };
    } catch {
      brandVoice = {
        summary: aiResult.text.slice(0, 500),
        analyzedAt: new Date().toISOString(),
        sampleCount: uniqueTexts.length,
      };
    }

    // Save to org settings
    const { data: org } = await serviceClient
      .from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const updated = {
      ...settings,
      brandVoice,
    };

    await serviceClient
      .from("organizations")
      .update({ settings: updated, updated_at: new Date().toISOString() })
      .eq("id", organizationId);

    return NextResponse.json(
      { ok: true, brandVoice, message: "Vocea brandului a fost salvată." },
      NO_STORE
    );
  } catch (err) {
    console.error("Brand voice error:", err);
    return NextResponse.json(
      { error: "Eroare la analiză." },
      { status: 500, ...NO_STORE }
    );
  }
}
