import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isUrlSafeForFetch, isUrlSafeSync, safeFetch } from "./url-safety";

describe("url-safety (SSRF Guard)", () => {
  describe("isUrlSafeSync", () => {
    it("blocks localhost and variants", () => {
      assert.equal(isUrlSafeSync("http://localhost/").ok, false);
      assert.equal(isUrlSafeSync("https://localhost/").ok, false);
      assert.equal(isUrlSafeSync("http://127.0.0.1/").ok, false);
      assert.equal(isUrlSafeSync("http://127.1.1.1/").ok, false);
      assert.equal(isUrlSafeSync("http://0.0.0.0/").ok, false);
      assert.equal(isUrlSafeSync("http://[::1]/").ok, false);
    });

    it("blocks private CIDR IPs", () => {
      assert.equal(isUrlSafeSync("http://10.0.0.1/").ok, false);
      assert.equal(isUrlSafeSync("https://10.255.255.255/").ok, false);
      assert.equal(isUrlSafeSync("http://192.168.0.1/").ok, false);
      assert.equal(isUrlSafeSync("http://192.168.255.255/").ok, false);
      assert.equal(isUrlSafeSync("http://172.16.0.1/").ok, false);
      assert.equal(isUrlSafeSync("http://172.31.255.255/").ok, false);
      assert.equal(isUrlSafeSync("http://172.20.100.50/").ok, false);
    });

    it("blocks link-local (169.254.*)", () => {
      assert.equal(isUrlSafeSync("http://169.254.0.1/").ok, false);
      assert.equal(isUrlSafeSync("http://169.254.255.255/").ok, false);
    });

    it("allows only HTTP and HTTPS", () => {
      assert.equal(isUrlSafeSync("ftp://example.com/").ok, false);
      assert.equal(isUrlSafeSync("file:///etc/passwd").ok, false);
      assert.equal(isUrlSafeSync("javascript:alert(1)").ok, false);
      assert.equal(isUrlSafeSync("data:text/html,evil").ok, false);
    });

    it("allows only ports 80 and 443", () => {
      assert.equal(isUrlSafeSync("http://example.com:8080/").ok, false);
      assert.equal(isUrlSafeSync("http://example.com:22/").ok, false);
      assert.equal(isUrlSafeSync("https://example.com:8443/").ok, false);
    });

    it("allows safe public HTTP(S) URLs", () => {
      assert.equal(isUrlSafeSync("https://example.com/").ok, true);
      assert.equal(isUrlSafeSync("http://example.com/").ok, true);
      assert.equal(isUrlSafeSync("https://example.com:443/path").ok, true);
      assert.equal(isUrlSafeSync("http://example.com:80/path").ok, true);
      assert.equal(isUrlSafeSync("https://8.8.8.8/").ok, true);
      assert.equal(isUrlSafeSync("https://1.1.1.1/").ok, true);
    });

    it("blocks invalid URLs", () => {
      assert.equal(isUrlSafeSync("not-a-url").ok, false);
      assert.equal(isUrlSafeSync("").ok, false);
    });

    it("blocks reserved TLD hostnames", () => {
      assert.equal(isUrlSafeSync("http://internal.local/").ok, false);
      assert.equal(isUrlSafeSync("http://service.internal/").ok, false);
      assert.equal(isUrlSafeSync("http://box.lan/").ok, false);
      assert.equal(isUrlSafeSync("http://server.home/").ok, false);
    });
  });

  describe("isUrlSafeForFetch", () => {
    it("blocks localhost (async)", async () => {
      const r = await isUrlSafeForFetch("http://localhost/");
      assert.equal(r.ok, false);
      assert.ok((r.reason || "").toLowerCase().includes("localhost"));
    });

    it("blocks private IPs", async () => {
      const r = await isUrlSafeForFetch("http://192.168.1.1/");
      assert.equal(r.ok, false);
    });

    it("allows public domains", async () => {
      const r = await isUrlSafeForFetch("https://example.com/");
      assert.equal(r.ok, true);
    });
  });

  describe("safeFetch", () => {
    const originalFetch = globalThis.fetch;
    let calls: Array<[unknown, unknown]> = [];
    let fetchImpl: (url: unknown, options: unknown) => Promise<Response>;

    beforeEach(() => {
      calls = [];
      fetchImpl = async () => new Response("ok", { status: 200 });
      globalThis.fetch = (async (url: unknown, options: unknown) => {
        calls.push([url, options]);
        return fetchImpl(url, options);
      }) as any;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("validates URL before fetch", async () => {
      fetchImpl = async () => new Response("ok", { status: 200 });

      await safeFetch("https://example.com/", { timeoutMs: 5000 });
      assert.equal(calls.length, 1);

      const [url, options] = calls[0] as [unknown, unknown];
      assert.equal(url, "https://example.com/");
      assert.equal((options as any)?.redirect, "manual");
    });

    it("throws for unsafe URL", async () => {
      await assert.rejects(
        safeFetch("http://127.0.0.1/", { timeoutMs: 5000 }),
        /URL unsafe/i
      );
      assert.equal(calls.length, 0);
    });

    it("uses timeout", async () => {
      fetchImpl = (_url: unknown, options: any) => {
        return new Promise((_resolve, reject) => {
          const signal: AbortSignal | undefined = options?.signal;
          if (!signal) return reject(new Error("missing signal"));
          if (signal.aborted) return reject(new Error("aborted"));
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });
      };

      await assert.rejects(
        safeFetch("https://example.com/", { timeoutMs: 50 }),
        /aborted/i
      );
    });

    it("follows redirects when Location is safe", async () => {
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

      const res = await safeFetch("https://example.com/redirect", { timeoutMs: 5000 });
      assert.equal(res.status, 200);
      assert.equal(calls.length, 2);
    });

    it("blocks redirect chains to localhost", async () => {
      fetchImpl = async () => {
        return new Response(null, {
          status: 302,
          headers: { Location: "http://127.0.0.1/evil" },
        });
      };

      await assert.rejects(
        safeFetch("https://example.com/redirect", { timeoutMs: 5000 }),
        /URL unsafe/i
      );
      assert.equal(calls.length, 1);
    });
  });
});
