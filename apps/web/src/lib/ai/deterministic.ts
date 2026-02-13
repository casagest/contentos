import type {
  AlgorithmScore,
  AlgorithmScoreMetric,
  CoachResponse,
  ContentGenerationResult,
  ContentType,
  Platform,
  Post,
} from "@contentos/content-engine";

type CorePlatform = "facebook" | "instagram" | "tiktok" | "youtube";

const STOP_WORDS = new Set([
  "acest",
  "aceasta",
  "acele",
  "acolo",
  "adica",
  "aici",
  "atunci",
  "avem",
  "bine",
  "care",
  "cand",
  "ca",
  "cu",
  "cum",
  "de",
  "din",
  "doar",
  "fara",
  "foarte",
  "iar",
  "in",
  "la",
  "mai",
  "mult",
  "nu",
  "pe",
  "pentru",
  "si",
  "sunt",
  "sau",
  "tot",
  "the",
  "this",
  "that",
  "with",
  "from",
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function firstSentence(text: string): string {
  const sentence = splitSentences(text)[0] || normalizeWhitespace(text);
  return sentence.slice(0, 220);
}

function containsCta(text: string): boolean {
  return /(comenteaza|scrie|trimite|salveaza|distribuie|urmareste|intra|click|abon|follow)/i.test(
    text
  );
}

function hashtagCount(text: string): number {
  const matches = text.match(/#([\p{L}\p{N}_]{2,30})/gu);
  return matches ? matches.length : 0;
}

function extractKeywords(text: string, limit = 10): string[] {
  const words = (text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).filter(
    (word) => !STOP_WORDS.has(word)
  );

  const frequencies = new Map<string, number>();
  for (const word of words) {
    frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }

  return [...frequencies.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

function toHashtags(keywords: string[], limit: number): string[] {
  return keywords
    .slice(0, limit)
    .map((keyword) => `#${keyword.replace(/[^\p{L}\p{N}_]+/gu, "")}`)
    .filter((value) => value.length > 2);
}

function scoreByRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 92;
  const lowerDelta = value < min ? min - value : 0;
  const upperDelta = value > max ? value - max : 0;
  const penalty = lowerDelta * 0.07 + upperDelta * 0.05;
  return clamp(Math.round(92 - penalty), 20, 90);
}

function scoreToGrade(score: number): AlgorithmScore["grade"] {
  if (score >= 95) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function engagementLabel(score: number): "Low" | "Medium" | "High" | "Viral Potential" {
  if (score >= 90) return "Viral Potential";
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function detectFramework(input: string): "AIDA" | "PAS" | "BAB" | "Story" | "List" {
  const text = input.toLowerCase();

  if (/(problema|durere|frustr|stres|blocaj)/i.test(text)) return "PAS";
  if (/(inainte|dupa|transform|rezultat)/i.test(text)) return "BAB";
  if (/\b\d+\b/.test(text) || /(top|lista|pas|sfat)/i.test(text)) return "List";
  if (/(poveste|azi|am invatat|experienta|mi s-a intamplat)/i.test(text)) return "Story";
  return "AIDA";
}

function buildHook(coreIdea: string, framework: string, language: "ro" | "en"): string {
  if (language === "en") {
    switch (framework) {
      case "PAS":
        return `Most people struggle with this: ${coreIdea}`;
      case "BAB":
        return `Before vs after: ${coreIdea}`;
      case "List":
        return `3 things you should know about ${coreIdea}`;
      case "Story":
        return `Quick story: ${coreIdea}`;
      default:
        return `Stop scrolling. ${coreIdea}`;
    }
  }

  switch (framework) {
    case "PAS":
      return `Multi se lovesc de aceeasi problema: ${coreIdea}`;
    case "BAB":
      return `Inainte vs dupa: ${coreIdea}`;
    case "List":
      return `3 lucruri utile despre ${coreIdea}`;
    case "Story":
      return `Poveste scurta: ${coreIdea}`;
    default:
      return `Stop scroll. ${coreIdea}`;
  }
}

function platformLengthRange(platform: Platform): { min: number; max: number } {
  switch (platform) {
    case "facebook":
      return { min: 280, max: 1600 };
    case "instagram":
      return { min: 180, max: 2200 };
    case "tiktok":
      return { min: 90, max: 900 };
    case "youtube":
      return { min: 400, max: 5000 };
    case "twitter":
      return { min: 80, max: 280 };
    default:
      return { min: 120, max: 1200 };
  }
}

function hashtagTarget(platform: Platform): { min: number; max: number } {
  switch (platform) {
    case "facebook":
      return { min: 2, max: 5 };
    case "instagram":
      return { min: 8, max: 24 };
    case "tiktok":
      return { min: 3, max: 8 };
    case "youtube":
      return { min: 3, max: 12 };
    case "twitter":
      return { min: 1, max: 3 };
    default:
      return { min: 2, max: 8 };
  }
}

function buildMetric(
  name: string,
  score: number,
  explanation: string,
  suggestion?: string,
  weight = 1
): AlgorithmScoreMetric {
  return {
    name,
    score: clamp(Math.round(score), 0, 100),
    weight,
    explanation,
    suggestion,
  };
}

export function buildDeterministicScore(params: {
  content: string;
  platform: Platform;
  contentType: ContentType;
}): AlgorithmScore {
  const content = normalizeWhitespace(params.content);
  const sentences = splitSentences(content);
  const paragraphs = splitParagraphs(params.content);
  const words = content.split(/\s+/).filter(Boolean);
  const firstLine = firstSentence(content);
  const framework = detectFramework(content);
  const ctaPresent = containsCta(content);
  const hashtags = hashtagCount(content);
  const numbers = (content.match(/\b\d+\b/g) || []).length;

  const hookScore = /\?|!|\b(cum|de ce|why|how|stop)\b/i.test(firstLine)
    ? 88
    : firstLine.length > 45
      ? 74
      : 58;

  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const readabilityScore = clamp(95 - (avgWordsPerSentence - 16) * 3.2, 35, 95);

  const structureScore = paragraphs.length >= 2 ? 90 : 62;
  const ctaScore = ctaPresent ? 90 : 45;

  const lengthRange = platformLengthRange(params.platform);
  const lengthScore = scoreByRange(content.length, lengthRange.min, lengthRange.max);

  const hashtagRange = hashtagTarget(params.platform);
  const hashtagScore = scoreByRange(hashtags, hashtagRange.min, hashtagRange.max);

  const emotionalScore = /(nou|transform|rezultat|rapid|clar|fara|simplu|real|urgent)/i.test(content)
    ? 82
    : 60;
  const specificityScore = clamp(55 + numbers * 9, 45, 92);
  const frameworkScore = framework === "AIDA" || framework === "PAS" || framework === "BAB" ? 84 : 76;

  const metrics: AlgorithmScoreMetric[] = [
    buildMetric("Hook strength", hookScore, "Primele caractere trebuie sa opreasca scroll-ul.", "Deschide cu intrebare sau afirmatie puternica."),
    buildMetric("Readability", readabilityScore, "Fraze clare si usor de parcurs.", "Mentine 12-20 cuvinte per fraza."),
    buildMetric("Structure", structureScore, "Paragrafele scurte cresc retentia.", "Imparte ideea in 2-4 blocuri."),
    buildMetric("CTA clarity", ctaScore, "Fara CTA rata de comentarii scade.", "Inchide cu o actiune concreta."),
    buildMetric("Length fit", lengthScore, `Lungimea este calibrata pentru ${params.platform}.`, "Ajusteaza lungimea la platforma tinta."),
    buildMetric("Hashtag strategy", hashtagScore, "Numarul de hashtag-uri influenteaza reach-ul.", "Foloseste hashtag-uri relevante, nu liste lungi."),
    buildMetric("Emotional pull", emotionalScore, "Emotia sustine distribuirea.", "Adauga beneficii clare pentru audienta."),
    buildMetric("Specificity", specificityScore, "Exemplele si cifrele cresc increderea.", "Adauga exemple concrete sau mini-caz."),
    buildMetric("Creative framework", frameworkScore, "Mesajul are structura de copywriting.", "Aplica explicit un framework (AIDA/PAS/BAB)."),
  ];

  const weighted = metrics.reduce((sum, metric) => sum + metric.score * metric.weight, 0);
  const weightSum = metrics.reduce((sum, metric) => sum + metric.weight, 0) || 1;
  const overall = clamp(Math.round(weighted / weightSum), 0, 100);

  const improvements = metrics
    .filter((metric) => metric.score < 70)
    .slice(0, 5)
    .map((metric) => metric.suggestion || `Imbunatateste metrica ${metric.name}.`);

  return {
    platform: params.platform,
    overallScore: overall,
    grade: scoreToGrade(overall),
    metrics,
    summary:
      overall >= 80
        ? "Continut bun pentru publicare; are structura si intentie clara."
        : "Continutul are potential, dar mai are nevoie de ajustari pentru performanta constanta.",
    improvements:
      improvements.length > 0
        ? improvements
        : ["Testeaza doua variante de hook inainte de publicare."],
    alternativeVersions: [
      `${firstLine}\n\n${ctaPresent ? "Pastreaza" : "Adauga"} un CTA orientat pe comentarii.`,
    ],
  };
}

function pickContentType(platform: CorePlatform): ContentType {
  switch (platform) {
    case "instagram":
      return "carousel";
    case "tiktok":
      return "reel";
    case "youtube":
      return "video";
    default:
      return "text";
  }
}

function buildFacebookText(coreIdea: string, hook: string, cta: string): string {
  return `${hook}\n\nIdeea-cheie: ${coreIdea}.\n\nCe poti aplica rapid:\n- clarifica beneficiul principal\n- pastreaza mesajul simplu\n- cere feedback direct\n\n${cta}`;
}

function buildInstagramText(coreIdea: string, hook: string, cta: string, includeEmoji: boolean): string {
  const emoji = includeEmoji ? "\n\n?" : "\n\n";
  return `${hook}${emoji} ${coreIdea}\n\nFormat recomandat:\n1) Hook\n2) Valoare concreta\n3) CTA\n\n${cta}`;
}

function buildTikTokScript(coreIdea: string, hook: string, cta: string): { hook: string; script: string } {
  return {
    hook,
    script: `Cadru 1 (0-3s): spune problema pe scurt.\nCadru 2 (3-20s): explica ideea ${coreIdea}.\nCadru 3 (20-35s): da exemplu concret.\nCadru 4 (35-45s): ${cta}`,
  };
}

function buildYoutubeTitle(coreIdea: string): string {
  const cleaned = coreIdea.replace(/[.!?]+$/g, "");
  return `Ce functioneaza acum: ${cleaned}`.slice(0, 95);
}

function buildYoutubeDescription(coreIdea: string, cta: string): string {
  return `In acest material discutam practic despre: ${coreIdea}.\n\nCapitole:\n00:00 Hook\n00:20 Context\n01:20 Solutie aplicabila\n02:30 Recap\n\n${cta}`;
}

function buildIdeas(input: string): { keyIdeas: string[]; suggestedTopics: string[]; coreIdea: string; framework: string } {
  const normalized = normalizeWhitespace(input);
  const keywords = extractKeywords(normalized, 8);
  const coreIdea = firstSentence(normalized) || "Mesaj clar pentru audienta";
  const framework = detectFramework(normalized);

  return {
    coreIdea,
    framework,
    keyIdeas: keywords.slice(0, 5),
    suggestedTopics: keywords.slice(0, 6).map((keyword) => `Unghi practic: ${keyword}`),
  };
}

export function buildDeterministicGeneration(params: {
  input: string;
  targetPlatforms: Platform[];
  tone?: string;
  includeHashtags?: boolean;
  includeEmoji?: boolean;
  language?: "ro" | "en";
}): ContentGenerationResult {
  const ideas = buildIdeas(params.input);
  const hook = buildHook(ideas.coreIdea, ideas.framework, params.language === "en" ? "en" : "ro");

  const platformVersions = {} as ContentGenerationResult["platformVersions"];

  for (const platform of params.targetPlatforms) {
    if (!["facebook", "instagram", "tiktok", "youtube"].includes(platform)) continue;

    const corePlatform = platform as CorePlatform;
    const cta = params.language === "en" ? "Tell me your opinion in comments." : "Scrie in comentarii ce ai testa prima data.";

    let text = "";
    let hashtags: string[] = [];

    if (corePlatform === "facebook") {
      text = buildFacebookText(ideas.coreIdea, hook, cta);
      hashtags = params.includeHashtags === false ? [] : toHashtags(ideas.keyIdeas, 5);
    }

    if (corePlatform === "instagram") {
      text = buildInstagramText(ideas.coreIdea, hook, cta, params.includeEmoji !== false);
      hashtags = params.includeHashtags === false ? [] : toHashtags(ideas.keyIdeas, 12);
    }

    if (corePlatform === "tiktok") {
      const tiktok = buildTikTokScript(ideas.coreIdea, hook, cta);
      text = `${tiktok.hook}\n\n${tiktok.script}`;
      hashtags = params.includeHashtags === false ? [] : toHashtags(ideas.keyIdeas, 8);
    }

    if (corePlatform === "youtube") {
      const title = buildYoutubeTitle(ideas.coreIdea);
      const description = buildYoutubeDescription(ideas.coreIdea, cta);
      text = `${title}\n\n${description}`;
      hashtags = params.includeHashtags === false ? [] : toHashtags(ideas.keyIdeas, 10);
    }

    const score = buildDeterministicScore({
      content: text,
      platform,
      contentType: pickContentType(corePlatform),
    });

    platformVersions[platform] = {
      text,
      hashtags,
      contentType: pickContentType(corePlatform),
      algorithmScore: score,
      alternativeVersions: [
        `${hook}\n\n${ideas.coreIdea}\n\n${cta}`,
        `${ideas.coreIdea}\n\n${cta}`,
      ],
    };
  }

  return {
    platformVersions,
    keyIdeas: ideas.keyIdeas,
    suggestedTopics: ideas.suggestedTopics,
  };
}

export function buildDeterministicCoach(params: {
  question: string;
  platform?: Platform;
  recentPosts: Post[];
  topPosts: Post[];
}): CoachResponse {
  const platformLabel = params.platform || "toate platformele";
  const avgEngagement = average(params.recentPosts.map((post) => post.engagementRate || 0));
  const bestPost = params.topPosts[0] || params.recentPosts[0];

  const bestPostContext = bestPost
    ? `Cel mai bun exemplu recent: ${bestPost.contentType} cu engagement ${bestPost.engagementRate.toFixed(2)}%.`
    : "Nu exista suficiente postari istorice pentru benchmark solid.";

  const answer = [
    `Plan rapid pentru intrebarea ta (${platformLabel}):`,
    `1) Clarifica un singur obiectiv per postare (comentarii, click sau salvare).`,
    `2) Testeaza 2 hook-uri diferite pe acelasi subiect in 7 zile.`,
    `3) Pastreaza structura Hook -> Valoare -> CTA in fiecare postare.`,
    `Metric curent de referinta: engagement mediu ${avgEngagement.toFixed(2)}%.`,
    bestPostContext,
  ].join("\n");

  return {
    answer,
    actionItems: [
      "Creeaza 3 postari cu acelasi subiect, dar hook diferit.",
      "Masoara comentarii/salvari la 24h si 72h.",
      "Pune CTA explicit in ultimele 2 randuri.",
      "Consolideaza tonul brandului in primele 120 de caractere.",
    ],
    dataReferences: (params.topPosts.length ? params.topPosts : params.recentPosts)
      .slice(0, 3)
      .map((post) => ({ postId: post.id, relevance: "performance_reference" })),
  };
}

type FacebookResult = {
  content: string;
  hashtags: string[];
  estimatedEngagement: "Low" | "Medium" | "High" | "Viral Potential";
  tips: string[];
};

type InstagramResult = {
  caption: string;
  hashtags: string[];
  altText: string;
  bestTimeToPost: string;
  tips: string[];
};

type TikTokResult = {
  hook: string;
  script: string;
  hashtags: string[];
  soundSuggestion: string;
  tips: string[];
};

type YouTubeResult = {
  title: string;
  description: string;
  tags: string[];
  thumbnailIdea: string;
  tips: string[];
};

type DeterministicBrainDumpResponse = {
  platforms: {
    facebook?: FacebookResult;
    instagram?: InstagramResult;
    tiktok?: TikTokResult;
    youtube?: YouTubeResult;
  };
  meta: {
    mode: "deterministic";
    framework: string;
    warning?: string;
  };
};

export function buildDeterministicBrainDump(params: {
  rawInput: string;
  platforms: CorePlatform[];
  language?: "ro" | "en";
  warning?: string;
}): DeterministicBrainDumpResponse {
  const ideas = buildIdeas(params.rawInput);
  const language = params.language === "en" ? "en" : "ro";
  const hook = buildHook(ideas.coreIdea, ideas.framework, language);
  const cta = language === "en" ? "Share your perspective in comments." : "Lasa un comentariu cu ce ai aplica prima data.";

  const platforms: DeterministicBrainDumpResponse["platforms"] = {};

  if (params.platforms.includes("facebook")) {
    const content = buildFacebookText(ideas.coreIdea, hook, cta);
    const score = buildDeterministicScore({ content, platform: "facebook", contentType: "text" });

    platforms.facebook = {
      content,
      hashtags: toHashtags(ideas.keyIdeas, 5),
      estimatedEngagement: engagementLabel(score.overallScore),
      tips: [
        "Publica intre 09:00-11:00 sau 18:00-20:00 pentru reach mai bun.",
        "Raspunde la primele comentarii in primele 30 de minute.",
      ],
    };
  }

  if (params.platforms.includes("instagram")) {
    const caption = buildInstagramText(ideas.coreIdea, hook, cta, true);

    platforms.instagram = {
      caption,
      hashtags: toHashtags(ideas.keyIdeas, 15),
      altText: `Imagine sugerata: ${ideas.coreIdea}`,
      bestTimeToPost: "19:00",
      tips: [
        "Pastreaza hook-ul in primul rand al caption-ului.",
        "Combinatia Reels + carousel creste consistenta engagement-ului.",
      ],
    };
  }

  if (params.platforms.includes("tiktok")) {
    const tiktok = buildTikTokScript(ideas.coreIdea, hook, cta);

    platforms.tiktok = {
      hook: tiktok.hook,
      script: tiktok.script,
      hashtags: toHashtags(ideas.keyIdeas, 7),
      soundSuggestion: "Sunet trend cu beat clar si intro rapid.",
      tips: [
        "Arata rezultatul final in primele 2 secunde.",
        "Foloseste subtitrari mari pentru retentie.",
      ],
    };
  }

  if (params.platforms.includes("youtube")) {
    const title = buildYoutubeTitle(ideas.coreIdea);
    const description = buildYoutubeDescription(ideas.coreIdea, cta);

    platforms.youtube = {
      title,
      description,
      tags: toHashtags(ideas.keyIdeas, 10).map((tag) => tag.replace(/^#/, "")),
      thumbnailIdea: `Contrast mare + text scurt: "${ideas.keyIdeas[0] || "Strategie"}"`,
      tips: [
        "Pastreaza promisiunea din titlu in primele 20 secunde.",
        "Include 1 CTA pentru abonare si 1 CTA pentru comentariu.",
      ],
    };
  }

  return {
    platforms,
    meta: {
      mode: "deterministic",
      framework: ideas.framework,
      warning: params.warning,
    },
  };
}
