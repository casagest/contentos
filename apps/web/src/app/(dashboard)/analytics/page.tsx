"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Hash,
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
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
];

const platformColors: Record<string, { bg: string; text: string; fill: string }> = {
  facebook: { bg: "bg-blue-500/10", text: "text-blue-400", fill: "#3b82f6" },
  instagram: { bg: "bg-pink-500/10", text: "text-pink-400", fill: "#ec4899" },
  tiktok: { bg: "bg-gray-500/10", text: "text-foreground/80", fill: "#9ca3af" },
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
    <div className="rounded-xl bg-surface-overlay/95 backdrop-blur-lg border border-white/[0.08] px-4 py-3 text-xs shadow-xl">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-foreground/80">{p.name}:</span>
          <span className="text-white font-semibold">{formatNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- KPI Card ----------
function KpiCard({ icon: Icon, label, value, color, trend }: { icon: typeof TrendingUp; label: string; value: string; color: string; trend?: { pct: number; positive: boolean } }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-lg">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        {trend != null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.positive ? "text-green-400" : "text-red-400"}`}>
            {trend.positive ? "↑" : "↓"} {Math.abs(trend.pct)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
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
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nu am putut incarca datele de analytics.</p>
      </div>
    );
  }

  const maxHourEng = Math.max(...data.bestHours.map((h) => h.avgEngagement), 1);

  // Compute trend from daily engagement (first half vs second half)
  const getEngagementTrend = () => {
    if (data.dailyEngagement.length < 4) return undefined;
    const mid = Math.floor(data.dailyEngagement.length / 2);
    const first = data.dailyEngagement.slice(0, mid).reduce((s, d) => s + d.likes + d.comments + d.shares, 0);
    const second = data.dailyEngagement.slice(mid).reduce((s, d) => s + d.likes + d.comments + d.shares, 0);
    if (first === 0) return second > 0 ? { pct: 100, positive: true } : undefined;
    const pct = Math.round(((second - first) / first) * 100);
    return { pct, positive: pct >= 0 };
  };
  const engagementTrend = getEngagementTrend();

  const getImpressionsTrend = () => {
    if (data.dailyEngagement.length < 4) return undefined;
    const mid = Math.floor(data.dailyEngagement.length / 2);
    const first = data.dailyEngagement.slice(0, mid).reduce((s, d) => s + (d.impressions || 0), 0);
    const second = data.dailyEngagement.slice(mid).reduce((s, d) => s + (d.impressions || 0), 0);
    if (first === 0) return second > 0 ? { pct: 100, positive: true } : undefined;
    const pct = Math.round(((second - first) / first) * 100);
    return { pct, positive: pct >= 0 };
  };
  const impressionsTrend = getImpressionsTrend();

  return (
    <div className="space-y-6">
      {/* KPI Strip — stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Hash} label="Total postări" value={String(data.totalPosts)} color="#6366f1" />
        <KpiCard icon={TrendingUp} label="Total engagement" value={formatNum(data.totalEngagement)} color="#10b981" trend={engagementTrend} />
        <KpiCard icon={ThumbsUp} label="Medie / postare" value={formatNum(data.avgEngagement)} color="#f59e0b" />
        <KpiCard icon={Eye} label="Total impressions" value={formatNum(data.totalImpressions)} color="#8b5cf6" trend={impressionsTrend} />
      </div>

      {/* Main chart — Engagement Trend */}
      {data.dailyEngagement.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              Trend Engagement
            </h2>
            {/* Time range selector — pill buttons */}
            <div className="flex items-center gap-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    range === r.value
                      ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                      : "text-muted-foreground hover:text-white/80 border border-transparent hover:border-white/[0.1]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
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
              <Area type="monotone" dataKey="likes" name="Likes" stroke="#3b82f6" fill="url(#gradLikes)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
              <Area type="monotone" dataKey="comments" name="Comentarii" stroke="#10b981" fill="url(#gradComments)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" animationBegin={200} animationDuration={1200} animationEasing="ease-out" />
              <Area type="monotone" dataKey="shares" name="Shares" stroke="#8b5cf6" fill="url(#gradShares)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" animationBegin={400} animationDuration={1200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column layout — sub-charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Comparison */}
        {data.platformComparison.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
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
                <Bar dataKey="avgEngagement" name="Avg Eng." fill="#6366f1" radius={[4, 4, 0, 0]} animationBegin={0} animationDuration={800} animationEasing="ease-out" />
                <Bar dataKey="totalReach" name="Total Reach" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.7} animationBegin={200} animationDuration={800} animationEasing="ease-out" />
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
                    <span className="text-muted-foreground">{p.posts} postari</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Best Posting Hours */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
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
                  <span className="text-[9px] text-muted-foreground">{h.hour}</span>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-surface-overlay/95 backdrop-blur-lg border border-white/[0.08] rounded-xl px-3 py-2 text-[10px] whitespace-nowrap shadow-xl">
                    <span className="text-white font-medium">{h.hour}:00</span>
                    <br />
                    <span className="text-muted-foreground">Avg: {formatNum(h.avgEngagement)}</span>
                    <br />
                    <span className="text-muted-foreground">{h.postCount} postari</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
            <span>6:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Content Type + Hook Performance — grid 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Content Type Performance */}
      {data.contentTypePerformance.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
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
                    <span className="text-xs text-muted-foreground w-20 capitalize flex-shrink-0">{ct.type}</span>
                    <div className="flex-1 h-6 bg-white/[0.04] rounded overflow-hidden">
                      <div
                        className="h-full rounded bg-gradient-to-r from-orange-500/40 to-orange-500/70 transition-all duration-700"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
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
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Performanta Hook-uri (Creative Memory)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.hookPerformance.slice(0, 9).map((hook) => (
              <div
                key={hook.hookType}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 hover:border-orange-500/30 transition"
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
                        : "bg-gray-500/10 text-muted-foreground"
                  }`}>
                    {hook.successRate}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span>Avg: <span className="text-white font-medium">{formatNum(hook.avgEngagement)}</span></span>
                  <span>{hook.sampleSize} samples</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Followers Trend + Top Posts — grid 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Followers Trend */}
      {data.followersTrend.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
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
              <Area type="monotone" dataKey="followers" name="Urmaritori" stroke="#10b981" fill="url(#gradFollowers)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" animationBegin={0} animationDuration={1200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

        {/* Top Posts */}
        {data.topPosts.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-5 backdrop-blur-sm">
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition"
                >
                  <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0 font-mono">
                    #{i + 1}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors.bg} ${colors.text} flex-shrink-0`}>
                    {post.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 truncate">{post.text || "[fara text]"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
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
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-white transition flex-shrink-0"
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
      </div>

      {/* Empty state */}
      {data.totalPosts === 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-dashed border-white/[0.06] p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-1">Nicio postare in ultimele {data.range} zile</p>
          <p className="text-xs text-muted-foreground">
            Conecteaza conturile sociale si publica continut pentru a vedea analytics.
          </p>
        </div>
      )}
    </div>
  );
}
