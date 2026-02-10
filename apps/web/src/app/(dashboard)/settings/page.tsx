import { createClient } from "@/lib/supabase/server";
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  CheckCircle2,
} from "lucide-react";
import BusinessProfileForm from "./business-profile-form";
import ConnectedAccounts from "./connected-accounts";
import type { BusinessProfile } from "@contentos/database/schemas/types";

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

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch organization business profile
  let businessProfile: BusinessProfile | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from("users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (userData?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", userData.organization_id)
        .single();

      const settings = org?.settings as Record<string, unknown> | null;
      if (settings?.businessProfile) {
        businessProfile = settings.businessProfile as BusinessProfile;
      }
    }
  }

  const showSuccess = params.connected === "facebook";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Setări</h1>
          <p className="text-gray-400 text-sm">
            Administrează contul, conexiunile și abonamentul
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
                placeholder="Numele tău"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <button className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition">
              Salvează modificările
            </button>
          </div>
        </div>

        {/* Business Profile */}
        <BusinessProfileForm initialProfile={businessProfile} />

        {/* Connected accounts */}
        <ConnectedAccounts
          accounts={(accounts || []) as Array<{
            id: string;
            platform: string;
            platform_username: string;
            platform_name: string;
            avatar_url: string | null;
            followers_count: number;
            sync_status: string;
            sync_error: string | null;
            is_active: boolean;
          }>}
          showSuccess={showSuccess}
        />

        {/* Subscription */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Abonament</h2>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] mb-4">
            <div>
              <div className="text-sm font-medium text-white">Plan gratuit</div>
              <div className="text-xs text-gray-500 mt-0.5">
                2 conturi conectate, 50 generări/lună
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-600/10 text-brand-300 border border-brand-500/20">
              Activ
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-white/[0.06] hover:border-brand-500/30 transition">
              <div className="text-sm font-medium text-white mb-1">
                Creator Pro
              </div>
              <div className="text-xs text-gray-400 mb-3">
                10 conturi, generări nelimitate, AI Coach
              </div>
              <div className="text-lg font-bold text-white">
                &euro;29<span className="text-xs text-gray-500 font-normal">/lună</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-white/[0.06] hover:border-brand-500/30 transition">
              <div className="text-sm font-medium text-white mb-1">
                Agency
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Conturi nelimitate, API access, echipă
              </div>
              <div className="text-lg font-bold text-white">
                &euro;99<span className="text-xs text-gray-500 font-normal">/lună</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-gray-400" />
            <h2 className="text-base font-semibold text-white">Notificări</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Raport săptămânal de performanță", defaultOn: true },
              { label: "Alerte de engagement scăzut", defaultOn: true },
              { label: "Sugestii AI de conținut", defaultOn: false },
              { label: "Newsletter și noutăți", defaultOn: false },
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
              Schimbă parola
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition text-sm text-gray-300">
              Exportă datele mele (GDPR)
            </button>
            <button className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-red-500/5 transition text-sm text-red-400">
              Șterge contul
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
