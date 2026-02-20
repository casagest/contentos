import { describe, it, expect } from "vitest";
import {
  detectAiIsms,
  cleanAiIsms,
  analyzeBurstiness,
  analyzeEntropy,
  analyzeHumanness,
} from "../humanizer";

describe("detectAiIsms", () => {
  it("detects Romanian AI-isms", () => {
    const text = "În concluzie, este important de menționat că mai mult decât atât trebuie să explorăm. Haideți să explorăm acest subiect.";
    const matches = detectAiIsms(text);
    expect(matches.length).toBeGreaterThanOrEqual(3);
    expect(matches.some((m) => m.phrase.toLowerCase().includes("în concluzie"))).toBe(true);
    expect(matches.some((m) => m.phrase.toLowerCase().includes("este important de menționat"))).toBe(true);
  });

  it("detects English AI-isms", () => {
    const text = "Let's delve into the digital landscape. Furthermore, it's worth noting this paradigm shift.";
    const matches = detectAiIsms(text);
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("returns empty for clean human text", () => {
    const text = "Am fost ieri la piață. Roșiile erau scumpe, dar merită. Ce mai faceți voi?";
    const matches = detectAiIsms(text);
    expect(matches.length).toBe(0);
  });

  it("sorts by severity descending", () => {
    const text = "Prin urmare, în concluzie, haideți să explorăm.";
    const matches = detectAiIsms(text);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].severity).toBeLessThanOrEqual(matches[i - 1].severity);
    }
  });
});

describe("cleanAiIsms", () => {
  it("replaces AI-isms with suggestions", () => {
    const text = "În concluzie, este important de menționat că rezultatele sunt bune.";
    const { cleaned, replacements } = cleanAiIsms(text);
    expect(cleaned).not.toContain("În concluzie");
    expect(cleaned).toContain("Pe scurt");
    expect(replacements).toBeGreaterThanOrEqual(2);
  });

  it("preserves clean text unchanged", () => {
    const text = "Azi am lansat colecția nouă de cercei handmade.";
    const { cleaned, replacements } = cleanAiIsms(text);
    expect(cleaned).toBe(text);
    expect(replacements).toBe(0);
  });
});

describe("analyzeBurstiness", () => {
  it("scores uniform text low (AI-like)", () => {
    // All sentences roughly same length
    const text = [
      "Acest lucru este important pentru noi.",
      "Acest aspect merită atenția tuturor.",
      "Acest punct necesită discuție aprofundată.",
      "Acest subiect prezintă interes major.",
      "Acest element contribuie la succes.",
    ].join(" ");
    const result = analyzeBurstiness(text);
    expect(result.score).toBeLessThan(60);
    expect(result.cv).toBeLessThan(0.4);
  });

  it("scores varied text high (human-like)", () => {
    // Mix of short and long sentences
    const text = "Stop. Asta chiar contează. Am petrecut 3 luni testând tot ce se putea testa despre algoritmul Instagram și am descoperit ceva ce m-a surprins complet. Scurt: hook-ul e totul. Restul? Detalii.";
    const result = analyzeBurstiness(text);
    expect(result.score).toBeGreaterThan(55);
    expect(result.cv).toBeGreaterThan(0.3);
  });

  it("handles short text gracefully", () => {
    const result = analyzeBurstiness("Salut!");
    expect(result.score).toBe(50);
    expect(result.feedback).toContain("prea scurt");
  });

  it("detects monotone streaks", () => {
    const text = [
      "Primul pas este simplu.",
      "Al doilea pas este clar.",
      "Al treilea pas este rapid.",
      "Al patrulea pas este ușor.",
    ].join(" ");
    const result = analyzeBurstiness(text);
    expect(result.monotoneStreaks).toBeGreaterThan(0);
  });
});

describe("analyzeEntropy", () => {
  it("scores repetitive text low", () => {
    const text = "Acest produs este bun. Acest produs este foarte bun. Acest produs este cel mai bun. Acest produs este incredibil de bun.";
    const result = analyzeEntropy(text);
    expect(result.score).toBeLessThan(60);
    expect(result.repeatedPatterns.length).toBeGreaterThan(0);
  });

  it("scores diverse text high", () => {
    const text = "Dimineața am fugit prin parc. Câinele vecinului lătra la vrăbii. Mirosea a pâine proaspătă din brutăria de pe colț. Copiii se jucau zgomotos lângă fântâna artezianã. Bătrânul citea ziarul pe bancă.";
    const result = analyzeEntropy(text);
    expect(result.score).toBeGreaterThan(50);
    expect(result.typeTokenRatio).toBeGreaterThan(0.5);
  });

  it("handles short text gracefully", () => {
    const result = analyzeEntropy("Salut!");
    expect(result.score).toBe(50);
  });

  it("detects repeated trigram patterns", () => {
    const text = "este important pentru toți este important pentru echipă este important pentru rezultate";
    const result = analyzeEntropy(text);
    expect(result.repeatedPatterns.length).toBeGreaterThan(0);
  });
});

describe("analyzeHumanness", () => {
  it("gives low score to AI-heavy text", () => {
    const text = "În concluzie, este important de menționat că în era digitală trebuie să recunoaștem aspecte esențiale. Mai mult decât atât, haideți să explorăm acest peisaj digital care joacă un rol crucial.";
    const report = analyzeHumanness(text);
    expect(report.overallScore).toBeLessThan(50);
    expect(report.aiIsms.length).toBeGreaterThan(3);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it("gives high score to natural human text", () => {
    const text = "Ieri am stat 3 ore pe un singur reel. Serios. Un singur reel de 15 secunde — și a explodat. 47K views cu un cont de 800 followeri. Ce am făcut diferit? Hook-ul. Prima secundă am arătat rezultatul final. Nu intro, nu explicații, direct BAM — cercei handmade pe pielea clientei.";
    const report = analyzeHumanness(text);
    expect(report.overallScore).toBeGreaterThan(55);
    expect(report.aiIsms.length).toBe(0);
  });

  it("returns actionable suggestions", () => {
    const text = "În concluzie, este important de menționat acest aspect. Acest aspect este foarte relevant. Acest aspect merită atenție.";
    const report = analyzeHumanness(text);
    expect(report.suggestions.length).toBeGreaterThan(0);
    // Should suggest replacing AI-isms
    expect(report.suggestions.some((s) => s.includes("Înlocuiește") || s.includes("Elimină"))).toBe(true);
  });
});
