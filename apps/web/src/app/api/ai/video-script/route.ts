import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";

/**
 * POST /api/ai/video-script
 * Generate a video script for TikTok/Reels/Shorts/YouTube
 */

interface VideoScriptRequest {
  topic: string;
  platform: "tiktok" | "instagram" | "youtube" | "facebook";
  duration: "15s" | "30s" | "60s" | "3min" | "10min";
  style: "educational" | "testimonial" | "behind-scenes" | "how-to" | "storytelling" | "comparison";
  language?: "ro" | "en";
  isDental?: boolean;
}

const DURATION_SECONDS: Record<string, number> = {
  "15s": 15,
  "30s": 30,
  "60s": 60,
  "3min": 180,
  "10min": 600,
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = (await request.json()) as VideoScriptRequest;
    const { topic, platform, duration, style, language = "ro", isDental = false } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Subiectul este obligatoriu." }, { status: 400 });
    }

    const durationSec = DURATION_SECONDS[duration] || 60;
    const dentalContext = isDental
      ? `\nCONTEXT: Clinică dentară. Respectă regulile CMSR 2025:
- NU exagera rezultatele, NU folosi superlative absolute
- Include disclaimer "Rezultatele pot varia"
- Before/After necesită consimțământ GDPR
- NU compara cu alte clinici`
      : "";

    const prompt = `Generează un script video detaliat pentru ${platform}.

SUBIECT: ${topic}
DURATĂ: ${duration} (${durationSec} secunde)
STIL: ${style}
LIMBA: ${language === "ro" ? "Română" : "English"}
${dentalContext}

STRUCTURĂ OBLIGATORIE:
1. HOOK (primele 1-3 secunde) — captează atenția IMEDIAT
2. CONȚINUT — informația principală, împărțită în secțiuni
3. CTA — îndemn la acțiune final

Pentru FIECARE secțiune, specifică:
- timestamp: "0:00-0:03"
- type: "hook" | "content" | "cta" | "transition"
- visual: ce se vede pe ecran (cadraj, unghiuri, b-roll)
- audio: ce se spune (script exact, word-for-word)
- textOverlay: text suprapus pe video (opțional)
- notes: note tehnice (tranziții, efecte, muzică)

IMPORTANT:
- Script-ul audio trebuie să fie EXACT — cuvânt cu cuvânt
- Visual-urile trebuie să fie specifice și filmabile
- Textul overlay trebuie să fie scurt (max 8 cuvinte)
- Adaptează ritmul la platformă: ${platform === "tiktok" ? "rapid, dinamic, jump cuts" : platform === "youtube" ? "mai detaliat, narativ" : "vizual, carousel-friendly"}

Răspunde în JSON:
{
  "title": "titlul scriptului",
  "sections": [{ "timestamp": "0:00-0:03", "type": "hook", "visual": "...", "audio": "...", "textOverlay": "...", "notes": "..." }],
  "musicSuggestion": "tip de muzică recomandată",
  "equipmentNeeded": ["telefon", "trepied"],
  "estimatedProductionTime": "30 min",
  "tips": ["sfat 1", "sfat 2"]
}`;

    const result = await routeAICall({
      task: "braindump",
      messages: [
        { role: "system", content: "Ești un regizor video specializat în conținut social media. Răspunzi doar în JSON valid." },
        { role: "user", content: prompt },
      ],
      maxTokens: 2000,
    });

    // Parse JSON response
    let script;
    try {
      const text = result.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      script = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Nu am putut genera scriptul." };
    } catch {
      script = { raw: result.text, error: "Răspuns invalid de la AI." };
    }

    return NextResponse.json({
      script,
      meta: {
        model: result.model,
        tokens: (result.inputTokens || 0) + (result.outputTokens || 0),
      },
    });
  } catch (err) {
    console.error("Video script error:", err);
    return NextResponse.json({ error: "Eroare la generarea scriptului." }, { status: 500 });
  }
}
