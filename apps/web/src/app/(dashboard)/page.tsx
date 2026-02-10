import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  FileText,
  TrendingUp,
  Zap,
  PenTool,
  MessageSquareText,
  Brain,
  Search,
  ArrowRight,
  Activity,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

const platformMeta: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  facebook: { label: "Facebook", color: "text-blue-400", bg: "bg-blue-500/10" },
  instagram: {
    label: "Instagram",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  tiktok: { label: "TikTok", color: "text-gray-300", bg: "bg-gray-500/10" },
  youtube: { label: "YouTube", color: "text-red-400", bg: "bg-red-500/10" },
};

const quickActions = [
  {
    href: "/braindump",
    label: "Start Brain Dump",
    desc: "Transformă idei brute în postări optimizate",
    icon: Brain,
    gradient: "from-purple-600 to-purple-700",
  },
  {
    href: "/coach",
    label: "Open AI Coach",
    desc: "Întreabă coach-ul despre strategia ta de conținut",
    icon: MessageSquareText,
    gradient: "from-emerald-600 to-emerald-700",
  },
  {
    href: "/compose",
    label: "Compose Post",
    desc: "Compune conținut optimizat pentru orice platformă",
    icon: PenTool,
    gradient: "from-brand-600 to-brand-700",
  },
  {
    href: "/research",
    label: "Research Account",
    desc: "Analizează ce funcționează la alți creatori",
    icon: Search,
    gradient: "from-cyan-600 to-cyan-700",
  },
];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Bună, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "creator"}
        </h1>
        <p className="text-gray-400 mt-1">
          Iată un rezumat al activității tale pe platforme.
        </p>
      </div>

      {!hasAccounts ? (
        /* Onboarding — no accounts connected */
        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-600/10 flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-8 h-8 text-brand-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Conectează primul cont social
            </h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              ContentOS are nevoie de acces la conturile tale pentru a analiza
              performanța și a genera conținut optimizat.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              {[
                {
                  name: "Facebook",
                  color: "bg-blue-600 hover:bg-blue-500",
                  href: "/settings",
                },
                {
                  name: "Instagram",
                  color: "bg-pink-600 hover:bg-pink-500",
                  href: "/settings",
                },
                {
                  name: "TikTok",
                  color: "bg-gray-700 hover:bg-gray-600",
                  href: "/settings",
                },
                {
                  name: "YouTube",
                  color: "bg-red-600 hover:bg-red-500",
                  href: "/settings",
                },
              ].map((platform) => (
                <a
                  key={platform.name}
                  href={platform.href}
                  className={`px-5 py-2.5 rounded-lg text-white text-sm font-medium transition ${platform.color}`}
                >
                  Conectează {platform.name}
                </a>
              ))}
            </div>
          </div>

          {/* Quick actions shown even without accounts */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              Începe rapid
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/30 transition"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-brand-300 transition">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {action.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Full dashboard */
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-brand-400" />
                </div>
                <span className="text-xs text-green-400 font-medium">
                  Activ
                </span>
              </div>
              <div className="text-2xl font-bold text-white">
                {accounts.length}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Conturi conectate
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-xs text-gray-500 mt-1">
                Postări analizate
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-gray-500 mt-1">
                Engagement mediu
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-pink-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">--</div>
              <div className="text-xs text-gray-500 mt-1">
                AI Score
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Acțiuni rapide
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex flex-col items-center gap-3 p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/30 transition text-center"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-brand-300 transition">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {action.desc}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Connected Accounts */}
            <div className="lg:col-span-2 rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Conturile tale
                </h3>
                <Link
                  href="/settings"
                  className="text-xs text-brand-400 hover:text-brand-300 transition flex items-center gap-1"
                >
                  Administrează <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {accounts.map((account: Record<string, unknown>) => {
                  const platform = account.platform as string;
                  const meta = platformMeta[platform] || {
                    label: platform,
                    color: "text-gray-400",
                    bg: "bg-gray-500/10",
                  };
                  return (
                    <div
                      key={account.id as string}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center`}
                        >
                          <span className={`text-xs font-bold ${meta.color}`}>
                            {meta.label[0]}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            @{account.platform_username as string}
                          </div>
                          <div className="text-xs text-gray-500">
                            {meta.label}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.sync_status === "synced" ? (
                          <span className="flex items-center gap-1.5 text-xs text-green-400">
                            <Wifi className="w-3 h-3" /> Sincronizat
                          </span>
                        ) : account.sync_status === "error" ? (
                          <span className="flex items-center gap-1.5 text-xs text-red-400">
                            <WifiOff className="w-3 h-3" /> Eroare
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Se
                            sincronizează
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Link
                  href="/settings"
                  className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-white/[0.08] text-gray-500 hover:text-brand-400 hover:border-brand-500/30 transition text-sm"
                >
                  <Plus className="w-4 h-4" /> Adaugă cont
                </Link>
              </div>
            </div>

            {/* Activity Feed — empty state */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">
                  Activitate recentă
                </h3>
                <Activity className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400 mb-1">
                  Nicio activitate încă
                </p>
                <p className="text-xs text-gray-500">
                  Activitatea ta va apărea aici pe măsură ce folosești platforma.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Performance Placeholder */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Performanță pe platforme
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Ultimele 30 de zile
                </p>
              </div>
              <Link
                href="/history"
                className="text-xs text-brand-400 hover:text-brand-300 transition"
              >
                Detalii
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(accounts as Record<string, unknown>[]).slice(0, 4).map((account) => {
                const platform = account.platform as string;
                const meta = platformMeta[platform] || {
                  label: platform,
                  color: "text-gray-400",
                  bg: "bg-gray-500/10",
                };
                return (
                  <div key={account.id as string} className="text-center">
                    <div
                      className={`w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center mx-auto mb-2`}
                    >
                      <span className={`text-sm font-bold ${meta.color}`}>
                        {meta.label[0]}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-white">
                      {meta.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Se colectează date...
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.bg} w-0`}
                        style={{ transition: "width 1s" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {accounts.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                Conectează conturi pentru a vedea performanța.
              </div>
            )}
          </div>

          {/* Feature discovery */}
          <div className="rounded-xl bg-gradient-to-r from-brand-950/50 to-pink-950/30 border border-brand-500/10 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-brand-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Cercetează competitorii
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  Analizează ce funcționează la alți creatori din nișa ta și
                  adaptează strategia.
                </p>
                <Link
                  href="/research"
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium transition"
                >
                  Explorează Research <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
