import { describe, it } from "node:test";
import assert from "node:assert/strict";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

describe("SEO artifacts", () => {
  it("robots route returns valid structure with sitemap reference", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    assert.ok(rules);
    assert.equal(rules.userAgent, "*");
    assert.equal(rules.allow, "/");
    const disallow = Array.isArray(rules.disallow)
      ? rules.disallow
      : typeof rules.disallow === "string"
        ? [rules.disallow]
        : [];
    assert.ok(disallow.includes("/api/"));
    assert.ok(disallow.includes("/login"));
    assert.ok(disallow.includes("/dashboard"));
    const sitemapUrl = Array.isArray(result.sitemap) ? result.sitemap[0] : result.sitemap;
    assert.match(String(sitemapUrl || ""), /\/sitemap\.xml$/);
  });

  it("sitemap includes homepage and legal pages, excludes auth", () => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";
    const result = sitemap();
    const urls = result.map((e) => e.url);
    assert.ok(urls.includes(baseUrl));
    assert.ok(urls.includes(`${baseUrl}/terms`));
    assert.ok(urls.includes(`${baseUrl}/privacy`));
    assert.ok(urls.includes(`${baseUrl}/gdpr`));
    assert.ok(!urls.includes(`${baseUrl}/login`));
    assert.ok(!urls.includes(`${baseUrl}/register`));
  });
});
