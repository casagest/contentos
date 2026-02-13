import { createClient } from "@/lib/supabase/server";
import {
  Settings,
  User,
  Bell,
  Shield,
  CheckCircle2,
} from "lucide-react";
import BusinessProfileForm from "./business-profile-form";
import ConnectedAccounts from "./connected-accounts";
import BillingSection from "./billing-section";
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
      }
    }
  }

  const showSuccess = !!params.connected;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Setari</h1>
          <p className="text-gray-400 text-sm">
            Administreaza contul, conexiunile si abonamentul
          </p>
        </div>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Profile section */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Profil</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-gray-300">
                  {user?.email || "—"}
                </div>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="w-3 h-3" /> Verificat
                </span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nume</label>
              <input
                type="text"
                defaultValue={user?.user_metadata?.full_name || ""}
                placeholder="Numele tau"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition">
              Salveaza modificarile
            </button>
          </div>
        </div>

        {/* Business Profile */}
        <BusinessProfileForm initialProfile={businessProfile} />

        {/* Connected accounts - fetched client-side */}
        <ConnectedAccounts showSuccess={showSuccess} />

        {/* Billing */}
        <BillingSection currentPlan={currentPlan} hasStripeCustomer={hasStripeCustomer} />

        {/* Notifications */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Notificari</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Raport saptamanal de performanta", defaultOn: true },
              { label: "Alerte de engagement scazut", defaultOn: true },
              { label: "Sugestii AI de continut", defaultOn: false },
              { label: "Newsletter si noutati", defaultOn: false },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-300">{item.label}</span>
                <button
                  className={`w-9 h-5 rounded-full transition ${
                    item.defaultOn ? "bg-brand-600" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      item.defaultOn
                        ? "translate-x-[18px]"
                        : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Securitate</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition text-sm text-gray-300">
              Schimba parola
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition text-sm text-gray-300">
              Exporta datele mele (GDPR)
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-red-500/5 transition text-sm text-red-400">
              Sterge contul
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
