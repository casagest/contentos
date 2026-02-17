/**
 * Vision API — analiză imagini pentru mood board
 * Folosește OpenAI GPT-4o (vision) când disponibil, fallback la text
 */

import OpenAI from "openai";

const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim();

export interface VisionResult {
  text: string;
  provider: "openai";
  model: string;
}

/** Analizează imagini cu API vision (OpenAI GPT-4o) */
export async function analyzeImagesWithVision(params: {
  imageUrls: string[];
  prompt: string;
  systemPrompt?: string;
}): Promise<VisionResult | null> {
  if (!OPENAI_KEY || params.imageUrls.length === 0) return null;

  const client = new OpenAI({ apiKey: OPENAI_KEY });

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  for (let i = 0; i < Math.min(params.imageUrls.length, 4); i++) {
    const url = params.imageUrls[i];
    if (!url || !url.startsWith("http")) continue;
    content.push({
      type: "image_url",
      image_url: {
        url,
        detail: "low" as const,
      },
    });
  }

  if (content.length === 0) return null;

  content.push({
    type: "text",
    text: params.prompt,
  });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        ...(params.systemPrompt
          ? [{ role: "system" as const, content: params.systemPrompt }]
          : []),
        { role: "user" as const, content },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    return {
      text,
      provider: "openai",
      model: response.model,
    };
  } catch (err) {
    console.error("Vision API error:", err);
    return null;
  }
}
