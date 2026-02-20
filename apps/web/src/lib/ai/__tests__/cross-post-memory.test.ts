import { describe, it, expect } from "vitest";
import {
  fingerprintPost,
  buildDiversityRules,
  diversityRulesToPrompt,
} from "../cross-post-memory";

describe("fingerprintPost", () => {
  it("detects hook-body-cta structure", () => {
    const fp = fingerprintPost("🔥 Asta e secretul!\n\nDetalii importante.\n\nSalvează postarea asta!");
    expect(fp.structure).toBe("hook-body-cta");
    expect(fp.hasCta).toBe(true);
  });

  it("detects question-list structure", () => {
    const fp = fingerprintPost("Ce faci când nu ai idei?\n\n- Citești\n- Testezi\n- Experimentezi");
    expect(fp.structure).toBe("question-list");
  });

  it("detects story structure", () => {
    const fp = fingerprintPost("Ieri am fost la un eveniment incredibil. Am învățat atât de multe lucruri noi.");
    expect(fp.structure).toBe("story");
  });

  it("extracts opening words", () => {
    const fp = fingerprintPost("Primul pas spre succes este să renunți la ego.");
    expect(fp.opening).toBe("primul pas spre");
    expect(fp.firstWord).toBe("primul");
  });

  it("counts emoji", () => {
    const fp = fingerprintPost("🔥 Super 💪 content 🎯 rocks!");
    expect(fp.emojiCount).toBe(3);
  });
});

describe("buildDiversityRules", () => {
  it("flags overused structures", () => {
    const fps = [
      { opening: "primul pas", structure: "hook-body-cta", sentenceCount: 5, length: 200, emojiCount: 2, hasCta: true, firstWord: "primul" },
      { opening: "al doilea", structure: "hook-body-cta", sentenceCount: 4, length: 180, emojiCount: 1, hasCta: true, firstWord: "al" },
      { opening: "al treilea", structure: "hook-body-cta", sentenceCount: 6, length: 220, emojiCount: 3, hasCta: true, firstWord: "al" },
    ];
    const rules = buildDiversityRules(fps);
    expect(rules.avoidStructures).toContain("hook-body-cta");
    expect(rules.suggestedStructure).not.toBe("hook-body-cta");
  });

  it("avoids recent opening words", () => {
    const fps = [
      { opening: "ieri am", structure: "story", sentenceCount: 3, length: 150, emojiCount: 0, hasCta: false, firstWord: "ieri" },
      { opening: "astăzi vreau", structure: "statement", sentenceCount: 4, length: 200, emojiCount: 1, hasCta: false, firstWord: "astăzi" },
    ];
    const rules = buildDiversityRules(fps);
    expect(rules.avoidOpenings).toContain("ieri");
    expect(rules.avoidOpenings).toContain("astăzi");
  });

  it("handles empty input gracefully", () => {
    const rules = buildDiversityRules([]);
    expect(rules.avoidOpenings).toEqual([]);
    expect(rules.avoidStructures).toEqual([]);
    expect(rules.suggestedStructure).toBeTruthy();
  });

  it("suggests emoji reduction after emoji-heavy posts", () => {
    const fps = [
      { opening: "wow", structure: "statement", sentenceCount: 3, length: 200, emojiCount: 8, hasCta: false, firstWord: "wow" },
      { opening: "super", structure: "statement", sentenceCount: 3, length: 200, emojiCount: 2, hasCta: false, firstWord: "super" },
    ];
    const rules = buildDiversityRules(fps);
    expect(rules.emojiGuidance).toBe("less");
  });
});

describe("diversityRulesToPrompt", () => {
  it("generates non-empty prompt for active rules", () => {
    const rules = buildDiversityRules([
      { opening: "ieri am", structure: "story", sentenceCount: 3, length: 150, emojiCount: 0, hasCta: false, firstWord: "ieri" },
      { opening: "azi am", structure: "story", sentenceCount: 3, length: 150, emojiCount: 0, hasCta: false, firstWord: "azi" },
      { opening: "mâine o", structure: "story", sentenceCount: 3, length: 150, emojiCount: 0, hasCta: false, firstWord: "mâine" },
    ]);
    const prompt = diversityRulesToPrompt(rules);
    expect(prompt).toContain("DIVERSITY RULES");
    expect(prompt).toContain("Do NOT start");
  });

  it("returns empty for no fingerprints", () => {
    const rules = buildDiversityRules([]);
    const prompt = diversityRulesToPrompt(rules);
    expect(prompt).toBe("");
  });
});
