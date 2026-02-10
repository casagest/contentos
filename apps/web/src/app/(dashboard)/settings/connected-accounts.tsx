"use client";

import { useState, useEffect } from "react";
import {
  Wifi,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";

interface SocialAccount {
  id: string;
  platform: string;
  platform_username: string;
  platform_name: string;
  avatar_url: string | null;
  sync_status: string;
  is_active: boolean;
}

const platformMeta: Record<
  string,
  { label: string; color: string; connectUrl: string; icon: string }
> = {
  facebook: {
    label: "Facebook",
    color: "bg-blue-600 hover:bg-blue-500",
    connectUrl: "/api/auth/callback/facebook",
    icon: "F",
  },
  instagram: {
    label: "Instagram",
    color: "bg-pink-600 hover:bg-pink-500",
    connectUrl: "/api/auth/facebook",
    icon: "I",
  },
  tiktok: {
    label: "TikTok",
    color: "bg-gray-700 hover:bg-gray-600",
    connectUrl: "#",
    icon: "T",
  },
  youtube: {
    label: "YouTube",
    color: "bg-red-600 hover:bg-red-500",
    connectUrl: "#",
    icon: "Y",
  },
};

function platformGradient(platform: string): string {
  switch (platform) {
    case "facebook":
      return "from-blue-600 to-blue-700";
    case "instagram":
      return "from-pink-500 via-purple-500 to-orange-400";
    case "tiktok":
      return "from-gray-700 to-gray-800";
    case "youtube":
      return "from-red-600 to-red-700";
    default:
      return "from-gray-600 to-gray-700";
  }
}

async function disconnectSocialAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/social-accounts/disconnect?id=${accountId}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message || "Failed to disconnect" };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: "Network error" };
  }
}

export default function ConnectedAccounts({
  showSuccess,
}: {
  showSuccess: boolean;
}) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(showSuccess);

  // Fetch accounts from API
  useEffect(() => {
    fetch("/api/social-accounts")
      .then((res) => res.json())
      .then((data) => {
        setAccounts(data.accounts || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch accounts:", err);
        setLoading(false);
      });
  }, []);

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (showSuccess) {
      setShowSuccessBanner(true);
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const connectedPlatforms = new Set(accounts.map((a) => a.platform));

  async function handleDisconnect(accountId: string) {
    if (!confirm("Esti sigur ca vrei sa deconectezi acest cont?")) return;

    setDisconnecting(accountId);
    const result = await disconnectSocialAccount(accountId);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    }
    setDisconnecting(null);
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wifi className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-white">Conturi conectate</h2>
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Se incarca conturile...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Wifi className="w-4 h-4 text-gray-400" />
        <h2 className="text-base font-semibold text-white">Conturi conectate</h2>
      </div>

      {/* Success message */}
      {showSuccessBanner && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-300">
            ✓ Contul tau Facebook a fost conectat cu succes!
          </span>
        </div>
      )}

      <div className="space-y-3">
        {accounts.map((account) => {
          const meta = platformMeta[account.platform];
          const isDisconnecting = disconnecting === account.id;

          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                {account.avatar_url ? (
                  <img
                    src={account.avatar_url}
                    alt={account.platform_name}
                    className="w-9 h-9 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${platformGradient(account.platform)} flex items-center justify-center text-xs font-bold text-white`}
                  >
                    {meta?.icon || "?"}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-white">
                    {account.platform_name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>@{account.platform_username}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {account.sync_status === "synced" ? (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    Conectat
                  </span>
                ) : account.sync_status === "error" ? (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    Eroare
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Se sincronizeaza...
                  </span>
                )}

                <button
                  onClick={() => handleDisconnect(account.id)}
                  disabled={isDisconnecting}
                  className="ml-2 p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  title="Deconecteaza"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            Niciun cont conectat. Conecteaza-ti conturile de social media
            pentru a incepe.
          </div>
        )}

        {/* Connect more platforms */}
        <div className="pt-3 border-t border-white/[0.06]">
          <p className="text-xs text-gray-500 mb-3">
            Conecteaza mai multe platforme:
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(platformMeta)
              .filter(([key]) => !connectedPlatforms.has(key))
              .map(([key, meta]) => (
                <a
                  key={key}
                  href={meta.connectUrl}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition ${meta.color}`}
                >
                  <Plus className="w-3 h-3" /> {meta.label}
                </a>
              ))}
            {connectedPlatforms.size >= 4 && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Toate platformele
                conectate
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
