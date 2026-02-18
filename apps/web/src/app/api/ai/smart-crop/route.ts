import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { analyzeImagesWithVision } from "@/lib/ai/vision";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

const PLATFORM_ASPECTS: Record<string, { w: number; h: number; label: string }> = {
  "instagram-square": { w: 1, h: 1, label: "Instagram 1:1" },
  "instagram-portrait": { w: 4, h: 5, label: "Instagram 4:5" },
  "instagram-landscape": { w: 1.91, h: 1, label: "Instagram 1.91:1" },
  "facebook-square": { w: 1, h: 1, label: "Facebook 1:1" },
  "facebook-portrait": { w: 4, h: 5, label: "Facebook 4:5" },
  "facebook-landscape": { w: 1.91, h: 1, label: "Facebook 1.91:1" },
  "tiktok": { w: 9, h: 16, label: "TikTok 9:16" },
  "youtube-thumbnail": { w: 16, h: 9, label: "YouTube 16:9" },
};

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

    let focusHint = "centru";
    const visionResult = await analyzeImagesWithVision({
      imageUrls: [imageUrl],
      prompt: "Unde e punctul focal al imaginii? Răspunde cu UNA din: centru, stanga, dreapta, sus, jos, obiect-mijloc. Doar cuvântul.",
      systemPrompt: "Răspunde cu un singur cuvânt.",
    });

    if (visionResult?.text) {
      const m = visionResult.text.toLowerCase().match(/(centru|stanga|dreapta|sus|jos|obiect|mijloc)/);
      if (m) focusHint = m[1];
    }

    const crops = Object.entries(PLATFORM_ASPECTS).map(([key, spec]) => {
      const aspect = spec.w / spec.h;
      return {
        platform: key,
        label: spec.label,
        aspectRatio: `${spec.w}:${spec.h}`,
        width: Math.round(spec.w * 100),
        height: Math.round(spec.h * 100),
        focusHint,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        imageUrl,
        crops,
        focusHint,
      },
      NO_STORE
    );
  } catch (err) {
    console.error("Smart crop error:", err);
    return NextResponse.json(
      { error: "Eroare la analiză." },
      { status: 500, ...NO_STORE }
    );
  }
}
