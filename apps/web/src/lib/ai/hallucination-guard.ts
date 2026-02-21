// ============================================================================
// src/lib/ai/hallucination-guard.ts
// Post-Generation Hallucination Guard — Validates AI output against source data
//
// Extracts structured claims (numbers, names, prices, percentages, awards,
// certifications, rankings) from AI-generated text, then verifies each claim
// appears in the source truth (user input + business intelligence).
//
// NON-FATAL: never blocks content delivery. Adds warnings + optional sanitization.
//
// Performance: regex-only, no LLM call, <5ms per validation.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClaimType =
  | "number"
  | "percentage"
  | "price"
  | "name"
  | "award"
  | "certification"
  | "ranking"
  | "statistic";

export type ViolationSeverity = "critical" | "warning" | "info";

export interface ExtractedClaim {
  /** The claim type */
  type: ClaimType;
  /** The raw text of the claim as found in output */
  raw: string;
  /** Normalized value for comparison (lowercase, trimmed) */
  normalized: string;
  /** Character offset in the source text */
  offset: number;
}

/**
 * Confidence score for a claim's hallucination probability.
 * 0.0 = certainly grounded, 1.0 = certainly hallucinated.
 *
 * Multi-signal scoring:
 * - Grounding signal: is the claim in source data? (strongest)
 * - Specificity signal: how specific is the claim? (more specific = higher risk)
 * - Type risk signal: some claim types are inherently riskier
 * - Context signal: surrounding text patterns (hedging vs assertion)
 * - Numeric plausibility: round numbers / suspicious patterns
 */
export interface ClaimConfidence {
  /** Overall hallucination probability: 0.0 (grounded) → 1.0 (hallucinated) */
  score: number;
  /** Human label: "grounded" | "likely_grounded" | "uncertain" | "suspicious" | "likely_hallucinated" */
  label: ConfidenceLabel;
  /** Individual signal scores (0–1 each, higher = more suspicious) */
  signals: ConfidenceSignals;
}

export type ConfidenceLabel =
  | "grounded"
  | "likely_grounded"
  | "uncertain"
  | "suspicious"
  | "likely_hallucinated";

export interface ConfidenceSignals {
  /** 0 = found in source, 1 = not found */
  grounding: number;
  /** 0 = vague/generic, 1 = very specific (exact number, full name) */
  specificity: number;
  /** Inherent risk by claim type: names/prices higher than generic numbers */
  typeRisk: number;
  /** 0 = hedged ("aproximativ", "circa"), 1 = asserted as absolute fact */
  assertionStrength: number;
  /** 0 = normal number, 1 = suspiciously round/patterned (500, 1000, 99%) */
  numericSuspicion: number;
}

export interface Violation {
  /** The ungrounded claim */
  claim: ExtractedClaim;
  /** Severity: critical = fabricated number/name, warning = suspicious, info = minor */
  severity: ViolationSeverity;
  /** Confidence score — probability this claim is hallucinated (0–1) */
  confidence: ClaimConfidence;
  /** Human-readable explanation */
  reason: string;
  /** Suggested replacement (generic language) */
  suggestion: string;
}

export interface ValidationResult {
  /** True if no critical or warning violations found */
  passed: boolean;
  /** Total claims extracted from output */
  totalClaims: number;
  /** Claims verified as grounded in source data */
  groundedClaims: number;
  /** Ungrounded claims */
  violations: Violation[];
  /** Hallucination score: 0 = clean, 100 = everything fabricated */
  hallucinationScore: number;
  /** Average confidence score across all violations (0–1). Higher = more likely hallucinated. */
  avgConfidence: number;
  /** Maximum confidence score among violations (worst offender) */
  maxConfidence: number;
  /** Auto-sanitized text (ungrounded claims replaced with generic language) */
  sanitizedText: string | null;
  /** Validation duration in ms */
  durationMs: number;
}

export interface SourceTruth {
  /** Raw user input text */
  userInput: string;
  /** Business intelligence grounding prompt (compact or full) */
  groundingPrompt: string;
  /** Additional source texts (website content, memory fragments, etc.) */
  additionalSources?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Numbers below this are considered too common to flag (e.g., "2 lucruri", "3 pași").
 * Only flag specific numbers that could be fabricated statistics.
 */
const MIN_FLAGGABLE_NUMBER = 5;

/**
 * Numbers that are common in generic language and should never be flagged.
 * e.g., "top 10", "24/7", "100%", "nr. 1"
 */
const COMMON_NUMBERS = new Set([
  "1", "2", "3", "4", "5", "10", "24", "7", "100", "0", "24/7",
]);

/**
 * Generic Romanian/English award/certification keywords that indicate a fabricated claim.
 */
const AWARD_PATTERNS = [
  /premiu[l]?\b/i,
  /award/i,
  /distincți[aei]/i,
  /locul\s+[1-9]\d*/i,
  /nr\.?\s*[1-9]/i,
  /top\s+\d+/i,
  /cel\s+mai\s+(bun|mare|rapid|eficient)/i,
  /best\s+(in|of|for)/i,
  /lider\s+(de|în|pe)\s+(piață|industrie|domeniu)/i,
  /leader\s+in/i,
];

const CERTIFICATION_PATTERNS = [
  /certificat?\b/i,
  /certification/i,
  /acredita[rtț]/i,
  /accredited/i,
  /ISO\s*\d+/i,
  /atestat/i,
  /licențiat/i,
  /licensed/i,
  /autorizat/i,
];

const RANKING_PATTERNS = [
  /clasament/i,
  /ranking/i,
  /#\s*\d+/i,
  /poziți[aei]\s+\d+/i,
  /locul\s+\d+/i,
  /pe\s+primul\s+loc/i,
  /first\s+place/i,
];

// ---------------------------------------------------------------------------
// Claim Extraction (regex-based, no LLM)
// ---------------------------------------------------------------------------

/**
 * Extract numeric claims from text.
 * Matches: "500+ pacienți", "190 intervenții", "30.000 RON", "95%", etc.
 */
function extractNumberClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  // Match numbers with optional context (thousands separator, currency, units)
  // Patterns: "1.234", "1,234", "500+", "30.000 RON", "95%", etc.
  // Note: no trailing \b because % € + are non-word chars → \b fails after them
  const numberPattern =
    /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(\+|%|€|RON|lei|EUR|USD)?(?=\s|[.,;:!?)}\]"']|$)/gi;

  let match: RegExpExecArray | null;
  while ((match = numberPattern.exec(text)) !== null) {
    const rawNumber = match[1];
    const suffix = match[2] || "";
    const fullMatch = match[0];

    // Normalize: remove thousands separators
    const normalized = rawNumber.replace(/[.,](?=\d{3})/g, "");
    const numValue = parseFloat(normalized);

    // Skip common/small numbers unless they have a meaningful suffix
    if (
      !suffix &&
      (isNaN(numValue) || numValue < MIN_FLAGGABLE_NUMBER || COMMON_NUMBERS.has(rawNumber))
    ) {
      continue;
    }

    if (suffix === "%") {
      claims.push({
        type: "percentage",
        raw: fullMatch,
        normalized: normalized + "%",
        offset: match.index,
      });
    } else if (suffix && /RON|lei|EUR|USD|€/i.test(suffix)) {
      claims.push({
        type: "price",
        raw: fullMatch,
        normalized: normalized + " " + suffix.toUpperCase(),
        offset: match.index,
      });
    } else if (numValue >= MIN_FLAGGABLE_NUMBER) {
      claims.push({
        type: "number",
        raw: fullMatch,
        normalized: String(numValue),
        offset: match.index,
      });
    }
  }

  // Percentages with text: "95 la sută", "95 de procente"
  const percentTextPattern = /(\d+)\s+(la\s+sut[ăa]|de\s+procente|percent)/gi;
  while ((match = percentTextPattern.exec(text)) !== null) {
    claims.push({
      type: "percentage",
      raw: match[0],
      normalized: match[1] + "%",
      offset: match.index,
    });
  }

  return claims;
}

/**
 * Extract name claims from text.
 * Matches capitalized names: "Dr. Popescu", "Maria Ionescu", etc.
 * Avoids common Romanian words that happen to be capitalized (sentence start).
 */
function extractNameClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  // Romanian/English common capitalized words to ignore (expanded)
  const commonWords = new Set([
    "de", "la", "în", "pe", "cu", "și", "sau", "dar", "ca", "ce", "nu",
    "da", "mai", "cum", "când", "unde", "the", "and", "for", "with",
    "from", "that", "this", "our", "your", "their", "his", "her",
    "facebook", "instagram", "tiktok", "youtube", "twitter", "google",
    "linkedin", "pinterest", "whatsapp", "telegram", "zoom",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "luni", "marți", "miercuri", "joi", "vineri", "sâmbătă", "duminică",
    "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie",
    "august", "septembrie", "octombrie", "noiembrie", "decembrie",
    "romania", "românia", "bucurești", "bucharest", "cluj", "timișoara",
    "iași", "constanța", "brașov", "sibiu", "oradea", "arad", "craiova",
    // AI/Content platform terms
    "contentos", "medicalcor", "one step all-on-x",
  ]);

  // "Dr. Surname", "Dr Surname"
  const doctorPattern = /\b(Dr\.?\s+[A-ZĂÂÎȘȚ][a-zăâîșțé]{2,}(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșțé]{2,})?)\b/g;
  let match: RegExpExecArray | null;
  while ((match = doctorPattern.exec(text)) !== null) {
    claims.push({
      type: "name",
      raw: match[1],
      normalized: match[1].toLowerCase().replace(/\s+/g, " ").trim(),
      offset: match.index,
    });
  }

  // "FirstName LastName" patterns (two+ consecutive capitalized words)
  const namePattern =
    /\b([A-ZĂÂÎȘȚ][a-zăâîșțé]{2,}\s+[A-ZĂÂÎȘȚ][a-zăâîșțé]{2,}(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșțé]{2,})?)\b/g;
  while ((match = namePattern.exec(text)) !== null) {
    const candidate = match[1];
    const words = candidate.split(/\s+/);

    // Skip if all words are common
    if (words.every((w) => commonWords.has(w.toLowerCase()))) continue;

    // Skip if it's at the start of a sentence (after . ! ? or at position 0)
    const before = text.substring(Math.max(0, match.index - 3), match.index);
    if (match.index === 0 || /[.!?]\s*$/.test(before)) {
      // Might be sentence-start capitalization — only flag if it looks like a real name
      // Real names typically have 2-3 words where at least one isn't a dictionary word
      const nonCommonWords = words.filter((w) => !commonWords.has(w.toLowerCase()));
      if (nonCommonWords.length < 2) continue;
    }

    // Avoid duplicate with doctor pattern
    const alreadyClaimed = claims.some(
      (c) =>
        c.type === "name" &&
        c.offset <= match!.index &&
        c.offset + c.raw.length >= match!.index + candidate.length,
    );
    if (alreadyClaimed) continue;

    claims.push({
      type: "name",
      raw: candidate,
      normalized: candidate.toLowerCase().replace(/\s+/g, " ").trim(),
      offset: match.index,
    });
  }

  return claims;
}

/**
 * Extract award/certification/ranking claims from text.
 */
function extractQualitativeClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  for (const pattern of AWARD_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = globalPattern.exec(text)) !== null) {
      // Get surrounding context (up to 60 chars around match)
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.substring(start, end).trim();

      claims.push({
        type: "award",
        raw: context,
        normalized: match[0].toLowerCase().trim(),
        offset: match.index,
      });
    }
  }

  for (const pattern of CERTIFICATION_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = globalPattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.substring(start, end).trim();

      claims.push({
        type: "certification",
        raw: context,
        normalized: match[0].toLowerCase().trim(),
        offset: match.index,
      });
    }
  }

  for (const pattern of RANKING_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    let match: RegExpExecArray | null;
    while ((match = globalPattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      const context = text.substring(start, end).trim();

      claims.push({
        type: "ranking",
        raw: context,
        normalized: match[0].toLowerCase().trim(),
        offset: match.index,
      });
    }
  }

  return claims;
}

/**
 * Extract statistic claims: "X din Y", "X din 10", "9 din 10 pacienți"
 */
function extractStatisticClaims(text: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  const statPatterns = [
    /(\d+)\s+din\s+(\d+)\s+(\w+)/gi,      // "9 din 10 pacienți"
    /(\d+)\s+out\s+of\s+(\d+)/gi,          // "9 out of 10"
    /peste\s+(\d[\d.,]*)\s+/gi,            // "peste 500 pacienți"
    /over\s+(\d[\d.,]*)\s+/gi,            // "over 500 patients"
    /mai\s+mult\s+de\s+(\d[\d.,]*)/gi,    // "mai mult de 1000"
    /more\s+than\s+(\d[\d.,]*)/gi,        // "more than 1000"
  ];

  for (const pattern of statPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      claims.push({
        type: "statistic",
        raw: match[0],
        normalized: match[0].toLowerCase().replace(/\s+/g, " ").trim(),
        offset: match.index,
      });
    }
  }

  return claims;
}

// ---------------------------------------------------------------------------
// Extract ALL claims from generated text
// ---------------------------------------------------------------------------

export function extractClaims(text: string): ExtractedClaim[] {
  const allClaims: ExtractedClaim[] = [
    ...extractNumberClaims(text),
    ...extractNameClaims(text),
    ...extractQualitativeClaims(text),
    ...extractStatisticClaims(text),
  ];

  // Deduplicate by offset (same position can match multiple patterns)
  const seen = new Set<string>();
  return allClaims.filter((claim) => {
    const key = `${claim.type}:${claim.offset}:${claim.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Truth Set Builder
// ---------------------------------------------------------------------------

/**
 * Build a normalized set of facts from source data for verification.
 * We extract all numbers, names, and keywords from source texts.
 */
function buildTruthSet(source: SourceTruth): Set<string> {
  const truth = new Set<string>();

  const allSources = [
    source.userInput,
    source.groundingPrompt,
    ...(source.additionalSources ?? []),
  ].filter(Boolean);

  const combinedText = allSources.join("\n\n");

  // Extract all numbers from source
  const numberPattern = /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(\+|%|€|RON|lei|EUR|USD)?(?=\s|[.,;:!?)}\]"']|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = numberPattern.exec(combinedText)) !== null) {
    const raw = match[1];
    const suffix = match[2] || "";
    // Store both raw and normalized forms
    truth.add(raw);
    truth.add(raw.replace(/[.,](?=\d{3})/g, "")); // without thousands separator
    if (suffix) {
      truth.add(raw + suffix);
      truth.add(raw + " " + suffix);
    }
  }

  // Extract names from source (same pattern as claims)
  const namePattern =
    /\b([A-ZĂÂÎȘȚ][a-zăâîșțé]{2,}(?:\s+[A-ZĂÂÎȘȚ][a-zăâîșțé]{2,}){0,2})\b/g;
  while ((match = namePattern.exec(combinedText)) !== null) {
    truth.add(match[1].toLowerCase().replace(/\s+/g, " ").trim());
  }

  // Extract "Dr. Name" patterns
  const drPattern = /\b(Dr\.?\s+\w+(?:\s+\w+)?)\b/gi;
  while ((match = drPattern.exec(combinedText)) !== null) {
    truth.add(match[1].toLowerCase().replace(/\s+/g, " ").trim());
  }

  // Store the full lowercase text for fuzzy substring matching of qualitative claims
  truth.add("__full__:" + combinedText.toLowerCase());

  return truth;
}

/**
 * Check if a claim's core value exists in the truth set.
 */
function isGrounded(claim: ExtractedClaim, truthSet: Set<string>): boolean {
  // For numbers/percentages/prices: check if the numeric value exists in source
  if (claim.type === "number" || claim.type === "percentage" || claim.type === "price") {
    // Direct match on normalized value
    if (truthSet.has(claim.normalized)) return true;

    // Try just the numeric part
    const numericOnly = claim.normalized.replace(/[^0-9.,]/g, "").trim();
    if (truthSet.has(numericOnly)) return true;

    // Try without thousands separators
    const noSeparators = numericOnly.replace(/[.,](?=\d{3})/g, "");
    if (truthSet.has(noSeparators)) return true;

    return false;
  }

  // For names: check if the name appears in source (case-insensitive)
  if (claim.type === "name") {
    if (truthSet.has(claim.normalized)) return true;

    // Check in full text (substring match)
    for (const entry of truthSet) {
      if (entry.startsWith("__full__:") && entry.includes(claim.normalized)) {
        return true;
      }
    }
    return false;
  }

  // For awards/certifications/rankings/statistics: check in full text
  if (
    claim.type === "award" ||
    claim.type === "certification" ||
    claim.type === "ranking" ||
    claim.type === "statistic"
  ) {
    for (const entry of truthSet) {
      if (entry.startsWith("__full__:") && entry.includes(claim.normalized)) {
        return true;
      }
    }
    return false;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Severity Classification
// ---------------------------------------------------------------------------

function classifySeverity(claim: ExtractedClaim): ViolationSeverity {
  switch (claim.type) {
    case "name":
      // Fabricated names are critical (GDPR risk, credibility damage)
      return "critical";
    case "number":
    case "percentage":
    case "statistic":
      // Fabricated numbers/stats are critical (misinformation)
      return "critical";
    case "price":
      // Fabricated prices are critical (false advertising)
      return "critical";
    case "award":
    case "certification":
    case "ranking":
      // Fabricated awards/certs are critical (legal risk)
      return "critical";
    default:
      return "warning";
  }
}

// ---------------------------------------------------------------------------
// Suggestion Generator (Romanian-first)
// ---------------------------------------------------------------------------

const GENERIC_REPLACEMENTS: Record<ClaimType, string[]> = {
  number: ["numeroși", "mulți", "o mulțime de", "experiență vastă"],
  percentage: ["un procent semnificativ", "marea majoritate", "o rată ridicată"],
  price: ["preț competitiv", "investiție accesibilă", "contactează-ne pentru preț"],
  name: ["echipa noastră", "specialiștii noștri", "profesioniștii noștri"],
  award: ["recunoscut pentru calitate", "apreciat de pacienți", "rezultate dovedite"],
  certification: ["autorizat conform legislației", "conform standardelor", "acreditat"],
  ranking: ["un nivel de top", "printre cele mai bune", "de înaltă performanță"],
  statistic: ["rezultate remarcabile", "performanță dovedită", "feedback excelent"],
};

function generateSuggestion(claim: ExtractedClaim): string {
  const options = GENERIC_REPLACEMENTS[claim.type] ?? ["[verifică datele]"];
  // Pick first option as default suggestion
  return options[0];
}

// ---------------------------------------------------------------------------
// Auto-Sanitizer
// ---------------------------------------------------------------------------

function sanitizeText(text: string, violations: Violation[]): string {
  if (violations.length === 0) return text;

  // Sort violations by offset descending (replace from end to preserve offsets)
  const sorted = [...violations]
    .filter((v) => v.severity === "critical")
    .sort((a, b) => b.claim.offset - a.claim.offset);

  let result = text;
  for (const violation of sorted) {
    const { claim, suggestion } = violation;
    const before = result.substring(0, claim.offset);
    const after = result.substring(claim.offset + claim.raw.length);
    result = before + suggestion + after;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Confidence Scoring Engine
// ---------------------------------------------------------------------------

/** Inherent risk weight by claim type (higher = riskier when ungrounded) */
const TYPE_RISK_WEIGHTS: Record<ClaimType, number> = {
  name: 0.9,           // Names are almost always hallucinated if not in source
  price: 0.85,         // Prices are very specific → high risk
  certification: 0.85, // Legal claims → high risk
  award: 0.8,          // Awards are frequently fabricated
  ranking: 0.8,        // Rankings are frequently fabricated
  percentage: 0.75,    // Percentages are often made up
  statistic: 0.75,     // Statistics are often made up
  number: 0.6,         // Generic numbers can be contextual (years, counts)
};

/** Hedging/qualification words that reduce assertion strength */
const HEDGING_PATTERNS = [
  /aproximativ/i,
  /circa/i,
  /cam\b/i,
  /roughly/i,
  /about/i,
  /around/i,
  /aproape/i,
  /nearly/i,
  /poate/i,
  /maybe/i,
  /posibil/i,
  /possibly/i,
  /estimat/i,
  /estimated/i,
  /până\s+la/i,
  /up\s+to/i,
];

/** Suspiciously round numbers that AI loves to fabricate */
const SUSPICIOUS_ROUND_NUMBERS = new Set([
  "50", "100", "200", "250", "300", "500", "750", "1000", "1500",
  "2000", "2500", "3000", "5000", "10000", "15000", "20000", "50000",
  "100000",
]);

/** Suspiciously perfect percentages */
const SUSPICIOUS_PERCENTAGES = new Set([
  "90%", "95%", "97%", "98%", "99%", "99.5%", "99.9%", "100%",
]);

/**
 * Calculate specificity of a claim (how precise/detailed it is).
 * More specific claims are harder to guess correctly → higher hallucination risk.
 */
function calcSpecificity(claim: ExtractedClaim): number {
  switch (claim.type) {
    case "name": {
      // Full names (2+ words) are more specific than single names
      const wordCount = claim.raw.split(/\s+/).length;
      if (claim.raw.startsWith("Dr")) return 0.95; // "Dr. Firstname Lastname" is very specific
      return wordCount >= 3 ? 0.9 : wordCount === 2 ? 0.8 : 0.5;
    }
    case "price": return 0.9; // Prices are inherently specific
    case "percentage": {
      // Exact decimal percentages are more specific than round ones
      const numStr = claim.normalized.replace("%", "");
      return numStr.includes(".") ? 0.95 : 0.7;
    }
    case "number": {
      const num = parseFloat(claim.normalized);
      if (isNaN(num)) return 0.5;
      // Large specific numbers are more suspicious
      if (num >= 10000) return 0.85;
      if (num >= 1000) return 0.75;
      if (num >= 100) return 0.6;
      return 0.4;
    }
    case "statistic": return 0.8; // "9 din 10" patterns are specific claims
    case "award":
    case "certification":
    case "ranking":
      return 0.7; // These are qualitative but still specific claims
    default:
      return 0.5;
  }
}

/**
 * Detect assertion strength based on surrounding context.
 * Returns 0 (hedged/qualified) → 1 (asserted as fact).
 */
function calcAssertionStrength(claim: ExtractedClaim, fullText: string): number {
  // Get surrounding context (80 chars before the claim)
  const contextStart = Math.max(0, claim.offset - 80);
  const contextBefore = fullText.substring(contextStart, claim.offset).toLowerCase();

  // Check for hedging words near the claim
  for (const pattern of HEDGING_PATTERNS) {
    if (pattern.test(contextBefore)) {
      return 0.3; // Hedged — lower assertion strength
    }
  }

  // Check for strong assertion patterns
  const strongAssertions = [
    /exact\b/i,
    /precis\b/i,
    /confirmat/i,
    /dovedit/i,
    /garantat/i,
    /proven/i,
    /verified/i,
    /guaranteed/i,
  ];
  for (const pattern of strongAssertions) {
    if (pattern.test(contextBefore)) {
      return 1.0; // Very strong assertion
    }
  }

  return 0.7; // Default: moderate assertion (stated as fact, no hedging)
}

/**
 * Detect suspiciously round or perfect numbers that AI tends to fabricate.
 */
function calcNumericSuspicion(claim: ExtractedClaim): number {
  if (claim.type !== "number" && claim.type !== "percentage" && claim.type !== "statistic") {
    return 0; // Not applicable
  }

  // Check suspicious percentages
  if (claim.type === "percentage" && SUSPICIOUS_PERCENTAGES.has(claim.normalized)) {
    return 0.85;
  }

  // Check suspiciously round numbers
  const numStr = claim.normalized.replace(/[^0-9]/g, "");
  if (SUSPICIOUS_ROUND_NUMBERS.has(numStr)) {
    return 0.75;
  }

  // Numbers ending in 0 or 00 are somewhat suspicious
  if (/00$/.test(numStr) && numStr.length >= 3) return 0.6;
  if (/0$/.test(numStr) && numStr.length >= 2) return 0.4;

  // "X din 10" pattern is classic AI fabrication
  if (claim.type === "statistic" && /\bdin\s+10\b/i.test(claim.raw)) {
    return 0.8;
  }

  return 0.1; // Non-round, specific number — less suspicious
}

/**
 * Compute composite confidence score from individual signals.
 * Weighted combination with grounding as the dominant signal.
 */
function computeConfidence(
  claim: ExtractedClaim,
  grounded: boolean,
  fullText: string,
): ClaimConfidence {
  const signals: ConfidenceSignals = {
    grounding: grounded ? 0.0 : 1.0,
    specificity: calcSpecificity(claim),
    typeRisk: TYPE_RISK_WEIGHTS[claim.type] ?? 0.5,
    assertionStrength: calcAssertionStrength(claim, fullText),
    numericSuspicion: calcNumericSuspicion(claim),
  };

  // Weighted composite score
  // Grounding is the strongest signal (50%), rest contribute contextual evidence
  const weights = {
    grounding: 0.50,
    specificity: 0.12,
    typeRisk: 0.15,
    assertionStrength: 0.10,
    numericSuspicion: 0.13,
  };

  const score = Math.min(1.0, Math.max(0.0,
    signals.grounding * weights.grounding +
    signals.specificity * weights.specificity +
    signals.typeRisk * weights.typeRisk +
    signals.assertionStrength * weights.assertionStrength +
    signals.numericSuspicion * weights.numericSuspicion,
  ));

  // Round to 2 decimal places
  const rounded = Math.round(score * 100) / 100;

  return {
    score: rounded,
    label: scoreToLabel(rounded),
    signals,
  };
}

function scoreToLabel(score: number): ConfidenceLabel {
  if (score <= 0.15) return "grounded";
  if (score <= 0.35) return "likely_grounded";
  if (score <= 0.55) return "uncertain";
  if (score <= 0.75) return "suspicious";
  return "likely_hallucinated";
}

// ---------------------------------------------------------------------------
// Main Validator API
// ---------------------------------------------------------------------------

/**
 * Validate AI-generated text against source truth data.
 *
 * @param generatedText - The AI-generated content to validate
 * @param source - Source truth data (user input + business intel)
 * @param options - Configuration options
 * @returns ValidationResult with violations, score, and optional sanitized text
 *
 * @example
 * ```ts
 * const result = validateContent(aiText, {
 *   userInput: "clinica dentară din Cluj",
 *   groundingPrompt: buildCompactGroundingPrompt(intel),
 * });
 *
 * if (!result.passed) {
 *   console.warn(`${result.violations.length} hallucination(s) detected`);
 * }
 * ```
 */
export function validateContent(
  generatedText: string,
  source: SourceTruth,
  options?: {
    /** Enable auto-sanitization of critical violations (default: false) */
    autoSanitize?: boolean;
    /** Minimum severity to include in violations (default: "warning") */
    minSeverity?: ViolationSeverity;
  },
): ValidationResult {
  const start = performance.now();

  const autoSanitize = options?.autoSanitize ?? false;
  const minSeverity = options?.minSeverity ?? "warning";
  const severityRank: Record<ViolationSeverity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  };
  const minRank = severityRank[minSeverity];

  // 1. Extract claims from generated text
  const claims = extractClaims(generatedText);

  // 2. Build truth set from source data
  const truthSet = buildTruthSet(source);

  // 3. Validate each claim with confidence scoring
  const violations: Violation[] = [];
  let groundedCount = 0;

  for (const claim of claims) {
    const grounded = isGrounded(claim, truthSet);
    const confidence = computeConfidence(claim, grounded, generatedText);

    if (grounded) {
      groundedCount++;
    } else {
      const severity = classifySeverity(claim);
      if (severityRank[severity] >= minRank) {
        violations.push({
          claim,
          severity,
          confidence,
          reason: buildViolationReason(claim),
          suggestion: generateSuggestion(claim),
        });
      }
    }
  }

  // 4. Calculate hallucination score (0–100)
  const totalClaims = claims.length;
  const hallucinationScore =
    totalClaims === 0
      ? 0
      : Math.round(
          (violations.filter((v) => v.severity === "critical").length / totalClaims) * 100,
        );

  // 5. Calculate aggregate confidence metrics
  const avgConfidence =
    violations.length === 0
      ? 0
      : Math.round(
          (violations.reduce((sum, v) => sum + v.confidence.score, 0) / violations.length) * 100,
        ) / 100;
  const maxConfidence =
    violations.length === 0
      ? 0
      : Math.round(Math.max(...violations.map((v) => v.confidence.score)) * 100) / 100;

  // 6. Auto-sanitize if requested
  const sanitizedText = autoSanitize ? sanitizeText(generatedText, violations) : null;

  // 7. Determine pass/fail
  const criticalCount = violations.filter((v) => v.severity === "critical").length;
  const passed = criticalCount === 0;

  const durationMs = Math.round((performance.now() - start) * 100) / 100;

  return {
    passed,
    totalClaims,
    groundedClaims: groundedCount,
    violations,
    hallucinationScore,
    avgConfidence,
    maxConfidence,
    sanitizedText,
    durationMs,
  };
}

/**
 * Validate multiple platform versions at once.
 * Returns a map of platform → ValidationResult.
 */
export function validatePlatformVersions(
  platformVersions: Record<string, { text?: string; alternativeVersions?: string[] }>,
  source: SourceTruth,
  options?: {
    autoSanitize?: boolean;
    minSeverity?: ViolationSeverity;
  },
): {
  results: Record<string, ValidationResult>;
  overallPassed: boolean;
  totalViolations: number;
  worstScore: number;
} {
  const results: Record<string, ValidationResult> = {};
  let totalViolations = 0;
  let worstScore = 0;
  let overallPassed = true;

  for (const [platform, version] of Object.entries(platformVersions)) {
    if (!version?.text) continue;

    // Validate primary text
    const result = validateContent(version.text, source, options);
    results[platform] = result;

    totalViolations += result.violations.length;
    if (result.hallucinationScore > worstScore) {
      worstScore = result.hallucinationScore;
    }
    if (!result.passed) {
      overallPassed = false;
    }
  }

  return { results, overallPassed, totalViolations, worstScore };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildViolationReason(claim: ExtractedClaim): string {
  switch (claim.type) {
    case "number":
      return `Numărul "${claim.raw}" nu apare în datele sursă. Posibilă halucinare.`;
    case "percentage":
      return `Procentul "${claim.raw}" nu apare în datele sursă. Fabricat de AI.`;
    case "price":
      return `Prețul "${claim.raw}" nu apare în datele sursă. Pericol de publicitate falsă.`;
    case "name":
      return `Numele "${claim.raw}" nu apare în datele sursă. Posibil inventat.`;
    case "award":
      return `Premiu/distincție menționată ("${claim.raw}") neconfirmată în date.`;
    case "certification":
      return `Certificare menționată ("${claim.raw}") neconfirmată în date.`;
    case "ranking":
      return `Clasament/ranking menționat ("${claim.raw}") neconfirmat în date.`;
    case "statistic":
      return `Statistică ("${claim.raw}") neconfirmată în datele sursă.`;
    default:
      return `Claim "${claim.raw}" neconfirmat în datele sursă.`;
  }
}
