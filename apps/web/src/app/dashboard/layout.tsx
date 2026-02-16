import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShellClient from "../(dashboard)/dashboard-shell-client";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if user needs onboarding
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (userData?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("onboarding_completed_at")
      .eq("id", userData.organization_id)
      .single();

    if (org && !org.onboarding_completed_at) {
      redirect("/onboarding");
    }
  }

  return <DashboardShellClient>{children}</DashboardShellClient>;
}
