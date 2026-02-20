// ============================================================================
// src/lib/ai/business-intel.ts
// Deep Business Intelligence — Comprehensive real data grounding for AI
//
// Crawls website (homepage + internal pages), reads social accounts,
// reads real posts, structures everything for AI prompt injection.
// Cached 24h in org settings. ZERO hallucination grounding.
// ============================================================================

import { scrapeUrlContent } from "@/lib/scrape";
import type { BusinessProfile } from "@contentos/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BusinessIntelligence {
  /** Business profile from settings */
  profile: BusinessProfile | null;
  /** Scraped website data — multiple pages combined */
  website: WebsiteData | null;
  /** Connected social accounts summary */
  socialAccounts: SocialAccountSummary[];
  /** Recent posts with real engagement data */
  recentPosts: PostSummary[];
  /** Top performing posts */
  topPosts: PostSummary[];
  /** Data completeness score (0-100) */
  completeness: number;
  /** Missing critical data fields */
  missingData: string[];
  /** When this intel was last refreshed */
  refreshedAt: string;
}

export interface WebsiteData {
  url: string;
  homepage: string;
  pages: WebsitePage[];
  /** Combined content from all pages */
  fullContent: string;
  scrapedAt: string;
}

export interface WebsitePage {
  url: string;
  title?: string;
  content: string;
  type: "homepage" | "services" | "about" | "team" | "pricing" | "contact" | "testimonials" | "other";
}

export interface SocialAccountSummary {
  platform: string;
  username: string;
  name: string;
  followersCount: number;
  postsCount: number;
  lastSyncedAt: string | null;
}

export interface PostSummary {
  platform: string;
  content: string;
  engagementRate: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  publishedAt: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCRAPE_TIMEOUT_MS = 12_000;
const MAX_PAGES_TO_CRAWL = 6;
const MAX_CHARS_PER_PAGE = 4000;
const MAX_TOTAL_CONTENT = 15000;

// Common internal page patterns to discover
const INTERNAL_PAGE_PATTERNS = [
  "/servicii", "/services",
  "/despre", "/despre-noi", "/about", "/about-us",
  "/echipa", "/team",
  "/preturi", "/pricing", "/tarife",
  "/contact",
  "/testimoniale", "/testimonials", "/recenzii", "/reviews",
  "/galerie", "/gallery", "/portofoliu", "/portfolio",
  "/blog",
  "/one-step-all-on-x", // MedicalCor specific
  "/implant", "/implanturi",
];

// ---------------------------------------------------------------------------
// Website Crawling
// ---------------------------------------------------------------------------

function classifyPage(url: string, content: string): WebsitePage["type"] {
  const lower = url.toLowerCase();
  if (/servici|services/i.test(lower)) return "services";
  if (/despre|about/i.test(lower)) return "about";
  if (/echipa|team/i.test(lower)) return "team";
  if (/pret|pricing|tarif/i.test(lower)) return "pricing";
  if (/contact/i.test(lower)) return "contact";
  if (/testimonial|recenz|review/i.test(lower)) return "testimonials";
  return "other";
}

function extractInternalLinks(content: string, baseUrl: string): string[] {
  const links: string[] = [];
  try {
    const base = new URL(baseUrl);
    // Find markdown links and raw URLs
    const linkPattern = /\[([^\]]*)\]\(([^)]+)\)|href="([^"]+)"/g;
    let match: RegExpExecArray | null;
    while ((match = linkPattern.exec(content)) !== null) {
      const href = match[2] || match[3];
      if (!href) continue;
      try {
        const resolved = new URL(href, baseUrl);
        if (resolved.hostname === base.hostname && !links.includes(resolved.pathname)) {
          links.push(resolved.pathname);
        }
      } catch { /* skip invalid URLs */ }
    }
  } catch { /* skip */ }
  return links;
}

async function crawlWebsite(websiteUrl: string): Promise<WebsiteData | null> {
  try {
    const baseUrl = new URL(websiteUrl);
    const origin = baseUrl.origin;

    // 1. Scrape homepage
    const homepage = await scrapeUrlContent(websiteUrl, {
      maxChars: MAX_CHARS_PER_PAGE * 2, // More budget for homepage
      minChars: 100,
      timeoutMs: SCRAPE_TIMEOUT_MS,
    });

    if (!homepage?.content) return null;

    const pages: WebsitePage[] = [{
      url: websiteUrl,
      title: homepage.title,
      content: homepage.content,
      type: "homepage",
    }];

    // 2. Discover internal pages from homepage links + known patterns
    const discoveredLinks = extractInternalLinks(homepage.content, websiteUrl);
    const candidatePages = new Set<string>();

    // Add discovered links
    for (const link of discoveredLinks) {
      candidatePages.add(link);
    }

    // Add known patterns
    for (const pattern of INTERNAL_PAGE_PATTERNS) {
      candidatePages.add(pattern);
    }

    // 3. Scrape internal pages (parallel, max 5)
    const pagesToScrape = [...candidatePages]
      .filter(path => path !== "/" && path !== baseUrl.pathname)
      .slice(0, MAX_PAGES_TO_CRAWL);

    const scrapePromises = pagesToScrape.map(async (path) => {
      const pageUrl = `${origin}${path}`;
      try {
        const result = await scrapeUrlContent(pageUrl, {
          maxChars: MAX_CHARS_PER_PAGE,
          minChars: 50,
          timeoutMs: SCRAPE_TIMEOUT_MS,
        });
        if (result?.content && result.content.length > 50) {
          return {
            url: pageUrl,
            title: result.title,
            content: result.content,
            type: classifyPage(pageUrl, result.content),
          } as WebsitePage;
        }
      } catch { /* skip failed pages */ }
      return null;
    });

    const results = await Promise.allSettled(scrapePromises);
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        pages.push(result.value);
      }
    }

    // 4. Combine all content, prioritize important pages
    const priorityOrder: WebsitePage["type"][] = [
      "homepage", "services", "about", "pricing", "testimonials", "team", "contact", "other"
    ];

    const sortedPages = [...pages].sort((a, b) => {
      return priorityOrder.indexOf(a.type) - priorityOrder.indexOf(b.type);
    });

    let fullContent = "";
    for (const page of sortedPages) {
      const section = `\n\n=== ${page.type.toUpperCase()} (${page.url}) ===\n${page.content}`;
      if ((fullContent + section).length > MAX_TOTAL_CONTENT) break;
      fullContent += section;
    }

    return {
      url: websiteUrl,
      homepage: homepage.content,
      pages,
      fullContent: fullContent.trim(),
      scrapedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Social Account Data
// ---------------------------------------------------------------------------

async function loadSocialAccounts(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<SocialAccountSummary[]> {
  try {
    const data = await query(supabase, (sb) =>
      sb.from("social_accounts")
        .select("platform, platform_username, platform_name, followers_count, posts_count, last_synced_at")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
    );

    if (!data?.length) return [];

    return data.map((account: Record<string, unknown>) => ({
      platform: String(account.platform || ""),
      username: String(account.platform_username || ""),
      name: String(account.platform_name || ""),
      followersCount: Number(account.followers_count || 0),
      postsCount: Number(account.posts_count || 0),
      lastSyncedAt: typeof account.last_synced_at === "string" ? account.last_synced_at : null,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Post Data
// ---------------------------------------------------------------------------

async function loadRecentPosts(
  supabase: SupabaseClient,
  organizationId: string,
  limit: number,
): Promise<PostSummary[]> {
  try {
    const data = await query(supabase, (sb) =>
      sb.from("posts")
        .select("platform, text_content, engagement_rate, likes_count, comments_count, shares_count, published_at")
        .eq("organization_id", organizationId)
        .order("published_at", { ascending: false })
        .limit(limit)
    );

    if (!data?.length) return [];

    return data.map((post: Record<string, unknown>) => ({
      platform: String(post.platform || ""),
      content: String(post.text_content || "").slice(0, 200),
      engagementRate: Number(post.engagement_rate || 0),
      likesCount: Number(post.likes_count || 0),
      commentsCount: Number(post.comments_count || 0),
      sharesCount: Number(post.shares_count || 0),
      publishedAt: typeof post.published_at === "string"
        ? post.published_at.slice(0, 10)
        : "",
    }));
  } catch {
    return [];
  }
}

async function loadTopPosts(
  supabase: SupabaseClient,
  organizationId: string,
  limit: number,
): Promise<PostSummary[]> {
  try {
    const data = await query(supabase, (sb) =>
      sb.from("posts")
        .select("platform, text_content, engagement_rate, likes_count, comments_count, shares_count, published_at")
        .eq("organization_id", organizationId)
        .order("engagement_rate", { ascending: false })
        .limit(limit)
    );

    if (!data?.length) return [];

    return data.map((post: Record<string, unknown>) => ({
      platform: String(post.platform || ""),
      content: String(post.text_content || "").slice(0, 200),
      engagementRate: Number(post.engagement_rate || 0),
      likesCount: Number(post.likes_count || 0),
      commentsCount: Number(post.comments_count || 0),
      sharesCount: Number(post.shares_count || 0),
      publishedAt: typeof post.published_at === "string"
        ? post.published_at.slice(0, 10)
        : "",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Data Completeness Analysis
// ---------------------------------------------------------------------------

function analyzeCompleteness(intel: Omit<BusinessIntelligence, "completeness" | "missingData">): {
  completeness: number;
  missingData: string[];
} {
  const missing: string[] = [];
  let score = 0;
  const maxScore = 100;

  // Profile (30 points)
  if (intel.profile) {
    if (intel.profile.name) score += 5; else missing.push("Numele afacerii");
    if (intel.profile.description && intel.profile.description.length > 50) score += 5; else missing.push("Descriere detaliată a afacerii (min 50 caractere)");
    if (intel.profile.industry) score += 3; else missing.push("Industria");
    if (intel.profile.targetAudience && intel.profile.targetAudience.length > 30) score += 5; else missing.push("Public țintă detaliat");
    if (intel.profile.usps && intel.profile.usps.length > 30) score += 5; else missing.push("USP-uri / Diferențiatori");
    if (intel.profile.tones?.length) score += 2; else missing.push("Tonul comunicării");
    if (intel.profile.preferredPhrases) score += 3; else missing.push("Expresii preferate (ex: One Step ALL-ON-X®, 0729 122 422)");
    if (intel.profile.website) score += 2; else missing.push("Website-ul afacerii (CRITIC — fără el AI-ul nu are date reale)");
  } else {
    score += 0;
    missing.push("Profil de afacere COMPLET (Settings → Profilul Afacerii)");
  }

  // Website (30 points)
  if (intel.website) {
    score += 10; // Has website data
    if (intel.website.pages.length > 1) score += 5; // Multiple pages scraped
    if (intel.website.pages.length > 3) score += 5; // Deep crawl
    if (intel.website.fullContent.length > 3000) score += 5; // Rich content
    if (intel.website.pages.some(p => p.type === "services")) score += 3; else missing.push("Pagină de servicii pe website");
    if (intel.website.pages.some(p => p.type === "pricing")) score += 2; else missing.push("Pagină de prețuri pe website");
  } else {
    missing.push("Date de pe website (adaugă URL-ul în Settings → Profilul Afacerii)");
  }

  // Social Accounts (20 points)
  if (intel.socialAccounts.length > 0) {
    score += 10;
    if (intel.socialAccounts.length > 1) score += 5;
    if (intel.socialAccounts.some(a => a.followersCount > 0)) score += 5;
  } else {
    missing.push("Conturile social media conectate (Settings → Conturi)");
  }

  // Posts (20 points)
  if (intel.recentPosts.length > 0) {
    score += 10;
    if (intel.recentPosts.length >= 5) score += 5;
    if (intel.topPosts.some(p => p.engagementRate > 0)) score += 5;
  } else {
    missing.push("Postări sincronizate cu date reale de engagement");
  }

  return {
    completeness: Math.min(maxScore, score),
    missingData: missing,
  };
}

// ---------------------------------------------------------------------------
// Supabase type (minimal — avoid importing full client)
// ---------------------------------------------------------------------------

// Supabase client — accept any shape, cast internally
// Accept any Supabase client shape — the actual type is SupabaseClient<...> from @supabase/supabase-js
// We only need `.from()` which all variants provide
type SupabaseClient = { from: CallableFunction };

/** Safe query helper — casts Supabase builder chain results */
async function query(
  supabase: SupabaseClient,
  fn: (sb: { from: (table: string) => ReturnType<typeof Object.create> }) => Promise<{ data: unknown; error: unknown }>,
): Promise<Record<string, unknown>[] | null> {
  try {
    const result = await fn(supabase as never);
    if (result.error || !result.data) return null;
    return result.data as Record<string, unknown>[];
  } catch {
    return null;
  }
}

async function querySingle(
  supabase: SupabaseClient,
  fn: (sb: { from: (table: string) => ReturnType<typeof Object.create> }) => Promise<{ data: unknown; error: unknown }>,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await fn(supabase as never);
    if (result.error || !result.data) return null;
    return result.data as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Fetch comprehensive business intelligence.
 * Uses cache when fresh (< 24h), otherwise re-crawls.
 */
export async function fetchBusinessIntelligence(params: {
  supabase: SupabaseClient;
  organizationId: string;
  forceRefresh?: boolean;
}): Promise<BusinessIntelligence> {
  const { supabase, organizationId, forceRefresh } = params;

  // 1. Load org settings
  const org = await querySingle(supabase, (sb) =>
    sb.from("organizations")
      .select("settings")
      .eq("id", organizationId)
      .single()
  );

  const settings = ((org?.settings as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  const profile = (settings.businessProfile ?? null) as BusinessProfile | null;

  // 2. Check cache
  const cached = settings.businessIntel as BusinessIntelligence | undefined;
  if (cached && !forceRefresh) {
    const cachedAt = cached.refreshedAt ? new Date(cached.refreshedAt).getTime() : 0;
    if (Date.now() - cachedAt < CACHE_TTL_MS) {
      return cached;
    }
  }

  // 3. Crawl website (if URL is available)
  let website: WebsiteData | null = null;
  if (profile?.website) {
    website = await crawlWebsite(profile.website);
  }

  // 4. Load social accounts
  const socialAccounts = await loadSocialAccounts(supabase, organizationId);

  // 5. Load posts
  const recentPosts = await loadRecentPosts(supabase, organizationId, 15);
  const topPosts = await loadTopPosts(supabase, organizationId, 8);

  // 6. Analyze completeness
  const partial = { profile, website, socialAccounts, recentPosts, topPosts, refreshedAt: new Date().toISOString() };
  const { completeness, missingData } = analyzeCompleteness(partial);

  const intel: BusinessIntelligence = {
    ...partial,
    completeness,
    missingData,
  };

  // 7. Cache in org settings (fire-and-forget)
  void Promise.resolve().then(async () => {
    try {
      const sb = supabase as never as { from: (t: string) => { update: (d: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> } } };
      await sb.from("organizations")
        .update({ settings: { ...settings, businessIntel: intel } })
        .eq("id", organizationId);
    } catch { /* silent */ }
  });

  return intel;
}

// ---------------------------------------------------------------------------
// Prompt Builder — converts BusinessIntelligence to AI prompt context
// ---------------------------------------------------------------------------

/**
 * Build a grounding context string for AI prompts.
 * Contains ONLY real, verified data. No placeholders.
 */
export function buildGroundingPrompt(intel: BusinessIntelligence): string {
  const sections: string[] = [];

  // Header
  sections.push("=== REAL BUSINESS DATA (VERIFIED — use ONLY this data, invent NOTHING) ===");

  // Profile
  if (intel.profile) {
    const p = intel.profile;
    const profileLines = [
      `Business: ${p.name || "NOT SET"}`,
      p.industry ? `Industry: ${p.industry}` : null,
      p.description ? `Description: ${p.description}` : null,
      p.targetAudience ? `Target audience: ${p.targetAudience}` : null,
      p.usps ? `USPs/Differentiators: ${p.usps}` : null,
      p.tones?.length ? `Communication tone: ${p.tones.join(", ")}` : null,
      p.preferredPhrases ? `Preferred phrases (USE these): ${p.preferredPhrases}` : null,
      p.avoidPhrases ? `Phrases to AVOID (NEVER use): ${p.avoidPhrases}` : null,
      p.website ? `Website: ${p.website}` : null,
      p.compliance?.length ? `Compliance: ${p.compliance.join(", ")}` : null,
    ].filter(Boolean);
    sections.push("\n--- BUSINESS PROFILE ---\n" + profileLines.join("\n"));
  }

  // Website content
  if (intel.website) {
    sections.push(`\n--- WEBSITE CONTENT (scraped from ${intel.website.url}) ---`);
    // Add page summaries
    for (const page of intel.website.pages) {
      const label = page.type.toUpperCase();
      const title = page.title ? ` — ${page.title}` : "";
      sections.push(`\n[${label}${title}]\n${page.content.slice(0, 3000)}`);
    }
  }

  // Social accounts
  if (intel.socialAccounts.length > 0) {
    const accountLines = intel.socialAccounts.map(a =>
      `- ${a.platform}: @${a.username} (${a.name}) — ${a.followersCount.toLocaleString()} followers, ${a.postsCount} posts`
    );
    sections.push("\n--- SOCIAL MEDIA ACCOUNTS (REAL DATA) ---\n" + accountLines.join("\n"));
  }

  // Recent posts with real engagement
  if (intel.recentPosts.length > 0) {
    const postLines = intel.recentPosts.slice(0, 10).map(p =>
      `[${p.publishedAt}] ${p.platform} | engagement: ${p.engagementRate.toFixed(2)}% | ❤️${p.likesCount} 💬${p.commentsCount} 🔄${p.sharesCount}\n  "${p.content}"`
    );
    sections.push("\n--- RECENT POSTS (REAL ENGAGEMENT DATA) ---\n" + postLines.join("\n\n"));
  }

  // Top performers
  if (intel.topPosts.length > 0) {
    const topLines = intel.topPosts.slice(0, 5).map(p =>
      `[${p.publishedAt}] ${p.platform} | engagement: ${p.engagementRate.toFixed(2)}% | ❤️${p.likesCount} 💬${p.commentsCount} 🔄${p.sharesCount}\n  "${p.content}"`
    );
    sections.push("\n--- TOP PERFORMING POSTS (learn from these) ---\n" + topLines.join("\n\n"));
  }

  // Data completeness warning
  if (intel.missingData.length > 0) {
    sections.push(
      `\n--- DATA COMPLETENESS: ${intel.completeness}% ---` +
      `\nMISSING (do NOT invent data for these — just work with what you have):` +
      `\n${intel.missingData.map(m => `  ⚠️ ${m}`).join("\n")}`
    );
  }

  sections.push("\n=== END REAL DATA — EVERYTHING ABOVE IS VERIFIED. INVENT NOTHING. ===");

  return sections.join("\n");
}

/**
 * Build a short completeness warning for the UI.
 */
export function buildCompletenessWarning(intel: BusinessIntelligence): string | null {
  if (intel.completeness >= 70) return null;

  const critical = intel.missingData.slice(0, 3);
  return `Datele business-ului sunt incomplete (${intel.completeness}%). Pentru conținut mai bun, completează: ${critical.join("; ")}`;
}
