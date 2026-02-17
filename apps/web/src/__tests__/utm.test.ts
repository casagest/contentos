import { describe, it, expect } from "vitest";
import { addUTMParams, addUTMToPostText, generateCampaignName } from "../lib/utm";

describe("addUTMParams", () => {
  it("adds utm_source to a clean URL", () => {
    const result = addUTMParams("https://example.com/page", { source: "facebook" });
    expect(result).toContain("utm_source=facebook");
  });

  it("adds all UTM params", () => {
    const result = addUTMParams("https://clinic.ro/contact", {
      source: "instagram",
      medium: "social",
      campaign: "dental-tips-w7",
      content: "draft-abc123",
    });
    expect(result).toContain("utm_source=instagram");
    expect(result).toContain("utm_medium=social");
    expect(result).toContain("utm_campaign=dental-tips-w7");
    expect(result).toContain("utm_content=draft-abc123");
  });

  it("preserves existing UTM params", () => {
    const result = addUTMParams("https://example.com?utm_source=google", { source: "facebook" });
    expect(result).toContain("utm_source=google"); // kept original
    expect(result).not.toContain("utm_source=facebook");
  });

  it("handles URLs with existing query params", () => {
    const result = addUTMParams("https://example.com?page=2", { source: "tiktok" });
    expect(result).toContain("page=2");
    expect(result).toContain("utm_source=tiktok");
  });

  it("returns invalid URLs unchanged", () => {
    const result = addUTMParams("not-a-url", { source: "facebook" });
    expect(result).toBe("not-a-url");
  });
});

describe("addUTMToPostText", () => {
  it("adds UTM params to URLs in text", () => {
    const text = "Vizitează https://clinic.ro/contact pentru consultație gratuită!";
    const result = addUTMToPostText(text, { source: "facebook", medium: "social" });
    expect(result).toContain("utm_source=facebook");
    expect(result).toContain("consultație gratuită");
  });

  it("handles multiple URLs", () => {
    const text = "Site: https://clinic.ro Blog: https://clinic.ro/blog";
    const result = addUTMToPostText(text, { source: "instagram" });
    const matches = result.match(/utm_source=instagram/g);
    expect(matches?.length).toBe(2);
  });

  it("returns text without URLs unchanged", () => {
    const text = "Zâmbet frumos! 🦷";
    const result = addUTMToPostText(text, { source: "facebook" });
    expect(result).toBe(text);
  });
});

describe("generateCampaignName", () => {
  it("generates from source and week", () => {
    const name = generateCampaignName({ source: "autopilot", weekNumber: 7 });
    expect(name).toBe("autopilot-w7");
  });

  it("includes draft ID prefix", () => {
    const name = generateCampaignName({ source: "braindump", draftId: "abc12345-6789" });
    expect(name).toBe("braindump-abc12345");
  });

  it("returns default for empty", () => {
    const name = generateCampaignName({});
    expect(name).toBe("contentos");
  });
});
