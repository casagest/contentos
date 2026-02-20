import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";
import { extractVoiceDNA } from "@/lib/ai/voice-dna";

/**
 * POST /api/ai/voice-dna
 * Extract Voice DNA from user's existing drafts/posts.
 * Stores result in organization settings.
 *
 * Body: { posts?: string[] }
 * If posts not provided, fetches from drafts table.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: { posts?: string[] } = {};
  try {
    body = (await request.json()) as { posts?: string[] };
  } catch {
    // empty body is fine — we'll fetch from DB
  }

  let posts: string[] = [];

  if (Array.isArray(body.posts) && body.posts.length > 0) {
    // Use provided posts
    posts = body.posts.filter((p): p is string => typeof p === "string" && p.trim().length > 20);
  } else {
    // Fetch from drafts
    const { data: drafts } = await session.supabase
      .from("drafts")
      .select("body")
      .eq("organization_id", session.organizationId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (drafts) {
      posts = drafts
        .map((d) => (typeof d.body === "string" ? d.body : ""))
        .filter((p) => p.trim().length > 20);
    }
  }

  if (posts.length < 3) {
    return NextResponse.json(
      {
        error: "Minimum 3 postări necesare pentru extragerea Voice DNA.",
        postsFound: posts.length,
      },
      { status: 400 }
    );
  }

  const dna = extractVoiceDNA(posts);

  // Store in organization settings
  const { data: orgData } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const currentSettings = (orgData?.settings as Record<string, unknown>) || {};

  const { error: updateError } = await session.supabase
    .from("organizations")
    .update({
      settings: {
        ...currentSettings,
        voiceDNA: dna,
      },
    })
    .eq("id", session.organizationId);

  if (updateError) {
    return NextResponse.json(
      { error: "Eroare la salvarea Voice DNA.", details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    voiceDNA: dna,
    message: `Voice DNA extras din ${dna.sampleSize} postări.`,
  });
}

/**
 * GET /api/ai/voice-dna
 * Retrieve stored Voice DNA for the organization.
 */
export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { data: orgData } = await session.supabase
    .from("organizations")
    .select("settings")
    .eq("id", session.organizationId)
    .single();

  const settings = orgData?.settings as Record<string, unknown> | null;
  const voiceDNA = settings?.voiceDNA || null;

  return NextResponse.json({ voiceDNA });
}
