import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO artifacts", () => {
  it("robots route returns valid structure with sitemap reference", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rules).toBeDefined();
    expect(rules!.userAgent).toBe("*");
    expect(rules!.allow).toBe("/");
    expect(rules!.disallow).toContain("/api/");
    expect(rules!.disallow).toContain("/login");
    expect(rules!.disallow).toContain("/dashboard");
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("sitemap includes homepage and legal pages, excludes auth", () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";
    const result = sitemap();
    const urls = result.map((e) => e.url);
    expect(urls).toContain(baseUrl);
    expect(urls).toContain(`${baseUrl}/terms`);
    expect(urls).toContain(`${baseUrl}/privacy`);
    expect(urls).toContain(`${baseUrl}/gdpr`);
    expect(urls).not.toContain(`${baseUrl}/login`);
    expect(urls).not.toContain(`${baseUrl}/register`);
  });
});
