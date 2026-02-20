"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Calendar,
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  Loader2,
  Flame,
  Target,
} from "lucide-react";
import type { TrendRadarResult, TrendItem } from "@/lib/trends-romania";

type TabKey = "today" | "thisWeek" | "seasonal" | "formats" | "timing";

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "today", label: "Azi", icon: Flame },
  { key: "thisWeek", label: "Săptămâna asta", icon: Calendar },
  { key: "seasonal", label: "Sezon", icon: TrendingUp },
  { key: "formats", label: "Formate", icon: Target },
  { key: "timing", label: "Timing", icon: Clock },
];

function TrendCard({
  trend,
  onGenerate,
}: {
  trend: TrendItem;
  onGenerate: (prompt: string) => void;
}) {
  return (
    <div className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all">
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-label={trend.title}>
          {trend.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-white truncate">{trend.title}</h3>
            {trend.expiresIn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 flex-shrink-0">
                {trend.expiresIn}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {trend.description}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {trend.platforms.slice(0, 3).map((p) => (
                <span
                  key={p}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground capitalize"
                >
                  {p}
                </span>
              ))}
            </div>
            <div className="ml-auto">
              <RelevanceBadge score={trend.relevance} />
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => onGenerate(trend.quickPrompt)}
        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Generează post
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}

function RelevanceBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-red-400 bg-red-500/10 border-red-500/20"
      : score >= 70
        ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
        : "text-blue-400 bg-blue-500/10 border-blue-500/20";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="w-10 h-10 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function TrendsPage() {
  const router = useRouter();
  const [data, setData] = useState<TrendRadarResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trends")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleGenerate = useCallback(
    (prompt: string) => {
      // Navigate to braindump with pre-filled prompt
      const encoded = encodeURIComponent(prompt);
      router.push(`/braindump?prefill=${encoded}`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-red-400">Eroare la încărcare: {error}</p>
      </div>
    );
  }

  const tabContent: Record<TabKey, TrendItem[]> = {
    today: [...data.todayEvents, ...data.timingInsights],
    thisWeek: data.thisWeek,
    seasonal: data.seasonalTrends,
    formats: data.platformFormats,
    timing: data.timingInsights,
  };

  const currentItems = tabContent[activeTab];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-orange-500/10">
            <TrendingUp className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Trend Radar România</h1>
            <p className="text-xs text-muted-foreground">
              {data.dayOfWeek}, {data.date} — Ce funcționează ACUM pe social media în România
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Flame className="w-4 h-4 text-red-400" />}
          label="Evenimente azi"
          value={data.todayEvents.length}
        />
        <StatCard
          icon={<Calendar className="w-4 h-4 text-blue-400" />}
          label="Săptămâna asta"
          value={data.thisWeek.length}
        />
        <StatCard
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          label="Formate trending"
          value={data.platformFormats.length}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-green-400" />}
          label="Upcoming (30 zile)"
          value={data.upcomingEvents.length}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center ${
              activeTab === key
                ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {currentItems.length === 0 ? (
        <EmptyState
          message={
            activeTab === "today"
              ? "Niciun eveniment special azi. Verifică formatele trending!"
              : "Niciun trend în această categorie."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {currentItems.map((trend) => (
            <TrendCard
              key={trend.id}
              trend={trend}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      )}

      {/* Upcoming Events Preview */}
      {activeTab === "today" && data.upcomingEvents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Evenimente în următoarele 30 de zile
          </h2>
          <div className="grid gap-2">
            {data.upcomingEvents.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-xl">{ev.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{ev.title}</p>
                  <p className="text-[10px] text-muted-foreground">{ev.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {ev.expiresIn}
                </span>
                <button
                  onClick={() => handleGenerate(ev.quickPrompt)}
                  className="p-1.5 rounded-md hover:bg-orange-500/10 text-muted-foreground hover:text-orange-400 transition-colors flex-shrink-0"
                  aria-label={`Generează post pentru ${ev.title}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      {icon}
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
