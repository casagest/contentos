import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isUrlSafeForFetch,
  isUrlSafeSync,
  safeFetch,
} from "./url-safety";

describe("url-safety (SSRF Guard)", () => {
  describe("isUrlSafeSync", () => {
    it("blochează localhost și variații", () => {
      expect(isUrlSafeSync("http://localhost/").ok).toBe(false);
      expect(isUrlSafeSync("https://localhost/").ok).toBe(false);
      expect(isUrlSafeSync("http://127.0.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://127.1.1.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://0.0.0.0/").ok).toBe(false);
      expect(isUrlSafeSync("http://[::1]/").ok).toBe(false);
    });

    it("blochează IP-uri private CIDR", () => {
      expect(isUrlSafeSync("http://10.0.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("https://10.255.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://192.168.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://192.168.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.16.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.31.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.20.100.50/").ok).toBe(false);
    });

    it("blochează link-local (169.254.*)", () => {
      expect(isUrlSafeSync("http://169.254.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://169.254.255.255/").ok).toBe(false);
    });

    it("permite doar HTTP și HTTPS", () => {
      expect(isUrlSafeSync("ftp://example.com/").ok).toBe(false);
      expect(isUrlSafeSync("file:///etc/passwd").ok).toBe(false);
      expect(isUrlSafeSync("javascript:alert(1)").ok).toBe(false);
      expect(isUrlSafeSync("data:text/html,evil").ok).toBe(false);
    });

    it("permite doar porturile 80 și 443", () => {
      expect(isUrlSafeSync("http://example.com:8080/").ok).toBe(false);
      expect(isUrlSafeSync("http://example.com:22/").ok).toBe(false);
      expect(isUrlSafeSync("https://example.com:8443/").ok).toBe(false);
    });

    it("permite URL-uri publice HTTP(S) sigure", () => {
      expect(isUrlSafeSync("https://example.com/").ok).toBe(true);
      expect(isUrlSafeSync("http://example.com/").ok).toBe(true);
      expect(isUrlSafeSync("https://example.com:443/path").ok).toBe(true);
      expect(isUrlSafeSync("http://example.com:80/path").ok).toBe(true);
      expect(isUrlSafeSync("https://8.8.8.8/").ok).toBe(true);
      expect(isUrlSafeSync("https://1.1.1.1/").ok).toBe(true);
    });

    it("blochează URL-uri invalide", () => {
      expect(isUrlSafeSync("not-a-url").ok).toBe(false);
      expect(isUrlSafeSync("").ok).toBe(false);
    });

    it("blochează hostname-uri cu suffix rezervat", () => {
      expect(isUrlSafeSync("http://internal.local/").ok).toBe(false);
      expect(isUrlSafeSync("http://service.internal/").ok).toBe(false);
      expect(isUrlSafeSync("http://box.lan/").ok).toBe(false);
      expect(isUrlSafeSync("http://server.home/").ok).toBe(false);
    });
  });

  describe("isUrlSafeForFetch", () => {
    it("blochează localhost (async)", async () => {
      const r = await isUrlSafeForFetch("http://localhost/");
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("localhost");
    });

    it("blochează IP-uri private", async () => {
      const r = await isUrlSafeForFetch("http://192.168.1.1/");
      expect(r.ok).toBe(false);
    });

    it("permite domenii publice", async () => {
      const r = await isUrlSafeForFetch("https://example.com/");
      expect(r.ok).toBe(true);
    });
  });

  describe("safeFetch", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("validă URL înainte de fetch", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response("ok", { status: 200 })
      );

      await safeFetch("https://example.com/", { timeoutMs: 5000 });
      expect(fetch).toHaveBeenCalledWith(
        "https://example.com/",
        expect.objectContaining({ redirect: "manual" })
      );
    });

    it("aruncă pentru URL unsafe", async () => {
      await expect(
        safeFetch("http://127.0.0.1/", { timeoutMs: 5000 })
      ).rejects.toThrow("URL unsafe");

      expect(fetch).not.toHaveBeenCalled();
    });

    it("folosește timeout", async () => {
      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 100)
          )
      );

      await expect(
        safeFetch("https://example.com/", { timeoutMs: 50 })
      ).rejects.toThrow();
    });

    it("urmează redirect-uri dacă Location este safe", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(null, {
            status: 302,
            headers: { Location: "https://example.com/final" },
          })
        )
        .mockResolvedValueOnce(
          new Response("final content", { status: 200 })
        );

      const res = await safeFetch("https://example.com/redirect", {
        timeoutMs: 5000,
      });
      expect(res.status).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("blochează redirect chain către localhost", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1/evil" },
        })
      );

      await expect(
        safeFetch("https://example.com/redirect", { timeoutMs: 5000 })
      ).rejects.toThrow("URL unsafe");

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
