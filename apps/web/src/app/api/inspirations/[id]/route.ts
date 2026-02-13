import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "ID invalid." }, { status: 400 });
  }

  const { error } = await session.supabase
    .from("inspirations")
    .delete()
    .eq("id", id)
    .eq("organization_id", session.organizationId);

  if (error) {
    return NextResponse.json(
      { error: "Nu s-a putut sterge inspiratia." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}