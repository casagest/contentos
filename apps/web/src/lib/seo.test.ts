import { describe, it, expect } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

describe("SEO artifacts", () => {
  it("robots route returns valid structure with sitemap reference", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules).toBeDefined();
    expect(rules!.userAgent).toBe("*");
    expect(rules!.allow).toBe("/");
    const disallow = Array.isArray(rules!.disallow)
      ? rules!.disallow
      : typeof rules!.disallow === "string"
        ? [rules!.disallow]
        : [];
    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/login");
    expect(disallow).toContain("/dashboard");
    const sitemapUrl = Array.isArray(result.sitemap) ? result.sitemap[0] : result.sitemap;
    expect(String(sitemapUrl || "")).toMatch(/\/sitemap\.xml$/);
  });

  it("sitemap includes homepage, auth, and legal pages", () => {
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro").trim();
    const result = sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain(baseUrl);
    expect(urls).toContain(`${baseUrl}/login`);
    expect(urls).toContain(`${baseUrl}/register`);
    expect(urls).toContain(`${baseUrl}/terms`);
    expect(urls).toContain(`${baseUrl}/privacy`);
    expect(urls).toContain(`${baseUrl}/gdpr`);
  });
});
