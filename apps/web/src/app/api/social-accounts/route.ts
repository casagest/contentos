import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { data: accounts, error } = await session.supabase
    .from("social_accounts")
    .select("id, platform, platform_name, platform_username, avatar_url, sync_status, is_active")
    .eq("organization_id", session.organizationId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching social accounts:", error);
    return NextResponse.json({ accounts: [] });
  }

  return NextResponse.json({ accounts: accounts || [] });
}
