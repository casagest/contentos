// ============================================================================
// __tests__/hallucination-guard.test.ts
// Post-Generation Hallucination Guard — Unit Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import {
  extractClaims,
  validateContent,
  validatePlatformVersions,
  type SourceTruth,
  type ClaimConfidence,
} from "../hallucination-guard";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const DENTAL_SOURCE: SourceTruth = {
  userInput: "clinica dentară din Cluj care oferă implanturi dentare",
  groundingPrompt: [
    "Business: MedicalCor",
    "Industry: stomatologie",
    "About: Clinică de stomatologie avansată din Cluj-Napoca",
    "Dr. Alexandru Tepșan — medic stomatolog specialist implantologie",
    "Services: implant dentar, All-on-4, fatete dentare, albire profesionala",
    "Website: https://medicalcor.ro",
    "Contact: 0729 122 422",
    "Preț All-on-4: de la 15.000 RON",
    "Experiență: 12 ani în implantologie",
    "Rating Google: 4.9 stele",
    "Număr recenzii: 230",
  ].join("\n"),
};

const CREATOR_SOURCE: SourceTruth = {
  userInput: "tips pentru content creators despre Instagram Reels",
  groundingPrompt: [
    "Business: ContentOS Academy",
    "Industry: digital marketing education",
    "About: Platforma de educatie pentru creatorii de continut din Romania",
    "Instructor: Ana Marinescu — expert social media",
    "Cursuri: Instagram Growth, TikTok Mastery, YouTube Strategy",
  ].join("\n"),
};

// ---------------------------------------------------------------------------
// extractClaims
// ---------------------------------------------------------------------------

describe("extractClaims", () => {
  it("extracts numeric claims above threshold", () => {
    const claims = extractClaims("Peste 500 de pacienți mulțumiți în 2024");
    const numbers = claims.filter((c) => c.type === "number");
    expect(numbers.length).toBeGreaterThanOrEqual(1);
    expect(numbers.some((c) => c.normalized === "500")).toBe(true);
  });

  it("ignores small common numbers", () => {
    const claims = extractClaims("3 pași simpli pentru un zâmbet perfect");
    const numbers = claims.filter((c) => c.type === "number");
    // "3" is below threshold and in COMMON_NUMBERS
    expect(numbers).toHaveLength(0);
  });

  it("extracts percentage claims", () => {
    const claims = extractClaims("Rata de succes de 95% pentru implanturi");
    const percentages = claims.filter((c) => c.type === "percentage");
    expect(percentages.length).toBeGreaterThanOrEqual(1);
    expect(percentages[0].normalized).toBe("95%");
  });

  it("extracts price claims with RON", () => {
    const claims = extractClaims("Prețul pentru All-on-4 este de 15.000 RON");
    const prices = claims.filter((c) => c.type === "price");
    expect(prices.length).toBeGreaterThanOrEqual(1);
    expect(prices[0].raw).toContain("15.000 RON");
  });

  it("extracts price claims with EUR", () => {
    const claims = extractClaims("Investiția este de doar 3.500 EUR");
    const prices = claims.filter((c) => c.type === "price");
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts Dr. name patterns", () => {
    const claims = extractClaims("Dr. Popescu vă invită la o consultație");
    const names = claims.filter((c) => c.type === "name");
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names[0].raw).toContain("Dr. Popescu");
  });

  it("extracts full person names", () => {
    const claims = extractClaims("Maria Ionescu recomandă tratamentul nostru");
    const names = claims.filter((c) => c.type === "name");
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(names[0].raw).toContain("Maria Ionescu");
  });

  it("extracts award claims", () => {
    const claims = extractClaims("Am câștigat premiul pentru cea mai bună clinică");
    const awards = claims.filter((c) => c.type === "award");
    expect(awards.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts certification claims", () => {
    const claims = extractClaims("Clinica noastră este certificată ISO 9001");
    const certs = claims.filter((c) => c.type === "certification");
    expect(certs.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts ranking claims", () => {
    const claims = extractClaims("Suntem pe locul 1 în clasamentul clinicilor");
    const rankings = claims.filter((c) => c.type === "ranking");
    expect(rankings.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts statistic claims (X din Y)", () => {
    const claims = extractClaims("9 din 10 pacienți ne recomandă");
    const stats = claims.filter((c) => c.type === "statistic");
    expect(stats.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts 'peste N' statistic claims", () => {
    const claims = extractClaims("Peste 1000 de proceduri efectuate");
    const stats = claims.filter((c) => c.type === "statistic");
    expect(stats.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty text", () => {
    expect(extractClaims("")).toHaveLength(0);
  });

  it("handles text with no claims", () => {
    const claims = extractClaims("Un zâmbet frumos schimbă totul.");
    // May extract some minor claims, but no critical ones
    expect(claims.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// validateContent — grounded (pass)
// ---------------------------------------------------------------------------

describe("validateContent — grounded content", () => {
  it("passes when all claims exist in source", () => {
    const text =
      "Dr. Alexandru Tepșan, specialist cu 12 ani experiență, realizează implanturi la MedicalCor Cluj-Napoca. Contactați-ne: 0729 122 422.";
    const result = validateContent(text, DENTAL_SOURCE);
    // All names and numbers are in source
    expect(result.hallucinationScore).toBe(0);
    expect(result.passed).toBe(true);
  });

  it("passes for text using only generic language", () => {
    const text =
      "Zâmbetul perfect începe cu o vizită la clinica noastră. Echipa noastră de specialiști te așteaptă!";
    const result = validateContent(text, DENTAL_SOURCE);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("passes for grounded price from source", () => {
    const text = "All-on-4 de la 15.000 RON — investiția într-un zâmbet nou!";
    const result = validateContent(text, DENTAL_SOURCE);
    const priceViolations = result.violations.filter((v) => v.claim.type === "price");
    expect(priceViolations).toHaveLength(0);
  });

  it("passes for grounded rating from source", () => {
    const text = "Cu un rating de 4.9 stele pe Google și 230 recenzii verificate.";
    const result = validateContent(text, DENTAL_SOURCE);
    // 4.9 and 230 are in source
    const numberViolations = result.violations.filter(
      (v) => v.claim.type === "number" || v.claim.type === "percentage",
    );
    expect(numberViolations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateContent — hallucinated (fail)
// ---------------------------------------------------------------------------

describe("validateContent — hallucinated content", () => {
  it("flags fabricated numbers", () => {
    const text =
      "Cu peste 5000 de pacienți fericiți și 15 ani de experiență, suntem lider.";
    const result = validateContent(text, DENTAL_SOURCE);
    // "5000" and "15" are NOT in source (source has "12")
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
    expect(result.passed).toBe(false);
  });

  it("flags fabricated percentages", () => {
    const text = "Rata noastră de succes este de 99.5% pentru implanturi.";
    const result = validateContent(text, DENTAL_SOURCE);
    const pctViolations = result.violations.filter((v) => v.claim.type === "percentage");
    expect(pctViolations.length).toBeGreaterThanOrEqual(1);
  });

  it("flags fabricated names", () => {
    const text =
      "Dr. Andrei Dumitrescu vă așteaptă cu cele mai moderne echipamente.";
    const result = validateContent(text, DENTAL_SOURCE);
    const nameViolations = result.violations.filter((v) => v.claim.type === "name");
    expect(nameViolations.length).toBeGreaterThanOrEqual(1);
  });

  it("flags fabricated prices", () => {
    const text = "Implant dentar premium la doar 2.500 RON!";
    const result = validateContent(text, DENTAL_SOURCE);
    const priceViolations = result.violations.filter((v) => v.claim.type === "price");
    expect(priceViolations.length).toBeGreaterThanOrEqual(1);
  });

  it("flags fabricated awards", () => {
    const text = "Premiul pentru cea mai bună clinică din Transilvania.";
    const result = validateContent(text, DENTAL_SOURCE);
    const awardViolations = result.violations.filter((v) => v.claim.type === "award");
    expect(awardViolations.length).toBeGreaterThanOrEqual(1);
  });

  it("flags fabricated statistics", () => {
    const text = "9 din 10 pacienți ne recomandă prietenilor!";
    const result = validateContent(text, DENTAL_SOURCE);
    const statViolations = result.violations.filter((v) => v.claim.type === "statistic");
    expect(statViolations.length).toBeGreaterThanOrEqual(1);
  });

  it("all fabricated claims are severity=critical", () => {
    const text =
      "Dr. Fake Name realizează 500 de implanturi pe lună cu rata de succes de 99%.";
    const result = validateContent(text, DENTAL_SOURCE);
    for (const v of result.violations) {
      expect(v.severity).toBe("critical");
    }
  });
});

// ---------------------------------------------------------------------------
// validateContent — options
// ---------------------------------------------------------------------------

describe("validateContent — options", () => {
  it("auto-sanitizes critical violations when enabled", () => {
    const text = "Dr. Inventat Nume recomandă 500 de pacienți mulțumiți.";
    const result = validateContent(text, DENTAL_SOURCE, { autoSanitize: true });
    expect(result.sanitizedText).not.toBeNull();
    // Sanitized text should not contain "500" or "Dr. Inventat Nume"
    if (result.sanitizedText && result.violations.length > 0) {
      // Should contain a generic replacement
      const hasGeneric =
        result.sanitizedText.includes("numeroși") ||
        result.sanitizedText.includes("echipa noastră") ||
        result.sanitizedText.includes("specialiștii noștri");
      expect(hasGeneric).toBe(true);
    }
  });

  it("returns null sanitizedText when autoSanitize is false", () => {
    const text = "Cu 500 de proceduri.";
    const result = validateContent(text, DENTAL_SOURCE, { autoSanitize: false });
    expect(result.sanitizedText).toBeNull();
  });

  it("reports durationMs", () => {
    const text = "Test content";
    const result = validateContent(text, DENTAL_SOURCE);
    expect(typeof result.durationMs).toBe("number");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// validateContent — edge cases
// ---------------------------------------------------------------------------

describe("validateContent — edge cases", () => {
  it("handles empty generated text", () => {
    const result = validateContent("", DENTAL_SOURCE);
    expect(result.passed).toBe(true);
    expect(result.totalClaims).toBe(0);
    expect(result.hallucinationScore).toBe(0);
  });

  it("handles empty source truth", () => {
    const text = "Dr. Popescu — 500 pacienți — premiu excelență.";
    const result = validateContent(text, {
      userInput: "",
      groundingPrompt: "",
    });
    // Everything should be flagged since no source data to verify against
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });

  it("handles very long text efficiently (<50ms)", () => {
    const longText = "Clinica noastră cu 500 pacienți și Dr. Fake Name. ".repeat(100);
    const start = performance.now();
    const result = validateContent(longText, DENTAL_SOURCE);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it("calculates hallucinationScore correctly", () => {
    const text = "Cu 500 pacienți și 99% succes la Dr. Inventat.";
    const result = validateContent(text, DENTAL_SOURCE);
    expect(result.hallucinationScore).toBeGreaterThan(0);
    expect(result.hallucinationScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// validatePlatformVersions
// ---------------------------------------------------------------------------

describe("validatePlatformVersions", () => {
  it("validates multiple platforms", () => {
    const platformVersions = {
      facebook: {
        text: "Dr. Alexandru Tepșan — specialist implantologie cu 12 ani experiență la MedicalCor.",
      },
      instagram: {
        text: "500 pacienți fericiți! Dr. Fake realizează implanturi premium.",
      },
    };

    const { results, overallPassed, totalViolations, worstScore } =
      validatePlatformVersions(platformVersions, DENTAL_SOURCE);

    expect(Object.keys(results)).toHaveLength(2);
    expect(results.facebook.passed).toBe(true);
    expect(results.instagram.passed).toBe(false);
    expect(overallPassed).toBe(false);
    expect(totalViolations).toBeGreaterThanOrEqual(1);
    expect(worstScore).toBeGreaterThan(0);
  });

  it("passes when all platforms are clean", () => {
    const platformVersions = {
      facebook: {
        text: "Echipa noastră de specialiști vă așteaptă la MedicalCor Cluj-Napoca!",
      },
      instagram: {
        text: "Un zâmbet frumos schimbă totul. Contactează-ne acum!",
      },
    };

    const { overallPassed, totalViolations } = validatePlatformVersions(
      platformVersions,
      DENTAL_SOURCE,
    );
    expect(overallPassed).toBe(true);
    expect(totalViolations).toBe(0);
  });

  it("handles empty platformVersions", () => {
    const { results, overallPassed } = validatePlatformVersions({}, DENTAL_SOURCE);
    expect(Object.keys(results)).toHaveLength(0);
    expect(overallPassed).toBe(true);
  });

  it("skips platforms with no text", () => {
    const platformVersions = {
      facebook: { text: "Content here" },
      instagram: { text: undefined as unknown as string },
    };

    const { results } = validatePlatformVersions(platformVersions, DENTAL_SOURCE);
    expect(Object.keys(results)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Creator source (non-dental)
// ---------------------------------------------------------------------------

describe("validateContent — creator content", () => {
  it("passes with grounded creator names", () => {
    const text = "Ana Marinescu vă arată cum să creșteți pe Instagram!";
    const result = validateContent(text, CREATOR_SOURCE);
    const nameViolations = result.violations.filter((v) => v.claim.type === "name");
    expect(nameViolations).toHaveLength(0);
  });

  it("flags fabricated engagement stats for creators", () => {
    const text = "Am crescut de la 0 la 100.000 de followeri în 30 de zile!";
    const result = validateContent(text, CREATOR_SOURCE);
    // 100.000 is not in source
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Confidence Scoring
// ---------------------------------------------------------------------------

describe("confidence scoring", () => {
  it("provides confidence score on each violation", () => {
    const text = "Dr. Inventat Face 500 de proceduri cu 99% succes.";
    const result = validateContent(text, DENTAL_SOURCE);
    for (const v of result.violations) {
      expect(v.confidence).toBeDefined();
      expect(typeof v.confidence.score).toBe("number");
      expect(v.confidence.score).toBeGreaterThanOrEqual(0);
      expect(v.confidence.score).toBeLessThanOrEqual(1);
      expect(v.confidence.label).toBeDefined();
      expect(v.confidence.signals).toBeDefined();
    }
  });

  it("ungrounded claims have confidence score > 0.5", () => {
    const text = "Dr. Fake Name — 500 de pacienți cu 95% rată de succes.";
    const result = validateContent(text, DENTAL_SOURCE);
    // All violations are ungrounded → grounding signal = 1.0 → composite > 0.5
    for (const v of result.violations) {
      expect(v.confidence.score).toBeGreaterThan(0.5);
    }
  });

  it("names have high confidence (type risk 0.9)", () => {
    const text = "Dr. Inventat Complet recomandă tratamentul nostru.";
    const result = validateContent(text, DENTAL_SOURCE);
    const nameViolation = result.violations.find((v) => v.claim.type === "name");
    expect(nameViolation).toBeDefined();
    if (nameViolation) {
      expect(nameViolation.confidence.signals.typeRisk).toBeGreaterThanOrEqual(0.9);
      expect(nameViolation.confidence.label).toBe("likely_hallucinated");
    }
  });

  it("suspiciously round numbers get higher numericSuspicion", () => {
    const text = "Cu 500 de pacienți mulțumiți.";
    const result = validateContent(text, DENTAL_SOURCE);
    const numViolation = result.violations.find((v) => v.claim.type === "number");
    expect(numViolation).toBeDefined();
    if (numViolation) {
      expect(numViolation.confidence.signals.numericSuspicion).toBeGreaterThanOrEqual(0.7);
    }
  });

  it("suspicious percentages (99%) get higher numericSuspicion", () => {
    const text = "Rata noastră de succes este de 99% pentru implanturi.";
    const result = validateContent(text, DENTAL_SOURCE);
    const pctViolation = result.violations.find((v) => v.claim.type === "percentage");
    expect(pctViolation).toBeDefined();
    if (pctViolation) {
      expect(pctViolation.confidence.signals.numericSuspicion).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("hedged claims get lower assertion strength", () => {
    const text = "Avem aproximativ 500 de pacienți mulțumiți.";
    const result = validateContent(text, DENTAL_SOURCE);
    const numViolation = result.violations.find((v) => v.claim.type === "number");
    expect(numViolation).toBeDefined();
    if (numViolation) {
      expect(numViolation.confidence.signals.assertionStrength).toBeLessThanOrEqual(0.3);
    }
  });

  it("strong assertions get higher assertion strength", () => {
    const text = "Este dovedit că avem 500 de proceduri.";
    const result = validateContent(text, DENTAL_SOURCE);
    const numViolation = result.violations.find((v) => v.claim.type === "number");
    expect(numViolation).toBeDefined();
    if (numViolation) {
      expect(numViolation.confidence.signals.assertionStrength).toBe(1.0);
    }
  });

  it("assigns correct confidence labels", () => {
    const text = "Dr. Inventat — premiu de excelență cu 99.5% succes.";
    const result = validateContent(text, DENTAL_SOURCE);
    for (const v of result.violations) {
      const label = v.confidence.label;
      expect([
        "grounded",
        "likely_grounded",
        "uncertain",
        "suspicious",
        "likely_hallucinated",
      ]).toContain(label);
    }
  });

  it("reports avgConfidence and maxConfidence on ValidationResult", () => {
    const text = "Dr. Inventat realizează 500 de proceduri cu 99% succes.";
    const result = validateContent(text, DENTAL_SOURCE);
    expect(typeof result.avgConfidence).toBe("number");
    expect(typeof result.maxConfidence).toBe("number");
    expect(result.avgConfidence).toBeGreaterThan(0);
    expect(result.maxConfidence).toBeGreaterThanOrEqual(result.avgConfidence);
  });

  it("clean content has avgConfidence = 0", () => {
    const text = "Echipa noastră de specialiști vă așteaptă!";
    const result = validateContent(text, DENTAL_SOURCE);
    expect(result.avgConfidence).toBe(0);
    expect(result.maxConfidence).toBe(0);
  });

  it("prices have high specificity signal", () => {
    const text = "Implant dentar premium la doar 2.500 RON!";
    const result = validateContent(text, DENTAL_SOURCE);
    const priceViolation = result.violations.find((v) => v.claim.type === "price");
    expect(priceViolation).toBeDefined();
    if (priceViolation) {
      expect(priceViolation.confidence.signals.specificity).toBeGreaterThanOrEqual(0.9);
    }
  });

  it("all 5 signal components are populated", () => {
    const text = "Cu peste 1000 de pacienți fericiți.";
    const result = validateContent(text, DENTAL_SOURCE);
    if (result.violations.length > 0) {
      const signals = result.violations[0].confidence.signals;
      expect(typeof signals.grounding).toBe("number");
      expect(typeof signals.specificity).toBe("number");
      expect(typeof signals.typeRisk).toBe("number");
      expect(typeof signals.assertionStrength).toBe("number");
      expect(typeof signals.numericSuspicion).toBe("number");
    }
  });
});
