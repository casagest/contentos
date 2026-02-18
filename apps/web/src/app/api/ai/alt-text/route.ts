import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { analyzeImagesWithVision } from "@/lib/ai/vision";
import { routeAICall } from "@/lib/ai/multi-model-router";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithOrg();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.startsWith("http")
        ? body.imageUrl
        : "";

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL imagine obligatoriu." },
        { status: 400, ...NO_STORE }
      );
    }

    const visionResult = await analyzeImagesWithVision({
      imageUrls: [imageUrl],
      prompt: `Descrie imaginea pentru accesibilitate (screen readers). Generează un alt text scurt (max 125 caractere) care descrie conținutul esențial. Returnează DOAR textul, fără ghilimele sau formatare.`,
      systemPrompt: "Ești expert în accesibilitate. Returnează doar textul alt, fără explicații.",
    });

    if (visionResult) {
      const altText = visionResult.text.replace(/^["']|["']$/g, "").trim().slice(0, 125);
      return NextResponse.json(
        { ok: true, altText, provider: "vision" },
        NO_STORE
      );
    }

    const aiResult = await routeAICall({
      task: "braindump",
      messages: [
        {
          role: "system",
          content: "Generează alt text pentru accesibilitate (max 125 caractere). Doar textul.",
        },
        {
          role: "user",
          content: `Imagine: ${imageUrl}\n\nGenerează alt text scurt pentru screen readers.`,
        },
      ],
      maxTokens: 150,
    });

    const altText = aiResult.text.replace(/^["']|["']$/g, "").trim().slice(0, 125);

    return NextResponse.json(
      { ok: true, altText, provider: aiResult.provider },
      NO_STORE
    );
  } catch (err) {
    console.error("Alt text error:", err);
    return NextResponse.json(
      { error: "Eroare la generare." },
      { status: 500, ...NO_STORE }
    );
  }
}
