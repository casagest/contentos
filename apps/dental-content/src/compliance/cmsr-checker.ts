export interface CMSRComplianceResult {
  isCompliant: boolean;
  violations: {
    rule: string;
    description: string;
    severity: "error" | "warning";
    suggestion: string;
  }[];
  suggestions: string[];
}

const FORBIDDEN_PATTERNS = [
  { pattern: /cel mai bun|cea mai bun[aă]|nr\.?\s*1|numărul\s*1/gi, rule: "Superlative absolute interzise", severity: "error" as const },
  { pattern: /garant[aă]m|garantat|100%\s*succes/gi, rule: "Promisiuni garantate interzise", severity: "error" as const },
  { pattern: /reduc(ere|eri)|discount|ofert[aă]\s*special[aă]/gi, rule: "Reduceri la acte medicale interzise", severity: "error" as const },
  { pattern: /mai bun[aăi]?\s*(decât|ca|față)/gi, rule: "Comparații cu alte clinici interzise", severity: "error" as const },
  { pattern: /singurul|singura|unic(ul|a)?/gi, rule: "Afirmații de unicitate fără dovezi", severity: "warning" as const },
];

export function quickCMSRCheck(content: string): CMSRComplianceResult {
  const violations: CMSRComplianceResult["violations"] = [];
  for (const { pattern, rule, severity } of FORBIDDEN_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      violations.push({ rule, description: `Conține: "${matches[0]}"`, severity, suggestion: `Reformulează fără "${matches[0]}"` });
    }
  }
  if (!/rezultatele\s*pot\s*varia|results\s*may\s*vary/gi.test(content)) {
    violations.push({ rule: "Disclaimer obligatoriu lipsă", description: "Adaugă 'Rezultatele pot varia'", severity: "warning", suggestion: "Adaugă disclaimer la final" });
  }
  return { isCompliant: violations.filter((v) => v.severity === "error").length === 0, violations, suggestions: violations.map((v) => v.suggestion) };
}
