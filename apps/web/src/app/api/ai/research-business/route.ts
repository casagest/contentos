import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import {
  fetchBusinessIntelligence,
  type BusinessIntelligence,
} from "@/lib/ai/business-intel";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { parseAIJson, JSON_FORMAT_RULES } from "@/lib/ai/parse-ai-json";

// ---------------------------------------------------------------------------
// Types — Rich discoveries for the "wow" research report
// ---------------------------------------------------------------------------

export interface BusinessDiscoveries {
  /** Business name found on site */
  name: string;
  /** What the business does (2-3 sentences) */
  description: string;
  /** Services/products discovered */
  services: DiscoveryItem[];
  /** Team members discovered */
  team: DiscoveryItem[];
  /** Contact information found */
  contact: ContactInfo;
  /** Prices/tariffs found */
  prices: DiscoveryItem[];
  /** Unique selling points */
  usps: DiscoveryItem[];
  /** Real testimonials/reviews found on site */
  testimonials: DiscoveryItem[];
  /** Target audience (inferred) */
  targetAudience: string;
  /** Tone of communication */
  tones: string[];
  /** Key branded terms, phone numbers, product names */
  preferredPhrases: string[];
  /** Social media links found on site */
  socialLinks: { platform: string; url: string }[];
  /** Industry-specific compliance notes */
  compliance: string[];
  /** Pages successfully scraped */
  pagesScraped: { url: string; type: string; contentLength: number }[];
}

export interface DiscoveryItem {
  /** What was found */
  text: string;
  /** Source page URL */
  source: string;
}

export interface ContactInfo {
  phone: string[];
  email: string[];
  address: string;
  city: string;
  schedule: string;
}

// ---------------------------------------------------------------------------
// POST /api/ai/research-business
// ---------------------------------------------------------------------------

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
    return NextResponse.json(
      { error: "URL-ul website-ului este obligatoriu." },
      { status: 400 },
    );
  }

  // Validate URL
  try {
    new URL(website);
  } catch {
    return NextResponse.json(
      { error: "URL invalid. Exemplu: https://medicalcor.ro" },
      { status: 400 },
    );
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
    const existingProfile =
      (settings.businessProfile as Record<string, unknown>) || {};

    settings.businessProfile = {
      ...existingProfile,
      website,
      ...(industry ? { industry } : {}),
    };

    await session.supabase
      .from("organizations")
      .update({ settings })
      .eq("id", session.organizationId);

    // 2. Deep crawl
    const intel = await fetchBusinessIntelligence({
      supabase: session.supabase,
      organizationId: session.organizationId,
      forceRefresh: true,
    });

    // 3. Extract rich discoveries via AI
    const discoveries = await extractDiscoveries(intel, industry);

    // 4. Build auto-profile from discoveries
    const autoProfile = buildAutoProfile(discoveries, industry, website);

    // 5. Save enriched profile
    const { data: freshOrg } = await session.supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();

    const freshSettings =
      (freshOrg?.settings as Record<string, unknown>) || {};
    freshSettings.businessProfile = {
      ...((freshSettings.businessProfile as Record<string, unknown>) || {}),
      ...autoProfile,
    };

    await session.supabase
      .from("organizations")
      .update({ settings: freshSettings })
      .eq("id", session.organizationId);

    return NextResponse.json({
      discoveries,
      profile: freshSettings.businessProfile,
      intel: {
        pagesScraped: intel.website?.pages.length || 0,
        completeness: intel.completeness,
        missingData: intel.missingData,
        socialAccounts: intel.socialAccounts.length,
        totalContentLength: intel.website?.fullContent.length || 0,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Cercetarea a eșuat. Verifică URL-ul.",
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// AI Discovery Extraction
// ---------------------------------------------------------------------------

async function extractDiscoveries(
  intel: BusinessIntelligence,
  industry: string,
): Promise<BusinessDiscoveries> {
  const websiteContent = intel.website?.fullContent || "";
  const pages = intel.website?.pages || [];

  // Fallback: return empty discoveries if no content
  const emptyDiscoveries: BusinessDiscoveries = {
    name: "",
    description: "",
    services: [],
    team: [],
    contact: { phone: [], email: [], address: "", city: "", schedule: "" },
    prices: [],
    usps: [],
    testimonials: [],
    targetAudience: "",
    tones: [],
    preferredPhrases: [],
    socialLinks: [],
    compliance: [],
    pagesScraped: pages.map((p) => ({
      url: p.url,
      type: p.type,
      contentLength: p.content.length,
    })),
  };

  if (!websiteContent || websiteContent.length < 100) return emptyDiscoveries;

  // Try AI extraction
  const hasProvider = [
    process.env.ANTHROPIC_API_KEY,
    process.env.OPENAI_API_KEY,
    process.env.GOOGLE_AI_API_KEY,
    process.env.OPENROUTER_API_KEY,
  ].some((k) => k?.trim());

  if (!hasProvider) {
    // No AI — extract what we can with regex
    return {
      ...emptyDiscoveries,
      ...extractWithRegex(websiteContent, pages),
    };
  }

  try {
    const result = await routeAICall({
      task: "insights",
      messages: [
        {
          role: "system",
          content: `You are a business intelligence analyst. Extract STRUCTURED data from website content.
Return ONLY valid JSON. Extract ONLY what is actually present. NEVER invent data.

${JSON_FORMAT_RULES}

Return this exact JSON structure:
{
  "name": "Exact business name from website",
  "description": "What this business does, 2-3 sentences",
  "services": [{"text": "Service name + brief description", "source": "page URL where found"}],
  "team": [{"text": "Name — Role/Specialty", "source": "page URL where found"}],
  "contact": {
    "phone": ["phone numbers found"],
    "email": ["emails found"],
    "address": "full address if found",
    "city": "city name",
    "schedule": "working hours if found"
  },
  "prices": [{"text": "Service — price", "source": "page URL"}],
  "usps": [{"text": "Unique selling point / differentiator", "source": "page URL"}],
  "testimonials": [{"text": "Real review/testimonial quote", "source": "page URL"}],
  "targetAudience": "Who are their customers (inferred from content)",
  "tones": ["professional", "friendly", "educational", "inspirational"],
  "preferredPhrases": ["branded terms", "product names", "phone numbers"],
  "socialLinks": [{"platform": "facebook/instagram/etc", "url": "full URL"}],
  "compliance": ["any regulatory notes relevant to ${industry || "this"} industry"]
}

RULES:
1. Extract ONLY data visible in the content below. NEVER invent.
2. For each discovery, include the source page URL.
3. Phone numbers, emails, addresses — extract exactly as written.
4. Team members — include real names and specialties only.
5. Prices — include exactly as shown, no conversions.
6. Testimonials — only real quotes found on site, not generated.
7. USPs — what makes this business different (from their own messaging).
8. For dental/medical: add "CMSR 2025 — verificare conformitate" to compliance.
9. All text in Romanian where applicable.
10. services, team, prices, usps: max 10 items each. testimonials: max 5.`,
        },
        {
          role: "user",
          content: `Industry: ${industry || "unknown"}

WEBSITE CONTENT (from ${pages.length} pages):
"""
${websiteContent.slice(0, 14000)}
"""

Extract all discoverable business data. Return ONLY JSON.`,
        },
        {
          role: "assistant",
          content: "{",
        },
      ],
      maxTokens: 3000,
    });

    const text = "{" + (result.text || "");
    const parsed = parseAIJson(text);
    if (!parsed) return emptyDiscoveries;

    return {
      name: safeStr(parsed.name),
      description: safeStr(parsed.description),
      services: safeItems(parsed.services),
      team: safeItems(parsed.team),
      contact: {
        phone: safeStrArr((parsed.contact as Record<string, unknown>)?.phone),
        email: safeStrArr((parsed.contact as Record<string, unknown>)?.email),
        address: safeStr((parsed.contact as Record<string, unknown>)?.address),
        city: safeStr((parsed.contact as Record<string, unknown>)?.city),
        schedule: safeStr((parsed.contact as Record<string, unknown>)?.schedule),
      },
      prices: safeItems(parsed.prices),
      usps: safeItems(parsed.usps),
      testimonials: safeItems(parsed.testimonials),
      targetAudience: safeStr(parsed.targetAudience),
      tones: safeStrArr(parsed.tones),
      preferredPhrases: safeStrArr(parsed.preferredPhrases),
      socialLinks: safeSocialLinks(parsed.socialLinks),
      compliance: safeStrArr(parsed.compliance),
      pagesScraped: pages.map((p) => ({
        url: p.url,
        type: p.type,
        contentLength: p.content.length,
      })),
    };
  } catch {
    return { ...emptyDiscoveries, ...extractWithRegex(websiteContent, pages) };
  }
}

// ---------------------------------------------------------------------------
// Regex fallback extraction (no AI needed)
// ---------------------------------------------------------------------------

function extractWithRegex(
  content: string,
  pages: { url: string; type: string; content: string }[],
): Partial<BusinessDiscoveries> {
  const phones: string[] = [];
  const emails: string[] = [];

  // Phone numbers (Romanian format)
  const phoneMatches = content.match(
    /(?:\+?40|0)\s*(?:7\d{2}|\d{3})[\s.-]?\d{3}[\s.-]?\d{3}/g,
  );
  if (phoneMatches) phones.push(...new Set(phoneMatches));

  // Emails
  const emailMatches = content.match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  );
  if (emailMatches) emails.push(...new Set(emailMatches));

  // Social links
  const socialLinks: { platform: string; url: string }[] = [];
  const socialPatterns = [
    { platform: "facebook", regex: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"')]+/g },
    { platform: "instagram", regex: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"')]+/g },
    { platform: "linkedin", regex: /https?:\/\/(?:www\.)?linkedin\.com\/[^\s"')]+/g },
    { platform: "tiktok", regex: /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"')]+/g },
    { platform: "youtube", regex: /https?:\/\/(?:www\.)?youtube\.com\/[^\s"')]+/g },
  ];
  for (const { platform, regex } of socialPatterns) {
    const m = content.match(regex);
    if (m) socialLinks.push({ platform, url: m[0] });
  }

  return {
    contact: {
      phone: phones.slice(0, 3),
      email: emails.slice(0, 3),
      address: "",
      city: "",
      schedule: "",
    },
    socialLinks,
    pagesScraped: pages.map((p) => ({
      url: p.url,
      type: p.type,
      contentLength: p.content.length,
    })),
  };
}

// ---------------------------------------------------------------------------
// Build auto-profile from discoveries
// ---------------------------------------------------------------------------

function buildAutoProfile(
  d: BusinessDiscoveries,
  industry: string,
  website: string,
): Record<string, unknown> {
  const profile: Record<string, unknown> = {
    website,
    ...(industry ? { industry } : {}),
  };

  if (d.name) profile.name = d.name;
  if (d.description) profile.description = d.description;
  if (d.targetAudience) profile.targetAudience = d.targetAudience;
  if (d.tones.length) profile.tones = d.tones;
  if (d.compliance.length) profile.compliance = d.compliance;

  // USPs as combined string
  if (d.usps.length) {
    profile.usps = d.usps.map((u) => u.text).join(". ");
  }

  // Preferred phrases: branded terms + phone numbers
  const phrases: string[] = [...d.preferredPhrases];
  for (const phone of d.contact.phone) {
    if (!phrases.includes(phone)) phrases.push(phone);
  }
  if (phrases.length) profile.preferredPhrases = phrases.join(", ");

  return profile;
}

// ---------------------------------------------------------------------------
// Safe parsing helpers
// ---------------------------------------------------------------------------

function safeStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeStrArr(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x: any) => typeof x === "string" && x.trim()).map((x: any) => x.trim());
}

function safeItems(v: any): DiscoveryItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x: any) => x && typeof x.text === "string" && x.text.trim())
    .map((x: any) => ({
      text: String(x.text).trim(),
      source: typeof x.source === "string" ? x.source.trim() : "",
    }))
    .slice(0, 10);
}

function safeSocialLinks(v: any): { platform: string; url: string }[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x: any) => x && typeof x.platform === "string" && typeof x.url === "string")
    .map((x: any) => ({
      platform: String(x.platform).trim().toLowerCase(),
      url: String(x.url).trim(),
    }));
}
