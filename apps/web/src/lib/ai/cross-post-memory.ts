/**
 * Cross-Post Memory — Anti-clustering for content diversity.
 *
 * Tracks patterns across recent posts to prevent AI from generating
 * repetitive structures, openings, and styles. Forces variety that
 * mimics natural human content evolution.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types ─── */

export interface PostFingerprint {
  /** First 3 words of the post */
  opening: string;
  /** Structure type: hook-body-cta, question-list, story, etc. */
  structure: string;
  /** Sentence count */
  sentenceCount: number;
  /** Total character length */
  length: number;
  /** Emoji count */
  emojiCount: number;
  /** Has CTA? */
  hasCta: boolean;
  /** First word */
  firstWord: string;
}

export interface DiversityRules {
  /** Opening words to avoid (used in last 5 posts) */
  avoidOpenings: string[];
  /** Structures overused (used 2+ times in last 5) */
  avoidStructures: string[];
  /** Suggested structure to try */
  suggestedStructure: string;
  /** Emoji guidance */
  emojiGuidance: "more" | "less" | "same";
  /** Length guidance */
  lengthGuidance: "shorter" | "longer" | "same";
  /** Raw fingerprints for reference */
  recentFingerprints: PostFingerprint[];
}

/* ─── Fingerprinting ─── */

function detectStructure(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  const firstLine = (lines[0] || "").trim();
  const hasList = /[-•*]|\d+[.)]\s/.test(text);
  const hasQuestion = /\?/.test(firstLine);
  const hasCta = /(comenteaz|salveaz|distribuie|urm[aă]rește|scrie|tag|link|dm)/i.test(
    lines[lines.length - 1] || ""
  );
  const isStory = /(am |eram |ieri |acum |când )/i.test(firstLine);

  if (hasQuestion && hasList) return "question-list";
  if (isStory) return "story";
  if (hasList && hasCta) return "list-cta";
  if (hasCta) return "hook-body-cta";
  if (hasList) return "list";
  if (hasQuestion) return "question";
  return "statement";
}

function countEmoji(text: string): number {
  return (text.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu) || []).length;
}

function hasCta(text: string): boolean {
  return /(comenteaz|salveaz|distribuie|urm[aă]rește|scrie|tag|link|dm|click)/i.test(text);
}

export function fingerprintPost(text: string): PostFingerprint {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const sentences = clean
    .split(/(?<=[.!?…])\s+|(?<=\n)\s*/)
    .filter((s) => s.trim().length > 3);

  return {
    opening: words.slice(0, 3).join(" ").toLowerCase(),
    structure: detectStructure(clean),
    sentenceCount: sentences.length,
    length: clean.length,
    emojiCount: countEmoji(clean),
    hasCta: hasCta(clean),
    firstWord: (words[0] || "").toLowerCase().replace(/[^\p{L}]/gu, ""),
  };
}

/* ─── Diversity Analysis ─── */

const ALL_STRUCTURES = [
  "hook-body-cta",
  "question-list",
  "story",
  "list-cta",
  "statement",
  "question",
  "list",
];

/**
 * Analyze recent posts and generate diversity rules.
 */
export function buildDiversityRules(fingerprints: PostFingerprint[]): DiversityRules {
  const recent = fingerprints.slice(0, 10);

  // Avoid openings from last 5 posts
  const avoidOpenings = recent
    .slice(0, 5)
    .map((f) => f.firstWord)
    .filter((w) => w.length > 1);

  // Count structure usage
  const structureCounts = new Map<string, number>();
  for (const fp of recent.slice(0, 5)) {
    structureCounts.set(fp.structure, (structureCounts.get(fp.structure) || 0) + 1);
  }

  // Avoid structures used 2+ times in last 5
  const avoidStructures = [...structureCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([structure]) => structure);

  // Suggest a structure NOT recently used
  const usedStructures = new Set(recent.slice(0, 3).map((f) => f.structure));
  const suggestedStructure =
    ALL_STRUCTURES.find((s) => !usedStructures.has(s)) || "story";

  // Emoji guidance
  const avgEmoji = recent.length > 0
    ? recent.reduce((sum, f) => sum + f.emojiCount, 0) / recent.length
    : 2;
  const lastEmoji = recent[0]?.emojiCount ?? 2;
  const emojiGuidance: DiversityRules["emojiGuidance"] =
    lastEmoji > avgEmoji + 1 ? "less" : lastEmoji < avgEmoji - 1 ? "more" : "same";

  // Length guidance
  const avgLength = recent.length > 0
    ? recent.reduce((sum, f) => sum + f.length, 0) / recent.length
    : 300;
  const lastLength = recent[0]?.length ?? 300;
  const lengthGuidance: DiversityRules["lengthGuidance"] =
    lastLength > avgLength * 1.3 ? "shorter" : lastLength < avgLength * 0.7 ? "longer" : "same";

  return {
    avoidOpenings: [...new Set(avoidOpenings)],
    avoidStructures,
    suggestedStructure,
    emojiGuidance,
    lengthGuidance,
    recentFingerprints: recent,
  };
}

/**
 * Convert diversity rules to a prompt fragment.
 */
export function diversityRulesToPrompt(rules: DiversityRules): string {
  if (rules.recentFingerprints.length === 0) return "";

  const lines = [
    "DIVERSITY RULES (prevent repetitive AI patterns):",
  ];

  if (rules.avoidOpenings.length > 0) {
    lines.push(`- Do NOT start with these words: ${rules.avoidOpenings.map((w) => `"${w}"`).join(", ")}`);
  }

  if (rules.avoidStructures.length > 0) {
    lines.push(`- Do NOT use these structures (overused recently): ${rules.avoidStructures.join(", ")}`);
  }

  lines.push(`- TRY this structure instead: ${rules.suggestedStructure}`);

  if (rules.emojiGuidance === "less") {
    lines.push("- Use FEWER emojis than usual (last posts had too many)");
  } else if (rules.emojiGuidance === "more") {
    lines.push("- Use MORE emojis (last posts were emoji-light)");
  }

  if (rules.lengthGuidance === "shorter") {
    lines.push("- Make this post SHORTER than usual (recent posts were long)");
  } else if (rules.lengthGuidance === "longer") {
    lines.push("- Make this post LONGER with more detail (recent posts were short)");
  }

  return lines.join("\n");
}

/**
 * Fetch recent drafts/posts from DB and build diversity rules.
 * Non-fatal: returns empty rules on error.
 */
export async function fetchDiversityRules(params: {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
}): Promise<DiversityRules> {
  try {
    const { data: drafts } = await params.supabase
      .from("drafts")
      .select("body")
      .eq("organization_id", params.organizationId)
      .order("created_at", { ascending: false })
      .limit(params.limit || 10);

    if (!drafts || drafts.length === 0) {
      return buildDiversityRules([]);
    }

    const fingerprints = drafts
      .map((d) => (typeof d.body === "string" ? d.body : ""))
      .filter((body) => body.trim().length > 20)
      .map(fingerprintPost);

    return buildDiversityRules(fingerprints);
  } catch {
    return buildDiversityRules([]);
  }
}
