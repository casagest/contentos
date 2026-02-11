import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("id");

  if (!accountId) {
    return NextResponse.json({ error: "Account ID required" }, { status: 400 });
  }

  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { error } = await session.supabase
    .from("social_accounts")
    .delete()
    .eq("id", accountId)
    .eq("organization_id", session.organizationId);

  if (error) {
    console.error("Error deleting social account:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
