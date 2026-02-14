import { describe, it, expect } from "vitest";
import {
  maskPII,
  containsPII,
  detectPIIStats,
  maskContextPII,
  PII_PATTERNS,
} from "../pii-masker";
import type { CognitiveContext } from "../types";

// ---------------------------------------------------------------------------
// maskPII — basic
// ---------------------------------------------------------------------------

describe("maskPII", () => {
  it("returns empty result for empty string", () => {
    const result = maskPII("");
    expect(result.maskedText).toBe("");
    expect(result.hasPII).toBe(false);
    expect(result.matches).toHaveLength(0);
  });

  it("returns unchanged text when no PII", () => {
    const result = maskPII("This is a normal post about dental hygiene.");
    expect(result.maskedText).toBe("This is a normal post about dental hygiene.");
    expect(result.hasPII).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// maskPII — patient info
// ---------------------------------------------------------------------------

describe("maskPII — patient patterns", () => {
  it("masks patient name prefix (Romanian)", () => {
    const result = maskPII("Pacientul Ion Popescu a venit la control.");
    expect(result.maskedText).toContain("[PATIENT]");
    expect(result.hasPII).toBe(true);
  });

  it("masks CNP (Romanian personal numeric code)", () => {
    const result = maskPII("CNP: 1234567890123 este valid.");
    expect(result.maskedText).toContain("[CNP]");
    expect(result.hasPII).toBe(true);
  });

  it("masks date of birth", () => {
    const result = maskPII("DOB: 15/03/1990 recorded.");
    expect(result.maskedText).toContain("[DOB]");
  });

  it("masks patient ID", () => {
    const result = maskPII("cod pacient: 12345 in file.");
    expect(result.maskedText).toContain("[PATIENT_ID]");
  });
});

// ---------------------------------------------------------------------------
// maskPII — contact info
// ---------------------------------------------------------------------------

describe("maskPII — contact patterns", () => {
  it("masks email addresses", () => {
    const result = maskPII("Contact: john@example.com for info.");
    expect(result.maskedText).toContain("[EMAIL]");
  });

  it("masks Romanian phone numbers", () => {
    const result = maskPII("Suna la 0721234567 pentru programare.");
    expect(result.maskedText).toContain("[PHONE]");
  });

  it("masks Romanian addresses", () => {
    const result = maskPII("Clinica este pe str. Mihai Eminescu nr. 42.");
    expect(result.maskedText).toContain("[ADDRESS]");
  });
});

// ---------------------------------------------------------------------------
// maskPII — medical records
// ---------------------------------------------------------------------------

describe("maskPII — medical patterns", () => {
  it("masks medical record number", () => {
    const result = maskPII("MRN: ABC123456 in system.");
    expect(result.maskedText).toContain("[MEDICAL_RECORD]");
  });

  it("masks diagnosis codes", () => {
    const result = maskPII("Diagnostic: ICD-10 K02.1 — carie dentara.");
    expect(result.maskedText).toContain("[DIAGNOSIS]");
  });
});

// ---------------------------------------------------------------------------
// maskPII — staff info
// ---------------------------------------------------------------------------

describe("maskPII — staff patterns", () => {
  it("masks doctor name", () => {
    const result = maskPII("Dr. Ionescu a efectuat procedura.");
    expect(result.maskedText).toContain("[DOCTOR]");
  });
});

// ---------------------------------------------------------------------------
// maskPII — financial info
// ---------------------------------------------------------------------------

describe("maskPII — financial patterns", () => {
  it("masks IBAN", () => {
    const result = maskPII("Transfer pe RO49AAAA0100007593840000.");
    expect(result.maskedText).toContain("[IBAN]");
  });

  it("masks card numbers", () => {
    const result = maskPII("Card: 4111-1111-1111-1111 expirat.", { categories: ["financial_info"] });
    expect(result.maskedText).toContain("[CARD]");
  });
});

// ---------------------------------------------------------------------------
// maskPII — category filtering
// ---------------------------------------------------------------------------

describe("maskPII — category filtering", () => {
  it("only masks specified categories", () => {
    const text = "Dr. Ionescu, email: doc@clinic.ro, CNP: 1234567890123";
    const result = maskPII(text, { categories: ["contact_info"] });

    expect(result.maskedText).toContain("[EMAIL]");
    // CNP should NOT be masked (not in contact_info)
    expect(result.maskedText).toContain("1234567890123");
  });
});

// ---------------------------------------------------------------------------
// maskPII — no false positives
// ---------------------------------------------------------------------------

describe("maskPII — false positive resistance", () => {
  it("does not mask short numbers", () => {
    const result = maskPII("Avem 42 de pacienti azi.");
    expect(result.hasPII).toBe(false);
  });

  it("does not mask generic text", () => {
    const result = maskPII("Programare la ora 14:00 pentru detartraj.");
    expect(result.hasPII).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// containsPII — fast check
// ---------------------------------------------------------------------------

describe("containsPII", () => {
  it("returns true when PII present", () => {
    expect(containsPII("Contact: john@example.com")).toBe(true);
  });

  it("returns false when no PII", () => {
    expect(containsPII("Normal dental post")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsPII("")).toBe(false);
  });

  it("filters by category", () => {
    expect(
      containsPII("CNP: 1234567890123", ["contact_info"])
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectPIIStats
// ---------------------------------------------------------------------------

describe("detectPIIStats", () => {
  it("returns none risk for clean text", () => {
    const stats = detectPIIStats("Normal text");
    expect(stats.riskLevel).toBe("none");
    expect(stats.hasPII).toBe(false);
  });

  it("returns high risk for patient info", () => {
    const stats = detectPIIStats("Pacientul Maria Popescu, CNP: 1234567890123");
    expect(stats.riskLevel).toBe("high");
    expect(stats.categories).toContain("patient_info");
  });

  it("returns low risk for single contact match", () => {
    const stats = detectPIIStats("Email: test@test.com");
    expect(stats.riskLevel).toBe("low");
    expect(stats.matchCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// maskContextPII
// ---------------------------------------------------------------------------

describe("maskContextPII", () => {
  it("masks episodic summaries", () => {
    const context: CognitiveContext = {
      episodic: [
        {
          summary: "Pacientul Ion Pop a revenit.",
          event_type: "post_success",
        },
      ],
      semantic: [],
      procedural: [],
      working: [],
      metacognitive: {},
    };

    const { maskedContext, totalMatches } = maskContextPII(context);
    expect(maskedContext.episodic[0].summary).toContain("[PATIENT]");
    expect(totalMatches).toBeGreaterThan(0);
  });

  it("masks semantic pattern keys", () => {
    const context: CognitiveContext = {
      episodic: [],
      semantic: [
        {
          pattern_type: "topic",
          pattern_key: "Dr. Ionescu recommendations",
          pattern_value: {},
        },
      ],
      procedural: [],
      working: [],
      metacognitive: {},
    };

    const { maskedContext } = maskContextPII(context);
    expect(maskedContext.semantic[0].pattern_key).toContain("[DOCTOR]");
  });

  it("preserves working memory (unmasked)", () => {
    const context: CognitiveContext = {
      episodic: [],
      semantic: [],
      procedural: [],
      working: [
        {
          memory_type: "system_config",
          content: { email: "test@test.com" },
        },
      ],
      metacognitive: {},
    };

    const { maskedContext } = maskContextPII(context);
    // Working memory is NOT masked (JSONB internal state)
    expect(maskedContext.working[0].content).toEqual({
      email: "test@test.com",
    });
  });
});

// ---------------------------------------------------------------------------
// PII_PATTERNS coverage
// ---------------------------------------------------------------------------

describe("PII_PATTERNS", () => {
  it("has patterns for all 5 categories", () => {
    const categories = new Set(PII_PATTERNS.map((p) => p.category));
    expect(categories.size).toBe(5);
    expect(categories.has("patient_info")).toBe(true);
    expect(categories.has("medical_record")).toBe(true);
    expect(categories.has("contact_info")).toBe(true);
    expect(categories.has("staff_info")).toBe(true);
    expect(categories.has("financial_info")).toBe(true);
  });
});
