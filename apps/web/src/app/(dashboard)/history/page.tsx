"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ArrowUpRight,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Plus,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface Post {
  id: string;
  platform: string;
  text_content: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  impressions_count: number;
  reach_count: number;
  content_type: string;
  platform_url?: string;
  published_at: string;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  stats: {
    avgEngagement: number;
    bestDay: string;
  };
}

interface SyncResult {
  platform: string;
  accountName: string;
  synced: number;
  error?: string;
}

const platformTabs = [
  { id: "all", label: "Toate" },
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-500" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
];

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-foreground/80",
  youtube: "bg-red-500/10 text-red-400",
};

export default function HistoryPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ avgEngagement: 0, bestDay: "--" });
  const [activePlatform, setActivePlatform] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [hasAccounts, setHasAccounts] = useState<boolean | null>(null);

  const loadPosts = useCallback(async (platform: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50", offset: "0" });
      if (platform !== "all") params.set("platform", platform);

      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          setHasAccounts(false);
          return;
        }
        throw new Error("Eroare la încărcarea postărilor");
      }

      const data: PostsResponse = await res.json();
      setPosts(data.posts);
      setTotal(data.total);
      setStats(data.stats);
      setHasAccounts(true);
    } catch {
      // Load posts error — silent in production
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkAccounts() {
      try {
        const res = await fetch("/api/social-accounts");
        const data = await res.json();
        const connected = data.accounts?.length > 0;
        setHasAccounts(connected);
        if (connected) {
          loadPosts("all");
        } else {
          setIsLoading(false);
        }
      } catch {
        setHasAccounts(false);
        setIsLoading(false);
      }
    }
    checkAccounts();
  }, [loadPosts]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await fetch("/api/ingestion/sync", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Eroare la sincronizare");
      }

      const data: { total: number; results: SyncResult[] } = await res.json();

      const parts = data.results
        .map((r) =>
          r.error
            ? `${r.accountName}: ${r.error}`
            : `${r.accountName}: ${r.synced} postări`
        )
        .join(" | ");

      setSyncMessage(`Sincronizat ${data.total} postări. ${parts}`);
      await loadPosts(activePlatform);
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? err.message : "Eroare la sincronizare"
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePlatformChange = (platform: string) => {
    setActivePlatform(platform);
    loadPosts(platform);
  };

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (hasAccounts === null || (hasAccounts && isLoading && posts.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (hasAccounts === false) {
    return (
      <div>
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Nicio postare încă
          </h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
            Conectează-ți conturile sociale pentru a importa automat istoricul de
            postări și a vedea analiza performanței.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Conectează un cont
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {isSyncing ? "Se sincronizează..." : "Sincronizează"}
        </button>
      </div>

      {/* Sync message */}
      {syncMessage && (
        <div className="mb-4 rounded-xl bg-muted border border-border p-3 text-sm text-foreground/80">
          {syncMessage}
        </div>
      )}

      {/* Platform filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {platformTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handlePlatformChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              activePlatform === tab.id
                ? "bg-accent text-white"
                : "bg-muted text-muted-foreground hover:bg-muted hover:text-gray-200"
            }`}
          >
            {tab.color && (
              <div className={`w-2 h-2 rounded-full ${tab.color}`} />
            )}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-xs text-muted-foreground mt-1">Total postări</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {stats.avgEngagement > 0 ? formatNumber(stats.avgEngagement) : "--"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Engagement mediu</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.bestDay}</div>
          <div className="text-xs text-muted-foreground mt-1">Cea mai bună zi</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-2xl font-bold text-white">
            {posts.length > 0
              ? formatNumber(
                  posts.reduce(
                    (sum, p) =>
                      sum + p.likes_count + p.comments_count + p.shares_count,
                    0
                  )
                )
              : "--"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total interacțiuni</div>
        </div>
      </div>

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">
            {activePlatform !== "all"
              ? `Nicio postare pe ${platformTabs.find((t) => t.id === activePlatform)?.label}.`
              : "Nicio postare sincronizată încă."}
          </p>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="text-sm text-brand-400 hover:text-brand-300 transition"
          >
            Apasă &quot;Sincronizează&quot; pentru a importa postările
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground/80">
              Postări recente
            </h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 p-4 hover:bg-card transition"
              >
                <div
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${platformColors[post.platform] || "bg-gray-500/10 text-muted-foreground"}`}
                >
                  {post.platform}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {post.text_content || `[${post.content_type}]`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(post.published_at)}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />{" "}
                    {formatNumber(post.likes_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />{" "}
                    {formatNumber(post.comments_count)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" />{" "}
                    {formatNumber(post.shares_count)}
                  </span>
                  {(post.views_count > 0 || post.impressions_count > 0) && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />{" "}
                      {formatNumber(post.impressions_count || post.views_count)}
                    </span>
                  )}
                </div>
                {post.platform_url && (
                  <a
                    href={post.platform_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-muted-foreground transition"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator for filtering */}
      {isLoading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}
    </div>
  );
}
