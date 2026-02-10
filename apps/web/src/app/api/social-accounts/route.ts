import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ accounts: [] }, { status: 401 });
  }

  // Use service client to query public schema
  const serviceClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's org
  const { data: userData } = await serviceClient
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData) {
    return NextResponse.json({ accounts: [] });
  }

  // Get connected accounts from public schema
  const { data: accounts, error } = await serviceClient
    .from("social_accounts")
    .select("id, platform, platform_name, platform_username, avatar_url, sync_status, is_active")
    .eq("organization_id", userData.organization_id)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching social accounts:", error);
    return NextResponse.json({ accounts: [] });
  }

  return NextResponse.json({ accounts: accounts || [] });
}
