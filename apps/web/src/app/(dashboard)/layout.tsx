import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShellClient from "./dashboard-shell-client";
import { cookies } from "next/headers";

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * Onboarding check with cookie-based short-circuit.
 * Once onboarding is completed, we set a cookie to avoid
 * querying the DB on every single page navigation.
 */
async function needsOnboarding(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  // Fast path: if cookie says onboarding is done, skip DB queries
  const cookieStore = await cookies();
  if (cookieStore.get("onboarding_done")?.value === "1") {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!userData?.organization_id) return false;

  const { data: org } = await supabase
    .from("organizations")
    .select("onboarding_completed_at")
    .eq("id", userData.organization_id)
    .single();

  if (org?.onboarding_completed_at) {
    // Set cookie so we don't check again (expires in 7 days)
    cookieStore.set("onboarding_done", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return false;
  }

  return !org?.onboarding_completed_at;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  if (await needsOnboarding(supabase)) {
    redirect("/onboarding");
  }

  return <DashboardShellClient>{children}</DashboardShellClient>;
}
