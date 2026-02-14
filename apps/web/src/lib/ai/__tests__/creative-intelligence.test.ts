import { describe, it, expect, vi } from "vitest";
import {
  generateCreativeAngles,
  buildCreativeBrief,
  type CreativeMemoryInsight,
  type CreativeAngle,
  type Platform,
} from "../creative-intelligence";

// Helper to create a mock insight
function makeInsight(overrides: Partial<CreativeMemoryInsight> = {}): CreativeMemoryInsight {
  return {
    hookType: "question",
    framework: "pas",
    ctaType: "comment",
    memoryKey: "question|pas|comment",
    sampleSize: 10,
    successRate: 0.7,
    avgEngagement: 5.2,
    rank: "top",
    ...overrides,
  };
}

describe("creative-intelligence", () => {
  describe("generateCreativeAngles", () => {
    it("returns at most 5 angles", () => {
      const insights = [
        makeInsight({ hookType: "question", framework: "pas", ctaType: "comment", memoryKey: "question|pas|comment" }),
        makeInsight({ hookType: "list", framework: "listicle", ctaType: "save", memoryKey: "list|listicle|save", rank: "untested", sampleSize: 1 }),
      ];

      const angles = generateCreativeAngles({
        input: "5 sfaturi despre albire dentara",
        platform: "instagram",
        objective: "engagement",
        insights,
      });

      expect(angles.length).toBeLessThanOrEqual(5);
      expect(angles.length).toBeGreaterThan(0);
    });

    it("includes proven_winner angle when top performers exist", () => {
      const insights = [
        makeInsight({ rank: "top", avgEngagement: 8.0, successRate: 0.8, sampleSize: 15 }),
      ];

      const angles = generateCreativeAngles({
        input: "postare despre dental",
        platform: "facebook",
        objective: "engagement",
        insights,
      });

      const proven = angles.find((a) => a.id === "proven_winner");
      expect(proven).toBeDefined();
      expect(proven!.name).toBe("Formula Castigatoare");
      expect(proven!.isContrarian).toBe(false);
    });

    it("includes objective-optimized angle", () => {
      const angles = generateCreativeAngles({
        input: "test input",
        platform: "facebook",
        objective: "leads",
        insights: [],
      });

      const objectiveAngle = angles.find((a) => a.id === "objective_leads");
      expect(objectiveAngle).toBeDefined();
      expect(objectiveAngle!.name).toBe("Funnel Subtil");
    });

    it("includes platform-native angle", () => {
      const angles = generateCreativeAngles({
        input: "test",
        platform: "tiktok",
        objective: "reach",
        insights: [],
      });

      const platformAngle = angles.find((a) => a.id === "platform_native_tiktok");
      expect(platformAngle).toBeDefined();
      expect(platformAngle!.name).toContain("TikTok Native");
    });

    it("includes contrarian angle when insights have data", () => {
      const insights = [
        makeInsight({ hookType: "question", sampleSize: 20 }),
        makeInsight({ hookType: "question", sampleSize: 15 }),
        makeInsight({ hookType: "list", sampleSize: 5 }),
      ];

      const angles = generateCreativeAngles({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        insights,
      });

      const contrarian = angles.find((a) => a.id === "contrarian");
      expect(contrarian).toBeDefined();
      expect(contrarian!.isContrarian).toBe(true);
      expect(contrarian!.name).toBe("Unghi Neasteptat");
    });

    it("includes exploration angle when untested insights exist", () => {
      const insights = [
        makeInsight({ rank: "untested", sampleSize: 1, hookType: "story", memoryKey: "story|bab|share" }),
      ];

      const angles = generateCreativeAngles({
        input: "test",
        platform: "instagram",
        objective: "saves",
        insights,
      });

      const exploration = angles.find((a) => a.id === "exploration");
      expect(exploration).toBeDefined();
      expect(exploration!.name).toBe("Teritoriu Nou");
    });

    it("generates angles even with empty insights", () => {
      const angles = generateCreativeAngles({
        input: "postare noua",
        platform: "youtube",
        objective: "engagement",
        insights: [],
      });

      expect(angles.length).toBeGreaterThan(0);
      // Should at least have objective + platform native
      const objectiveAngle = angles.find((a) => a.id === "objective_engagement");
      expect(objectiveAngle).toBeDefined();
    });

    it("sorts angles by predicted score with contrarian last", () => {
      const insights = [
        makeInsight({ hookType: "question", sampleSize: 20, rank: "top" }),
        makeInsight({ hookType: "list", sampleSize: 3, rank: "untested" }),
      ];

      const angles = generateCreativeAngles({
        input: "test sorting",
        platform: "facebook",
        objective: "engagement",
        insights,
      });

      // Find contrarian and non-contrarian angles
      const contrarianIdx = angles.findIndex((a) => a.isContrarian);
      const nonContrarianAngles = angles.filter((a) => !a.isContrarian);

      // Non-contrarian angles should be sorted by score descending
      for (let i = 0; i < nonContrarianAngles.length - 1; i++) {
        expect(nonContrarianAngles[i].predictedScore).toBeGreaterThanOrEqual(
          nonContrarianAngles[i + 1].predictedScore
        );
      }

      // Contrarian should be after non-contrarian ones
      if (contrarianIdx >= 0) {
        let lastNonContrarian = -1;
        for (let i = angles.length - 1; i >= 0; i--) {
          if (!angles[i].isContrarian) { lastNonContrarian = i; break; }
        }
        expect(contrarianIdx).toBeGreaterThan(lastNonContrarian);
      }
    });

    it("generates different objective angles for each objective type", () => {
      const objectives = ["engagement", "reach", "leads", "saves"] as const;
      const names = new Set<string>();

      for (const objective of objectives) {
        const angles = generateCreativeAngles({
          input: "test",
          platform: "facebook",
          objective,
          insights: [],
        });

        const objAngle = angles.find((a) => a.id === `objective_${objective}`);
        expect(objAngle).toBeDefined();
        names.add(objAngle!.name);
      }

      // Each objective should have a unique angle name
      expect(names.size).toBe(4);
    });

    it("generates platform-specific angles for each platform", () => {
      const platforms: Platform[] = ["facebook", "instagram", "tiktok", "youtube"];

      for (const platform of platforms) {
        const angles = generateCreativeAngles({
          input: "test",
          platform,
          objective: "engagement",
          insights: [],
        });

        const platformAngle = angles.find((a) => a.id === `platform_native_${platform}`);
        expect(platformAngle).toBeDefined();
        expect(platformAngle!.name).toContain(platform.charAt(0).toUpperCase());
      }
    });

    it("every angle has valid predicted score", () => {
      const angles = generateCreativeAngles({
        input: "test",
        platform: "instagram",
        objective: "engagement",
        insights: [makeInsight()],
      });

      for (const angle of angles) {
        expect(angle.predictedScore).toBeGreaterThanOrEqual(0);
        expect(angle.predictedScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("buildCreativeBrief", () => {
    it("builds a creative brief with all required fields", () => {
      const angles: CreativeAngle[] = [
        {
          id: "test",
          name: "Test Angle",
          description: "Test description",
          hookType: "question",
          framework: "pas",
          ctaType: "comment",
          memoryKey: "question|pas|comment",
          predictedScore: 75,
          isContrarian: false,
          reasoning: "test",
        },
      ];

      const brief = buildCreativeBrief({
        input: "postare despre albire",
        platform: "instagram",
        objective: "engagement",
        angles,
        insights: [],
      });

      expect(brief.angles).toEqual(angles);
      expect(brief.platformTips).toBeInstanceOf(Array);
      expect(brief.platformTips.length).toBeGreaterThan(0);
      expect(brief.creativeBriefPrompt).toContain("INSTAGRAM");
      expect(brief.creativeBriefPrompt).toContain("engagement");
      expect(brief.creativeBriefPrompt).toContain("postare despre albire");
      expect(brief.topPerformers).toBeInstanceOf(Array);
      expect(brief.underexplored).toBeInstanceOf(Array);
      expect(brief.avoidPatterns).toBeInstanceOf(Array);
    });

    it("includes top performers in brief", () => {
      const insights = [
        makeInsight({ rank: "top", memoryKey: "top1", avgEngagement: 8.0, sampleSize: 10, successRate: 0.8 }),
        makeInsight({ rank: "top", memoryKey: "top2", avgEngagement: 6.0, sampleSize: 8, successRate: 0.7 }),
      ];

      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights,
      });

      expect(brief.topPerformers).toHaveLength(2);
      expect(brief.creativeBriefPrompt).toContain("FUNCTIONAT");
    });

    it("includes avoid patterns for low-performing insights", () => {
      const insights = [
        makeInsight({ rank: "low", memoryKey: "bad1", avgEngagement: 0.5, sampleSize: 10, successRate: 0.1 }),
      ];

      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights,
      });

      expect(brief.avoidPatterns).toHaveLength(1);
      expect(brief.creativeBriefPrompt).toContain("EVITA");
    });

    it("only includes avoid patterns with enough sample size", () => {
      const insights = [
        makeInsight({ rank: "low", memoryKey: "bad1", avgEngagement: 0.5, sampleSize: 3, successRate: 0.1 }),
      ];

      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights,
      });

      // sampleSize < 5, should not be included in avoidPatterns
      expect(brief.avoidPatterns).toHaveLength(0);
    });

    it("includes business profile in brief when provided", () => {
      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights: [],
        businessProfile: {
          name: "Clinica Dentara Smile",
          industry: "dental",
          targetAudience: "pacienti adulti",
          usps: ["tehnologie moderna", "preturi accesibile"],
          tones: ["profesional", "prietenos"],
        },
      });

      expect(brief.creativeBriefPrompt).toContain("Clinica Dentara Smile");
      expect(brief.creativeBriefPrompt).toContain("dental");
      expect(brief.creativeBriefPrompt).toContain("pacienti adulti");
      expect(brief.creativeBriefPrompt).toContain("tehnologie moderna");
      expect(brief.creativeBriefPrompt).toContain("profesional");
    });

    it("works without business profile", () => {
      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights: [],
      });

      expect(brief.creativeBriefPrompt).not.toContain("Contextul brandului");
    });

    it("includes contrarian marker for contrarian angles", () => {
      const angles: CreativeAngle[] = [
        {
          id: "contrarian",
          name: "Unghi Neasteptat",
          description: "test",
          hookType: "story",
          framework: "bab",
          ctaType: "comment",
          memoryKey: "story|bab|comment",
          predictedScore: 68,
          isContrarian: true,
          reasoning: "test",
        },
      ];

      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles,
        insights: [],
      });

      expect(brief.creativeBriefPrompt).toContain("CONTRARIAN");
    });

    it("limits top performers to 3", () => {
      const insights = Array.from({ length: 6 }, (_, i) =>
        makeInsight({ rank: "top", memoryKey: `top${i}`, avgEngagement: 5 + i })
      );

      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights,
      });

      expect(brief.topPerformers).toHaveLength(3);
    });

    it("includes platform-specific tips", () => {
      for (const platform of ["facebook", "instagram", "tiktok", "youtube"] as Platform[]) {
        const brief = buildCreativeBrief({
          input: "test",
          platform,
          objective: "engagement",
          angles: [],
          insights: [],
        });

        expect(brief.platformTips.length).toBeGreaterThan(0);
        expect(brief.creativeBriefPrompt).toContain(`Sfaturi ${platform}`);
      }
    });

    it("includes final instructions in brief", () => {
      const brief = buildCreativeBrief({
        input: "test",
        platform: "facebook",
        objective: "engagement",
        angles: [],
        insights: [],
      });

      expect(brief.creativeBriefPrompt).toContain("INSTRUCTIUNI FINALE");
      expect(brief.creativeBriefPrompt).toContain("OUTSIDE THE BOX");
      expect(brief.creativeBriefPrompt).toContain("IREZISTIBIL");
    });
  });
});
