/**
 * Safe JSON response parsing for fetch calls.
 *
 * Handles cases where the server returns non-JSON (HTML error pages,
 * 502 Bad Gateway, 504 Timeout, Vercel edge errors, etc.)
 */

/**
 * Safely parse a JSON error from a non-OK response.
 * Returns the error message or a fallback with the HTTP status.
 */
export async function safeErrorJson(response: Response): Promise<string> {
  try {
    const body = await response.json();
    return body?.error || `Eroare server (${response.status})`;
  } catch {
    return `Eroare server (${response.status}). Încearcă din nou.`;
  }
}

/**
 * Safely parse a JSON body from an OK response.
 * Throws a user-friendly error if the body is not valid JSON.
 */
export async function safeResponseJson<T = unknown>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error("Răspuns invalid de la server. Încearcă din nou.");
  }
}
