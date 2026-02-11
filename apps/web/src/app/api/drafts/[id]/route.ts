import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getAuthContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return null;

  return { userId: user.id, orgId: userData.organization_id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await getAuthContext(supabase);

    if (!auth) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { id } = await params;

    const { data: draft, error } = await supabase
      .from("drafts")
      .select("*")
      .eq("id", id)
      .eq("organization_id", auth.orgId)
      .single();

    if (error || !draft) {
      return NextResponse.json(
        { error: "Draft-ul nu a fost găsit." },
        { status: 404 }
      );
    }

    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Draft GET error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await getAuthContext(supabase);

    if (!auth) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "title",
      "body",
      "hashtags",
      "target_platforms",
      "platform_versions",
      "algorithm_scores",
      "status",
      "scheduled_at",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Niciun câmp de actualizat." },
        { status: 400 }
      );
    }

    const { data: draft, error } = await supabase
      .from("drafts")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", auth.orgId)
      .select()
      .single();

    if (error || !draft) {
      console.error("Draft update error:", error);
      return NextResponse.json(
        { error: "Eroare la actualizarea draft-ului." },
        { status: 500 }
      );
    }

    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Draft PATCH error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const auth = await getAuthContext(supabase);

    if (!auth) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from("drafts")
      .delete()
      .eq("id", id)
      .eq("organization_id", auth.orgId);

    if (error) {
      console.error("Draft delete error:", error);
      return NextResponse.json(
        { error: "Eroare la ștergerea draft-ului." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Draft DELETE error:", err);
    return NextResponse.json(
      { error: "Eroare internă." },
      { status: 500 }
    );
  }
}
