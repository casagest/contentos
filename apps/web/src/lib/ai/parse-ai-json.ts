import { jsonrepair } from "jsonrepair";

/**
 * Robust JSON parser for AI model responses.
 *
 * Handles common issues:
 * - Markdown code blocks (```json ... ```)
 * - BOM and control characters
 * - Literal newlines inside JSON string values (Claude)
 * - Trailing commas
 * - Truncated output (unbalanced braces)
 * - Missing opening brace (from assistant prefill)
 * - Unescaped quotes and other edge cases (via jsonrepair)
 */
export function parseAIJson(rawText: string): Record<string, unknown> | null {
  try {
    let text = rawText || "";

    // Step 1: Strip markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch?.[1]) {
      text = codeBlockMatch[1].trim();
    }

    // Step 2: Remove BOM and control characters
    text = text.replace(/^\uFEFF/, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    // Step 3: Ensure starts with {
    text = text.trim();
    if (!text.startsWith("{")) {
      const firstBrace = text.indexOf("{");
      if (firstBrace !== -1) text = text.slice(firstBrace);
      else text = "{" + text;
    }

    // Step 4: Replace ALL literal newlines with spaces
    // (Claude puts real newlines in JSON string values instead of \n)
    text = text.replace(/\r?\n/g, " ").replace(/\r/g, " ");

    // Step 5: Fix trailing commas before ] or }
    text = text.replace(/,\s*([\]}])/g, "$1");

    // Step 6: Trim after last closing brace
    const lastBrace = text.lastIndexOf("}");
    if (lastBrace !== -1) {
      text = text.substring(0, lastBrace + 1);
    }

    // Step 7: jsonrepair handles remaining edge cases
    return JSON.parse(jsonrepair(text)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Formatting rules to append to AI system prompts.
 * Ensures models return raw JSON without markdown wrapping.
 */
export const JSON_FORMAT_RULES = `
CRITICAL: Your response must be RAW JSON only. No markdown. No backticks. No code blocks. No explanation text. Start with { and end with }. Use \\n for line breaks inside text values, never real newlines.`.trim();
