/**
 * CMSR 2025 sanitization — Colegiul Medicilor Stomatologi din România
 * Înlocuiește expresii interzise cu formulări conforme.
 * Folosit la output-ul deterministic (template) când profilul are compliance: ["cmsr_2025"].
 */

const CMSR_REPLACEMENTS: { pattern: RegExp; replacement: string }[] = [
  { pattern: /\bcel mai bun\b/gi, replacement: "de top" },
  { pattern: /\bcel mai bun\s+cabinet\b/gi, replacement: "cabinet cu experiență de top" },
  { pattern: /\bcel mai bun\s+tratament\b/gi, replacement: "tratament de referință" },
  { pattern: /\bnumărul 1\b|\b#1\b|\bnr\.?\s*1\b/gi, replacement: "de încredere" },
  {
    pattern: /\b(?:reducere|discount|promoție)\s*(?:la|de|pe)\s*(?:\d+|tratament|implant|albire|coroană)/gi,
    replacement: "consultație de evaluare gratuită",
  },
  { pattern: /\bgarant(?:ăm|at|ăm|ez)\b/gi, replacement: "ofere" },
  { pattern: /\b(?:fără durere|indolor|nedureros)\b/gi, replacement: "disconfort minim cu anestezie locală" },
  {
    pattern: /\b(?:mai bun|mai ieftin|mai rapid)\s+(?:decât|ca|față de)\s+/gi,
    replacement: "",
  },
  {
    pattern: /\bsingurul?\b(?:\s+\w+){0,3}\s+(?:din|care)\s+/gi,
    replacement: "unul dintre ",
  },
];

/**
 * Sanitizează textul pentru conformitate CMSR 2025.
 * Aplică înlocuiri pentru expresii interzise (Art. 45, 46 CMSR).
 */
export function sanitizeTextForCMSR(text: string): string {
  if (!text || typeof text !== "string") return text;
  let result = text;

  for (const { pattern, replacement } of CMSR_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

/** Verifică dacă profile-ul cere CMSR 2025 */
export function requiresCMSRSanitization(compliance: unknown): boolean {
  if (!Array.isArray(compliance)) return false;
  return compliance.some((c) => String(c).toLowerCase() === "cmsr_2025");
}
