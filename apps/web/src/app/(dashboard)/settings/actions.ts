"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
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

  // Use service client for DB operations (bypasses RLS that silently blocks)
  const serviceClient = createServiceClient();

  // Fetch current settings to merge
  const { data: org, error: orgError } = await serviceClient
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

  // Use .select() to verify rows were actually updated
  const { data: updateResult, error: updateError } = await serviceClient
    .from("organizations")
    .update({ settings: updatedSettings })
    .eq("id", userData.organization_id)
    .select("id");

  if (updateError) {
    return { error: `Eroare la salvare: ${updateError.message}` };
  }

  // Detect if 0 rows affected
  if (!updateResult || updateResult.length === 0) {
    return {
      error:
        "Salvarea nu a reusit — organizatia nu a fost gasita.",
    };
  }

  // Verify the data was actually persisted
  const { data: verifyOrg } = await serviceClient
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  const savedSettings = verifyOrg?.settings as Record<string, unknown> | null;
  const savedProfile = savedSettings?.businessProfile as Record<
    string,
    unknown
  > | null;

  if (!savedProfile || savedProfile.description !== profile.description) {
    return {
      error: "Datele nu s-au salvat corect in baza de date. Incercati din nou.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true, savedProfile: profile };
}

export async function updateUserName(name: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Neautentificat." };
  }

  const { error } = await supabase.auth.updateUser({
    data: { full_name: name },
  });

  if (error) {
    return { error: `Eroare la salvare: ${error.message}` };
  }

  // NOTE: Do NOT call revalidatePath("/settings") here.
  // ProfileSection already tracks the name in local state.
  // revalidatePath remounts ALL client components on the page,
  // which resets BusinessProfileForm's unsaved state (data loss).
  return { success: true };
}

export async function saveNotificationPrefs(prefs: Record<string, boolean>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Neautentificat." };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) {
    return { error: "Nu s-a gasit organizatia." };
  }

  const notifService = createServiceClient();

  const { data: org } = await notifService
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const updatedSettings = {
    ...currentSettings,
    notifications: prefs,
  };

  const { data: updateResult, error } = await notifService
    .from("organizations")
    .update({ settings: updatedSettings })
    .eq("id", userData.organization_id)
    .select("id");

  if (error) {
    return { error: `Eroare la salvare: ${error.message}` };
  }

  if (!updateResult || updateResult.length === 0) {
    return { error: "Salvarea nu a reusit." };
  }

  return { success: true };
}
