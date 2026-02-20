// ============================================================================
// src/lib/ai/perplexity-research.ts
// Perplexity Sonar API — Deep research about business + industry
//
// Uses Perplexity's search-grounded AI to find:
// - Real reviews, reputation, online mentions
// - Industry trends, statistics, best practices
// - Competitor landscape, content strategies
// - Audience behavior, preferences
//
// All data is REAL (search-grounded). Zero hallucination by design.
// ============================================================================

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";
const TIMEOUT_MS = 25_000;
const SONAR_MODEL = "sonar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerplexityResult {
  answer: string;
  citations: string[];
  model: string;
}

export interface BusinessReputation {
  /** Google/online reviews summary */
  reviews: string[];
  /** Overall sentiment */
  sentiment: string;
  /** Online mentions, press, articles */
  mentions: string[];
  /** Competitor names + brief */
  competitors: string[];
  /** Awards, certifications found */
  awards: string[];
}

export interface IndustryIntelligence {
  /** Industry name */
  industry: string;
  /** Current trends (2025-2026) */
  trends: string[];
  /** Content best practices for this industry */
  contentStrategies: string[];
  /** Target audience insights */
  audienceInsights: string[];
  /** Top performing content types */
  topContentTypes: string[];
  /** Key statistics */
  statistics: string[];
  /** Regulatory/compliance notes */
  regulations: string[];
  /** Seasonal patterns (when to post what) */
  seasonalPatterns: string[];
  /** Romanian market specifics */
  localInsights: string[];
  /** Sources (Perplexity citations) */
  sources: string[];
}

// ---------------------------------------------------------------------------
// Perplexity API Client
// ---------------------------------------------------------------------------

function getPerplexityKey(): string | undefined {
  return process.env.PERPLEXITY_API_KEY?.trim() || undefined;
}

export function isPerplexityAvailable(): boolean {
  return Boolean(getPerplexityKey());
}

async function queryPerplexity(
  systemPrompt: string,
  userQuery: string,
): Promise<PerplexityResult | null> {
  const apiKey = getPerplexityKey();
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: SONAR_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userQuery },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        return_citations: true,
        search_recency_filter: "year",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
      }>;
      citations?: string[];
      model?: string;
    };

    const answer = data.choices?.[0]?.message?.content || "";
    if (!answer) return null;

    return {
      answer,
      citations: Array.isArray(data.citations) ? data.citations : [],
      model: typeof data.model === "string" ? data.model : SONAR_MODEL,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Business Reputation Research
// ---------------------------------------------------------------------------

export async function researchBusinessReputation(
  businessName: string,
  industry: string,
  city: string,
  website: string,
): Promise<BusinessReputation | null> {
  if (!isPerplexityAvailable() || !businessName) return null;

  const location = city ? ` din ${city}` : " din România";

  const result = await queryPerplexity(
    `Ești un analist de reputație online. Caută informații REALE și VERIFICABILE despre un business.
Răspunde STRICT cu ce găsești online. NU inventa recenzii, date sau mențiuni.
Dacă nu găsești informații, spune clar "Nu am găsit informații despre [subiect]."
Răspunde în română. Fii specific — numere, date, citate exacte.`,

    `Cercetează reputația online a "${businessName}"${location} (${industry}).
Website: ${website}

Găsește și raportează:
1. RECENZII REALE: Ce spun clienții pe Google Reviews, Facebook, alte platforme? Rating mediu?
2. SENTIMENT GENERAL: Pozitiv/negativ/mixt? Ce apreciază/critică clienții?
3. MENȚIUNI ONLINE: Articole, presă, bloguri care menționează ${businessName}
4. COMPETITORI: Cine sunt principalii competitori${location} în ${industry}?
5. PREMII/CERTIFICĂRI: Are certificări, premii, distincții?

Fii EXACT. Citează surse. Nu inventa nimic.`,
  );

  if (!result) return null;

  // Parse the response into structured data
  return parseReputationResponse(result.answer);
}

function parseReputationResponse(text: string): BusinessReputation {
  const sections = text.split(/\n(?=\d\.|\*\*|#{1,3}\s)/);
  const reviews: string[] = [];
  const mentions: string[] = [];
  const competitors: string[] = [];
  const awards: string[] = [];
  let sentiment = "";

  for (const section of sections) {
    const lower = section.toLowerCase();
    const bullets = section
      .split(/\n[-•*]\s?/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 500);

    if (lower.includes("recenz") || lower.includes("review") || lower.includes("rating")) {
      reviews.push(...bullets.slice(0, 5));
    } else if (lower.includes("sentiment") || lower.includes("general")) {
      sentiment = bullets[0] || section.slice(0, 200).trim();
    } else if (lower.includes("menți") || lower.includes("artic") || lower.includes("presă")) {
      mentions.push(...bullets.slice(0, 5));
    } else if (lower.includes("competi") || lower.includes("concuren")) {
      competitors.push(...bullets.slice(0, 5));
    } else if (lower.includes("premi") || lower.includes("certific") || lower.includes("distincț")) {
      awards.push(...bullets.slice(0, 3));
    }
  }

  // If parsing failed, extract lines as generic reviews
  if (reviews.length === 0 && mentions.length === 0) {
    const lines = text
      .split("\n")
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 15 && l.length < 500);
    reviews.push(...lines.slice(0, 5));
  }

  return { reviews, sentiment, mentions, competitors, awards };
}

// ---------------------------------------------------------------------------
// Industry Intelligence Research
// ---------------------------------------------------------------------------

export async function researchIndustry(
  industry: string,
  businessType: string,
  country: string = "România",
): Promise<IndustryIntelligence | null> {
  if (!isPerplexityAvailable() || !industry) return null;

  // Map industry IDs to Romanian labels for better search
  const industryLabels: Record<string, string> = {
    dental: "clinică dentară / stomatologie",
    restaurant: "restaurant / HoReCa",
    beauty: "salon de beauty / cosmetică",
    fitness: "fitness / sport / sală",
    ecommerce: "e-commerce / magazin online",
    real_estate: "imobiliare / agenție imobiliară",
    education: "educație / cursuri online",
    altele: businessType || "business general",
  };

  const industryLabel = industryLabels[industry] || industry;

  const result = await queryPerplexity(
    `Ești un expert în marketing digital și social media pentru piața din ${country}.
Oferă date REALE, ACTUALE (2025-2026), cu statistici și surse concrete.
NU inventa cifre — dacă nu ai date exacte, spune "estimare bazată pe [sursă]".
Răspunde în română. Fii practic și acționabil.`,

    `Cercetare completă despre industria "${industryLabel}" în ${country} pentru social media marketing:

1. TRENDURI ACTUALE (2025-2026): Ce tendințe sunt populare acum în ${industryLabel}?
2. STRATEGII DE CONȚINUT: Ce tip de conținut funcționează cel mai bine pe social media pentru ${industryLabel}? (video, carusel, reels, stories, etc.)
3. AUDIENȚA: Cine este publicul țintă tipic? Vârstă, interese, comportament online.
4. TOP CONTENT TYPES: Ce postări au cel mai mare engagement în ${industryLabel}?
5. STATISTICI CHEIE: Numere relevante — rata de engagement medie, ore optime de postare, frecvență ideală.
6. REGLEMENTĂRI: Există reguli specifice pentru publicitatea în ${industryLabel} în ${country}? (CMSR, ANPC, etc.)
7. PATTERN-URI SEZONIERE: Când e cel mai bun moment pentru anumite campanii? (sărbători, sezon, back-to-school, etc.)
8. SPECIFICUL PIEȚEI DIN ROMÂNIA: Ce e diferit la piața locală vs. internațional?

Fii specific. Dă exemple concrete. Citează surse.`,
  );

  if (!result) return null;

  return parseIndustryResponse(result.answer, industry, result.citations);
}

function parseIndustryResponse(
  text: string,
  industry: string,
  citations: string[],
): IndustryIntelligence {
  const trends: string[] = [];
  const contentStrategies: string[] = [];
  const audienceInsights: string[] = [];
  const topContentTypes: string[] = [];
  const statistics: string[] = [];
  const regulations: string[] = [];
  const seasonalPatterns: string[] = [];
  const localInsights: string[] = [];

  // Split by numbered sections or headers
  const sections = text.split(/\n(?=\d+\.\s|\*\*\d+|\#{1,3}\s)/);

  for (const section of sections) {
    const lower = section.toLowerCase();
    const bullets = extractBullets(section);

    if (lower.includes("trend") || lower.includes("tendinț")) {
      trends.push(...bullets);
    } else if (lower.includes("strategi") || lower.includes("conținut")) {
      contentStrategies.push(...bullets);
    } else if (lower.includes("audiență") || lower.includes("public") || lower.includes("target")) {
      audienceInsights.push(...bullets);
    } else if (lower.includes("top content") || lower.includes("engagement") || lower.includes("funcționează")) {
      topContentTypes.push(...bullets);
    } else if (lower.includes("statistic") || lower.includes("numere") || lower.includes("medie")) {
      statistics.push(...bullets);
    } else if (lower.includes("reglementăr") || lower.includes("regul") || lower.includes("cmsr") || lower.includes("anpc")) {
      regulations.push(...bullets);
    } else if (lower.includes("sezon") || lower.includes("pattern") || lower.includes("calendar")) {
      seasonalPatterns.push(...bullets);
    } else if (lower.includes("românia") || lower.includes("local") || lower.includes("piața")) {
      localInsights.push(...bullets);
    }
  }

  // Fallback: if parsing found nothing in specific sections, distribute lines
  if (trends.length === 0 && contentStrategies.length === 0) {
    const allBullets = extractBullets(text);
    // Distribute evenly
    for (let i = 0; i < allBullets.length; i++) {
      if (i % 3 === 0) trends.push(allBullets[i]);
      else if (i % 3 === 1) contentStrategies.push(allBullets[i]);
      else audienceInsights.push(allBullets[i]);
    }
  }

  return {
    industry,
    trends: trends.slice(0, 8),
    contentStrategies: contentStrategies.slice(0, 8),
    audienceInsights: audienceInsights.slice(0, 6),
    topContentTypes: topContentTypes.slice(0, 6),
    statistics: statistics.slice(0, 8),
    regulations: regulations.slice(0, 5),
    seasonalPatterns: seasonalPatterns.slice(0, 6),
    localInsights: localInsights.slice(0, 6),
    sources: citations.slice(0, 10),
  };
}

function extractBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\-•*\d.)]+/, "").trim())
    .filter((line) => line.length > 15 && line.length < 600)
    .map((line) => {
      // Remove markdown bold markers
      return line.replace(/\*\*/g, "");
    });
}

// ---------------------------------------------------------------------------
// Combined Deep Research — runs all queries in parallel
// ---------------------------------------------------------------------------

export interface DeepResearchResult {
  reputation: BusinessReputation | null;
  industryIntel: IndustryIntelligence | null;
  perplexityAvailable: boolean;
}

export async function deepResearch(params: {
  businessName: string;
  industry: string;
  city: string;
  website: string;
}): Promise<DeepResearchResult> {
  const { businessName, industry, city, website } = params;
  const available = isPerplexityAvailable();

  if (!available) {
    return { reputation: null, industryIntel: null, perplexityAvailable: false };
  }

  // Run both in parallel for speed
  const [reputation, industryIntel] = await Promise.all([
    researchBusinessReputation(businessName, industry, city, website).catch(() => null),
    researchIndustry(industry, businessName).catch(() => null),
  ]);

  return { reputation, industryIntel, perplexityAvailable: true };
}
