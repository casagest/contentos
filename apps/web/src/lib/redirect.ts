/**
 * Sanitizes redirect URLs to prevent open redirect vulnerabilities.
 * Only allows internal, relative paths (starting with /) that do not
 * contain protocol-relative URLs (//) or external schemes.
 */
export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback: string = "/dashboard"
): string {
  if (!value || typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  // Reject protocol-relative, absolute URLs, or paths with : (e.g. javascript:)
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("http:") ||
    trimmed.startsWith("https:") ||
    trimmed.includes(":")
  ) {
    return fallback;
  }
  // Must start with single / and not //
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }
  return trimmed;
}
