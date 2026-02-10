import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch connected social accounts
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .order("created_at", { ascending: false });

  const hasAccounts = accounts && accounts.length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Bine ai venit în ContentOS. Conectează-ți conturile pentru a începe.
        </p>
      </div>

      {!hasAccounts ? (
        /* Onboarding — no accounts connected */
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Conectează primul cont social
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            ContentOS are nevoie de acces la conturile tale pentru a analiza performanța
            și a genera conținut optimizat.
          </p>

          <div className="flex items-center justify-center gap-4">
            {[
              { name: "Facebook", color: "bg-blue-600 hover:bg-blue-500", href: "/api/auth/callback/facebook" },
              { name: "Instagram", color: "bg-pink-600 hover:bg-pink-500", href: "/api/auth/callback/instagram" },
              { name: "TikTok", color: "bg-gray-800 hover:bg-gray-700", href: "/api/auth/callback/tiktok" },
              { name: "YouTube", color: "bg-red-600 hover:bg-red-500", href: "/api/auth/callback/youtube" },
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
      ) : (
        /* Dashboard with connected accounts */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Connected Accounts Card */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="text-sm text-gray-400 mb-1">Conturi conectate</div>
            <div className="text-3xl font-bold text-white">{accounts.length}</div>
          </div>

          {/* Total Posts Card */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="text-sm text-gray-400 mb-1">Postări analizate</div>
            <div className="text-3xl font-bold text-white">—</div>
          </div>

          {/* Avg Engagement Card */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
            <div className="text-sm text-gray-400 mb-1">Engagement mediu</div>
            <div className="text-3xl font-bold text-white">—</div>
          </div>

          {/* Account list */}
          <div className="col-span-full rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Conturile tale</h3>
            <div className="space-y-3">
              {accounts.map((account: Record<string, unknown>) => (
                <div
                  key={account.id as string}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center text-sm">
                      {(account.platform as string) === "facebook" && "📘"}
                      {(account.platform as string) === "instagram" && "📸"}
                      {(account.platform as string) === "tiktok" && "🎵"}
                      {(account.platform as string) === "youtube" && "▶️"}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        @{account.platform_username as string}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {account.platform as string}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {account.sync_status === "synced" ? "✅ Sincronizat" : "⏳ Se sincronizează..."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
