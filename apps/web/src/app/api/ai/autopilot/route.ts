import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";
import {
  decidePaidAIAccess,
  estimateAnthropicCostUsd,
  estimateTokensFromText,
  logAIUsageEvent,
} from "@/lib/ai/governor";
import { INDUSTRY_CONFIGS } from "@/lib/dashboard/industry-config";

const ROUTE_KEY = "autopilot";

/**
 * POST /api/ai/autopilot
 *
 * Generates 7 draft posts for the upcoming week.
 * Uses business profile + industry config to create personalized content.
 *
 * Body: { platforms?: string[], postsCount?: number }
 * Returns: { drafts: Array<{ day, platform, title, body, hashtags, scheduledAt }> }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = await request.json().catch(() => ({}));
    const postsCount = Math.min(Math.max(body.postsCount ?? 7, 1), 14);
    const requestedPlatforms: string[] = Array.isArray(body.platforms)
      ? (body.platforms as unknown[]).filter((p): p is string => typeof p === "string")
      : ["facebook", "instagram"];

    // Fetch business profile
    const { data: org } = await session.supabase
      .from("organizations")
      .select("business_name, business_description, industry, tone, target_audience, usp, language, avoid_phrases, preferred_phrases, compliance")
      .eq("id", session.organizationId)
      .single();

    const industry = org?.industry || "general";
    const config = INDUSTRY_CONFIGS[industry];
    const businessName = org?.business_name || "Business";
    const description = org?.business_description || "";
    const tone = org?.tone || "profesional";
    const audience = org?.target_audience || "";
    const usp = org?.usp || "";
    const avoidPhrases = org?.avoid_phrases || "";
    const preferredPhrases = org?.preferred_phrases || "";
    const compliance = Array.isArray(org?.compliance) ? org.compliance.join(", ") : "";
    const contentTips = config?.contentTips?.join(", ") || "";
    const bestPostTypes = config?.bestPostTypes?.join(", ") || "";
    const language = org?.language || "ro";

    // Fetch recent posts for context
    const { data: recentPosts } = await session.supabase
      .from("posts")
      .select("text_content, platform, published_at, likes_count, comments_count")
      .eq("organization_id", session.organizationId)
      .order("published_at", { ascending: false })
      .limit(10);

    const recentContext = recentPosts?.length
      ? `\n\nUltimele postări (pentru a NU repeta conținut similar):\n${recentPosts.map(p => `- [${p.platform}] ${(p.text_content || "").slice(0, 100)} (likes: ${p.likes_count}, comments: ${p.comments_count})`).join("\n")}`
      : "";

    // Fetch recent drafts to avoid duplicates
    const { data: recentDrafts } = await session.supabase
      .from("drafts")
      .select("body, title")
      .eq("organization_id", session.organizationId)
      .order("created_at", { ascending: false })
      .limit(10);

    const draftsContext = recentDrafts?.length
      ? `\n\nDraft-uri recente (NU repeta teme similare):\n${recentDrafts.map(d => `- ${d.title || (d.body || "").slice(0, 80)}`).join("\n")}`
      : "";

    // Calculate schedule (next 7 days, skip today)
    const now = new Date();
    const days: string[] = [];
    const dayNames = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];
    for (let i = 1; i <= postsCount; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      days.push(`${dayNames[d.getDay()]} ${d.toISOString().slice(0, 10)}`);
    }

    // Budget check
    const estimatedInputTokens = estimateTokensFromText(description + audience + usp) + 1200;
    const estimatedOutputTokens = postsCount * 250;
    const estimatedCostUsd = estimateAnthropicCostUsd("claude-3-5-haiku-latest", estimatedInputTokens, estimatedOutputTokens);

    const budget = await decidePaidAIAccess({
      supabase: session.supabase,
      organizationId: session.organizationId,
      estimatedAdditionalCostUsd: estimatedCostUsd,
    });

    if (!budget.allowed) {
      return NextResponse.json(
        { error: `${budget.reason} Încearcă din nou mâine sau fă upgrade.` },
        { status: 429 }
      );
    }

    const platformList = requestedPlatforms.join(", ");
    const langInstruction = language === "ro"
      ? "Scrie TOTUL în limba română, cu diacritice corecte (ă, â, î, ș, ț)."
      : "Write everything in English.";

    const systemPrompt = `Ești expert în social media marketing pentru ${industry === "dental" ? "clinici dentare" : "business-uri"} din România.
Generează exact ${postsCount} postări pentru săptămâna viitoare.

BUSINESS: ${businessName}
${description ? `DESCRIERE: ${description}` : ""}
${audience ? `PUBLIC ȚINTĂ: ${audience}` : ""}
${usp ? `DIFERENȚIATORI: ${usp}` : ""}
TON: ${tone}
${avoidPhrases ? `NU FOLOSI: ${avoidPhrases}` : ""}
${preferredPhrases ? `FOLOSEȘTE CU PRIORITATE: ${preferredPhrases}` : ""}
${compliance ? `CONFORMITATE: ${compliance}` : ""}
${contentTips ? `TIPURI DE CONȚINUT RECOMANDATE: ${contentTips}` : ""}
${bestPostTypes ? `FORMATE BUNE: ${bestPostTypes}` : ""}

PLATFORME DISPONIBILE: ${platformList}

REGULI:
1. ${langInstruction}
2. Distribuie egal pe platforme: ${platformList}
3. Variază tipul de conținut (educativ, storytelling, CTA, behind-the-scenes, testimonial, etc.)
4. Include hashtag-uri relevante (5-15 per post, în limba română)
5. Fiecare post trebuie să aibă un CTA clar
6. NU repeta aceeași temă de două ori în săptămână
7. Ora programată: între 09:00-12:00 sau 18:00-21:00 (ore de vârf)
${recentContext}
${draftsContext}

${JSON_FORMAT_RULES}

Return ONLY valid JSON array with exactly ${postsCount} objects:
[
  {
    "day": "Luni 2026-02-17",
    "platform": "facebook",
    "title": "Titlu scurt și atractiv",
    "body": "Textul complet al postării cu emoji-uri și formatare...",
    "hashtags": ["#hashtag1", "#hashtag2"],
    "hour": "10:00"
  }
]`;

    const startedAt = Date.now();

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generează ${postsCount} postări pentru zilele: ${days.join(", ")}`,
        },
        { role: "assistant", content: "[" },
      ],
      maxTokens: estimatedOutputTokens + 500,
    });

    aiResult.text = "[" + (aiResult.text || "");
    const parsed = parseAIJson(aiResult.text);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      await logAIUsageEvent({
        supabase: session.supabase,
        organizationId: session.organizationId,
        userId: session.user.id,
        routeKey: ROUTE_KEY,
        intentHash: `autopilot-${Date.now()}`,
        provider: aiResult.provider,
        model: aiResult.model,
        mode: "ai",
        inputTokens: aiResult.inputTokens || estimatedInputTokens,
        outputTokens: aiResult.outputTokens || 0,
        estimatedCostUsd,
        latencyMs: aiResult.latencyMs,
        success: false,
        errorCode: "parse_failed",
      });

      return NextResponse.json(
        { error: "AI-ul nu a generat un format valid. Încearcă din nou." },
        { status: 500 }
      );
    }

    // Create drafts in DB
    const drafts = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const postBody = typeof item.body === "string" ? item.body.trim() : "";
      const postTitle = typeof item.title === "string" ? item.title.trim() : "";
      const platform = typeof item.platform === "string" ? item.platform : "facebook";
      const hashtags = Array.isArray(item.hashtags)
        ? item.hashtags.filter((h: unknown): h is string => typeof h === "string")
        : [];
      const day = typeof item.day === "string" ? item.day : "";
      const hour = typeof item.hour === "string" ? item.hour : "10:00";

      if (!postBody) continue;

      // Parse scheduled_at from day + hour
      const dateMatch = day.match(/\d{4}-\d{2}-\d{2}/);
      let scheduledAt: string | null = null;
      if (dateMatch) {
        scheduledAt = `${dateMatch[0]}T${hour}:00.000Z`;
      }

      const { data: draft, error } = await session.supabase
        .from("drafts")
        .insert({
          organization_id: session.organizationId,
          user_id: session.user.id,
          title: postTitle || postBody.slice(0, 60),
          body: postBody,
          hashtags,
          target_platforms: [platform],
          platform_versions: {
            [platform]: { text: postBody },
          },
          scheduled_at: scheduledAt,
          status: scheduledAt ? "scheduled" : "draft",
          source: "autopilot",
        })
        .select("id, title, body, target_platforms, scheduled_at, status")
        .single();

      if (!error && draft) {
        drafts.push({ ...draft, day, platform, hour });
      }
    }

    await logAIUsageEvent({
      supabase: session.supabase,
      organizationId: session.organizationId,
      userId: session.user.id,
      routeKey: ROUTE_KEY,
      intentHash: `autopilot-${Date.now()}`,
      provider: aiResult.provider,
      model: aiResult.model,
      mode: "ai",
      inputTokens: aiResult.inputTokens || estimatedInputTokens,
      outputTokens: aiResult.outputTokens || estimatedOutputTokens,
      estimatedCostUsd,
      latencyMs: aiResult.latencyMs,
      success: true,
      metadata: {
        postsGenerated: drafts.length,
        postsRequested: postsCount,
        platforms: requestedPlatforms,
      },
    });

    return NextResponse.json({
      drafts,
      generated: drafts.length,
      requested: postsCount,
    });
  } catch (error) {
    console.error("[autopilot] Error:", error);
    return NextResponse.json(
      { error: "Eroare la generarea conținutului. Încearcă din nou." },
      { status: 500 }
    );
  }
}
