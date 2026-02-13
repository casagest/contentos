"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Hash,
  MessageSquare,
  ThumbsUp,
  Share2,
  Clock,
  Loader2,
  ExternalLink,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ---------- Types ----------
interface TrendsData {
  range: number;
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  totalImpressions: number;
  dailyEngagement: { date: string; likes: number; comments: number; shares: number; impressions: number }[];
  platformComparison: { platform: string; posts: number; avgEngagement: number; totalReach: number }[];
  contentTypePerformance: { type: string; count: number; avgEngagement: number }[];
  hookPerformance: { hookType: string; avgEngagement: number; sampleSize: number; successRate: number }[];
  bestHours: { hour: number; avgEngagement: number; postCount: number }[];
  followersTrend: { date: string; followers: number; gained: number; lost: number }[];
  topPosts: { id: string; platform: string; text: string; engagement: number; published_at: string; platform_url: string | null }[];
}

const RANGES = [
  { value: 7, label: "7z" },
  { value: 30, label: "30z" },
  { value: 60, label: "60z" },
  { value: 90, label: "90z" },
];

const platformColors: Record<string, { bg: string; text: string; fill: string }> = {
  facebook: { bg: "bg-blue-500/10", text: "text-blue-400", fill: "#3b82f6" },
  instagram: { bg: "bg-pink-500/10", text: "text-pink-400", fill: "#ec4899" },
  tiktok: { bg: "bg-gray-500/10", text: "text-gray-300", fill: "#9ca3af" },
  youtube: { bg: "bg-red-500/10", text: "text-red-400", fill: "#ef4444" },
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- Custom Tooltip ----------
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.1] px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-medium">{formatNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- KPI Card ----------
function KpiCard({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ---------- Main ----------
export default function AnalyticsPage() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/trends?range=${range}`, { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Nu am putut incarca datele de analytics.</p>
      </div>
    );
  }

  const maxHourEng = Math.max(...data.bestHours.map((h) => h.avgEngagement), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-gray-400 text-sm">Performanta reala a continutului tau</p>
          </div>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                range === r.value
                  ? "bg-brand-600/20 text-brand-300 border border-brand-500/40"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Hash} label="Total postari" value={String(data.totalPosts)} color="#6366f1" />
        <KpiCard icon={TrendingUp} label="Total engagement" value={formatNum(data.totalEngagement)} color="#10b981" />
        <KpiCard icon={ThumbsUp} label="Medie / postare" value={formatNum(data.avgEngagement)} color="#f59e0b" />
        <KpiCard icon={Eye} label="Total impressions" value={formatNum(data.totalImpressions)} color="#8b5cf6" />
      </div>

      {/* Engagement Trend Chart */}
      {data.dailyEngagement.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" />
            Trend Engagement
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyEngagement.map((d) => ({ ...d, name: formatDate(d.date) }))}>
              <defs>
                <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradComments" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradShares" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} />
              <ReTooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                iconType="circle"
                iconSize={8}
              />
              <Area type="monotone" dataKey="likes" name="Likes" stroke="#3b82f6" fill="url(#gradLikes)" strokeWidth={2} />
              <Area type="monotone" dataKey="comments" name="Comentarii" stroke="#10b981" fill="url(#gradComments)" strokeWidth={2} />
              <Area type="monotone" dataKey="shares" name="Shares" stroke="#8b5cf6" fill="url(#gradShares)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Comparison */}
        {data.platformComparison.length > 0 && (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-blue-400" />
              Comparatie platforme
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.platformComparison} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="platform" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} />
                <ReTooltip content={<ChartTooltip />} />
                <Bar dataKey="avgEngagement" name="Avg Eng." fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalReach" name="Total Reach" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-3">
              {data.platformComparison.map((p) => {
                const colors = platformColors[p.platform] || platformColors.facebook;
                return (
                  <div key={p.platform} className="flex items-center gap-2 text-xs">
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${colors.bg} ${colors.text}`}>
                      {p.platform}
                    </span>
                    <span className="text-gray-400">{p.posts} postari</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Best Posting Hours */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Cele mai bune ore de postare
          </h2>
          <div className="grid grid-cols-12 gap-1 items-end h-32">
            {data.bestHours.filter((_, i) => i >= 6 && i <= 23).map((h) => {
              const intensity = maxHourEng > 0 ? h.avgEngagement / maxHourEng : 0;
              const heightPct = Math.max(intensity * 100, 4);
              return (
                <div key={h.hour} className="flex flex-col items-center gap-1 group relative">
                  <div
                    className="w-full rounded-t transition-all duration-300"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: `rgba(99, 102, 241, ${0.2 + intensity * 0.6})`,
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[9px] text-gray-600">{h.hour}</span>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-[#1a1a2e] border border-white/[0.1] rounded px-2 py-1 text-[10px] whitespace-nowrap">
                    <span className="text-white font-medium">{h.hour}:00</span>
                    <br />
                    <span className="text-gray-400">Avg: {formatNum(h.avgEngagement)}</span>
                    <br />
                    <span className="text-gray-400">{h.postCount} postari</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-gray-600">
            <span>6:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Content Type Performance */}
      {data.contentTypePerformance.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Performanta per tip de continut
          </h2>
          <div className="space-y-2">
            {data.contentTypePerformance
              .sort((a, b) => b.avgEngagement - a.avgEngagement)
              .map((ct) => {
                const maxCtEng = Math.max(...data.contentTypePerformance.map((c) => c.avgEngagement), 1);
                const pct = (ct.avgEngagement / maxCtEng) * 100;
                return (
                  <div key={ct.type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-20 capitalize flex-shrink-0">{ct.type}</span>
                    <div className="flex-1 h-6 bg-white/[0.03] rounded overflow-hidden">
                      <div
                        className="h-full rounded bg-gradient-to-r from-brand-500/40 to-brand-500/70 transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-shrink-0">
                      <span>{ct.count} postari</span>
                      <span className="text-white font-medium">{formatNum(ct.avgEngagement)} avg</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Hook Type Performance */}
      {data.hookPerformance.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Performanta Hook-uri (Creative Memory)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.hookPerformance.slice(0, 9).map((hook) => (
              <div
                key={hook.hookType}
                className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 hover:border-brand-500/20 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white capitalize">
                    {hook.hookType.replace(/_/g, " ")}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    hook.successRate >= 70
                      ? "bg-green-500/10 text-green-400"
                      : hook.successRate >= 40
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-gray-500/10 text-gray-400"
                  }`}>
                    {hook.successRate}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                  <span>Avg: <span className="text-white font-medium">{formatNum(hook.avgEngagement)}</span></span>
                  <span>{hook.sampleSize} samples</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Followers Trend */}
      {data.followersTrend.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Trend Urmaritori
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.followersTrend.map((d) => ({ ...d, name: formatDate(d.date) }))}>
              <defs>
                <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatNum} />
              <ReTooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="followers" name="Urmaritori" stroke="#10b981" fill="url(#gradFollowers)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Posts */}
      {data.topPosts.length > 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-brand-400" />
            Top Postari ({data.range} zile)
          </h2>
          <div className="space-y-2">
            {data.topPosts.map((post, i) => {
              const colors = platformColors[post.platform] || platformColors.facebook;
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition"
                >
                  <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0 font-mono">
                    #{i + 1}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors.bg} ${colors.text} flex-shrink-0`}>
                    {post.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 truncate">{post.text || "[fara text]"}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">
                      {new Date(post.published_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-white flex-shrink-0">
                    {formatNum(post.engagement)}
                  </span>
                  {post.platform_url && (
                    <a
                      href={post.platform_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {data.totalPosts === 0 && (
        <div className="rounded-xl bg-white/[0.02] border border-dashed border-white/[0.06] p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-1">Nicio postare in ultimele {data.range} zile</p>
          <p className="text-xs text-gray-600">
            Conecteaza conturile sociale si publica continut pentru a vedea analytics.
          </p>
        </div>
      )}
    </div>
  );
}
