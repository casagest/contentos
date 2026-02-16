/**
 * Resolve the application URL.
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicit, user-set)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (Vercel auto-set for production)
 * 3. VERCEL_URL (Vercel auto-set, preview/production)
 * 4. Fallback to localhost for dev
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit && !explicit.includes("localhost")) return explicit;

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProd) return `https://${vercelProd}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;

  return explicit || "http://localhost:3000";
}
