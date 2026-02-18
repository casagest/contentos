"use client";

import { useEffect, useState, useCallback, useTransition, useRef, lazy, Suspense } from "react";
import Link from "next/link";
import {
  UserPlus,
  CalendarCheck,
  CheckCircle2,
  Euro,
  TrendingDown,
  Target,
  Stethoscope,
  ClipboardList,
  Activity,
  PhoneCall,
  Star,
  UtensilsCrossed,
  ShoppingBag,
  RefreshCw,
  Search,
  Globe,
  MapPin,
  Heart,
  Users,
  Gift,
  Share2,
  Eye,
  Sparkles,
  ShoppingCart,
  CreditCard,
  Truck,
  Building2,
  FolderOpen,
  Send,
  MessageSquare,
  FileText,
  FileCheck,
  Rocket,
  TrendingUp,
  Plane,
  Camera,
  BarChart3,
  Home,
  Shirt,
  GraduationCap,
  Monitor,
  Crown,
  ThumbsUp,
  Receipt,
  Zap,
  Scale,
  Briefcase,
  Brain,
  PenTool,
  MessageSquareText,
  Lightbulb,
  ArrowRight,
  Settings,
  ChevronRight,
  Calendar,
  Dumbbell,
  Loader2,
  Check,
  Link2 as LinkIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getIndustryConfig, INDUSTRY_CONFIGS } from "@/lib/dashboard/industry-config";
import type { IndustryConfig, KpiConfig, FunnelStage } from "@/lib/dashboard/industry-config";
import type { BusinessProfile, Industry } from "@contentos/database";
import { saveKpiValues, quickSetIndustry } from "./actions";
const MemoryHealth = lazy(() => import("@/app/(dashboard)/components/memory-health"));
// MiniReporting removed — dashboard already fetches analytics data directly

interface SocialAccountSummary {
  id: string;
  platform: string;
  platform_name: string;
  platform_username: string;
  avatar_url: string | null;
  followers_count: number;
  sync_status: string;
}

interface RecentPost {
  id: string;
  platform: string;
  text_content: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  published_at: string;
  platform_url: string | null;
}

interface AnalyticsData {
  totalPosts: number;
  totalEngagement: number;
  avgEngagement: number;
  totalImpressions: number;
  bestDay: string;
  platformBreakdown: { platform: string; posts: number; engagement: number }[];
  weeklyTrend: { date: string; label: string; engagement: number }[];
  topPosts: {
    id: string;
    platform: string;
    text_content: string;
    content_type: string;
    platform_url: string | null;
    published_at: string;
    engagement: number;
    likes: number;
    comments: number;
    shares: number;
  }[];
}

// Icon resolver - maps string names to lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  UserPlus, CalendarCheck, CheckCircle2, Euro, TrendingDown, Target,
  Stethoscope, ClipboardList, Activity, PhoneCall, Star, UtensilsCrossed,
  ShoppingBag, RefreshCw, Search, Globe, MapPin, Heart, Users, Gift,
  Share2, Eye, Sparkles, ShoppingCart, CreditCard, Truck, Building2,
  FolderOpen, Send, MessageSquare, FileText, FileCheck, Rocket, TrendingUp,
  Plane, Camera, BarChart3, Home, Shirt, GraduationCap, Monitor, Crown,
  ThumbsUp, Receipt, Zap, Scale, Briefcase, Dumbbell,
};

function getIcon(name: string) {
  return ICON_MAP[name] || Briefcase;
}

// Icon lookup by name - getIcon returns existing refs from ICON_MAP, not new components
function DynamicIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = getIcon(name);
  return (
    <span className={className} style={style} aria-hidden>
      <Icon className="w-full h-full" />
    </span>
  );
}

// Format values based on KPI format type
function formatKpiValue(value: number, format: string): string {
  switch (format) {
    case "currency":
      return `${value.toLocaleString("ro-RO")} RON`;
    case "percent":
      return `${value}%`;
    case "multiplier":
      return value.toFixed(1);
    default:
      return value.toLocaleString("ro-RO");
  }
}

// Industry quick-select grid items
const INDUSTRY_GRID: { value: Industry; label: string; icon: string; color: string }[] = [
  { value: "dental", label: "Dental", icon: "Stethoscope", color: "#6366f1" },
  { value: "restaurant", label: "Restaurant", icon: "UtensilsCrossed", color: "#f59e0b" },
  { value: "fitness", label: "Fitness", icon: "Dumbbell", color: "#10b981" },
  { value: "beauty", label: "Beauty", icon: "Sparkles", color: "#ec4899" },
  { value: "ecommerce", label: "E-commerce", icon: "ShoppingCart", color: "#8b5cf6" },
  { value: "agency", label: "Agenție", icon: "Building2", color: "#06b6d4" },
  { value: "turism", label: "Turism", icon: "Plane", color: "#f97316" },
  { value: "altele", label: "Altele", icon: "Briefcase", color: "#64748b" },
];

// ============================================================
// Animated Counter Component
// ============================================================
function AnimatedNumber({
  value,
  format,
  duration = 1200,
}: {
  value: number;
  format: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0); // eslint-disable-line react-hooks/set-state-in-effect -- reset animation
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = value;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span>{formatKpiValue(display, format)}</span>;
}

// ============================================================
// KPI Card Component
// ============================================================
function KpiCard({
  kpi,
  value,
  onEdit,
}: {
  kpi: KpiConfig;
  value: number;
  onEdit: (key: string, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));

  function handleSave() {
    const num = parseFloat(inputVal) || 0;
    onEdit(kpi.key, num);
    setEditing(false);
  }

  return (
    <div
      className="group relative rounded-xl bg-muted border border-border p-4 hover:border-border transition-all duration-300 cursor-pointer"
      onClick={() => !editing && setEditing(true)}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${kpi.color}15` }}
        >
          <DynamicIcon name={kpi.icon} className="w-4 h-4" style={{ color: kpi.color }} />
        </div>
        {!editing && (
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            click to edit
          </span>
        )}
      </div>

      {editing ? (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
            className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <button
            onClick={handleSave}
            className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-2xl font-bold text-white dashboard-number-animate">
          <AnimatedNumber value={value} format={kpi.format} />
        </div>
      )}

      <div className="text-xs text-muted-foreground mt-1 truncate">{kpi.label}</div>
    </div>
  );
}

// ============================================================
// Funnel Visualization
// ============================================================
function FunnelVisualization({ stages, counts }: { stages: FunnelStage[]; counts?: Record<string, number> }) {
  const hasData = counts && Object.values(counts).some(v => v > 0);
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const Icon = getIcon(stage.icon);
        const count = counts?.[stage.id] ?? 0;
        const maxCount = hasData ? Math.max(...stages.map(s => counts?.[s.id] ?? 0), 1) : 1;
        const widthPercent = hasData ? Math.max((count / maxCount) * 100, 8) : 100 - (i / (stages.length - 1)) * 40;

        return (
          <div key={stage.id} className="group">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${stage.color}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: stage.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{hasData ? count : "—"}</span>
                </div>
                <div className="h-6 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-1000 ease-out dashboard-bar-animate"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: `${stage.color}30`,
                      borderRight: `2px solid ${stage.color}`,
                    }}
                  />
                </div>
              </div>
            </div>
            {i < stages.length - 1 && (
              <div className="ml-[18px] h-4 border-l border-dashed border-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Content Calendar Preview (Next 7 Days)
// ============================================================
function ContentCalendarPreview() {
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const now = new Date();
  const dayNames = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

  const days: { label: string; date: string; dateStr: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    days.push({
      label: i === 0 ? "Azi" : i === 1 ? "Mâine" : dayNames[d.getDay()],
      date: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, "0")}`,
      dateStr: d.toISOString().split("T")[0],
    });
  }

  useEffect(() => {
    const startDate = new Date();
    const start = startDate.toISOString().split("T")[0];
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().split("T")[0];

    fetch(`/api/drafts?status=scheduled&start=${start}&end=${endStr}&limit=200`)
      .then((r) => r.json())
      .then((data) => {
        const counts: Record<string, number> = {};
        for (const draft of data.drafts || []) {
          if (!draft.scheduled_at) continue;
          const ds = new Date(draft.scheduled_at).toISOString().split("T")[0];
          counts[ds] = (counts[ds] || 0) + 1;
        }
        setDraftCounts(counts);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day) => {
        const count = draftCounts[day.dateStr] || 0;
        return (
          <div
            key={day.date}
            className="rounded-lg bg-card border border-border p-2 text-center hover:border-brand-500/30 transition group"
          >
            <div className="text-[10px] text-muted-foreground font-medium">{day.label}</div>
            <div className="text-xs text-muted-foreground mb-2">{day.date}</div>
            <div className="h-8 flex items-center justify-center">
              {count > 0 ? (
                <span className="text-brand-400 text-sm font-bold">{count}</span>
              ) : (
                <span className="text-gray-700 text-[10px]">—</span>
              )}
            </div>
            <Link
              href="/calendar"
              className="mt-1 block text-[9px] text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              + Creează
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// AI Content Suggestions
// ============================================================
function AiContentSuggestions({ config }: { config: IndustryConfig }) {
  const suggestions = config.bestPostTypes.slice(0, 3).map((type, i) => {
    const platforms = ["Instagram", "TikTok", "Facebook"];
    return {
      title: `${type} — ${config.contentTips[i % config.contentTips.length]}`,
      platform: platforms[i % platforms.length],
      engagement: ["Ridicat", "Mediu-Ridicat", "Ridicat"][i],
    };
  });

  return (
    <div className="space-y-3">
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-card border border-border hover:border-brand-500/20 transition"
        >
          <div className="text-sm text-white font-medium mb-1">{s.title}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-brand-600/10 text-brand-300 text-[10px]">
              {s.platform}
            </span>
            <span>Engagement estimat: {s.engagement}</span>
          </div>
        </div>
      ))}
      <Link
        href="/braindump"
        className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-brand-500/30 text-brand-400 text-sm hover:bg-brand-500/5 transition"
      >
        <Brain className="w-4 h-4" />
        Generează cu AI
      </Link>
    </div>
  );
}

// ============================================================
// Industry Tips
// ============================================================
function IndustryTips({ tips }: { tips: string[] }) {
  return (
    <div className="space-y-2">
      {tips.map((tip, i) => (
        <div
          key={i}
          className="flex items-start gap-2 p-3 rounded-lg bg-card border border-border"
        >
          <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-foreground/80">{tip}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Autopilot Card
// ============================================================
function AutopilotCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ generated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postsCount: 7, platforms: ["facebook", "instagram"] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Eroare la generare.");
        return;
      }
      setResult({ generated: data.generated });
    } catch {
      setError("Eroare de rețea. Încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-600/20 to-purple-600/20 border border-brand-500/20 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Autopilot</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generează 7 postări pentru toată săptămâna cu un click
          </p>
        </div>
      </div>

      {result ? (
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">
            {result.generated} postări generate! Verifică în{" "}
            <Link href="/calendar" className="underline hover:text-emerald-300">Calendar</Link>.
          </span>
        </div>
      ) : error ? (
        <p className="text-sm text-red-400 mb-3">{error}</p>
      ) : null}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-brand-500 to-purple-500 hover:from-brand-400 hover:to-purple-400 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generez postările...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generează Săptămâna
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Quick Actions
// ============================================================
function QuickActions() {
  const actions = [
    { href: "/braindump", label: "Brain Dump", icon: Brain, gradient: "from-purple-600 to-purple-700" },
    { href: "/compose", label: "Composer", icon: PenTool, gradient: "from-brand-600 to-brand-700" },
    { href: "/coach", label: "AI Coach", icon: MessageSquareText, gradient: "from-emerald-600 to-emerald-700" },
    { href: "/analyze", label: "Scorer", icon: BarChart3, gradient: "from-cyan-600 to-cyan-700" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-brand-500/30 transition"
          >
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-foreground/80 group-hover:text-white transition">
              {action.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================================
// Social Performance Section
// ============================================================
function SocialPerformance({
  accounts,
  recentPosts,
}: {
  accounts: SocialAccountSummary[];
  recentPosts: RecentPost[];
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-xl bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 border border-blue-500/20 p-5">
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-400" />
          Performanță Social Media
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Conectează-ți conturile de social media pentru a vedea performanța
          reală a postărilor tale.
        </p>
        <a
          href="/api/auth/facebook"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
        >
          <Share2 className="w-4 h-4" />
          Conectează Facebook
        </a>
      </div>
    );
  }

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followers_count || 0), 0);

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Share2 className="w-4 h-4 text-blue-400" />
          Performanță Social Media
        </h2>
        <Link
          href="/settings"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
        >
          Gestionează <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Connected accounts summary */}
      <div className="flex flex-wrap gap-3 mb-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
          >
            {account.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.avatar_url}
                alt={account.platform_name}
                className="w-6 h-6 rounded-md object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                {account.platform[0].toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-white">{account.platform_name}</div>
              <div className="text-[10px] text-muted-foreground">
                {account.followers_count.toLocaleString("ro-RO")} urmăritori
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ml-1 ${
              account.sync_status === "synced" ? "bg-green-400" :
              account.sync_status === "error" ? "bg-red-400" : "bg-yellow-400"
            }`} />
          </div>
        ))}
      </div>

      {/* Total followers */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-card border border-border mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          <span className="text-sm text-muted-foreground">Total urmăritori:</span>
        </div>
        <span className="text-lg font-bold text-white">
          {totalFollowers.toLocaleString("ro-RO")}
        </span>
      </div>

      {/* Recent posts performance */}
      {recentPosts.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-2">Ultimele postări:</div>
          {recentPosts.slice(0, 5).map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground/80 truncate">
                  {post.text_content || "—"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(post.published_at).toLocaleDateString("ro-RO")}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-shrink-0">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {post.likes_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {post.comments_count}
                </span>
                <span className="flex items-center gap-1">
                  <Share2 className="w-3 h-3" />
                  {post.shares_count}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2">
          Nicio postare sincronizată încă. Postările vor apărea automat.
        </p>
      )}
    </div>
  );
}

// ============================================================
// Engagement Overview Section
// ============================================================
const platformColorMap: Record<string, { bg: string; text: string; bar: string }> = {
  facebook: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500" },
  instagram: { bg: "bg-pink-500/10", text: "text-pink-400", bar: "bg-pink-500" },
  tiktok: { bg: "bg-gray-500/10", text: "text-foreground/80", bar: "bg-gray-400" },
  youtube: { bg: "bg-red-500/10", text: "text-red-400", bar: "bg-red-500" },
};

function formatEngNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function EngagementOverview({ data }: { data: AnalyticsData | null }) {
  if (!data || data.totalPosts === 0) return null;

  const maxTrend = Math.max(...data.weeklyTrend.map((d) => d.engagement), 1);
  const maxPlatform = Math.max(...data.platformBreakdown.map((p) => p.engagement), 1);

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          Prezentare interacțiune
        </h2>
        <Link
          href="/history"
          className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
        >
          Vezi istoric <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg bg-muted border border-border p-3 text-center">
          <div className="text-xl font-bold text-white">{data.totalPosts}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total postări</div>
        </div>
        <div className="rounded-lg bg-muted border border-border p-3 text-center">
          <div className="text-xl font-bold text-white">{formatEngNumber(data.totalEngagement)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Total engagement</div>
        </div>
        <div className="rounded-lg bg-muted border border-border p-3 text-center">
          <div className="text-xl font-bold text-white">{formatEngNumber(data.avgEngagement)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Medie / postare</div>
        </div>
        <div className="rounded-lg bg-muted border border-border p-3 text-center">
          <div className="text-xl font-bold text-white">{data.bestDay}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Cea mai bună zi</div>
        </div>
      </div>

      {/* 7-day trend */}
      <div className="mb-5">
        <div className="text-xs text-muted-foreground mb-2">Trend ultimele 7 zile</div>
        <div className="space-y-1.5">
          {data.weeklyTrend.map((day) => (
            <div key={day.date} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-8 text-right flex-shrink-0">{day.label}</span>
              <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                <div
                  className="h-full rounded bg-brand-500/60 transition-all duration-700"
                  style={{ width: `${Math.max((day.engagement / maxTrend) * 100, 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground w-10 text-right flex-shrink-0">
                {day.engagement > 0 ? formatEngNumber(day.engagement) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform breakdown */}
      {data.platformBreakdown.length > 0 && (
        <div className="mb-5">
          <div className="text-xs text-muted-foreground mb-2">Per platformă</div>
          <div className="space-y-2">
            {data.platformBreakdown.map((p) => {
              const colors = platformColorMap[p.platform] || { bg: "bg-gray-500/10", text: "text-muted-foreground", bar: "bg-gray-500" };
              return (
                <div key={p.platform} className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors.bg} ${colors.text} w-16 text-center flex-shrink-0`}>
                    {p.platform}
                  </span>
                  <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${colors.bar} opacity-50 transition-all duration-700`}
                      style={{ width: `${(p.engagement / maxPlatform) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-14 text-right flex-shrink-0">
                    {formatEngNumber(p.engagement)} · {p.posts}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top 3 posts */}
      {data.topPosts.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-2">Top postări</div>
          <div className="space-y-2">
            {data.topPosts.map((post) => {
              const colors = platformColorMap[post.platform] || { bg: "bg-gray-500/10", text: "text-muted-foreground", bar: "bg-gray-500" };
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${colors.bg} ${colors.text} flex-shrink-0`}>
                    {post.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/80 truncate">
                      {post.text_content || `[${post.content_type}]`}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(post.published_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0">
                    <span className="flex items-center gap-0.5">
                      <ThumbsUp className="w-3 h-3" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" /> {post.comments}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Share2 className="w-3 h-3" /> {post.shares}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Onboarding Card (No business profile)
// ============================================================
function OnboardingCard({
  onSelectIndustry,
  isPending,
}: {
  onSelectIndustry: (industry: Industry) => void;
  isPending: boolean;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-br from-brand-600/10 via-purple-600/5 to-pink-600/10 border border-brand-500/20 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center mx-auto mb-5">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">
          Bine ai venit la ContentOS!
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Configurează profilul afacerii tale pentru un dashboard personalizat.
          Selectează industria ta pentru a începe.
        </p>

        {isPending && (
          <div className="flex items-center justify-center gap-2 text-brand-400 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Se configurează...</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {INDUSTRY_GRID.map((ind) => {
            const Icon = getIcon(ind.icon);
            return (
              <button
                key={ind.value}
                onClick={() => onSelectIndustry(ind.value)}
                disabled={isPending}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-muted border border-border hover:border-white/[0.2] hover:bg-muted transition-all duration-200 disabled:opacity-50"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${ind.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: ind.color }} />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-white transition">
                  {ind.label}
                </span>
              </button>
            );
          })}
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition"
        >
          Configurare completă
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Main Business Dashboard Page
// ============================================================
export default function BusinessDashboardPage() {
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [kpiValues, setKpiValues] = useState<Record<string, number>>({});
  const [socialAccounts, setSocialAccounts] = useState<SocialAccountSummary[]>([]);
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [currentTime] = useState(() => new Date());

  // Load data from Supabase — optimized: user+org in parallel with data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setBusinessProfile(null);
        setKpiValues({});
        setSocialAccounts([]);
        setRecentPosts([]);
        setAnalyticsData(null);
        return;
      }

      // Single query to get org_id, then parallel fetch everything
      const { data: userData } = await supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!userData?.organization_id) {
        setBusinessProfile(null);
        setKpiValues({});
        setSocialAccounts([]);
        setRecentPosts([]);
        setAnalyticsData(null);
        return;
      }

      const orgId = userData.organization_id;

      // All queries in parallel — no waterfall
      const [
        { data: org, error: orgError },
        { data: accounts, error: accountsError },
        { data: posts, error: postsError },
        analyticsDataResult,
      ] = await Promise.all([
        supabase
          .from("organizations")
          .select("settings")
          .eq("id", orgId)
          .single(),
        supabase
          .from("social_accounts")
          .select("id, platform, platform_name, platform_username, avatar_url, followers_count, sync_status")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("posts")
          .select("id, platform, text_content, likes_count, comments_count, shares_count, published_at, platform_url")
          .eq("organization_id", orgId)
          .order("published_at", { ascending: false })
          .limit(5),
        fetch("/api/analytics/overview")
          .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()) as AnalyticsData;
          })
          .catch(() => null),
      ]);

      if (orgError) {
        console.error("Business profile query error:", orgError);
      }
      if (accountsError) {
        console.error("Social accounts query error:", accountsError);
      }
      if (postsError) {
        console.error("Recent posts query error:", postsError);
      }

      const settings = (org?.settings as Record<string, unknown>) || {};
      const bp = settings.businessProfile as BusinessProfile | undefined;
      const kpis = (settings.dashboardKpis as Record<string, number>) || {};

      if (bp?.name || bp?.industry) {
        setBusinessProfile(bp);
      } else {
        setBusinessProfile(null);
      }
      setKpiValues(kpis);
      setSocialAccounts((accounts as SocialAccountSummary[]) || []);
      setRecentPosts((posts as RecentPost[]) || []);
      setAnalyticsData(analyticsDataResult);
    } catch (err) {
      console.error("Dashboard business load error:", err);
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clock is static — no interval re-renders

  // Handle quick industry selection (onboarding)
  function handleQuickIndustry(industry: Industry) {
    startTransition(async () => {
      const result = await quickSetIndustry(industry);
      if (result.success) {
        setBusinessProfile({
          name: "",
          description: "",
          industry,
          tones: [],
          targetAudience: "",
          usps: "",
          avoidPhrases: "",
          preferredPhrases: "",
          language: "ro",
          compliance: [],
        });
      }
    });
  }

  // Handle KPI value editing
  function handleKpiEdit(key: string, value: number) {
    const updated = { ...kpiValues, [key]: value };
    setKpiValues(updated);
    startTransition(async () => {
      await saveKpiValues(updated);
    });
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-input" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-input" />
        </div>
        {/* KPI cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
              <div className="h-3 w-20 rounded bg-input" />
              <div className="h-8 w-16 rounded bg-input" />
              <div className="h-2 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl bg-card border border-border p-4 h-48" />
            <div className="rounded-xl bg-card border border-border p-4 h-32" />
          </div>
          <div className="space-y-4">
            <div className="rounded-xl bg-card border border-border p-4 h-40" />
            <div className="rounded-xl bg-card border border-border p-4 h-28" />
          </div>
        </div>
      </div>
    );
  }

  // No business profile - show onboarding
  if (!businessProfile || (!businessProfile.name && !businessProfile.industry)) {
    return <OnboardingCard onSelectIndustry={handleQuickIndustry} isPending={isPending} />;
  }

  const config = getIndustryConfig(businessProfile.industry);

  const dateStr = currentTime.toLocaleDateString("ro-RO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = currentTime.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 dashboard-fade-in">
      {/* Header — simple, clean */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {businessProfile.name || "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {dateStr} · <span className="capitalize">{config.label}</span>
          </p>
        </div>
        <Link
          href="/braindump"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition"
        >
          <PenTool className="w-4 h-4" />
          Creează post
        </Link>
      </div>

      {/* KPI cards — per industrie, întotdeauna vizibile */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {config.kpis.map((kpi) => (
          <KpiCard
            key={kpi.key}
            kpi={kpi}
            value={kpiValues[kpi.key] ?? kpi.defaultValue}
            onEdit={handleKpiEdit}
          />
        ))}
      </div>

      {/* Stats — only show if we have real data */}
      {(socialAccounts.length > 0 || recentPosts.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Conturi conectate</p>
            <p className="text-2xl font-bold text-white">{socialAccounts.length}</p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Postări publicate</p>
            <p className="text-2xl font-bold text-white">{recentPosts.length}</p>
          </div>
          {analyticsData && (
            <>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Interacțiune totală</p>
                <p className="text-2xl font-bold text-white">
                  {analyticsData.totalEngagement?.toLocaleString() || "0"}
                </p>
              </div>
              <div className="rounded-xl bg-card border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Impressions</p>
                <p className="text-2xl font-bold text-white">
                  {analyticsData.totalImpressions?.toLocaleString() || "0"}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state — show when no accounts connected */}
      {socialAccounts.length === 0 && (
        <>
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Bine ai venit pe ContentOS!</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Conectează-ți conturile de social media și lasă AI-ul să analizeze ce funcționează.
            În câteva minute vei avea conținut optimizat gata de publicat.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:opacity-90 transition"
            >
              <LinkIcon className="w-4 h-4" />
              Conectează conturi
            </Link>
            <Link
              href="/braindump"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition"
            >
              <Brain className="w-4 h-4" />
              Sau creează direct
            </Link>
          </div>
        </div>

          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              <AutopilotCard />
              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Acțiuni rapide
                </h2>
                <QuickActions />
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  Sfaturi pentru {config.label}
                </h2>
                <IndustryTips tips={config.contentTips} />
              </div>
              <div className="rounded-xl bg-card border border-border p-5">
                <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-400" />
                  Funnel ideal
                </h2>
                <FunnelVisualization stages={config.funnelStages} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Layout complet — când sunt conturi conectate */}
      {socialAccounts.length > 0 && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EngagementOverview data={analyticsData} />
            <SocialPerformance accounts={socialAccounts} recentPosts={recentPosts} />
          </div>
          <div className="space-y-6">
            <AutopilotCard />
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-400" />
                Săptămâna următoare
              </h2>
              <ContentCalendarPreview />
            </div>
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Idei de conținut
              </h2>
              <AiContentSuggestions config={config} />
            </div>
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Sfaturi {config.label}
              </h2>
              <IndustryTips tips={config.contentTips} />
            </div>
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-400" />
                Funnel
              </h2>
              <FunnelVisualization stages={config.funnelStages} />
            </div>
            <div className="rounded-xl bg-card border border-border p-5">
              <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Acțiuni rapide
              </h2>
              <QuickActions />
            </div>
          </div>
        </div>
      )}

      {/* Recent posts — când avem postări fără conturi active (edge case) */}
      {recentPosts.length > 0 && socialAccounts.length === 0 && (
        <div className="rounded-xl bg-card border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Postări recente
            </h2>
            <Link href="/history" className="text-xs text-primary hover:underline">
              Vezi tot →
            </Link>
          </div>
          <div className="space-y-2">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {post.text_content || "Postare publicată"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {post.platform} · {new Date(post.published_at).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {post.likes_count + post.comments_count + post.shares_count} eng.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
