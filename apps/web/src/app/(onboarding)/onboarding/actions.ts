"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateOnboardingStep(step: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return { success: false };

  await supabase
    .from("organizations")
    .update({ onboarding_step: step })
    .eq("id", userData.organization_id);

  return { success: true };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return { success: false };

  await supabase
    .from("organizations")
    .update({
      onboarding_step: 4,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", userData.organization_id);

  return { success: true };
}

export async function saveOnboardingProfile(data: {
  name: string;
  description: string;
  industry: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return { success: false };

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", userData.organization_id)
    .single();

  const settings = (org?.settings as Record<string, unknown>) || {};
  const profile = (settings.businessProfile as Record<string, unknown>) || {};

  settings.businessProfile = {
    ...profile,
    name: data.name,
    description: data.description,
    industry: data.industry,
  };

  await supabase
    .from("organizations")
    .update({ settings, onboarding_step: 2 })
    .eq("id", userData.organization_id);

  return { success: true };
}
