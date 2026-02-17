import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { routeAICall } from "@/lib/ai/multi-model-router";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET() {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const { organizationId, supabase } = session;
    const serviceClient = createServiceClient();

    const since = new Date();
    since.setDate(since.getDate() - 180);
    const sinceStr = since.toISOString();

    const [postsRes, draftsRes, orgRes] = await Promise.all([
      serviceClient
        .from("posts")
        .select("text_content, platform, topic_tags")
        .eq("organization_id", organizationId)
        .gte("published_at", sinceStr)
        .limit(80),
      serviceClient
        .from("drafts")
        .select("body, platform_versions")
        .eq("organization_id", organizationId)
        .gte("created_at", sinceStr)
        .limit(50),
      serviceClient
        .from("organizations")
        .select("settings")
        .eq("id", organizationId)
        .single(),
    ]);

    const posts = postsRes.data || [];
    const drafts = draftsRes.data || [];
    const settings = (orgRes.data?.settings as Record<string, unknown>) || {};
    const bp = settings?.businessProfile as {
      industry?: string;
      targetAudience?: string;
      name?: string;
    } | null;

    const texts: string[] = [];
    for (const p of posts) {
      if (p.text_content?.trim())
        texts.push(p.text_content.trim().slice(0, 400));
    }
    for (const d of drafts) {
      if (d.body?.trim()) texts.push(d.body.trim().slice(0, 400));
      const pv = d.platform_versions as Record<string, unknown> | null;
      if (pv) {
        for (const v of Object.values(pv)) {
          const row = v as Record<string, unknown>;
          const t =
            (row.content as string) ||
            (row.caption as string) ||
            (row.script as string) ||
            "";
          if (t?.trim()) texts.push(String(t).trim().slice(0, 300));
        }
      }
    }

    const sample = [...new Set(texts)].slice(0, 30).join("\n\n---\n\n");
    const industry = bp?.industry || "general";
    const audience = bp?.targetAudience || "clienți";
    const brand = bp?.name || "Brandul";

    if (sample.length < 150) {
      return NextResponse.json(
        {
          ok: true,
          questions: [],
          message:
            "Adaugă mai mult conținut (postări sau draft-uri) pentru a genera întrebări pe baza audienței.",
        },
        NO_STORE
      );
    }

    const prompt = `Analizează conținutul publicat de ${brand} (industrie: ${industry}, audiență: ${audience}):

"""
${sample}
"""

Bazat pe subiectele abordate și pe tipul de audiență, generează 8-12 ÎNTREBĂRI FRECVENTE pe care clienții/urmașii le-ar putea avea.
Fiecare întrebare = o IDEE DE CONȚINUT (post care răspunde la acea întrebare).

Returnează DOAR JSON valid:
{
  "questions": [
    {
      "question": "întrebarea",
      "contentIdea": "idee scurtă pentru post",
      "priority": "high|medium|low",
      "suggestedPlatforms": ["instagram", "facebook"]
    }
  ]
}`;

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content: "Răspunde DOAR cu JSON valid, fără markdown.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens: 1200,
    });

    let parsed: { questions?: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(
        aiResult.text.replace(/```json\s*|\s*```/g, "").trim()
      );
    } catch {
      return NextResponse.json(
        { ok: true, questions: [], meta: { raw: aiResult.text.slice(0, 300) } },
        NO_STORE
      );
    }

    return NextResponse.json(
      {
        ok: true,
        questions: parsed.questions || [],
        industry,
        meta: { provider: aiResult.provider },
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Audience questions error:", err);
    return NextResponse.json(
      { error: "Eroare la analiză." },
      { status: 500, ...NO_STORE }
    );
  }
}
