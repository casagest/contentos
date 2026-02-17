import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShellClient from "./dashboard-shell-client";
import { UserProvider } from "@/components/providers/user-provider";

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

  if (user) {
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
  }

  return (
    <UserProvider>
      <DashboardShellClient>{children}</DashboardShellClient>
    </UserProvider>
  );
}
