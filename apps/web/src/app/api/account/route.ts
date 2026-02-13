import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userData?.organization_id) {
    // Deactivate all social accounts
    await supabase
      .from("social_accounts")
      .update({ is_active: false })
      .eq("organization_id", userData.organization_id);

    // Mark organization as deleted
    await supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", userData.organization_id);
  }

  // Sign out the user
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
