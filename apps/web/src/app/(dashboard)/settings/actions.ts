"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BusinessProfile } from "@contentos/database";

export async function saveBusinessProfile(profile: BusinessProfile) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Neautentificat." };
  }

  // Get user's organization_id
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.organization_id) {
    return { error: "Nu s-a gasit organizatia." };
  }

  // Fetch current settings to merge
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  if (orgError) {
    return { error: "Eroare la citirea setarilor." };
  }

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const updatedSettings = {
    ...currentSettings,
    businessProfile: profile,
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ settings: updatedSettings })
    .eq("id", userData.organization_id);

  if (updateError) {
    return { error: `Eroare la salvare: ${updateError.message}` };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
