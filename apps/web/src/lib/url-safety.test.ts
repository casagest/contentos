import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isUrlSafeSync, isUrlSafeForFetch, safeFetch } from "./url-safety";

describe("url-safety (SSRF Guard)", () => {
  describe("isUrlSafeSync", () => {
    it("blocks localhost and variants", () => {
      expect(isUrlSafeSync("http://localhost/").ok).toBe(false);
      expect(isUrlSafeSync("https://localhost/").ok).toBe(false);
      expect(isUrlSafeSync("http://127.0.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://127.1.1.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://0.0.0.0/").ok).toBe(false);
      expect(isUrlSafeSync("http://[::1]/").ok).toBe(false);
    });

    it("blocks private CIDR IPs", () => {
      expect(isUrlSafeSync("http://10.0.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("https://10.255.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://192.168.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://192.168.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.16.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.31.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://172.20.100.50/").ok).toBe(false);
    });

    it("blocks link-local (169.254.*)", () => {
      expect(isUrlSafeSync("http://169.254.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://169.254.255.255/").ok).toBe(false);
    });

    it("allows only HTTP and HTTPS", () => {
      expect(isUrlSafeSync("ftp://example.com/").ok).toBe(false);
      expect(isUrlSafeSync("file:///etc/passwd").ok).toBe(false);
      expect(isUrlSafeSync("javascript:alert(1)").ok).toBe(false);
      expect(isUrlSafeSync("data:text/html,evil").ok).toBe(false);
    });

    it("allows only ports 80 and 443", () => {
      expect(isUrlSafeSync("http://example.com:8080/").ok).toBe(false);
      expect(isUrlSafeSync("http://example.com:22/").ok).toBe(false);
      expect(isUrlSafeSync("https://example.com:8443/").ok).toBe(false);
    });

    it("allows safe public HTTP(S) URLs", () => {
      expect(isUrlSafeSync("https://example.com/").ok).toBe(true);
      expect(isUrlSafeSync("http://example.com/").ok).toBe(true);
      expect(isUrlSafeSync("https://example.com:443/path").ok).toBe(true);
      expect(isUrlSafeSync("http://example.com:80/path").ok).toBe(true);
      expect(isUrlSafeSync("https://8.8.8.8/").ok).toBe(true);
      expect(isUrlSafeSync("https://1.1.1.1/").ok).toBe(true);
    });

    it("blocks invalid URLs", () => {
      expect(isUrlSafeSync("not-a-url").ok).toBe(false);
      expect(isUrlSafeSync("").ok).toBe(false);
    });

    it("blocks reserved TLD hostnames", () => {
      expect(isUrlSafeSync("http://internal.local/").ok).toBe(false);
      expect(isUrlSafeSync("http://service.internal/").ok).toBe(false);
      expect(isUrlSafeSync("http://box.lan/").ok).toBe(false);
      expect(isUrlSafeSync("http://server.home/").ok).toBe(false);
      expect(isUrlSafeSync("http://app.localhost/").ok).toBe(false);
    });

    it("blocks multicast IPs (224+)", () => {
      expect(isUrlSafeSync("http://224.0.0.1/").ok).toBe(false);
      expect(isUrlSafeSync("http://239.255.255.255/").ok).toBe(false);
      expect(isUrlSafeSync("http://255.255.255.255/").ok).toBe(false);
    });

    it("blocks 0.0.0.0/8 range", () => {
      expect(isUrlSafeSync("http://0.1.2.3/").ok).toBe(false);
    });

    it("allows safe public IPv6", () => {
      expect(isUrlSafeSync("http://[2001:db8::1]/").ok).toBe(true);
    });

    it("blocks IPv6 link-local (fe80)", () => {
      expect(isUrlSafeSync("http://[fe80::1]/").ok).toBe(false);
    });

    it("blocks IPv6 unique local (fc00/fd00)", () => {
      expect(isUrlSafeSync("http://[fc00::1]/").ok).toBe(false);
      expect(isUrlSafeSync("http://[fd12::1]/").ok).toBe(false);
    });

    it("blocks IPv6 long-form loopback", () => {
      expect(isUrlSafeSync("http://[0:0:0:0:0:0:0:1]/").ok).toBe(false);
    });
  });

  describe("isUrlSafeForFetch", () => {
    it("blocks localhost (async)", async () => {
      const r = await isUrlSafeForFetch("http://localhost/");
      expect(r.ok).toBe(false);
      expect((r.reason || "").toLowerCase()).toContain("localhost");
    });

    it("blocks private IPs", async () => {
      const r = await isUrlSafeForFetch("http://192.168.1.1/");
      expect(r.ok).toBe(false);
    });

    it.skip("allows public domains", async () => {
      const r = await isUrlSafeForFetch("https://example.com/");
      expect(r.ok).toBe(true);
    });

    it("blocks invalid URL (async)", async () => {
      const r = await isUrlSafeForFetch("not-a-url");
      expect(r.ok).toBe(false);
    });

    it("blocks disallowed scheme (async)", async () => {
      const r = await isUrlSafeForFetch("ftp://example.com/");
      expect(r.ok).toBe(false);
    });

    it("blocks disallowed port (async)", async () => {
      const r = await isUrlSafeForFetch("http://example.com:8080/");
      expect(r.ok).toBe(false);
    });

    it("blocks blocked suffix (async)", async () => {
      const r = await isUrlSafeForFetch("http://my.internal/");
      expect(r.ok).toBe(false);
    });

    it("allows public IPv4 (async)", async () => {
      const r = await isUrlSafeForFetch("http://8.8.8.8/");
      expect(r.ok).toBe(true);
    });

    it("blocks IPv6 loopback (async)", async () => {
      const r = await isUrlSafeForFetch("http://[::1]/");
      expect(r.ok).toBe(false);
    });

    it("allows public IPv6 (async)", async () => {
      const r = await isUrlSafeForFetch("http://[2001:db8::1]/");
      expect(r.ok).toBe(true);
    });

    it("blocks IPv6 link-local (async)", async () => {
      const r = await isUrlSafeForFetch("http://[fe80::1]/");
      expect(r.ok).toBe(false);
    });
  });

  describe("safeFetch", () => {
    const originalFetch = globalThis.fetch;
    let fetchImpl: (url: unknown, options: unknown) => Promise<Response>;

    beforeEach(() => {
      fetchImpl = async () => new Response("ok", { status: 200 });
      vi.stubGlobal("fetch", async (url: unknown, options: unknown) =>
        fetchImpl(url, options)
      );
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it.skip("validates URL before fetch", async () => {
      const calls: unknown[] = [];
      fetchImpl = async (url) => {
        calls.push(url);
        return new Response("ok", { status: 200 });
      };
      await safeFetch("https://example.com/", { timeoutMs: 5000 });
      expect(calls.length).toBe(1);
    });

    it("throws for unsafe URL", async () => {
      await expect(
        safeFetch("http://127.0.0.1/", { timeoutMs: 5000 })
      ).rejects.toThrow(/URL unsafe/i);
    });

    it.skip("uses timeout", async () => {
      fetchImpl = (_url: unknown, options: any) =>
        new Promise((_resolve, reject) => {
          const signal: AbortSignal | undefined = options?.signal;
          if (!signal) return reject(new Error("missing signal"));
          if (signal.aborted) return reject(new Error("aborted"));
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });

      await expect(
        safeFetch("https://example.com/", { timeoutMs: 50 })
      ).rejects.toThrow(/aborted/i);
    });

    it.skip("follows redirects when Location is safe", async () => {
      let call = 0;
      fetchImpl = async () => {
        call += 1;
        if (call === 1) {
          return new Response(null, {
            status: 302,
            headers: { Location: "https://example.com/final" },
          });
        }
        return new Response("final content", { status: 200 });
      };

      const res = await safeFetch("https://example.com/redirect", {
        timeoutMs: 5000,
      });
      expect(res.status).toBe(200);
    });

    it("blocks redirect chains to localhost", async () => {
      fetchImpl = async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1/evil" },
        });

      await expect(
        safeFetch("https://example.com/redirect", { timeoutMs: 5000 })
      ).rejects.toThrow(/URL unsafe/i);
    });

    it.skip("throws on too many redirects", async () => {
      let call = 0;
      fetchImpl = async () => {
        call++;
        return new Response(null, {
          status: 302,
          headers: { Location: `https://example.com/r${call}` },
        });
      };

      await expect(
        safeFetch("https://example.com/start", { timeoutMs: 5000 })
      ).rejects.toThrow(/redirect/i);
    });

    it.skip("stops redirect chain when Location header is missing", async () => {
      fetchImpl = async () =>
        new Response(null, { status: 302 });

      await expect(
        safeFetch("https://example.com/redirect", { timeoutMs: 5000 })
      ).rejects.toThrow(/redirect/i);
    });

    it.skip("passes custom headers", async () => {
      let capturedHeaders: any;
      fetchImpl = async (_url: unknown, opts: any) => {
        capturedHeaders = opts?.headers;
        return new Response("ok", { status: 200 });
      };

      await safeFetch("https://example.com/", {
        timeoutMs: 5000,
        headers: { "X-Custom": "test" },
      });
      expect(capturedHeaders?.["X-Custom"]).toBe("test");
    });
  });
});
