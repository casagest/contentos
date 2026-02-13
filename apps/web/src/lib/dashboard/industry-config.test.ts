import { describe, it, expect } from "vitest";
import { INDUSTRY_CONFIGS, getIndustryConfig } from "./industry-config";

const EXPECTED_INDUSTRIES = [
  "dental", "restaurant", "fitness", "beauty", "ecommerce",
  "agency", "turism", "medical", "fashion", "real_estate",
  "education", "tech", "altele",
];

describe("industry-config", () => {
  describe("INDUSTRY_CONFIGS", () => {
    it("has all 13 industries", () => {
      for (const key of EXPECTED_INDUSTRIES) {
        expect(INDUSTRY_CONFIGS).toHaveProperty(key);
      }
    });

    it.each(EXPECTED_INDUSTRIES)("%s has required fields", (industry) => {
      const config = INDUSTRY_CONFIGS[industry];
      expect(config.label).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.kpis.length).toBeGreaterThan(0);
      expect(config.funnelStages.length).toBeGreaterThan(0);
      expect(config.contentTips.length).toBeGreaterThan(0);
      expect(config.bestPostTypes.length).toBeGreaterThan(0);
    });

    it("kpis have valid format values", () => {
      const validFormats = ["number", "currency", "percent", "multiplier"];
      for (const industry of EXPECTED_INDUSTRIES) {
        for (const kpi of INDUSTRY_CONFIGS[industry].kpis) {
          expect(validFormats).toContain(kpi.format);
          expect(kpi.key).toBeTruthy();
          expect(kpi.label).toBeTruthy();
          expect(typeof kpi.defaultValue).toBe("number");
        }
      }
    });

    it("funnelStages have required fields", () => {
      for (const industry of EXPECTED_INDUSTRIES) {
        for (const stage of INDUSTRY_CONFIGS[industry].funnelStages) {
          expect(stage.id).toBeTruthy();
          expect(stage.label).toBeTruthy();
          expect(stage.icon).toBeTruthy();
          expect(stage.color).toBeTruthy();
          expect(stage.description).toBeTruthy();
        }
      }
    });
  });

  describe("getIndustryConfig", () => {
    it("returns dental config for 'dental'", () => {
      const config = getIndustryConfig("dental");
      expect(config.label).toBe("Dental");
    });

    it("returns altele config for unknown industry", () => {
      const config = getIndustryConfig("unknown_xyz");
      expect(config.label).toBe("General");
    });

    it("returns altele config for empty string", () => {
      const config = getIndustryConfig("");
      expect(config.label).toBe("General");
    });

    it("returns correct config for each industry", () => {
      for (const key of EXPECTED_INDUSTRIES) {
        const config = getIndustryConfig(key);
        expect(config).toBe(INDUSTRY_CONFIGS[key]);
      }
    });
  });
});
