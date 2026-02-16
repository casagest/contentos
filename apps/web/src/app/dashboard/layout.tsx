import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShellClient from "../(dashboard)/dashboard-shell-client";
import { cookies } from "next/headers";

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

  // Fast onboarding check with cookie short-circuit
  const cookieStore = await cookies();
  if (cookieStore.get("onboarding_done")?.value !== "1") {
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

      if (org?.onboarding_completed_at) {
        cookieStore.set("onboarding_done", "1", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60,
          path: "/",
        });
      }
    }
  }

  return <DashboardShellClient>{children}</DashboardShellClient>;
}
