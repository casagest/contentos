/**
 * SSRF Guard – validates URLs before server-side fetch.
 * Blochează: localhost, IP-uri private/link-local, scheme/port nepermise.
 */

import { lookup } from "dns/promises";

/** Scheme-uri permise (doar HTTP/HTTPS) */
const ALLOWED_SCHEMES = new Set(["http", "https"]);

/** Porturi permise pentru HTTP(S) – 80, 443 sau implicit */
const ALLOWED_PORTS = new Set([80, 443, undefined]);

/** Hostname-uri blocate (case-insensitive) */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "local",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "ip6-localhost",
  "ip6-loopback",
]);

/**
 * Verifică dacă un IP v4 este în range-uri blocate (private, loopback, link-local).
 */
function isIpv4Blocked(parts: number[]): boolean {
  if (parts.length !== 4) return true;
  const [a, b, c, d] = parts;
  // 0.0.0.0/8 – this network
  if (a === 0) return true;
  // 10.0.0.0/8 – private
  if (a === 10) return true;
  // 127.0.0.0/8 – loopback
  if (a === 127) return true;
  // 169.254.0.0/16 – link-local
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 – private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 – private
  if (a === 192 && b === 168) return true;
  // 224.0.0.0/4 – multicast
  if (a >= 224) return true;
  return false;
}

/**
 * Verifică dacă un IP v6 este în range-uri blocate.
 */
function isIpv6Blocked(ip: string): boolean {
  // ::1 – loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  // fe80::/10 – link-local
  if (/^fe8[0-9a-f]:/i.test(ip) || /^fe[9ab][0-9a-f]:/i.test(ip)) return true;
  // fc00::/7 – unique local
  if (/^fc[0-9a-f]{2}:/i.test(ip) || /^fd[0-9a-f]{2}:/i.test(ip)) return true;
  // ::ffff:0:0/96 – IPv4-mapped; verificăm octeții IPv4
  const m = ip.match(/^::ffff:(\d+)\.(\d+)\.(\d+)\.(\d+)$/i);
  if (m) return isIpv4Blocked(m.slice(1).map(Number));
  return false;
}

/**
 * Parsare și validare IP v4.
 */
function parseIpv4(host: string): number[] | null {
  const parts = host.split(".").map((s) => parseInt(s, 10));
  if (parts.length !== 4) return null;
  if (parts.some((n) => isNaN(n) || n < 0 || n > 255)) return null;
  return parts;
}

/**
 * Verifică dacă hostname-ul conține suffix-uri blocate (.local, .internal, etc.)
 */
function hasBlockedSuffix(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower.endsWith(".local") ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".lan") ||
    lower.endsWith(".home")
  );
}

export interface UrlSafetyResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validează un URL pentru fetch server-side. Blochează:
 * - localhost, hostname-uri rezervate
 * - IP-uri private (10.*, 172.16–31.*, 192.168.*)
 * - link-local (169.254.*)
 * - loopback (127.*, ::1)
 * - scheme != http/https
 * - port != 80/443
 * Rezolvă DNS pentru a detecta hostname-uri care mapează la IP-uri private.
 */
export async function isUrlSafeForFetch(url: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "URL invalid" };
  }

  const scheme = parsed.protocol.replace(":", "").toLowerCase();
  if (!ALLOWED_SCHEMES.has(scheme)) {
    return { ok: false, reason: "Doar HTTP și HTTPS sunt permise" };
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : undefined;
  if (!ALLOWED_PORTS.has(port)) {
    return { ok: false, reason: "Doar porturile 80 și 443 sunt permise" };
  }

  const hostname = parsed.hostname;
  if (!hostname) return { ok: false, reason: "Host lipsește" };

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    return { ok: false, reason: "Host blokat (localhost/rezervat)" };
  }

  if (hasBlockedSuffix(hostname)) {
    return { ok: false, reason: "Host blokat (.local/.internal)" };
  }

  // IP v4
  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    if (isIpv4Blocked(ipv4)) {
      return { ok: false, reason: "IP privat/link-local/loopback blokat" };
    }
    return { ok: true };
  }

  // IP v6 (format simplificat; hostname poate fi [::1] sau ::1)
  const ipv6Raw = hostname.replace(/^\[|\]$/g, "");
  if (ipv6Raw.includes(":")) {
    if (isIpv6Blocked(ipv6Raw)) {
      return { ok: false, reason: "IP v6 privat/loopback blokat" };
    }
    return { ok: true };
  }

  // Hostname – rezolvă DNS și verifică IP-urile
  try {
    const { address } = await lookup(hostname, { all: false });
    if (address.includes(":")) {
      if (isIpv6Blocked(address)) {
        return { ok: false, reason: "Host rezolvat la IP privat/link-local" };
      }
    } else {
      const parts = address.split(".").map((s) => parseInt(s, 10));
      if (isIpv4Blocked(parts)) {
        return { ok: false, reason: "Host rezolvat la IP privat/link-local" };
      }
    }
  } catch {
    return { ok: false, reason: "Nu s-a putut rezolva hostname-ul" };
  }

  return { ok: true };
}

/**
 * Verificare sincronă doar pentru URL-uri cu IP cunoscut (fără DNS).
 * Folosită pentru validare rapidă înainte de fetch.
 */
export function isUrlSafeSync(url: string): UrlSafetyResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "URL invalid" };
  }

  const scheme = parsed.protocol.replace(":", "").toLowerCase();
  if (!ALLOWED_SCHEMES.has(scheme)) {
    return { ok: false, reason: "Doar HTTP și HTTPS sunt permise" };
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : undefined;
  if (!ALLOWED_PORTS.has(port)) {
    return { ok: false, reason: "Doar porturile 80 și 443 sunt permise" };
  }

  const hostname = parsed.hostname;
  if (!hostname) return { ok: false, reason: "Host lipsește" };

  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) {
    return { ok: false, reason: "Host blokat (localhost/rezervat)" };
  }

  if (hasBlockedSuffix(hostname)) {
    return { ok: false, reason: "Host blokat (.local/.internal)" };
  }

  const ipv4 = parseIpv4(hostname);
  if (ipv4) {
    if (isIpv4Blocked(ipv4)) {
      return { ok: false, reason: "IP privat/link-local/loopback blokat" };
    }
    return { ok: true };
  }

  const ipv6RawSync = hostname.replace(/^\[|\]$/g, "");
  if (ipv6RawSync.includes(":")) {
    if (isIpv6Blocked(ipv6RawSync)) {
      return { ok: false, reason: "IP v6 privat/loopback blokat" };
    }
    return { ok: true };
  }

  // Hostname fără IP – nu putem verifica fără DNS; returnăm ok dar
  // fetch-ul trebuie să folosească isUrlSafeForFetch cu redirect: manual
  return { ok: true };
}

/** Numărul maxim de redirect-uri permise */
const MAX_REDIRECTS = 5;

export interface SafeFetchOptions {
  /** Timeout în ms (obligatoriu). */
  timeoutMs: number;
  /** Headers opționale. */
  headers?: Record<string, string>;
}

/**
 * Fetch sigur cu protecție SSRF:
 * - Validare URL înainte de request
 * - Redirect chain: fiecare Location este validat; dacă redirecționarea merge la host nepermis, se oprește
 * - Timeout strict
 */
export async function safeFetch(
  inputUrl: string,
  options: SafeFetchOptions
): Promise<Response> {
  const { timeoutMs, headers = {} } = options;

  let currentUrl = inputUrl;
  let redirectCount = 0;

  while (redirectCount <= MAX_REDIRECTS) {
    const safety = await isUrlSafeForFetch(currentUrl);
    if (!safety.ok) {
      throw new Error(`URL unsafe: ${safety.reason}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(currentUrl, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ContentosBot/1.0; +https://contentos.app)",
        Accept: "text/html, application/xhtml+xml, text/plain",
        ...headers,
      },
    });

    clearTimeout(timeout);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;
      continue;
    }

    return res;
  }

  throw new Error("Prea multe redirect-uri");
}
