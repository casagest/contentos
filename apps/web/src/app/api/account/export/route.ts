import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let orgData = null;
  let socialAccounts: unknown[] = [];
  let drafts: unknown[] = [];

  if (userData?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", userData.organization_id)
      .single();
    orgData = org;

    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("platform, platform_username, platform_name, created_at")
      .eq("organization_id", userData.organization_id);
    socialAccounts = accounts || [];

    const { data: userDrafts } = await supabase
      .from("drafts")
      .select("title, content, platform, status, created_at, published_at")
      .eq("organization_id", userData.organization_id)
      .order("created_at", { ascending: false });
    drafts = userDrafts || [];
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    user: {
      email: user.email,
      name: user.user_metadata?.full_name,
      createdAt: user.created_at,
    },
    organization: orgData
      ? {
          name: (orgData.settings as Record<string, unknown>)?.businessProfile
            ? ((orgData.settings as Record<string, unknown>).businessProfile as Record<string, unknown>)?.name
            : null,
          plan: orgData.plan,
          settings: orgData.settings,
        }
      : null,
    socialAccounts,
    drafts,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="contentos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
