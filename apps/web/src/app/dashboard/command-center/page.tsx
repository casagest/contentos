"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  PenTool,
  Search,
  MessageSquare,
  BarChart3,
  Calendar,
  FileText,
  Zap,
  Users,
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface CommandCenterStats {
  drafts: number;
  scheduled: number;
  postsThisWeek: number;
  totalEngagement: number;
  accountsCount: number;
  recentPosts: Array<{
    id: string;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    published_at: string;
  }>;
}

const QUICK_ACTIONS = [
  { href: "/braindump", label: "Brain Dump", icon: Brain, color: "from-orange-500 to-amber-600" },
  { href: "/compose", label: "Compune", icon: PenTool, color: "from-violet-500 to-purple-600" },
  { href: "/research", label: "Cercetare", icon: Search, color: "from-cyan-500 to-blue-600" },
  { href: "/coach", label: "Antrenor AI", icon: MessageSquare, color: "from-emerald-500 to-teal-600" },
  { href: "/analyze", label: "Analiză", icon: BarChart3, color: "from-rose-500 to-pink-600" },
];

const PLATFORM_LABELS: Record<string, string> = {
  facebook: "Fb",
  instagram: "Ig",
  tiktok: "Tk",
  youtube: "Yt",
  twitter: "X",
};

function formatEngagement(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function CommandCenterPage() {
  const [stats, setStats] = useState<CommandCenterStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/command-center")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats({
        drafts: 0,
        scheduled: 0,
        postsThisWeek: 0,
        totalEngagement: 0,
        accountsCount: 0,
        recentPosts: [],
      }))
      .finally(() => setLoading(false));
  }, []);

  const s = stats || {
    drafts: 0,
    scheduled: 0,
    postsThisWeek: 0,
    totalEngagement: 0,
    accountsCount: 0,
    recentPosts: [],
  };

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control central — metrici, acțiuni rapide, activitate
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-xs text-emerald-400">SISTEM OK</span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Draft-uri", value: s.drafts, icon: FileText, href: "/compose" },
          { label: "Programate", value: s.scheduled, icon: Calendar, href: "/calendar" },
          { label: "Postări (7 zile)", value: s.postsThisWeek, icon: Zap, href: "/history" },
          { label: "Engagement", value: formatEngagement(s.totalEngagement), icon: TrendingUp, href: "/analytics" },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Link
                href={m.href}
                className="block rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground group-hover:text-orange-400 transition" />
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition" />
                </div>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <span className="font-mono text-2xl font-bold text-white tabular-nums">
                    {m.value}
                  </span>
                )}
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="font-display text-sm font-semibold text-white mb-4">Acțiuni rapide</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.href}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
              >
                <Link
                  href={a.href}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br ${a.color} border border-white/10 hover:border-white/20 hover:scale-[1.02] transition-all shadow-lg`}
                >
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">{a.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity — recent posts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h2 className="font-display text-sm font-semibold text-white">Activitate recentă</h2>
            <Link
              href="/history"
              className="text-xs text-orange-400 hover:text-orange-300 transition flex items-center gap-1"
            >
              Vezi toate
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : s.recentPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nicio postare recentă. Începe cu Brain Dump sau Compune.
              </p>
            ) : (
              <div className="space-y-3">
                {s.recentPosts.map((p) => {
                  const eng = p.likes + p.comments + p.shares;
                  const date = p.published_at
                    ? new Date(p.published_at).toLocaleDateString("ro-RO", {
                        day: "numeric",
                        month: "short",
                      })
                    : "—";
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-muted-foreground shrink-0">
                          {PLATFORM_LABELS[p.platform] || p.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">{date}</span>
                      </div>
                      <span className="font-mono text-xs text-white tabular-nums">
                        {formatEngagement(eng)} eng.
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Right column — Calendar + Accounts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="space-y-6"
        >
          {/* Connected accounts */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h2 className="font-display text-sm font-semibold text-white">Conturi conectate</h2>
              <Link
                href="/settings"
                className="text-xs text-orange-400 hover:text-orange-300 transition"
              >
                Setări
              </Link>
            </div>
            <div className="p-4">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto block" />
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="font-mono text-lg font-bold text-white">{s.accountsCount}</span>
                  <span className="text-sm text-muted-foreground">conturi active</span>
                </div>
              )}
            </div>
          </div>

          {/* Calendar CTA */}
          <Link
            href="/calendar"
            className="block rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-orange-400" />
              <h2 className="font-display text-sm font-semibold text-white">Calendar conținut</h2>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-xs text-muted-foreground">
              Planifică și programează postările pentru săptămânile următoare.
            </p>
          </Link>
        </motion.div>
      </div>

      {/* Business dashboard link */}
      <div className="mt-8 pt-6 border-t border-white/[0.06]">
        <Link
          href="/dashboard/business"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition"
        >
          <Clock className="w-4 h-4" />
          Dashboard Business (KPI-uri, funnel, industrie)
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
