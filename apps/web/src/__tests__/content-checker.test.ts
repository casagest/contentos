import { describe, it, expect } from "vitest";
import { checkCMSRCompliance, checkPlatformFit, PLATFORM_SPECS } from "../app/(dashboard)/components/content-checker";

describe("checkCMSRCompliance", () => {
  it("flags superlatives", () => {
    const issues = checkCMSRCompliance("Suntem cel mai bun cabinet stomatologic din Cluj");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].rule).toContain("Superlative");
  });

  it("flags medical discounts", () => {
    const issues = checkCMSRCompliance("Reducere la implant dentar 30%");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("error");
    expect(issues[0].rule).toContain("Reduceri");
  });

  it("flags guaranteed results", () => {
    const issues = checkCMSRCompliance("Vă garantăm rezultate perfecte");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].rule).toContain("Garanții");
  });

  it("flags comparisons with competitors", () => {
    const issues = checkCMSRCompliance("Mai bun decât alte clinici");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].rule).toContain("Comparații");
  });

  it("warns about before/after GDPR", () => {
    const issues = checkCMSRCompliance("Vedeți transformarea before și after");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("warning");
  });

  it("warns about painless claims", () => {
    const issues = checkCMSRCompliance("Procedură fără durere");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].severity).toBe("warning");
  });

  it("returns empty for clean content", () => {
    const issues = checkCMSRCompliance("Programați o consultație de evaluare gratuită. Experiența noastră în implantologie vă oferă rezultate excelente.");
    expect(issues).toEqual([]);
  });

  it("flags #1 ranking claims", () => {
    const issues = checkCMSRCompliance("Clinica nr. 1 din România");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].rule).toContain("Clasamente");
  });
});

describe("checkPlatformFit", () => {
  it("returns high score for well-fitted Facebook post", () => {
    const text = "🦷 Consultație gratuită luna aceasta!\n\nProgramează-te acum pentru o evaluare completă.";
    const hashtags = ["#dental", "#consultatie", "#cluj"];
    const result = checkPlatformFit(text, hashtags, "facebook");
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it("penalizes text exceeding Instagram limit", () => {
    const longText = "A".repeat(2300);
    const result = checkPlatformFit(longText, [], "instagram");
    expect(result.score).toBeLessThan(60);
    const charCheck = result.checks.find((c) => c.label === "Lungime text");
    expect(charCheck?.status).toBe("error");
  });

  it("warns about too many hashtags on Facebook", () => {
    const hashtags = Array.from({ length: 35 }, (_, i) => `#tag${i}`);
    const result = checkPlatformFit("Test post contactează-ne", hashtags, "facebook");
    const hashCheck = result.checks.find((c) => c.label === "Hashtag-uri");
    expect(hashCheck?.status).toBe("error");
  });

  it("warns about missing CTA", () => {
    const result = checkPlatformFit("Frumos zâmbet astăzi", [], "facebook");
    const ctaCheck = result.checks.find((c) => c.label === "Call-to-Action");
    expect(ctaCheck?.status).toBe("warn");
  });

  it("detects CTA when present", () => {
    const result = checkPlatformFit("Programează consultația ta gratuită!", ["#dental"], "facebook");
    const ctaCheck = result.checks.find((c) => c.label === "Call-to-Action");
    // "programează" matches the CTA regex
    expect(ctaCheck?.status).toBe("ok");
  });

  it("warns about missing emoji", () => {
    const result = checkPlatformFit("Programeaza o consultatie gratuita.", ["#test"], "instagram");
    const emojiCheck = result.checks.find((c) => c.label === "Emoji");
    expect(emojiCheck?.status).toBe("warn");
  });

  it("returns 50 for unknown platform", () => {
    const result = checkPlatformFit("test", [], "snapchat");
    expect(result.score).toBe(50);
  });
});

describe("PLATFORM_SPECS", () => {
  it("has specs for all major platforms", () => {
    expect(PLATFORM_SPECS.facebook).toBeDefined();
    expect(PLATFORM_SPECS.instagram).toBeDefined();
    expect(PLATFORM_SPECS.tiktok).toBeDefined();
    expect(PLATFORM_SPECS.youtube).toBeDefined();
  });

  it("has image and video specs for each platform", () => {
    for (const [, spec] of Object.entries(PLATFORM_SPECS)) {
      expect(spec.imageSizes.length).toBeGreaterThan(0);
      expect(spec.videoSpecs.length).toBeGreaterThan(0);
      expect(spec.tips.length).toBeGreaterThan(0);
    }
  });
});
