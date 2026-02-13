import { createHash } from "crypto";

export const SCRAPE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const RESEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function normalizeUrlForCache(rawUrl: string): string {
  const parsed = new URL(rawUrl.trim());

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
    parsed.port = "";
  }

  const params = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  parsed.search = "";
  for (const [key, value] of params) {
    parsed.searchParams.append(key, value);
  }

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/g, "");
  }

  return parsed.toString();
}

export function hashUrl(rawUrl: string): string {
  return createHash("sha256").update(normalizeUrlForCache(rawUrl)).digest("hex");
}

export function expiresAtIso(ttlMs: number): string {
  return new Date(Date.now() + ttlMs).toISOString();
}

export function isFresh(createdAt: string | null | undefined, ttlMs: number): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= ttlMs;
}
