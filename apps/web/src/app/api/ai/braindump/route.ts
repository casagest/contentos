import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Esti un expert in social media marketing, specializat pe piata romaneasca.
Transformi ganduri brute si idei in postari virale, optimizate pentru algoritmi.

REGULI STRICTE:
1. Genereaza continut EXCLUSIV pe baza textului primit de la utilizator - NU inventa informatii, NU presupune domeniul de activitate, NU adauga detalii care nu exista in text
2. Daca utilizatorul mentioneaza un website sau un brand, NU presupune ce face acel brand - foloseste DOAR informatiile din textul primit
3. Scrie NATIV in romana cu diacritice corecte (a, a, i, s, t)
4. Adapteaza tonul si formatul per platforma:
   - Facebook: conversational, informativ, 100-250 cuvinte, CTA clar
   - Instagram: vizual, aspirational, caption + 25-30 hashtags relevante, emoji strategic, include alt text
   - TikTok: hook puternic in primele 2 secunde, script 15-60s, trending sounds, Gen Z friendly
   - YouTube: titlu SEO click-worthy, descriere 200+ cuvinte cu keywords, 15-20 tags, idee thumbnail
5. Foloseste expresii si referinte culturale romanesti
6. Include CTA-uri clare per platforma
7. Emoji-uri: foloseste strategic, nu exagerat (max 5-7 per post)
8. Pentru continut medical/dental (DOAR daca utilizatorul mentioneaza explicit):
   - ZERO superlative absolute (cel mai bun, nr. 1, unic)
   - ZERO rezultate garantate
   - Include disclaimer: "Rezultatele pot varia. Consultati un specialist."
   - ZERO comparatii cu alte clinici
9. NU inventa statistici, testimoniale sau informatii pe care utilizatorul nu le-a furnizat
10. Estimeaza engagement-ul potential (Low / Medium / High / Viral Potential)
11. Ofera 2-3 tips specifice per platforma

FORMAT RASPUNS: Raspunde STRICT in JSON valid, fara markdown, fara backticks. Structura exacta:
{
  "platforms": {
    "facebook": {
      "content": "textul complet al postarii",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "estimatedEngagement": "Medium",
      "tips": ["Tip 1", "Tip 2"]
    },
    "instagram": {
      "caption": "caption-ul complet",
      "hashtags": ["#hashtag1", "#hashtag2", "...max 30"],
      "altText": "descriere imagine pentru accesibilitate",
      "bestTimeToPost": "ora optima de postare",
      "tips": ["Tip 1", "Tip 2"]
    },
    "tiktok": {
      "hook": "primele 2 secunde - hook-ul care opreste scroll-ul",
      "script": "scriptul complet 15-60s",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "soundSuggestion": "sugestie de sunet/trend",
      "tips": ["Tip 1", "Tip 2"]
    },
    "youtube": {
      "title": "titlu SEO optimizat",
      "description": "descriere completa cu timestamps",
      "tags": ["tag1", "tag2"],
      "thumbnailIdea": "idee pentru thumbnail",
      "tips": ["Tip 1", "Tip 2"]
    }
  }
}

Genereaza DOAR platformele cerute.`;

interface BrainDumpRequest {
  rawInput: string;
  platforms: string[];
  language: "ro" | "en";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Configurare server incompleta. Cheia API lipseste." },
        { status: 500 }
      );
    }

    const body: BrainDumpRequest = await request.json();

    if (!body.rawInput?.trim()) {
      return NextResponse.json(
        { error: "Textul nu poate fi gol." },
        { status: 400 }
      );
    }

    if (!body.platforms?.length) {
      return NextResponse.json(
        { error: "Selecteaza cel putin o platforma." },
        { status: 400 }
      );
    }

    const validPlatforms = ["facebook", "instagram", "tiktok", "youtube"];
    const platforms = body.platforms.filter((p) => validPlatforms.includes(p));

    if (!platforms.length) {
      return NextResponse.json(
        { error: "Nicio platforma valida selectata." },
        { status: 400 }
      );
    }

    const language = body.language === "en" ? "en" : "ro";
    const languageInstruction =
      language === "en"
        ? "\n\nIMPORTANT: Write all content in ENGLISH."
        : "";

    const userMessage = `Genereaza continut optimizat pentru: ${platforms.join(", ")}.

TEXTUL UTILIZATORULUI (foloseste DOAR aceste informatii, nu inventa nimic in plus):
"""
${body.rawInput.slice(0, 4000)}
"""
${languageInstruction}

Raspunde STRICT in JSON valid. Genereaza DOAR pentru: ${platforms.join(", ")}.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: userMessage }],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Raspunsul AI nu contine text." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      let jsonText = textBlock.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Eroare la procesarea raspunsului AI. Incearca din nou.", raw: textBlock.text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Prea multe cereri. Asteapta cateva secunde." },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Cheie API invalida." },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: `Eroare API: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    console.error("Brain Dump AI Error:", error);
    return NextResponse.json(
      { error: "Eroare neasteptata. Incearca din nou." },
      { status: 500 }
    );
  }
}
