import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

interface CreateInspirationBody {
  platform?: string;
  platformUrl?: string;
  authorUsername?: string;
  authorName?: string;
  textContent?: string;
  likesCount?: number;
  sharesCount?: number;
  viewsCount?: number;
  commentsCount?: number;
  tags?: string[];
  notes?: string;
  title?: string;
  source?: "firecrawl" | "fallback" | "manual";
}

function toNumber(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { data, error } = await session.supabase
    .from("inspirations")
    .select(
      "id,platform,platform_url,author_username,author_name,text_content,likes_count,shares_count,views_count,tags,notes,created_at,repurpose_ideas"
    )
    .eq("organization_id", session.organizationId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: "Nu s-a putut incarca lista de inspiratie." },
      { status: 500 }
    );
  }

  const items = (data || []).map((row) => {
    const meta = (row.repurpose_ideas ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      platform: row.platform,
      url: row.platform_url,
      authorUsername: row.author_username,
      authorName: row.author_name,
      text: row.text_content,
      likes: row.likes_count,
      shares: row.shares_count,
      views: row.views_count,
      comments:
        typeof meta.commentsCount === "number" ? Math.max(0, Math.floor(meta.commentsCount)) : 0,
      tags: row.tags || [],
      notes: row.notes,
      title: typeof meta.title === "string" ? meta.title : undefined,
      source: typeof meta.source === "string" ? meta.source : undefined,
      savedAt: row.created_at,
    };
  });

  return NextResponse.json({ inspirations: items });
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  let body: CreateInspirationBody;
  try {
    body = (await request.json()) as CreateInspirationBody;
  } catch {
    return NextResponse.json(
      { error: "Body invalid. Trimite JSON valid." },
      { status: 400 }
    );
  }

  const platform = body.platform?.trim() || "other";
  const platformUrl = body.platformUrl?.trim();
  if (!platformUrl) {
    return NextResponse.json(
      { error: "platformUrl este obligatoriu." },
      { status: 400 }
    );
  }

  const textContent = body.textContent?.trim() || null;
  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const payload = {
    organization_id: session.organizationId,
    saved_by: session.user.id,
    platform,
    platform_url: platformUrl,
    author_username: body.authorUsername?.trim() || null,
    author_name: body.authorName?.trim() || null,
    text_content: textContent,
    media_urls: [],
    likes_count: toNumber(body.likesCount),
    shares_count: toNumber(body.sharesCount),
    views_count: toNumber(body.viewsCount),
    folder: "unsorted",
    tags,
    notes: body.notes?.trim() || null,
    repurpose_ideas: {
      title: body.title?.trim() || null,
      source: body.source || "manual",
      commentsCount: toNumber(body.commentsCount),
    },
  };

  const { data, error } = await session.supabase
    .from("inspirations")
    .insert(payload)
    .select("id,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Nu s-a putut salva inspiratia." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: data.id,
    createdAt: data.created_at,
  });
}
