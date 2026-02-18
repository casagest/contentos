/**
 * Normalizează URL-ul Supabase pentru a evita eroarea "requested path is invalid".
 * Supabase JS client nu suportă trailing slash — produce path-uri malformate.
 */
export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const trimmed = url.trim().replace(/\/+$/, ""); // elimină trailing slash(uri)
  return trimmed;
}
