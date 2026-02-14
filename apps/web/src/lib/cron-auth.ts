// ============================================================================
// Shared cron authentication — timing-safe CRON_SECRET comparison
//
// Extracted from memory-consolidation/route.ts which was the only cron
// using crypto.timingSafeEqual. All 5 crons must use this.
// ============================================================================

import * as crypto from "node:crypto";

/**
 * Verify the CRON_SECRET from a Bearer token in the Authorization header.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 *
 * @returns true if the token matches CRON_SECRET
 */
export function verifyCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("cron_config_missing: CRON_SECRET not set");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) return false;

  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(cronSecret, "utf8");

  if (a.length !== b.length) {
    // Constant-time comparison even for different lengths
    // (prevents length-based timing leak)
    crypto.timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}
