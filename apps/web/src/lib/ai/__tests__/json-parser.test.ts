import { describe, it, expect } from "vitest";

/**
 * Robust JSON parser for AI responses
 * Handles markdown code blocks, BOM, control characters, trailing commas,
 * preamble text, and balanced brace extraction
 */
export function parseAIJsonResponse(text: string): any {
  let parsed = null;
  try {
    let cleanText = text || "";

    // Step 1: Strip markdown code blocks
    const codeBlockMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    // Step 2: Remove BOM and control characters (except newlines/tabs)
    cleanText = cleanText.replace(/^\uFEFF/, "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

    // Step 3: If text starts with a key (no outer braces), wrap in {}
    const trimmedForCheck = cleanText.trim();
    if (trimmedForCheck.startsWith("\"") && trimmedForCheck.includes("\"platformVersions\"")) {
      cleanText = "{" + cleanText + "}";
    }

    // Step 4: Fix common JSON issues from LLMs
    // Remove trailing commas before } or ]
    cleanText = cleanText.replace(/,\s*([\]}])/g, "$1");
    // Remove any trailing text after last }
    const lastBrace = cleanText.lastIndexOf("}");
    if (lastBrace !== -1 && lastBrace < cleanText.length - 1) {
      cleanText = cleanText.substring(0, lastBrace + 1);
    }

    // Step 5: Try direct parse
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      // Step 6: Try balanced brace extraction as fallback
      const jsonStart = cleanText.indexOf("{");
      if (jsonStart !== -1) {
        let depth = 0;
        let jsonEnd = -1;
        let inString = false;
        let escapeNext = false;
        for (let i = jsonStart; i < cleanText.length; i++) {
          const char = cleanText[i];
          if (escapeNext) { escapeNext = false; continue; }
          if (char === "\\") { escapeNext = true; continue; }
          if (char === "\"") { inString = !inString; continue; }
          if (!inString) {
            if (char === "{") depth++;
            else if (char === "}") {
              depth--;
              if (depth === 0) { jsonEnd = i; break; }
            }
          }
        }
        if (jsonEnd !== -1) {
          const extracted = cleanText.substring(jsonStart, jsonEnd + 1);
          // Also fix trailing commas in extracted text
          const fixedExtracted = extracted.replace(/,\s*([\]}])/g, "$1");
          try {
            parsed = JSON.parse(fixedExtracted);
          } catch {
            parsed = null;
          }
        }
      }
    }
  } catch {
    parsed = null;
  }
  return parsed;
}

describe("parseAIJsonResponse", () => {
  it("parses clean JSON object", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON wrapped in markdown code blocks with json tag", () => {
    const input = '```json\n{"platformVersions": {"facebook": {"text": "test"}}}\n```';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON wrapped in markdown code blocks without json tag", () => {
    const input = '```\n{"platformVersions": {"facebook": {"text": "test"}}}\n```';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with preamble text before", () => {
    const input = 'Here is your content:\n{"platformVersions": {"facebook": {"text": "test"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with text after", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test"}}}\nHope this helps!';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with both preamble and postamble text", () => {
    const input = 'Let me generate that for you:\n{"platformVersions": {"facebook": {"text": "test"}}}\nEnjoy!';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles nested JSON objects with balanced braces", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test", "meta": {"nested": {"deep": "value"}}}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test",
          meta: {
            nested: {
              deep: "value"
            }
          }
        }
      }
    });
  });

  it("handles JSON with strings containing curly braces", () => {
    const input = '{"platformVersions": {"facebook": {"text": "Use {variable} syntax"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "Use {variable} syntax"
        }
      }
    });
  });

  it("handles markdown code block with preamble", () => {
    const input = 'Sure! Here\'s your content:\n```json\n{"platformVersions": {"facebook": {"text": "test"}}}\n```';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles complex real-world AI response", () => {
    const input = `Here's the social media content you requested:

\`\`\`json
{
  "platformVersions": {
    "facebook": {
      "text": "Check out our new product! 🎉",
      "hashtags": ["#NewProduct", "#Innovation"],
      "alternativeVersions": ["Discover our latest innovation! 🚀"],
      "algorithmScore": {
        "overallScore": 85
      }
    },
    "instagram": {
      "text": "New drop alert! 🔥",
      "hashtags": ["#NewProduct", "#InstaShop"],
      "alternativeVersions": ["Fresh arrivals just landed! ✨"],
      "algorithmScore": {
        "overallScore": 90
      }
    }
  }
}
\`\`\`

Let me know if you need any adjustments!`;
    
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions).toBeDefined();
    expect(result.platformVersions.facebook).toBeDefined();
    expect(result.platformVersions.instagram).toBeDefined();
  });

  it("returns null for invalid JSON", () => {
    const input = "This is not JSON at all";
    const result = parseAIJsonResponse(input);
    expect(result).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test"'; // missing closing braces
    const result = parseAIJsonResponse(input);
    expect(result).toBeNull();
  });

  it("returns null for empty string", () => {
    const input = "";
    const result = parseAIJsonResponse(input);
    expect(result).toBeNull();
  });

  it("handles JSON without outer braces (missing {})", () => {
    const input = `"platformVersions": {
    "facebook": {
      "text": "content here..."
    }
  }`;
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions).toBeDefined();
    expect(result.platformVersions.facebook.text).toBe("content here...");
  });

  it("handles JSON without outer braces inside markdown code block", () => {
    const input = '```json\n  "platformVersions": {\n    "facebook": {\n      "text": "content here..."\n    }\n  }\n```';
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions).toBeDefined();
    expect(result.platformVersions.facebook.text).toBe("content here...");
  });

  it("handles JSON with newlines and whitespace", () => {
    const input = `
    {
      "platformVersions": {
        "facebook": {
          "text": "test"
        }
      }
    }
    `;
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with BOM character at start", () => {
    const input = '\uFEFF{"platformVersions": {"facebook": {"text": "test"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with trailing commas", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test",},},}';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with control characters", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test\x03"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions.facebook.text).toBe("test");
  });

  it("handles JSON with trailing text after closing brace", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test"}}}\n\nI hope this helps!';
    const result = parseAIJsonResponse(input);
    expect(result).toEqual({
      platformVersions: {
        facebook: {
          text: "test"
        }
      }
    });
  });

  it("handles JSON with trailing commas in arrays", () => {
    const input = '{"platformVersions": {"facebook": {"text": "test", "hashtags": ["#one", "#two",]}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions.facebook.hashtags).toEqual(["#one", "#two"]);
  });

  it("preserves text around embedded control characters", () => {
    const input = '{"platformVersions": {"facebook": {"text": "before\x02after content"}}}';
    const result = parseAIJsonResponse(input);
    expect(result).toBeTruthy();
    expect(result.platformVersions.facebook.text).toBe("beforeafter content");
  });
});
