/**
 * Voice DNA — Extract writing patterns from user's past content.
 *
 * Analyzes a corpus of the user's posts to create a statistical
 * fingerprint of their writing style. This fingerprint is used
 * to condition AI generation prompts for authentic voice match.
 */

/* ─── Types ─── */

export interface VoiceDNA {
  /** Sentence length: mean in words */
  sentenceLengthMean: number;
  /** Sentence length: standard deviation */
  sentenceLengthStdDev: number;
  /** Average emoji count per post */
  emojiFrequency: number;
  /** Average hashtag count per post */
  hashtagFrequency: number;
  /** Formality level 1-10 (1=very casual, 10=very formal) */
  formalityLevel: number;
  /** Detected verbal tics (Romanian-specific patterns) */
  verbalTics: string[];
  /** Preferred post structure pattern */
  preferredStructure: "hook-story-cta" | "question-list-opinion" | "statement-proof-ask" | "mixed";
  /** Vocabulary complexity (simple/moderate/complex) */
  vocabularyLevel: "simple" | "moderate" | "complex";
  /** Average post length in characters */
  avgPostLength: number;
  /** Uses questions frequently? */
  questionFrequency: number;
  /** Exclamation frequency per post */
  exclamationFrequency: number;
  /** Number of posts analyzed */
  sampleSize: number;
  /** When this DNA was last computed */
  computedAt: string;
}

/* ─── Romanian Verbal Tics ─── */

const VERBAL_TIC_PATTERNS: [RegExp, string][] = [
  [/\bdeci\b/giu, "deci"],
  [/\bsincer\b/giu, "sincer"],
  [/\bpractic\b/giu, "practic"],
  [/\bgen\b/giu, "gen"],
  [/\bno\b(?=\s|,)/giu, "no"],
  [/\bpăi\b/giu, "păi"],
  [/\bbun\b(?=\s*,)/giu, "bun,"],
  [/\bna\b(?=\s|,)/giu, "na"],
  [/\bserios\b/giu, "serios"],
  [/\bștiți\b/giu, "știți"],
  [/\bînțelegi\b/giu, "înțelegi"],
  [/\bazis\b/giu, "azis"],
  [/\bnu-i așa\b/giu, "nu-i așa"],
  [/\bcumva\b/giu, "cumva"],
  [/\boarecum\b/giu, "oarecum"],
  [/\bfrate\b/giu, "frate"],
  [/\bstai\b(?=\s|,)/giu, "stai"],
  [/\bîn fine\b/giu, "în fine"],
  [/\bpe bune\b/giu, "pe bune"],
  [/\bla propriu\b/giu, "la propriu"],
];

/* ─── Analysis Functions ─── */

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
}

function countEmoji(text: string): number {
  const matches = text.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 0;
}

function countHashtags(text: string): number {
  const matches = text.match(/#[\p{L}\p{N}_]{2,}/gu);
  return matches ? matches.length : 0;
}

function countQuestions(text: string): number {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

function countExclamations(text: string): number {
  const matches = text.match(/!/g);
  return matches ? matches.length : 0;
}

function detectVerbalTics(texts: string[]): string[] {
  const corpus = texts.join(" ").toLowerCase();
  const totalWords = corpus.split(/\s+/).length;
  const detected: [string, number][] = [];

  for (const [pattern, label] of VERBAL_TIC_PATTERNS) {
    const matches = corpus.match(new RegExp(pattern.source, pattern.flags));
    if (matches && matches.length > 0) {
      const frequency = matches.length / totalWords;
      // Only count as "tic" if used more than average (>0.5% of words)
      if (frequency > 0.005) {
        detected.push([label, frequency]);
      }
    }
  }

  return detected
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => label);
}

function measureFormality(texts: string[]): number {
  const corpus = texts.join(" ");
  let formalSignals = 0;
  let casualSignals = 0;

  // Formal signals
  if (/\bdumneavoastră\b/giu.test(corpus)) formalSignals += 3;
  if (/\bstimat[ăei]?\b/giu.test(corpus)) formalSignals += 3;
  if (/\bvă rog\b/giu.test(corpus)) formalSignals += 2;
  if (/\bcu respect\b/giu.test(corpus)) formalSignals += 2;
  if (/\bîn ceea ce privește\b/giu.test(corpus)) formalSignals += 1;

  // Casual signals
  if (/\p{Emoji_Presentation}/gu.test(corpus)) casualSignals += 2;
  if (/\bhaha\b|\blol\b|\bomg\b/giu.test(corpus)) casualSignals += 3;
  if (/\bfrate\b|\bbro\b/giu.test(corpus)) casualSignals += 2;
  if (/!{2,}/g.test(corpus)) casualSignals += 1;
  if (/\btu\b/giu.test(corpus)) casualSignals += 1;
  if (/\bvoi\b/giu.test(corpus)) casualSignals += 1;

  // Scale 1-10: more formal signals = higher
  const diff = formalSignals - casualSignals;
  return Math.max(1, Math.min(10, 5 + diff));
}

function detectStructure(texts: string[]): VoiceDNA["preferredStructure"] {
  let hookStoryCta = 0;
  let questionListOpinion = 0;
  let statementProofAsk = 0;

  for (const text of texts) {
    const lines = text.split("\n").filter((l) => l.trim());
    const firstLine = lines[0] || "";
    const lastLine = lines[lines.length - 1] || "";
    const hasQuestion = /\?/.test(firstLine);
    const hasList = /[-•*]|\d+[.)]\s/.test(text);
    const hasCta = /(comenteaz|salveaz|distribuie|urm[aă]rește|scrie|tag|link)/i.test(lastLine);

    if (hasQuestion && hasList) questionListOpinion++;
    else if (hasCta && !hasQuestion) hookStoryCta++;
    else statementProofAsk++;
  }

  const max = Math.max(hookStoryCta, questionListOpinion, statementProofAsk);
  if (max === hookStoryCta && hookStoryCta > texts.length * 0.4) return "hook-story-cta";
  if (max === questionListOpinion && questionListOpinion > texts.length * 0.4) return "question-list-opinion";
  if (max === statementProofAsk && statementProofAsk > texts.length * 0.4) return "statement-proof-ask";
  return "mixed";
}

function measureVocabulary(texts: string[]): VoiceDNA["vocabularyLevel"] {
  const corpus = texts.join(" ");
  const words = corpus
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return "simple";

  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const uniqueRatio = new Set(words).size / words.length;

  if (avgWordLength > 7 && uniqueRatio > 0.6) return "complex";
  if (avgWordLength > 5.5 || uniqueRatio > 0.5) return "moderate";
  return "simple";
}

/* ─── Main Extraction ─── */

/**
 * Extract Voice DNA from a collection of user's posts.
 * Requires at least 3 posts for meaningful analysis.
 */
export function extractVoiceDNA(posts: string[]): VoiceDNA {
  const validPosts = posts.filter((p) => p.trim().length > 20);

  if (validPosts.length < 3) {
    return getDefaultVoiceDNA(validPosts.length);
  }

  // Sentence lengths across all posts
  const allSentences = validPosts.flatMap(splitSentences);
  const sentenceLengths = allSentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const slMean = sentenceLengths.length > 0
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
    : 12;
  const slVariance = sentenceLengths.length > 0
    ? sentenceLengths.reduce((sum, l) => sum + (l - slMean) ** 2, 0) / sentenceLengths.length
    : 4;
  const slStdDev = Math.sqrt(slVariance);

  // Per-post metrics
  const emojiCounts = validPosts.map(countEmoji);
  const hashtagCounts = validPosts.map(countHashtags);
  const questionCounts = validPosts.map(countQuestions);
  const exclamationCounts = validPosts.map(countExclamations);
  const postLengths = validPosts.map((p) => p.length);

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  return {
    sentenceLengthMean: Math.round(slMean * 10) / 10,
    sentenceLengthStdDev: Math.round(slStdDev * 10) / 10,
    emojiFrequency: Math.round(avg(emojiCounts) * 10) / 10,
    hashtagFrequency: Math.round(avg(hashtagCounts) * 10) / 10,
    formalityLevel: measureFormality(validPosts),
    verbalTics: detectVerbalTics(validPosts),
    preferredStructure: detectStructure(validPosts),
    vocabularyLevel: measureVocabulary(validPosts),
    avgPostLength: Math.round(avg(postLengths)),
    questionFrequency: Math.round(avg(questionCounts) * 10) / 10,
    exclamationFrequency: Math.round(avg(exclamationCounts) * 10) / 10,
    sampleSize: validPosts.length,
    computedAt: new Date().toISOString(),
  };
}

function getDefaultVoiceDNA(sampleSize: number): VoiceDNA {
  return {
    sentenceLengthMean: 12,
    sentenceLengthStdDev: 5,
    emojiFrequency: 2,
    hashtagFrequency: 5,
    formalityLevel: 4,
    verbalTics: [],
    preferredStructure: "mixed",
    vocabularyLevel: "moderate",
    avgPostLength: 300,
    questionFrequency: 1,
    exclamationFrequency: 1.5,
    sampleSize,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Convert VoiceDNA to a prompt fragment for AI generation.
 */
export function voiceDNAToPrompt(dna: VoiceDNA): string {
  if (dna.sampleSize < 3) return "";

  const lines = [
    "VOICE DNA (match this writing style):",
    `- Sentence rhythm: average ${dna.sentenceLengthMean} words/sentence, vary ±${dna.sentenceLengthStdDev} words`,
    `- Emoji: ~${dna.emojiFrequency} per post`,
    `- Hashtags: ~${dna.hashtagFrequency} per post`,
    `- Formality: ${dna.formalityLevel}/10 (${dna.formalityLevel <= 3 ? "very casual" : dna.formalityLevel <= 6 ? "conversational" : "professional"})`,
    `- Vocabulary: ${dna.vocabularyLevel}`,
    `- Questions per post: ~${dna.questionFrequency}`,
    `- Post length: ~${dna.avgPostLength} characters`,
  ];

  if (dna.verbalTics.length > 0) {
    lines.push(`- Verbal tics to include naturally: ${dna.verbalTics.map((t) => `"${t}"`).join(", ")}`);
  }

  const structureMap: Record<string, string> = {
    "hook-story-cta": "Hook → Story → CTA",
    "question-list-opinion": "Question → List/Points → Opinion",
    "statement-proof-ask": "Bold statement → Proof/Example → Ask audience",
    mixed: "Vary between Hook→CTA, Question→List, Statement→Proof",
  };
  lines.push(`- Preferred structure: ${structureMap[dna.preferredStructure] || "mixed"}`);

  return lines.join("\n");
}
