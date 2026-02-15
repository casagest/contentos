// ============================================================================
// src/lib/ai/pii-masker.ts
// PII Detection & Query-Time Masking — HIPAA-Adjacent
//
// Responsibilities:
//   - Detect PII patterns in text (medical/dental context, Romanian locale)
//   - Mask PII at query time (data stored unmasked, masked before LLM prompt)
//   - Category-based filtering (patient, staff, contact, financial, medical)
//   - Observability: match counts, risk level assessment
//
// Design: Pure functions only. No DB access, no side effects.
// Masking happens in buildMemoryPromptFragment() via opt-in flag.
// ============================================================================

import type {
  PIICategory,
  PIIPattern,
  PIIMatch,
  PIIMaskResult,
  CognitiveContext,
} from "./types";

// ---------------------------------------------------------------------------
// Pre-compiled regex patterns for HIPAA-adjacent PII detection
// Organized by category for selective masking
// ---------------------------------------------------------------------------

export const PII_PATTERNS: readonly PIIPattern[] = [
  // --- Patient Info ---
  {
    category: "patient_info",
    name: "patient_name_prefix",
    regex:
      /\b(?:pacient(?:ul|a)?|patient)\s+([A-Z][a-zăâîșț]+(?:\s+[A-Z][a-zăâîșț]+){0,2})/gi,
    maskFn: () => "[PATIENT]",
  },
  {
    category: "patient_info",
    name: "cnp",
    regex: /\b(?:CNP|cod\s*numeric\s*personal)\s*[:=#]?\s*(\d{13})\b/gi,
    maskFn: () => "[CNP]",
  },
  {
    category: "patient_info",
    name: "patient_id",
    regex: /\b(?:ID|cod\s*pacient)\s*[:=#]?\s*(\d{5,13})\b/gi,
    maskFn: () => "[PATIENT_ID]",
  },
  {
    category: "patient_info",
    name: "date_of_birth",
    regex:
      /\b(?:DOB|data\s*(?:na[sș]terii|nastere)|born|n[aă]scut[aă]?)\s*[:=]?\s*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/gi,
    maskFn: () => "[DOB]",
  },

  // --- Medical Record ---
  {
    category: "medical_record",
    name: "medical_record_number",
    regex: /\b(?:MRN|chart|fi[sș][aă]|dosar)\s*#?\s*[:=]?\s*(\w{4,20})\b/gi,
    maskFn: () => "[MEDICAL_RECORD]",
  },
  {
    category: "medical_record",
    name: "treatment_plan_id",
    regex:
      /\b(?:plan\s*(?:de\s*)?tratament|treatment\s*plan)\s*#?\s*[:=]?\s*(\w{3,15})\b/gi,
    maskFn: () => "[TREATMENT_PLAN]",
  },
  {
    category: "medical_record",
    name: "diagnosis_code",
    regex: /\b(?:ICD[-\s]?10|diagn(?:ostic|oza))\s*[:=]?\s*([A-Z]\d{2}(?:\.\d{1,2})?)\b/gi,
    maskFn: () => "[DIAGNOSIS]",
  },

  // --- Contact Info ---
  {
    category: "contact_info",
    name: "email",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    maskFn: () => "[EMAIL]",
  },
  {
    category: "contact_info",
    name: "phone_ro",
    regex: /\b(?:\+?4[07]\d{8}|0[237]\d{8})\b/g,
    maskFn: () => "[PHONE]",
  },
  {
    category: "contact_info",
    name: "phone_intl",
    regex:
      /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g,
    maskFn: () => "[PHONE]",
  },
  {
    category: "contact_info",
    name: "address_ro",
    regex:
      /\b(?:str\.|strada|bd\.|bdul|b-dul|calea|aleea|sos\.|[sș]oseaua)\s+[A-Za-z\u00C0-\u024F\s]+(?:\s*nr\.?\s*\d+)?/gi,
    maskFn: () => "[ADDRESS]",
  },

  // --- Staff Info ---
  {
    category: "staff_info",
    name: "doctor_name",
    regex:
      /\b(?:Dr\.?|doctor|medic|dna\.?\s*dr\.?|dl\.?\s*dr\.?)\s+([A-Z][a-zăâîșț]+(?:\s+[A-Z][a-zăâîșț]+)?)/gi,
    maskFn: () => "[DOCTOR]",
  },
  {
    category: "staff_info",
    name: "staff_id",
    regex:
      /\b(?:employee|angajat|cod\s*personal|staff\s*ID)\s*#?\s*[:=]?\s*(\w{3,12})\b/gi,
    maskFn: () => "[STAFF_ID]",
  },

  // --- Financial Info ---
  {
    category: "financial_info",
    name: "iban",
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{4}[A-Z0-9]{0,26}\b/g,
    maskFn: () => "[IBAN]",
  },
  {
    category: "financial_info",
    name: "card_number",
    regex: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    maskFn: () => "[CARD]",
  },
  {
    category: "financial_info",
    name: "cif",
    regex: /\b(?:CIF|CUI|cod\s*fiscal)\s*[:=]?\s*(RO)?\d{6,10}\b/gi,
    maskFn: () => "[CIF]",
  },
];

// ---------------------------------------------------------------------------
// Core: detect and mask PII in text
// ---------------------------------------------------------------------------

export function maskPII(
  text: string,
  options?: {
    categories?: PIICategory[];
    customPatterns?: PIIPattern[];
  }
): PIIMaskResult {
  if (!text) {
    return { maskedText: "", matches: [], hasPII: false };
  }

  const patterns = buildPatternList(options?.categories, options?.customPatterns);
  const matches: PIIMatch[] = [];
  let maskedText = text;

  // Collect all matches first, then apply from end to start to preserve positions
  const allMatches: Array<PIIMatch & { originalMatch: string }> = [];

  for (const pattern of patterns) {
    // Reset regex lastIndex for global patterns
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      allMatches.push({
        category: pattern.category,
        pattern: pattern.name,
        start: match.index,
        end: match.index + match[0].length,
        masked: pattern.maskFn(match[0]),
        originalMatch: match[0],
      });
    }
  }

  // Sort by position descending so replacements don't shift indexes
  allMatches.sort((a, b) => b.start - a.start);

  // Deduplicate overlapping matches (keep the one that starts first)
  const deduped = deduplicateOverlaps(allMatches);

  // Apply replacements
  for (const m of deduped) {
    maskedText =
      maskedText.slice(0, m.start) + m.masked + maskedText.slice(m.end);
    matches.push({
      category: m.category,
      pattern: m.pattern,
      start: m.start,
      end: m.end,
      masked: m.masked,
    });
  }

  return {
    maskedText,
    matches: matches.reverse(), // return in document order
    hasPII: matches.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Mask all text fields in a cognitive context
// ---------------------------------------------------------------------------

export function maskContextPII(
  context: CognitiveContext,
  categories?: PIICategory[]
): {
  maskedContext: CognitiveContext;
  totalMatches: number;
  matchesByCategory: Record<string, number>;
} {
  const opts = categories ? { categories } : undefined;
  let totalMatches = 0;
  const matchesByCategory: Record<string, number> = {};

  function track(result: PIIMaskResult): string {
    totalMatches += result.matches.length;
    for (const m of result.matches) {
      matchesByCategory[m.category] =
        (matchesByCategory[m.category] ?? 0) + 1;
    }
    return result.maskedText;
  }

  const maskedEpisodic = context.episodic.map((e) => ({
    ...e,
    summary: track(maskPII(e.summary ?? "", opts)),
  }));

  const maskedSemantic = context.semantic.map((s) => ({
    ...s,
    pattern_key: track(maskPII(s.pattern_key, opts)),
  }));

  const maskedProcedural = context.procedural.map((p) => ({
    ...p,
    name: track(maskPII(p.name, opts)),
    description: p.description
      ? track(maskPII(p.description, opts))
      : p.description,
  }));

  const maskedContext: CognitiveContext = {
    ...context,
    episodic: maskedEpisodic,
    semantic: maskedSemantic,
    procedural: maskedProcedural,
    working: context.working, // JSONB content — not masked (internal state)
  };

  return { maskedContext, totalMatches, matchesByCategory };
}

// ---------------------------------------------------------------------------
// Fast check: does text contain PII? (no masking, short-circuits on first)
// ---------------------------------------------------------------------------

export function containsPII(
  text: string,
  categories?: PIICategory[]
): boolean {
  if (!text) return false;

  const patterns = buildPatternList(categories);
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(text)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Observability: PII detection statistics
// ---------------------------------------------------------------------------

export function detectPIIStats(text: string): {
  hasPII: boolean;
  categories: PIICategory[];
  matchCount: number;
  riskLevel: "none" | "low" | "medium" | "high";
} {
  const result = maskPII(text);
  const categories = [...new Set(result.matches.map((m) => m.category))];

  let riskLevel: "none" | "low" | "medium" | "high" = "none";
  if (result.matches.length > 0) {
    const hasPatient = categories.includes("patient_info");
    const hasMedical = categories.includes("medical_record");
    if (hasPatient || hasMedical) {
      riskLevel = "high";
    } else if (result.matches.length >= 3) {
      riskLevel = "medium";
    } else {
      riskLevel = "low";
    }
  }

  return {
    hasPII: result.hasPII,
    categories,
    matchCount: result.matches.length,
    riskLevel,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildPatternList(
  categories?: PIICategory[],
  customPatterns?: PIIPattern[]
): PIIPattern[] {
  let patterns: PIIPattern[] = [...PII_PATTERNS];

  if (categories && categories.length > 0) {
    const categorySet = new Set(categories);
    patterns = patterns.filter((p) => categorySet.has(p.category));
  }

  if (customPatterns && customPatterns.length > 0) {
    patterns = patterns.concat(customPatterns);
  }

  return patterns;
}

function deduplicateOverlaps(
  matches: Array<PIIMatch & { originalMatch: string }>
): Array<PIIMatch & { originalMatch: string }> {
  if (matches.length <= 1) return matches;

  // Already sorted descending by start; process from end of document to start
  const result: Array<PIIMatch & { originalMatch: string }> = [];
  let lastEnd = Infinity;

  for (const m of matches) {
    // Skip if this match overlaps with one we already kept
    if (m.end <= lastEnd) {
      result.push(m);
      lastEnd = m.start;
    }
  }

  return result;
}
