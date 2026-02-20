/**
 * AI Humanization Engine — ContentOS
 *
 * Detects AI-isms, measures burstiness (sentence length variance),
 * and estimates entropy (vocabulary diversity) to score how "human"
 * a piece of content reads.
 *
 * Used by deterministic score + AI score to add a "Naturalness" metric.
 */

/* ─── AI-ism Ban List ─── */

/**
 * Phrases that AI models overuse and human writers rarely use.
 * Split into RO (Romanian) and EN (English) for bilingual detection.
 * Each entry: [regex pattern, severity 1-3, replacement suggestion]
 */
// Note: \b doesn't work with Unicode/diacritics in JS — use (?<!\p{L}) and (?!\p{L}) as word boundaries
const B = "(?<!\\p{L})"; // Unicode-safe word boundary start
const E = "(?!\\p{L})";  // Unicode-safe word boundary end
const u = "giu"; // flags: global, case-insensitive, unicode

const AI_ISMS_RO: [RegExp, number, string][] = [
  [new RegExp(`${B}în concluzie${E}`, u), 3, "Pe scurt"],
  [new RegExp(`${B}este important de menționat${E}`, u), 3, ""],
  [new RegExp(`${B}mai mult decât atât${E}`, u), 2, "Și"],
  [new RegExp(`${B}haideți să explorăm${E}`, u), 3, ""],
  [new RegExp(`${B}haideți să descoperim${E}`, u), 3, ""],
  [new RegExp(`${B}în era digitală${E}`, u), 3, ""],
  [new RegExp(`${B}peisajul digital${E}`, u), 3, ""],
  [new RegExp(`${B}nu este un secret${E}`, u), 2, ""],
  [new RegExp(`${B}fără îndoială${E}`, u), 2, "Clar"],
  [new RegExp(`${B}merită menționat${E}`, u), 2, ""],
  [new RegExp(`${B}este important să subliniem${E}`, u), 3, ""],
  [new RegExp(`${B}într-o lume în continuă schimbare${E}`, u), 3, ""],
  [new RegExp(`${B}este un pas esențial${E}`, u), 2, ""],
  [new RegExp(`${B}în cele din urmă${E}`, u), 2, "Până la urmă"],
  [new RegExp(`${B}nu în ultimul rând${E}`, u), 2, "Și"],
  [new RegExp(`${B}putem afirma cu certitudine${E}`, u), 3, ""],
  [new RegExp(`${B}este esențial să${E}`, u), 2, "Trebuie să"],
  [new RegExp(`${B}trebuie să recunoaștem${E}`, u), 2, ""],
  [new RegExp(`${B}în acest context${E}`, u), 2, "Aici"],
  [new RegExp(`${B}reprezintă un aspect fundamental${E}`, u), 3, "e important"],
  [new RegExp(`${B}prin urmare${E}`, u), 1, "Deci"],
  [new RegExp(`${B}aspecte esențiale${E}`, u), 2, "lucruri importante"],
  [new RegExp(`${B}un rol crucial${E}`, u), 2, "contează mult"],
  [new RegExp(`${B}joacă un rol${E}`, u), 1, "contează"],
  [new RegExp(`${B}nu putem ignora${E}`, u), 2, ""],
  [new RegExp(`${B}se remarcă prin${E}`, u), 2, "e special prin"],
  [new RegExp(`${B}componentă esențială${E}`, u), 2, "parte importantă"],
  [new RegExp(`${B}strategii eficiente${E}`, u), 2, "ce funcționează"],
  [new RegExp(`${B}abordare holistică${E}`, u), 3, "privire completă"],
];

const AI_ISMS_EN: [RegExp, number, string][] = [
  [/\bin conclusion\b/gi, 3, "So"],
  [/\bit'?s worth noting\b/gi, 3, ""],
  [/\bfurthermore\b/gi, 2, "Also"],
  [/\bmoreover\b/gi, 2, "Plus"],
  [/\blet'?s delve\b/gi, 3, ""],
  [/\blet'?s explore\b/gi, 3, ""],
  [/\bin today'?s digital landscape\b/gi, 3, ""],
  [/\bdigital landscape\b/gi, 3, "online world"],
  [/\bin the realm of\b/gi, 3, "in"],
  [/\bnavigating the\b/gi, 2, "dealing with"],
  [/\beverchanging\b/gi, 2, "fast-moving"],
  [/\bunleash\b/gi, 2, "use"],
  [/\bgame.?changer\b/gi, 2, "big deal"],
  [/\bleverage\b/gi, 1, "use"],
  [/\bsynergy\b/gi, 2, "teamwork"],
  [/\bholistic approach\b/gi, 3, "full picture"],
  [/\bparadigm shift\b/gi, 3, "big change"],
  [/\bseamless(?:ly)?\b/gi, 2, "smooth"],
  [/\brobust\b/gi, 1, "strong"],
  [/\bcutting.?edge\b/gi, 2, "latest"],
  [/\bwithout further ado\b/gi, 2, ""],
  [/\bnot only.{0,20}but also\b/gi, 2, "and"],
  [/\bit goes without saying\b/gi, 2, "Obviously"],
  [/\bplays a crucial role\b/gi, 2, "matters a lot"],
  [/\bfundamental aspect\b/gi, 2, "key part"],
];

export const AI_ISMS = [...AI_ISMS_RO, ...AI_ISMS_EN];

export interface AiIsmMatch {
  phrase: string;
  severity: number;
  suggestion: string;
  index: number;
}

/**
 * Scan text for AI-ism phrases. Returns matches with positions.
 */
export function detectAiIsms(text: string): AiIsmMatch[] {
  const matches: AiIsmMatch[] = [];
  for (const [pattern, severity, suggestion] of AI_ISMS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        phrase: match[0],
        severity,
        suggestion,
        index: match.index,
      });
    }
  }
  return matches.sort((a, b) => b.severity - a.severity);
}

/**
 * Auto-clean: replace AI-isms with suggestions (or remove them).
 */
export function cleanAiIsms(text: string): { cleaned: string; replacements: number } {
  let cleaned = text;
  let replacements = 0;
  for (const [pattern, , suggestion] of AI_ISMS) {
    const before = cleaned;
    cleaned = cleaned.replace(pattern, suggestion);
    if (cleaned !== before) replacements++;
  }
  // Clean up double spaces from removals
  cleaned = cleaned.replace(/ {2,}/g, " ").replace(/\n {1,}\n/g, "\n\n").trim();
  return { cleaned, replacements };
}

/* ─── Burstiness Analysis ─── */

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

export interface BurstinessResult {
  /** 0-100: higher = more human-like variance */
  score: number;
  /** Average sentence length in words */
  avgLength: number;
  /** Standard deviation of sentence lengths */
  stdDev: number;
  /** Coefficient of variation (stdDev / mean) */
  cv: number;
  /** Sentence lengths array */
  lengths: number[];
  /** Whether consecutive sentences have too-similar lengths */
  monotoneStreaks: number;
  feedback: string;
}

/**
 * Measure sentence length variance (burstiness).
 * AI text: CV < 0.3 (uniform). Human text: CV > 0.5 (bursty).
 */
export function analyzeBurstiness(text: string): BurstinessResult {
  const sentences = splitIntoSentences(text);
  if (sentences.length < 3) {
    return {
      score: 50,
      avgLength: 0,
      stdDev: 0,
      cv: 0,
      lengths: [],
      monotoneStreaks: 0,
      feedback: "Text prea scurt pentru analiză de burstiness.",
    };
  }

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / lengths.length;
  const stdDev = Math.sqrt(variance);
  const cv = avg > 0 ? stdDev / avg : 0;

  // Count monotone streaks: 3+ consecutive sentences within ±2 words
  let monotoneStreaks = 0;
  let streak = 1;
  for (let i = 1; i < lengths.length; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= 2) {
      streak++;
      if (streak >= 3) monotoneStreaks++;
    } else {
      streak = 1;
    }
  }

  // Score: CV 0.0 → 20pts, CV 0.3 → 50pts, CV 0.6+ → 90pts
  // Penalize monotone streaks
  let score: number;
  if (cv >= 0.6) score = 90 + Math.min(cv - 0.6, 0.4) * 25;
  else if (cv >= 0.3) score = 50 + ((cv - 0.3) / 0.3) * 40;
  else score = 20 + (cv / 0.3) * 30;

  score -= monotoneStreaks * 8;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let feedback: string;
  if (score >= 75) {
    feedback = "Variație naturală — textul sună uman.";
  } else if (score >= 50) {
    feedback = "Variație medie — alternează propoziții scurte (3-5 cuv.) cu fraze lungi (15-20 cuv.).";
  } else {
    feedback = "Propoziții prea uniforme — tipic AI. Sparge ritmul: o frază scurtă. Apoi una mai lungă, cu detalii.";
  }

  return { score, avgLength: Math.round(avg * 10) / 10, stdDev: Math.round(stdDev * 10) / 10, cv: Math.round(cv * 100) / 100, lengths, monotoneStreaks, feedback };
}

/* ─── Entropy / Vocabulary Diversity ─── */

export interface EntropyResult {
  /** 0-100: higher = more diverse vocabulary = more human */
  score: number;
  /** Unique words / total words ratio */
  typeTokenRatio: number;
  /** Hapax legomena ratio (words appearing once / total unique) */
  hapaxRatio: number;
  /** Repeated phrase patterns detected */
  repeatedPatterns: string[];
  feedback: string;
}

/**
 * Estimate vocabulary entropy / diversity.
 * AI text: low TTR, few hapax. Human text: high TTR, many unique words.
 */
export function analyzeEntropy(text: string): EntropyResult {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length < 10) {
    return {
      score: 50,
      typeTokenRatio: 0,
      hapaxRatio: 0,
      repeatedPatterns: [],
      feedback: "Text prea scurt pentru analiză de entropie.",
    };
  }

  // Type-Token Ratio (adjusted for length — longer texts naturally have lower TTR)
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);

  const uniqueCount = freq.size;
  const rawTTR = uniqueCount / words.length;
  // Root TTR (Guiraud's index) — normalizes for text length
  const guiraud = uniqueCount / Math.sqrt(words.length);

  // Hapax legomena — words appearing exactly once (marker of creativity)
  const hapaxCount = [...freq.values()].filter((c) => c === 1).length;
  const hapaxRatio = hapaxCount / uniqueCount;

  // Detect repeated 3-gram patterns (AI tends to reuse phrase structures)
  const trigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 2; i++) {
    const tri = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
  }
  const repeatedPatterns = [...trigrams.entries()]
    .filter(([, count]) => count >= 2)
    .map(([tri]) => tri)
    .slice(0, 5);

  // Score: Guiraud < 4 → low diversity, 4-7 → normal, 7+ → high
  // Hapax ratio boost: >0.5 is very human
  let score: number;
  if (guiraud >= 7) score = 85 + Math.min((guiraud - 7) * 3, 15);
  else if (guiraud >= 4) score = 50 + ((guiraud - 4) / 3) * 35;
  else score = 15 + (guiraud / 4) * 35;

  if (hapaxRatio > 0.6) score += 10;
  else if (hapaxRatio < 0.3) score -= 10;

  score -= repeatedPatterns.length * 5;
  score = Math.max(10, Math.min(100, Math.round(score)));

  let feedback: string;
  if (score >= 75) {
    feedback = "Vocabular divers și natural — amprenta umană puternică.";
  } else if (score >= 50) {
    feedback = "Diversitate medie — înlocuiește cuvintele repetate cu sinonime sau expresii colocviale.";
  } else {
    feedback = "Vocabular repetitiv, tipic AI — folosește cuvinte neașteptate, argou, expresii regionale.";
  }

  return {
    score,
    typeTokenRatio: Math.round(rawTTR * 100) / 100,
    hapaxRatio: Math.round(hapaxRatio * 100) / 100,
    repeatedPatterns,
    feedback,
  };
}

/* ─── Combined Humanness Score ─── */

export interface HumannessReport {
  /** 0-100 overall humanness score */
  overallScore: number;
  aiIsms: AiIsmMatch[];
  aiIsmScore: number;
  burstiness: BurstinessResult;
  entropy: EntropyResult;
  /** Actionable suggestions sorted by impact */
  suggestions: string[];
}

/**
 * Full humanness analysis combining all three dimensions.
 * Weights: AI-isms 30%, Burstiness 35%, Entropy 35%
 */
export function analyzeHumanness(text: string): HumannessReport {
  const aiIsms = detectAiIsms(text);
  const burstiness = analyzeBurstiness(text);
  const entropy = analyzeEntropy(text);

  // AI-ism score: starts at 100, loses points per match
  const aiIsmPenalty = aiIsms.reduce((sum, m) => sum + m.severity * 12, 0);
  const aiIsmScore = Math.max(10, 100 - aiIsmPenalty);

  // Weighted overall
  const overallScore = Math.round(
    aiIsmScore * 0.3 + burstiness.score * 0.35 + entropy.score * 0.35
  );

  // Build actionable suggestions
  const suggestions: string[] = [];

  if (aiIsms.length > 0) {
    const worst = aiIsms.slice(0, 3);
    for (const m of worst) {
      if (m.suggestion) {
        suggestions.push(`Înlocuiește "${m.phrase}" cu "${m.suggestion}" (sau șterge complet).`);
      } else {
        suggestions.push(`Elimină "${m.phrase}" — formulare tipic AI.`);
      }
    }
  }

  if (burstiness.score < 60) {
    suggestions.push(burstiness.feedback);
  }

  if (burstiness.monotoneStreaks > 0) {
    suggestions.push(`Sparge ${burstiness.monotoneStreaks} secvență/e de propoziții cu lungimi similare.`);
  }

  if (entropy.score < 60) {
    suggestions.push(entropy.feedback);
  }

  if (entropy.repeatedPatterns.length > 0) {
    suggestions.push(
      `Fraze repetate detectate: "${entropy.repeatedPatterns[0]}" — reformulează una din apariții.`
    );
  }

  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    aiIsms,
    aiIsmScore,
    burstiness,
    entropy,
    suggestions,
  };
}
