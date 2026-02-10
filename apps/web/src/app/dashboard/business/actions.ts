"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Industry } from "@contentos/database/schemas/types";

export async function saveKpiValues(kpis: Record<string, number>) {
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
    return { error: "Nu s-a găsit organizația." };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const updatedSettings = {
    ...currentSettings,
    dashboardKpis: kpis,
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ settings: updatedSettings })
    .eq("id", userData.organization_id);

  if (updateError) {
    return { error: `Eroare la salvare: ${updateError.message}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  return { success: true };
}

export async function quickSetIndustry(industry: Industry) {
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
    return { error: "Nu s-a găsit organizația." };
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  const currentSettings = (org?.settings as Record<string, unknown>) || {};
  const existingProfile =
    (currentSettings.businessProfile as Record<string, unknown>) || {};

  const updatedSettings = {
    ...currentSettings,
    businessProfile: {
      ...existingProfile,
      name: existingProfile.name || "",
      description: existingProfile.description || "",
      industry,
      tones: existingProfile.tones || [],
      targetAudience: existingProfile.targetAudience || "",
      usps: existingProfile.usps || "",
      avoidPhrases: existingProfile.avoidPhrases || "",
      preferredPhrases: existingProfile.preferredPhrases || "",
      language: existingProfile.language || "ro",
      compliance: existingProfile.compliance || [],
    },
  };

  const { error: updateError } = await supabase
    .from("organizations")
    .update({ settings: updatedSettings })
    .eq("id", userData.organization_id);

  if (updateError) {
    return { error: `Eroare la salvare: ${updateError.message}` };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/business");
  revalidatePath("/settings");
  return { success: true };
}
