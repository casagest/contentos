import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { routeAICall } from "@/lib/ai/multi-model-router";
import { analyzeImagesWithVision } from "@/lib/ai/vision";
import type { BusinessProfile } from "@contentos/database";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };
const MAX_IMAGES = 5;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls
          .filter((u: unknown): u is string => typeof u === "string" && u.startsWith("http"))
          .slice(0, MAX_IMAGES)
      : [];

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "Trimite cel puțin o URL de imagine." },
        { status: 400, ...NO_STORE }
      );
    }

    const { supabase } = session;

    let businessProfile: BusinessProfile | null = null;
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", session.organizationId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings?.businessProfile) {
      businessProfile = settings.businessProfile as BusinessProfile;
    }

    const bp = businessProfile;
    const context = bp
      ? `Brand: ${bp.name}, Industrie: ${bp.industry}, Audiență: ${bp.targetAudience}`
      : "";

    const systemPrompt =
      "Ești expert în analiză vizuală și creative direction. Răspunde DOAR cu JSON valid, fără markdown.";

    const textPrompt = `Analizează imaginile atașate pentru conținut creativ.

Extrage:
1. PALETĂ DE CULORI: culorile dominante
2. STIL VIZUAL: minimal, colorat, vintage, modern, organic etc.
3. TON EMOȚIONAL: ce transmite (cald, profesional, playful, serios)
4. ELEMENTE CHEIE: obiecte, scene, compoziție
5. MESAJ IMPLICIT: ce comunică imaginea

Apoi generează un brief creativ (2-3 propoziții) pentru postare social media care să reflecte acest stil vizual.
${context ? `\nContext brand: ${context}` : ""}

Răspunde JSON valid:
{
  "palette": ["culoare1", "culoare2"],
  "style": "string",
  "tone": "string",
  "elements": ["elem1", "elem2"],
  "creativeBrief": "text scurt pentru copywriter",
  "suggestedHashtags": ["#tag1", "#tag2"]
}`;

    let aiText: string;
    let provider = "fallback";
    let model = "text";

    const visionResult = await analyzeImagesWithVision({
      imageUrls,
      prompt: textPrompt,
      systemPrompt,
    });

    if (visionResult) {
      aiText = visionResult.text;
      provider = visionResult.provider;
      model = visionResult.model;
    } else {
      const imageBlock =
        imageUrls.length === 1
          ? `[Imagine: ${imageUrls[0]}]`
          : imageUrls.map((u: string, i: number) => `[Imagine ${i + 1}: ${u}]`).join("\n");
      const fallbackPrompt = `Analizează aceste imagini de inspirație (URL-uri):\n${imageBlock}\n\n${textPrompt}`;
      const aiResult = await routeAICall({
        task: "braindump",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: fallbackPrompt },
        ],
        maxTokens: 600,
      });
      aiText = aiResult.text;
      provider = aiResult.provider;
      model = aiResult.model;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(
        aiText.replace(/```json\s*|\s*```/g, "").trim()
      );
    } catch {
      return NextResponse.json({
        ok: true,
        creativeBrief: aiText.slice(0, 500),
        palette: [],
        style: "necunoscut",
        meta: { provider, model },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        palette: parsed.palette || [],
        style: parsed.style || "",
        tone: parsed.tone || "",
        elements: parsed.elements || [],
        creativeBrief: parsed.creativeBrief || "",
        suggestedHashtags: parsed.suggestedHashtags || [],
        meta: { provider, model },
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Mood board error:", err);
    return NextResponse.json(
      { error: "Eroare la analiză." },
      { status: 500, ...NO_STORE }
    );
  }
}
