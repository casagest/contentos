"use client";

import { useEffect, useState } from "react";
import { Brain, Sparkles, TrendingUp, Zap, AlertCircle } from "lucide-react";

interface MemoryStats {
  stats: {
    episodic: number;
    semantic: number;
    procedural: number;
    working: number;
    metacognitive: number;
    total: number;
  };
  level: "empty" | "learning" | "active" | "expert";
}

const LEVEL_CONFIG = {
  empty: {
    label: "Nou",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
    icon: AlertCircle,
    message: "Creează conținut pentru a activa memoria AI",
  },
  learning: {
    label: "Învață",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: Brain,
    message: "AI-ul învață din conținutul tău",
  },
  active: {
    label: "Activ",
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    icon: TrendingUp,
    message: "Memoria detectează patterns din conținutul tău",
  },
  expert: {
    label: "Expert",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    icon: Sparkles,
    message: "AI-ul generează conținut personalizat pe baza strategiilor dovedite",
  },
};

export default function MemoryHealth() {
  const [data, setData] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/memory-stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d as MemoryStats | null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 animate-pulse">
        <div className="h-4 bg-white/[0.04] rounded w-32 mb-3" />
        <div className="h-3 bg-white/[0.04] rounded w-48" />
      </div>
    );
  }

  if (!data) return null;

  const config = LEVEL_CONFIG[data.level];
  const Icon = config.icon;
  const { stats } = data;

  const layers = [
    { label: "Episodice", count: stats.episodic, tip: "Experiențe din generări" },
    { label: "Patterns", count: stats.semantic, tip: "Tipare detectate" },
    { label: "Strategii", count: stats.procedural, tip: "Strategii dovedite" },
    { label: "Context", count: stats.working, tip: "Memorie de lucru" },
  ];

  return (
    <div className={`rounded-xl ${config.bg} border ${config.border} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm font-medium text-white">Memorie AI</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
          {config.label.toUpperCase()}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3">{config.message}</p>

      {/* Layer bars */}
      <div className="grid grid-cols-4 gap-2">
        {layers.map((layer) => (
          <div key={layer.label} title={layer.tip} className="text-center">
            <div className="text-lg font-bold text-white">{layer.count}</div>
            <div className="text-[10px] text-gray-500">{layer.label}</div>
          </div>
        ))}
      </div>

      {stats.total > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-brand-400" />
          <span className="text-[10px] text-gray-500">
            {stats.total} memorii totale — AI-ul folosește aceste date la fiecare generare
          </span>
        </div>
      )}
    </div>
  );
}
