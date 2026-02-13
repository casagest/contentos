import { describe, it, expect } from "vitest";
import {
  normalizeUrlForCache,
  hashUrl,
  expiresAtIso,
  isFresh,
  SCRAPE_CACHE_TTL_MS,
  RESEARCH_CACHE_TTL_MS,
} from "./url-cache";

describe("url-cache", () => {
  describe("constants", () => {
    it("SCRAPE_CACHE_TTL_MS is 6 hours", () => {
      expect(SCRAPE_CACHE_TTL_MS).toBe(6 * 60 * 60 * 1000);
    });
    it("RESEARCH_CACHE_TTL_MS is 24 hours", () => {
      expect(RESEARCH_CACHE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe("normalizeUrlForCache", () => {
    it("removes hash fragments", () => {
      const url = normalizeUrlForCache("https://example.com/page#section");
      expect(url).not.toContain("#section");
    });

    it("lowercases hostname", () => {
      const url = normalizeUrlForCache("https://EXAMPLE.COM/Path");
      expect(url).toContain("example.com");
    });

    it("removes default port 443 for https", () => {
      const url = normalizeUrlForCache("https://example.com:443/path");
      expect(url).not.toContain(":443");
    });

    it("removes default port 80 for http", () => {
      const url = normalizeUrlForCache("http://example.com:80/path");
      expect(url).not.toContain(":80");
    });

    it("preserves non-default port", () => {
      const url = normalizeUrlForCache("https://example.com:8443/path");
      expect(url).toContain(":8443");
    });

    it("sorts query params alphabetically", () => {
      const url = normalizeUrlForCache("https://example.com/?z=1&a=2&m=3");
      expect(url).toBe("https://example.com/?a=2&m=3&z=1");
    });

    it("strips trailing slashes but preserves root", () => {
      expect(normalizeUrlForCache("https://example.com/path/")).toBe(
        "https://example.com/path"
      );
      const root = normalizeUrlForCache("https://example.com/");
      expect(root).toBe("https://example.com/");
    });
  });

  describe("hashUrl", () => {
    it("returns consistent SHA-256 hex string", () => {
      const hash1 = hashUrl("https://example.com/page");
      const hash2 = hashUrl("https://example.com/page");
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it("normalizes before hashing", () => {
      expect(hashUrl("https://EXAMPLE.COM/page#x")).toBe(
        hashUrl("https://example.com/page")
      );
    });
  });

  describe("expiresAtIso", () => {
    it("returns valid ISO date string in the future", () => {
      const result = expiresAtIso(60_000);
      const date = new Date(result);
      expect(date.getTime()).toBeGreaterThan(Date.now() - 1000);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("isFresh", () => {
    it("returns false for null", () => {
      expect(isFresh(null, 60_000)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isFresh(undefined, 60_000)).toBe(false);
    });

    it("returns false for invalid date string", () => {
      expect(isFresh("not-a-date", 60_000)).toBe(false);
    });

    it("returns true for recent date within TTL", () => {
      const recent = new Date(Date.now() - 1000).toISOString();
      expect(isFresh(recent, 60_000)).toBe(true);
    });

    it("returns false for expired date", () => {
      const old = new Date(Date.now() - 120_000).toISOString();
      expect(isFresh(old, 60_000)).toBe(false);
    });
  });
});
