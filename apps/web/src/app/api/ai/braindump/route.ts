import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Ești un expert în social media marketing, specializat pe piața românească.
Transformi gânduri brute și idei în postări virale, optimizate pentru algoritmi.

REGULI STRICTE:
1. Generezi conținut EXCLUSIV pe baza textului primit de la utilizator - nu inventa informații
2. Scrie NATIV în română cu diacritice corecte (ă, â, î, ș, ț)
3. Adaptează tonul și formatul per platformă:
   - Facebook: conversațional, informativ, 100-250 cuvinte, CTA clar
   - Instagram: vizual, aspirațional, caption + 25-30 hashtags relevante, emoji strategic
   - TikTok: hook puternic în primele 2 secunde, script 15-60s, trending sounds, Gen Z friendly
   - YouTube: titlu SEO click-worthy, descriere 200+ cuvinte cu keywords, 15-20 tags
4. Folosește expresii și referințe culturale românești
5. Include CTA-uri clare per platformă
6. Emoji-uri: folosește strategic, nu exagerat (max 5-7 per post)
7. Pentru conținut medical/dental: respectă CMSR 2025:
   - ZERO superlative absolute (cel mai bun, nr. 1, unic)
   - ZERO rezultate garantate
   - Include disclaimer: "Rezultatele pot varia. Consultați un specialist."
   - ZERO comparații cu alte clinici
   - ZERO reduceri la acte medicale
8. NU inventa statistici, testimoniale sau informații pe care utilizatorul nu le-a furnizat

FORMAT RĂSPUNS: Răspunde STRICT în JSON valid conform structurii cerute. Fără markdown, fără backticks, fără text în afara JSON-ului.

Structura exactă:
{
  "platforms": {
    "facebook": {
      "content": "textul complet al postării",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "estimatedEngagement": "Medium",
      "tips": ["Tip 1", "Tip 2"]
    },
    "instagram": {
      "caption": "caption-ul complet",
      "hashtags": ["#hashtag1", "#hashtag2", "...max 30"],
      "altText": "descriere imagine pentru accesibilitate",
      "bestTimeToPost": "ora optimă de postare",
      "tips": ["Tip 1", "Tip 2"]
    },
    "tiktok": {
      "hook": "primele 2 secunde - hook-ul care oprește scroll-ul",
      "script": "scriptul complet 15-60s",
      "hashtags": ["#hashtag1", "#hashtag2"],
      "soundSuggestion": "sugestie de sunet/trend",
      "tips": ["Tip 1", "Tip 2"]
    },
    "youtube": {
      "title": "titlu SEO optimizat",
      "description": "descriere completă cu timestamps",
      "tags": ["tag1", "tag2"],
      "thumbnailIdea": "idee pentru thumbnail",
      "tips": ["Tip 1", "Tip 2"]
    }
  }
}

Generează DOAR platformele cerute. Nu include platforme care nu sunt în lista cerută.`;

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
        { error: "Configurare server incompletă. Cheia API lipsește." },
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
        { error: "Selectează cel puțin o platformă." },
        { status: 400 }
      );
    }

    const validPlatforms = ["facebook", "instagram", "tiktok", "youtube"];
    const platforms = body.platforms.filter((p) => validPlatforms.includes(p));

    if (!platforms.length) {
      return NextResponse.json(
        { error: "Nicio platformă validă selectată." },
        { status: 400 }
      );
    }

    const language = body.language === "en" ? "en" : "ro";
    const languageInstruction =
      language === "en"
        ? "\n\nIMPORTANT: The user requested content in ENGLISH. Write all content in English, but keep the same quality and structure."
        : "";

    const userMessage = `PLATFORME CERUTE: ${platforms.join(", ")}

TEXTUL UTILIZATORULUI (transformă DOAR acest conținut în postări social media):
"""
${body.rawInput.slice(0, 4000)}
"""
${languageInstruction}
IMPORTANT: Generează conținut EXCLUSIV pe baza textului de mai sus. Nu adăuga informații, statistici sau detalii care nu sunt menționate în text. Răspunde STRICT în JSON valid. Generează DOAR pentru platformele: ${platforms.join(", ")}.`;

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: userMessage,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "Răspunsul AI nu conține text." },
        { status: 500 }
      );
    }

    let parsed;
    try {
      // Try to extract JSON from the response - sometimes the model wraps it
      let jsonText = textBlock.text.trim();
      // Remove potential markdown code fences
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        {
          error: "Eroare la procesarea răspunsului AI. Încearcă din nou.",
          raw: textBlock.text,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    // Handle Anthropic-specific errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          {
            error:
              "Prea multe cereri. Te rugăm să aștepți câteva secunde și să încerci din nou.",
          },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Cheie API invalidă. Verifică configurarea." },
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
      {
        error:
          "A apărut o eroare neașteptată. Te rugăm să încerci din nou.",
      },
      { status: 500 }
    );
  }
}
