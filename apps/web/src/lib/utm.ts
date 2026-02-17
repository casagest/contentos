/**
 * UTM parameter builder for tracking social media post links.
 * Automatically adds utm_source, utm_medium, utm_campaign, utm_content to URLs.
 */

interface UTMParams {
  source: string; // e.g. "facebook", "instagram"
  medium?: string; // e.g. "social", "organic"
  campaign?: string; // e.g. "autopilot-week-7", "dental-tips"
  content?: string; // e.g. post ID or draft ID
  term?: string; // e.g. keyword
}

/**
 * Add UTM parameters to a URL.
 * If the URL already has UTM params, they are preserved.
 */
export function addUTMParams(url: string, params: UTMParams): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("utm_source")) {
      parsed.searchParams.set("utm_source", params.source);
    }
    if (params.medium && !parsed.searchParams.has("utm_medium")) {
      parsed.searchParams.set("utm_medium", params.medium || "social");
    }
    if (params.campaign && !parsed.searchParams.has("utm_campaign")) {
      parsed.searchParams.set("utm_campaign", params.campaign);
    }
    if (params.content && !parsed.searchParams.has("utm_content")) {
      parsed.searchParams.set("utm_content", params.content);
    }
    if (params.term && !parsed.searchParams.has("utm_term")) {
      parsed.searchParams.set("utm_term", params.term);
    }
    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Extract URLs from post text and add UTM params to them.
 */
export function addUTMToPostText(text: string, params: UTMParams): string {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return text.replace(urlRegex, (match) => addUTMParams(match, params));
}

/**
 * Generate a default campaign name from draft metadata.
 */
export function generateCampaignName(opts: {
  source?: string;
  draftId?: string;
  weekNumber?: number;
}): string {
  const parts: string[] = [];
  if (opts.source) parts.push(opts.source);
  if (opts.weekNumber) parts.push(`w${opts.weekNumber}`);
  if (opts.draftId) parts.push(opts.draftId.slice(0, 8));
  return parts.join("-") || "contentos";
}
