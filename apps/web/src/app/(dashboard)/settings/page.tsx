import { createClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";
import BusinessProfileForm from "./business-profile-form";
import ConnectedAccounts from "./connected-accounts";
import BillingSection from "./billing-section";
import ProfileSection from "./profile-section";
import NotificationSettings from "./notification-settings";
import SecuritySection from "./security-section";
import type { BusinessProfile, Plan } from "@contentos/database";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let businessProfile: BusinessProfile | null = null;
  let currentPlan: Plan = "free";
  let hasStripeCustomer = false;
  let notificationPrefs: Record<string, boolean> | null = null;

  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userData?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("settings, plan, stripe_customer_id")
        .eq("id", userData.organization_id)
        .single();

      if (org) {
        currentPlan = (org.plan as Plan) || "free";
        hasStripeCustomer = !!org.stripe_customer_id;
        const settings = org.settings as Record<string, unknown> | null;
        if (settings?.businessProfile) {
          businessProfile = settings.businessProfile as BusinessProfile;
        }
        if (settings?.notifications) {
          notificationPrefs = settings.notifications as Record<string, boolean>;
        }
      }
    }
  }

  const connectedPlatform = typeof params.connected === "string" ? params.connected : undefined;
  const showSuccess = !!connectedPlatform;

  return (
    <div>
      <div className="space-y-6 max-w-3xl">
        {/* Profile section */}
        <ProfileSection
          email={user?.email || ""}
          initialName={user?.user_metadata?.full_name || ""}
        />

        {/* Business Profile */}
        <BusinessProfileForm initialProfile={businessProfile} />

        {/* Connected accounts - fetched client-side */}
        <ConnectedAccounts showSuccess={showSuccess} connectedPlatform={connectedPlatform} />

        {/* Billing */}
        <BillingSection currentPlan={currentPlan} hasStripeCustomer={hasStripeCustomer} />

        {/* Notifications */}
        <NotificationSettings initialPrefs={notificationPrefs} />

        {/* Security */}
        <SecuritySection email={user?.email || ""} />
      </div>
    </div>
  );
}
