// packages/content-engine/src/romanian/diacritice.ts
// ============================================================
// Romanian Diacritics & Language Utilities
// ============================================================

/**
 * Map of common incorrect → correct Romanian diacritics
 * Handles both cedilla (ş, ţ) and comma-below (ș, ț) variants
 */
const DIACRITICS_MAP: Record<string, string> = {
  // Cedilla → Comma below (correct Unicode)
  "\u015F": "\u0219", // ş → ș
  "\u0163": "\u021B", // ţ → ț
  "\u015E": "\u0218", // Ş → Ș
  "\u0162": "\u021A", // Ţ → Ț
};

const ASCII_TO_DIACRITICS: Record<string, string[]> = {
  a: ["ă", "â"],
  i: ["î"],
  s: ["ș"],
  t: ["ț"],
  A: ["Ă", "Â"],
  I: ["Î"],
  S: ["Ș"],
  T: ["Ț"],
};

/**
 * Fix incorrect diacritics (cedilla → comma-below)
 */
export function fixDiacritics(text: string): string {
  let result = text;
  for (const [wrong, correct] of Object.entries(DIACRITICS_MAP)) {
    result = result.replaceAll(wrong, correct);
  }
  return result;
}

/**
 * Check if text contains proper Romanian diacritics
 */
export function hasDiacritics(text: string): boolean {
  return /[ăâîșț]/i.test(text);
}

/**
 * Check if text uses incorrect cedilla diacritics
 */
export function hasIncorrectDiacritics(text: string): boolean {
  return /[\u015F\u0163\u015E\u0162]/.test(text);
}

/**
 * Calculate diacritics quality score (0-100)
 * 100 = all diacritics present and correct
 * Lower scores = missing or incorrect diacritics
 */
export function diacriticsScore(text: string): number {
  if (!text || text.length === 0) return 100;

  const hasCorrect = hasDiacritics(text);
  const hasIncorrect = hasIncorrectDiacritics(text);

  if (hasCorrect && !hasIncorrect) return 100;
  if (hasCorrect && hasIncorrect) return 70; // Mix of correct and incorrect
  if (hasIncorrect) return 40; // Only incorrect diacritics

  // Check if text should have diacritics but doesn't
  // Common Romanian words that must have diacritics
  const MUST_HAVE_DIACRITICS = [
    { ascii: "sunt", correct: "sunt" }, // Exception: "sunt" is correct without diacritics
    { ascii: "intr-", correct: "într-" },
    { ascii: "este", correct: "este" },
    { ascii: "pentru", correct: "pentru" },
    { ascii: " si ", correct: " și " },
    { ascii: " ca ", correct: " că " },
    { ascii: " sa ", correct: " să " },
    { ascii: " ta ", correct: " ta " },
    { ascii: " in ", correct: " în " },
    { ascii: "aceasta", correct: "aceasta/această" },
    { ascii: "acesta", correct: "acesta" },
    { ascii: "tara", correct: "țara/tara" },
  ];

  const lowerText = text.toLowerCase();
  let shouldHaveDiacritics = false;

  for (const word of MUST_HAVE_DIACRITICS) {
    if (lowerText.includes(word.ascii) && word.correct !== word.ascii) {
      shouldHaveDiacritics = true;
      break;
    }
  }

  return shouldHaveDiacritics ? 30 : 80; // Likely missing diacritics vs possibly English
}

/**
 * Common Romanian social media hashtags by category
 */
export const RO_HASHTAGS = {
  general: ["#romania", "#bucuresti", "#clujnapoca", "#viata", "#motivatie"],
  business: ["#afaceri", "#antreprenor", "#startup", "#businessromania", "#succes"],
  dental: ["#stomatologie", "#dentist", "#implantdentar", "#zambet", "#igienorala", "#allonx"],
  food: ["#mancare", "#reteta", "#bucatarie", "#foodromania", "#delicious"],
  travel: ["#calatorii", "#vacanta", "#romania_frumoasa", "#turism", "#explorez"],
  fitness: ["#fitness", "#sanatate", "#antrenament", "#gym", "#stildevita"],
  beauty: ["#frumusete", "#skincare", "#machiaj", "#ingrijire", "#beauty"],
  parenting: ["#mama", "#tata", "#copii", "#familie", "#parenting"],
  tech: ["#tehnologie", "#it", "#programare", "#startup", "#inovatie"],
} as const;

/**
 * Detect if text is Romanian
 */
export function isRomanian(text: string): boolean {
  // Quick check: Romanian-specific diacritics
  if (/[ăâîșț]/i.test(text)) return true;

  // Common Romanian words check
  const roWords = /\b(și|că|să|în|este|sunt|care|pentru|acest|când|unde|cum|dar|sau|mai|foarte|poate|trebuie|despre)\b/i;
  return roWords.test(text);
}
