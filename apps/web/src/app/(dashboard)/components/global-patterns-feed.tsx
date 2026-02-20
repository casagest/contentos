"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Sparkles,
  Loader2,
  ArrowRight,
  TrendingUp,
  Filter,
} from "lucide-react";

interface GlobalInsight {
  id: string;
  category: "hook" | "timing" | "format" | "engagement" | "trend";
  platform: string | null;
  title: string;
  detail: string;
  metric: string;
  confidence: number;
  sampleSize: number;
  icon: string;
}

interface GlobalPatternsData {
  insights: GlobalInsight[];
  meta: {
    totalOrganizations: number;
    totalPostsAnalyzed: number;
    totalMemories: number;
    dataFreshness: string;
    source: string;
  };
}

const PLATFORM_FILTERS = [
  { key: null, label: "Toate" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  hook: "text-red-400 bg-red-500/10 border-red-500/20",
  timing: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  format: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  engagement: "text-green-400 bg-green-500/10 border-green-500/20",
  trend: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const CATEGORY_LABELS: Record<string, string> = {
  hook: "Hook",
  timing: "Timing",
  format: "Format",
  engagement: "Engagement",
  trend: "Trend",
};

export function GlobalPatternsFeed({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<GlobalPatternsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = platformFilter
      ? `/api/ai/global-patterns?platform=${platformFilter}`
      : "/api/ai/global-patterns";
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [platformFilter]);

  const handleUseInsight = useCallback(
    (insight: GlobalInsight) => {
      const prompt = `Aplică acest insight în postarea mea: ${insight.title}. ${insight.detail}`;
      router.push(`/braindump?prefill=${encodeURIComponent(prompt)}`);
    },
    [router]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const displayInsights = compact ? data.insights.slice(0, 4) : data.insights;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-500/10">
            <Globe className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Ce funcționează acum în România
            </h3>
            <p className="text-[10px] text-muted-foreground">
              Intelligence din rețeaua ContentOS
              {data.meta.totalPostsAnalyzed > 0 && (
                <> · {data.meta.totalPostsAnalyzed} postări analizate</>
              )}
            </p>
          </div>
        </div>
        {!compact && (
          <div className="flex items-center gap-1">
            <Filter className="w-3 h-3 text-muted-foreground mr-1" />
            {PLATFORM_FILTERS.map(({ key, label }) => (
              <button
                key={label}
                onClick={() => setPlatformFilter(key)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  platformFilter === key
                    ? "bg-orange-500/15 text-orange-400 border border-orange-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Insights Grid */}
      <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>
        {displayInsights.map((insight) => (
          <div
            key={insight.id}
            className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium uppercase tracking-wider ${
                      CATEGORY_COLORS[insight.category] || CATEGORY_COLORS.trend
                    }`}
                  >
                    {CATEGORY_LABELS[insight.category] || insight.category}
                  </span>
                  {insight.platform && (
                    <span className="text-[9px] text-muted-foreground capitalize">
                      {insight.platform}
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-medium text-white mb-1 line-clamp-2">
                  {insight.title}
                </h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2">
                  {insight.detail}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-green-400">
                    {insight.metric}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {insight.confidence > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        {Math.round(insight.confidence * 100)}% cert
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleUseInsight(insight)}
              className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 text-[10px] font-medium hover:bg-orange-500/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Sparkles className="w-3 h-3" />
              Aplică în braindump
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Network Stats */}
      {!compact && (
        <div className="flex items-center justify-center gap-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {data.meta.totalOrganizations} organizații în rețea
          </span>
          <span>·</span>
          <span>{data.meta.totalPostsAnalyzed} postări analizate</span>
          <span>·</span>
          <span>{data.meta.totalMemories} memorii colective</span>
        </div>
      )}
    </div>
  );
}
