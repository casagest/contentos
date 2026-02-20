import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import {
  fetchBusinessIntelligence,
  type BusinessIntelligence,
} from "@/lib/ai/business-intel";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";

/**
 * POST /api/ai/research-business
 *
 * Takes a website URL, crawls everything, and returns a structured
 * BusinessProfile auto-populated from real data.
 *
 * This is the FIRST step in onboarding — before any content generation.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: { website?: string; industry?: string };
  try {
    body = (await request.json()) as { website?: string; industry?: string };
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  const website = body.website?.trim();
  if (!website) {
    return NextResponse.json({ error: "URL-ul website-ului este obligatoriu." }, { status: 400 });
  }

  // Validate URL
  try {
    new URL(website);
  } catch {
    return NextResponse.json({ error: "URL invalid. Exemplu: https://medicalcor.ro" }, { status: 400 });
  }

  const industry = body.industry?.trim() || "";

  try {
    // 1. Save website URL to profile immediately
    const { data: org } = await session.supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const existingProfile = (settings.businessProfile as Record<string, unknown>) || {};

    // Save URL so BusinessIntelligence can crawl
    settings.businessProfile = {
      ...existingProfile,
      website,
      ...(industry ? { industry } : {}),
    };

    await session.supabase
      .from("organizations")
      .update({ settings })
      .eq("id", session.organizationId);

    // 2. Deep crawl + research
    const intel = await fetchBusinessIntelligence({
      supabase: session.supabase,
      organizationId: session.organizationId,
      forceRefresh: true,
    });

    // 3. If we have website content, use AI to extract structured profile
    if (intel.website?.fullContent) {
      const hasProvider = [
        process.env.ANTHROPIC_API_KEY,
        process.env.OPENAI_API_KEY,
        process.env.GOOGLE_AI_API_KEY,
        process.env.OPENROUTER_API_KEY,
      ].some((k) => k?.trim());

      if (hasProvider) {
        try {
          const extractedProfile = await extractProfileFromWebsite(
            intel,
            industry,
          );

          if (extractedProfile) {
            // Save enriched profile
            const { data: freshOrg } = await session.supabase
              .from("organizations")
              .select("settings")
              .eq("id", session.organizationId)
              .single();

            const freshSettings = (freshOrg?.settings as Record<string, unknown>) || {};

            freshSettings.businessProfile = {
              ...(freshSettings.businessProfile as Record<string, unknown> || {}),
              ...extractedProfile,
              website,
              ...(industry ? { industry } : {}),
            };

            await session.supabase
              .from("organizations")
              .update({ settings: freshSettings })
              .eq("id", session.organizationId);

            return NextResponse.json({
              profile: freshSettings.businessProfile,
              intel: {
                pagesScraped: intel.website?.pages.length || 0,
                completeness: intel.completeness,
                missingData: intel.missingData,
                socialAccounts: intel.socialAccounts.length,
              },
              source: "ai_extracted",
            });
          }
        } catch {
          // AI extraction failed, return raw data
        }
      }
    }

    // 4. Fallback: return what we got from crawl without AI extraction
    return NextResponse.json({
      profile: settings.businessProfile,
      intel: {
        pagesScraped: intel.website?.pages.length || 0,
        completeness: intel.completeness,
        missingData: intel.missingData,
        socialAccounts: intel.socialAccounts.length,
      },
      source: "crawl_only",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cercetarea a eșuat. Verifică URL-ul." },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// AI Profile Extraction — reads website content, returns structured profile
// ---------------------------------------------------------------------------

async function extractProfileFromWebsite(
  intel: BusinessIntelligence,
  industry: string,
): Promise<Record<string, unknown> | null> {
  const websiteContent = intel.website?.fullContent || "";
  if (!websiteContent || websiteContent.length < 100) return null;

  const result = await routeAICall({
    task: "insights",
    messages: [
      {
        role: "system",
        content: `You are a business analyst. Extract a structured business profile from website content.
Return ONLY valid JSON. Do NOT invent or assume data not present in the content.

${JSON_FORMAT_RULES}

JSON structure:
{
  "name": "Business name (exact, from website)",
  "description": "What the business does, 2-3 sentences (from website content)",
  "targetAudience": "Who are their customers (inferred from services/content)",
  "usps": "Unique selling points, differentiators (from website)",
  "tones": ["professional"|"prietenos"|"educativ"|"inspirational"],
  "preferredPhrases": "Key branded terms, product names, phone numbers (from website)",
  "avoidPhrases": "",
  "language": "ro",
  "compliance": []
}

RULES:
1. Extract ONLY data visible on the website. NEVER invent.
2. For dental/medical businesses, add "cmsr_2025" to compliance.
3. preferredPhrases should include: brand names, product names, phone numbers, addresses found on site.
4. tones should reflect the actual communication style of the website.
5. Use Romanian for all fields.`,
      },
      {
        role: "user",
        content: `Industry: ${industry || "unknown"}

WEBSITE CONTENT:
"""
${websiteContent.slice(0, 12000)}
"""

Extract the business profile. Return ONLY JSON.`,
      },
      {
        role: "assistant",
        content: "{",
      },
    ],
    maxTokens: 1500,
  });

  const text = "{" + (result.text || "");
  const parsed = parseAIJson(text);

  if (!parsed || typeof parsed.name !== "string") return null;

  // Validate — only keep fields that are strings/arrays
  const profile: Record<string, unknown> = {};

  if (typeof parsed.name === "string" && parsed.name) profile.name = parsed.name;
  if (typeof parsed.description === "string" && parsed.description) profile.description = parsed.description;
  if (typeof parsed.targetAudience === "string" && parsed.targetAudience) profile.targetAudience = parsed.targetAudience;
  if (typeof parsed.usps === "string" && parsed.usps) profile.usps = parsed.usps;
  if (typeof parsed.preferredPhrases === "string") profile.preferredPhrases = parsed.preferredPhrases;
  if (typeof parsed.avoidPhrases === "string") profile.avoidPhrases = parsed.avoidPhrases;
  if (typeof parsed.language === "string") profile.language = parsed.language;

  if (Array.isArray(parsed.tones)) {
    profile.tones = parsed.tones.filter((t: unknown) => typeof t === "string");
  }
  if (Array.isArray(parsed.compliance)) {
    profile.compliance = parsed.compliance.filter((c: unknown) => typeof c === "string");
  }

  return Object.keys(profile).length > 0 ? profile : null;
}
