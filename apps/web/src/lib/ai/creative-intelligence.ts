/**
 * Creative Intelligence Module — The Genius Brain of Compose
 *
 * This is what makes Compose extraordinary:
 * 1. Loads creative memory patterns (what worked, what failed)
 * 2. Generates creative ANGLES — not just content, but creative directions
 * 3. Suggests contrarian/unexpected approaches based on performance data
 * 4. Builds a "creative brief" that the AI uses to generate genius content
 */

import type { AIObjective } from "./governor";

export type Platform = "facebook" | "instagram" | "tiktok" | "youtube";

export interface CreativeMemoryInsight {
  hookType: string;
  framework: string;
  ctaType: string;
  memoryKey: string;
  sampleSize: number;
  successRate: number;
  avgEngagement: number;
  rank: "top" | "mid" | "low" | "untested";
}

export interface CreativeAngle {
  id: string;
  name: string;
  description: string;
  hookType: string;
  framework: string;
  ctaType: string;
  memoryKey: string;
  predictedScore: number;
  isContrarian: boolean;
  reasoning: string;
}

export interface CreativeBrief {
  angles: CreativeAngle[];
  topPerformers: CreativeMemoryInsight[];
  underexplored: CreativeMemoryInsight[];
  avoidPatterns: CreativeMemoryInsight[];
  platformTips: string[];
  creativeBriefPrompt: string;
}

interface MemoryRow {
  memory_key?: string;
  hook_type?: string;
  framework?: string;
  cta_type?: string;
  sample_size?: number;
  success_count?: number;
  avg_engagement?: number;
  total_engagement?: number;
}

const HOOK_TYPES = ["question", "interrupt", "list", "story", "educational", "statement"] as const;
const FRAMEWORKS = ["pas", "bab", "aida", "listicle", "story", "generic"] as const;
const CTA_TYPES = ["comment", "save", "share", "follow", "click", "none"] as const;

const HOOK_LABELS: Record<string, string> = {
  question: "Intrebare provocatoare",
  interrupt: "Pattern interrupt (STOP!)",
  list: "Lista cu cifre (Top 5...)",
  story: "Poveste personala",
  educational: "Educativ (Stiai ca...?)",
  statement: "Afirmatie puternica",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  pas: "PAS (Problema-Agitare-Solutie)",
  bab: "BAB (Before-After-Bridge)",
  aida: "AIDA (Atentie-Interes-Dorinta-Actiune)",
  listicle: "Listicle (Top N)",
  story: "Storytelling",
  generic: "Flow natural",
};

const CTA_LABELS: Record<string, string> = {
  comment: "CTA: Comenteaza",
  save: "CTA: Salveaza",
  share: "CTA: Distribuie",
  follow: "CTA: Urmareste",
  click: "CTA: Click/Link",
  none: "Fara CTA explicit",
};

const PLATFORM_CREATIVE_TIPS: Record<Platform, string[]> = {
  facebook: [
    "Conversatiile lungi in comentarii = boost organic masiv",
    "Postari cu intrebari polarizante au 3x reach",
    "Native video > link-uri externe, algoritmul penalizeaza link-urile",
    "First comment strategy: pune contextul extra in primul comentariu",
    "Dwell time e key — text lung cu line breaks imbunatateste retentia",
  ],
  instagram: [
    "Save-to-like ratio > 3% = semnal de continut exceptional",
    "Carousel-urile au 1.4x engagement vs single image",
    "Reel completion rate > 70% e pragul pentru viralitate",
    "Hook vizual in primele 0.5 secunde determina retentia",
    "Alt text optimizat imbunatateste reach-ul cu 10-15%",
  ],
  tiktok: [
    "Primele 100-500 views sunt testul algoritmului — retentia conteaza ENORM",
    "Completion rate e cel mai important metric, nu like-uri",
    "Hook in primele 1-2 secunde sau pierzi 80% din audienta",
    "Reply-urile la comentarii = content nou cu boost organic",
    "Trend sounds + continut original = combo imbatabil",
  ],
  youtube: [
    "CTR pe thumbnail + titlu determina 60% din succesul unui video",
    "Primele 30 secunde decid watch time-ul intreg",
    "Chapters (timestamp-uri) cresc retentia cu 20%+",
    "End screen + cards in ultimele 20 sec boost-uiesc sesiunea",
    "Consistency in upload schedule > viralitate random",
  ],
};

function toNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function rankInsight(insight: CreativeMemoryInsight): CreativeMemoryInsight["rank"] {
  if (insight.sampleSize < 3) return "untested";
  if (insight.successRate >= 0.6 && insight.avgEngagement >= 3) return "top";
  if (insight.successRate >= 0.35) return "mid";
  return "low";
}

export async function loadCreativeInsights(params: {
  supabase: any;
  organizationId: string;
  platform: Platform;
  objective: AIObjective;
}): Promise<CreativeMemoryInsight[]> {
  try {
    const { data, error } = await params.supabase
      .from("creative_memory")
      .select("memory_key,hook_type,framework,cta_type,sample_size,success_count,avg_engagement,total_engagement")
      .eq("organization_id", params.organizationId)
      .eq("platform", params.platform)
      .eq("objective", params.objective)
      .order("avg_engagement", { ascending: false })
      .limit(50);

    if (error || !Array.isArray(data)) return [];

    return (data as MemoryRow[])
      .filter((row) => row.memory_key)
      .map((row) => {
        const sampleSize = toNumber(row.sample_size);
        const successCount = toNumber(row.success_count);
        const avgEngagement = toNumber(row.avg_engagement);

        const insight: CreativeMemoryInsight = {
          hookType: row.hook_type || "unknown",
          framework: row.framework || "unknown",
          ctaType: row.cta_type || "none",
          memoryKey: row.memory_key!,
          sampleSize,
          successRate: sampleSize > 0 ? successCount / sampleSize : 0,
          avgEngagement,
          rank: "untested",
        };
        insight.rank = rankInsight(insight);
        return insight;
      });
  } catch {
    return [];
  }
}

function predictScore(
  hookType: string,
  framework: string,
  ctaType: string,
  insights: CreativeMemoryInsight[],
  objective: AIObjective
): number {
  const memoryKey = `${hookType}|${framework}|${ctaType}`;
  const exact = insights.find((i) => i.memoryKey === memoryKey);
  if (exact && exact.sampleSize >= 3) {
    return Math.round(50 + exact.successRate * 30 + Math.min(exact.avgEngagement * 3, 20));
  }

  // Partial match: same hook_type
  const hookMatches = insights.filter((i) => i.hookType === hookType && i.sampleSize >= 3);
  if (hookMatches.length > 0) {
    const avgSuccess = hookMatches.reduce((s, i) => s + i.successRate, 0) / hookMatches.length;
    const avgEng = hookMatches.reduce((s, i) => s + i.avgEngagement, 0) / hookMatches.length;
    return Math.round(45 + avgSuccess * 25 + Math.min(avgEng * 3, 20));
  }

  // Base scores per objective
  const baseScores: Record<string, number> = {
    question: 72,
    interrupt: 68,
    list: 70,
    story: 74,
    educational: 66,
    statement: 60,
  };

  let base = baseScores[hookType] || 60;

  // Objective bonuses
  if (objective === "engagement" && (ctaType === "comment" || hookType === "question")) base += 5;
  if (objective === "saves" && ctaType === "save") base += 6;
  if (objective === "leads" && ctaType === "click") base += 7;
  if (objective === "reach" && (hookType === "interrupt" || hookType === "list")) base += 4;

  return Math.min(95, base);
}

export function generateCreativeAngles(params: {
  input: string;
  platform: Platform;
  objective: AIObjective;
  insights: CreativeMemoryInsight[];
  tone?: string;
}): CreativeAngle[] {
  const { input, platform, objective, insights, tone } = params;
  const angles: CreativeAngle[] = [];

  const topPerformers = insights
    .filter((i) => i.rank === "top")
    .sort((a, b) => b.avgEngagement - a.avgEngagement);

  const underexplored = insights.filter((i) => i.rank === "untested" || i.sampleSize < 3);

  // Angle 1: Best performer — use what works
  if (topPerformers.length > 0) {
    const best = topPerformers[0];
    angles.push({
      id: "proven_winner",
      name: "Formula Castigatoare",
      description: `Bazat pe datele tale: ${HOOK_LABELS[best.hookType] || best.hookType} + ${FRAMEWORK_LABELS[best.framework] || best.framework} + ${CTA_LABELS[best.ctaType] || best.ctaType}. Aceasta combinatie a avut ${best.avgEngagement.toFixed(1)}% engagement mediu din ${best.sampleSize} postari.`,
      hookType: best.hookType,
      framework: best.framework,
      ctaType: best.ctaType,
      memoryKey: best.memoryKey,
      predictedScore: predictScore(best.hookType, best.framework, best.ctaType, insights, objective),
      isContrarian: false,
      reasoning: `Dovada din date: ${best.successRate * 100}% rata de succes, ${best.avgEngagement.toFixed(1)}% engagement mediu`,
    });
  }

  // Angle 2: Objective-optimized
  const objectiveAngle = buildObjectiveAngle(objective, insights, platform);
  if (objectiveAngle) {
    angles.push({
      ...objectiveAngle,
      predictedScore: predictScore(objectiveAngle.hookType, objectiveAngle.framework, objectiveAngle.ctaType, insights, objective),
    });
  }

  // Angle 3: Contrarian — do the opposite of what everyone expects
  const contrarianAngle = buildContrarianAngle(insights, platform, objective);
  if (contrarianAngle) {
    angles.push({
      ...contrarianAngle,
      predictedScore: predictScore(contrarianAngle.hookType, contrarianAngle.framework, contrarianAngle.ctaType, insights, objective),
    });
  }

  // Angle 4: Exploration — try something untested
  if (underexplored.length > 0) {
    const explore = underexplored[Math.floor(Math.random() * underexplored.length)];
    angles.push({
      id: "exploration",
      name: "Teritoriu Nou",
      description: `Combinatie netestat: ${HOOK_LABELS[explore.hookType] || explore.hookType} + ${FRAMEWORK_LABELS[explore.framework] || explore.framework}. Nu ai suficiente date — e momentul sa experimentezi.`,
      hookType: explore.hookType,
      framework: explore.framework,
      ctaType: explore.ctaType,
      memoryKey: explore.memoryKey,
      predictedScore: predictScore(explore.hookType, explore.framework, explore.ctaType, insights, objective),
      isContrarian: false,
      reasoning: "Exploration bonus: algoritmul UCB favorizeaza experimentarea pe combinatii netestate",
    });
  }

  // Angle 5: Platform-native genius
  const platformAngle = buildPlatformNativeAngle(platform, objective, insights);
  angles.push({
    ...platformAngle,
    predictedScore: predictScore(platformAngle.hookType, platformAngle.framework, platformAngle.ctaType, insights, objective),
  });

  // Sort by predicted score, but keep contrarian in the mix
  angles.sort((a, b) => {
    if (a.isContrarian && !b.isContrarian) return 1;
    if (!a.isContrarian && b.isContrarian) return -1;
    return b.predictedScore - a.predictedScore;
  });

  return angles.slice(0, 5);
}

function buildObjectiveAngle(
  objective: AIObjective,
  insights: CreativeMemoryInsight[],
  platform: Platform
): Omit<CreativeAngle, "predictedScore"> | null {
  const configs: Record<AIObjective, { hookType: string; framework: string; ctaType: string; name: string; desc: string }> = {
    engagement: {
      hookType: "question",
      framework: "pas",
      ctaType: "comment",
      name: "Magnet de Comentarii",
      desc: "Intrebare polarizanta + problema reala + CTA de comentariu. Formula care genereaza cele mai multe conversatii.",
    },
    reach: {
      hookType: "interrupt",
      framework: "aida",
      ctaType: "share",
      name: "Viralitate Calculata",
      desc: "Pattern interrupt puternic + AIDA + CTA de share. Conceput pentru maximum distribuiri si reach organic.",
    },
    leads: {
      hookType: "educational",
      framework: "pas",
      ctaType: "click",
      name: "Funnel Subtil",
      desc: "Educatie pe o problema reala + solutie + CTA de actiune. Construieste incredere si genereaza lead-uri calde.",
    },
    saves: {
      hookType: "list",
      framework: "listicle",
      ctaType: "save",
      name: "Salveaza pentru Mai Tarziu",
      desc: "Lista actionabila + framework listicle + CTA de save. Formatul cu cea mai mare rata de salvare.",
    },
  };

  const config = configs[objective];
  return {
    id: `objective_${objective}`,
    name: config.name,
    description: config.desc,
    hookType: config.hookType,
    framework: config.framework,
    ctaType: config.ctaType,
    memoryKey: `${config.hookType}|${config.framework}|${config.ctaType}`,
    isContrarian: false,
    reasoning: `Optimizat specific pentru obiectivul: ${objective}`,
  };
}

function buildContrarianAngle(
  insights: CreativeMemoryInsight[],
  platform: Platform,
  objective: AIObjective
): Omit<CreativeAngle, "predictedScore"> | null {
  // Find what everyone does (most common) and suggest the opposite
  const hookCounts = new Map<string, number>();
  for (const i of insights) {
    hookCounts.set(i.hookType, (hookCounts.get(i.hookType) || 0) + i.sampleSize);
  }

  const mostCommonHook = [...hookCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Pick the opposite hook
  const contrarianHooks: Record<string, string> = {
    question: "statement",
    statement: "story",
    list: "story",
    story: "interrupt",
    interrupt: "educational",
    educational: "question",
  };

  const contrarianHook = mostCommonHook
    ? (contrarianHooks[mostCommonHook] || "story")
    : "story";

  // Pick an uncommon framework
  const frameworkCounts = new Map<string, number>();
  for (const i of insights) {
    frameworkCounts.set(i.framework, (frameworkCounts.get(i.framework) || 0) + i.sampleSize);
  }

  const leastUsedFramework = [...frameworkCounts.entries()]
    .sort((a, b) => a[1] - b[1])[0]?.[0] || "bab";

  return {
    id: "contrarian",
    name: "Unghi Neasteptat",
    description: `Majoritatea postarilor tale folosesc ${HOOK_LABELS[mostCommonHook || "statement"] || "acelasi format"}. Aceasta varianta foloseste ${HOOK_LABELS[contrarianHook] || contrarianHook} + ${FRAMEWORK_LABELS[leastUsedFramework] || leastUsedFramework} — opusul a ceea ce faci de obicei. Surpriza creste retentia.`,
    hookType: contrarianHook,
    framework: leastUsedFramework,
    ctaType: objective === "leads" ? "click" : objective === "saves" ? "save" : "comment",
    memoryKey: `${contrarianHook}|${leastUsedFramework}|${objective === "leads" ? "click" : objective === "saves" ? "save" : "comment"}`,
    isContrarian: true,
    reasoning: `Contrarian strategy: audienta ta e obisnuita cu ${HOOK_LABELS[mostCommonHook || "statement"] || "un anumit stil"}. Schimbarea de format poate genera un spike de atentie.`,
  };
}

function buildPlatformNativeAngle(
  platform: Platform,
  objective: AIObjective,
  insights: CreativeMemoryInsight[]
): Omit<CreativeAngle, "predictedScore"> {
  const nativeConfigs: Record<Platform, { hookType: string; framework: string; ctaType: string; name: string; desc: string }> = {
    facebook: {
      hookType: "question",
      framework: "pas",
      ctaType: "comment",
      name: "Facebook Native: Conversatie",
      desc: "Algoritmul Facebook prioritizeaza meaningful conversations. Intrebare deschisa + problema relatabila + invitatie la dialog.",
    },
    instagram: {
      hookType: "list",
      framework: "listicle",
      ctaType: "save",
      name: "Instagram Native: Save-worthy",
      desc: "Save rate > 3% e semnalul #1 de calitate pe Instagram. Continut listicle cu valoare practica pe care oamenii il salveaza.",
    },
    tiktok: {
      hookType: "interrupt",
      framework: "story",
      ctaType: "comment",
      name: "TikTok Native: Hook + Story",
      desc: "Completion rate e totul pe TikTok. Hook vizual instant + poveste scurta + cliff la sfarsit pentru comentarii.",
    },
    youtube: {
      hookType: "educational",
      framework: "aida",
      ctaType: "click",
      name: "YouTube Native: CTR + Retentie",
      desc: "Thumbnail CTR + watch time = formula YouTube. Promisiune clara in titlu + livrare rapida + CTA mid-video.",
    },
  };

  const config = nativeConfigs[platform];
  return {
    id: `platform_native_${platform}`,
    name: config.name,
    description: config.desc,
    hookType: config.hookType,
    framework: config.framework,
    ctaType: config.ctaType,
    memoryKey: `${config.hookType}|${config.framework}|${config.ctaType}`,
    isContrarian: false,
    reasoning: `Optimizat nativ pentru algoritmul ${platform}`,
  };
}

export function buildCreativeBrief(params: {
  input: string;
  platform: Platform;
  objective: AIObjective;
  angles: CreativeAngle[];
  insights: CreativeMemoryInsight[];
  businessProfile?: {
    name?: string;
    description?: string;
    industry?: string;
    tones?: string[];
    targetAudience?: string;
    usps?: string[];
  };
}): CreativeBrief {
  const { input, platform, objective, angles, insights, businessProfile } = params;

  const topPerformers = insights.filter((i) => i.rank === "top").slice(0, 3);
  const underexplored = insights.filter((i) => i.rank === "untested").slice(0, 3);
  const avoidPatterns = insights.filter((i) => i.rank === "low" && i.sampleSize >= 5).slice(0, 3);
  const platformTips = PLATFORM_CREATIVE_TIPS[platform] || [];

  // Build the creative brief prompt that gets injected into AI generation
  const briefLines: string[] = [
    `# Creative Brief — ${platform.toUpperCase()} | Obiectiv: ${objective}`,
    "",
    `## Ideea originala`,
    input,
    "",
    `## Unghiuri creative disponibile (alege cel mai potrivit sau combina):`,
  ];

  for (const angle of angles) {
    briefLines.push(`### ${angle.name} (scor estimat: ${angle.predictedScore}/100${angle.isContrarian ? " — CONTRARIAN" : ""})`);
    briefLines.push(`- Hook: ${HOOK_LABELS[angle.hookType] || angle.hookType}`);
    briefLines.push(`- Framework: ${FRAMEWORK_LABELS[angle.framework] || angle.framework}`);
    briefLines.push(`- CTA: ${CTA_LABELS[angle.ctaType] || angle.ctaType}`);
    briefLines.push(`- Rationament: ${angle.reasoning}`);
    briefLines.push("");
  }

  if (topPerformers.length > 0) {
    briefLines.push("## Combinatii care au FUNCTIONAT pentru acest brand:");
    for (const p of topPerformers) {
      briefLines.push(`- ${p.memoryKey}: ${p.avgEngagement.toFixed(1)}% engagement, ${p.sampleSize} postari, ${(p.successRate * 100).toFixed(0)}% success`);
    }
    briefLines.push("");
  }

  if (avoidPatterns.length > 0) {
    briefLines.push("## EVITA aceste combinatii (performanta slaba dovedita):");
    for (const p of avoidPatterns) {
      briefLines.push(`- ${p.memoryKey}: doar ${p.avgEngagement.toFixed(1)}% engagement, ${(p.successRate * 100).toFixed(0)}% success`);
    }
    briefLines.push("");
  }

  briefLines.push(`## Sfaturi ${platform}:`);
  for (const tip of platformTips.slice(0, 3)) {
    briefLines.push(`- ${tip}`);
  }

  if (businessProfile) {
    briefLines.push("");
    briefLines.push("## Contextul brandului:");
    if (businessProfile.name) briefLines.push(`- Brand: ${businessProfile.name}`);
    if (businessProfile.industry) briefLines.push(`- Industrie: ${businessProfile.industry}`);
    if (businessProfile.targetAudience) briefLines.push(`- Audienta: ${businessProfile.targetAudience}`);
    if (businessProfile.usps?.length) briefLines.push(`- USP-uri: ${businessProfile.usps.join(", ")}`);
    if (businessProfile.tones?.length) briefLines.push(`- Tonuri: ${businessProfile.tones.join(", ")}`);
  }

  briefLines.push("");
  briefLines.push("## INSTRUCTIUNI FINALE:");
  briefLines.push("- Gandeste OUTSIDE THE BOX. Nu genera continut generic.");
  briefLines.push("- Foloseste datele de mai sus ca ghid, dar adauga un twist creativ unic.");
  briefLines.push("- Hook-ul trebuie sa fie IREZISTIBIL — primele 5 cuvinte decid totul.");
  briefLines.push("- CTA-ul trebuie sa fie natural, nu fortat.");
  briefLines.push("- Scrie ca un copywriter de top, nu ca un AI. Fii specific, nu vag.");
  briefLines.push("- Daca unghiul contrarian e relevant, INCEARCA-L. Surpriza captiveaza.");

  return {
    angles,
    topPerformers,
    underexplored,
    avoidPatterns,
    platformTips,
    creativeBriefPrompt: briefLines.join("\n"),
  };
}
