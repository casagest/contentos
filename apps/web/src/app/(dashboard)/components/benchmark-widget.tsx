"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Fingerprint,
  Database,
  Zap,
  Shield,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface BenchmarkData {
  maturityScore: number;
  level: "empty" | "learning" | "active" | "expert";
  voiceDNA: {
    maturity: number;
    sampleSize: number;
    hasVerbalTics: boolean;
    formalityLevel: number | null;
  };
  memory: {
    episodic: number;
    semantic: number;
    procedural: number;
    working: number;
    metacognitive: number;
  };
  totalMemories: number;
  content: {
    drafts: number;
    posts: number;
    braindumps: number;
    totalContent: number;
  };
  accuracy: {
    current: number | null;
    samples: number;
    trend: "up" | "down" | "stable";
  };
  aiUsage: {
    totalCalls: number;
    successRate: number | null;
    totalCostUsd: number;
  };
  velocity: {
    last7Days: number;
    previous7Days: number;
    trend: "up" | "down" | "stable";
  };
  switchingCost: {
    daysOfLearning: number;
    memoriesAccumulated: number;
    voiceDNASamples: number;
    patternsDiscovered: number;
    strategiesProven: number;
    contentCreated: number;
    aiInvestmentUsd: number;
  };
}

const LEVEL_CONFIG = {
  empty: {
    label: "Nou",
    color: "text-gray-400",
    gradient: "from-gray-500/20 to-gray-500/5",
    ring: "ring-gray-500/20",
    message: "Creează primul tău braindump pentru a începe antrenarea AI-ului",
  },
  learning: {
    label: "Învață",
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-500/5",
    ring: "ring-blue-500/20",
    message: "AI-ul începe să-ți recunoască stilul. Continuă să creezi!",
  },
  active: {
    label: "Activ",
    color: "text-green-400",
    gradient: "from-green-500/20 to-green-500/5",
    ring: "ring-green-500/20",
    message: "Pattern-uri detectate. AI-ul generează conținut personalizat.",
  },
  expert: {
    label: "Expert",
    color: "text-purple-400",
    gradient: "from-purple-500/20 to-purple-500/5",
    ring: "ring-purple-500/20",
    message: "AI-ul îți cunoaște vocea perfect. Strategii dovedite active.",
  },
};

function ProgressRing({ value, size = 80, strokeWidth = 6, color = "text-orange-500" }: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{value}%</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === "down") return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function MetricCard({ icon, label, value, sub }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] bg-white/[0.02]">
      <div className="p-1.5 rounded-md bg-white/[0.04]">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function BenchmarkWidget({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ai/benchmark")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const levelConfig = LEVEL_CONFIG[data.level];

  if (compact) {
    return (
      <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${levelConfig.gradient} p-4`}>
        <div className="flex items-center gap-4">
          <ProgressRing value={data.maturityScore} size={56} strokeWidth={4} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Brain className={`w-4 h-4 ${levelConfig.color}`} />
              <span className={`text-xs font-semibold ${levelConfig.color}`}>
                {levelConfig.label}
              </span>
              <TrendIcon trend={data.velocity.trend} />
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {levelConfig.message}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {data.totalMemories} memorii · {data.content.totalContent} conținuturi ·{" "}
              {data.switchingCost.daysOfLearning}z vechime
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with maturity ring */}
      <div className={`rounded-xl border border-white/[0.06] bg-gradient-to-br ${levelConfig.gradient} p-5`}>
        <div className="flex items-center gap-5">
          <ProgressRing value={data.maturityScore} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Brain className={`w-5 h-5 ${levelConfig.color}`} />
              <h3 className={`text-sm font-bold ${levelConfig.color}`}>
                Inteligență AI: {levelConfig.label}
              </h3>
              <TrendIcon trend={data.velocity.trend} />
            </div>
            <p className="text-xs text-muted-foreground mb-2">{levelConfig.message}</p>
            <div className="flex gap-3">
              <span className="text-[10px] text-muted-foreground">
                🧠 {data.totalMemories} memorii
              </span>
              <span className="text-[10px] text-muted-foreground">
                📝 {data.content.totalContent} conținuturi
              </span>
              <span className="text-[10px] text-muted-foreground">
                📅 {data.switchingCost.daysOfLearning} zile
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Voice DNA */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-orange-400" />
          <h4 className="text-xs font-semibold text-white">Voice DNA</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 ml-auto">
            {data.voiceDNA.maturity}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-1000"
            style={{ width: `${data.voiceDNA.maturity}%` }}
          />
        </div>
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span>{data.voiceDNA.sampleSize} texte analizate</span>
          {data.voiceDNA.hasVerbalTics && (
            <span className="text-green-400">✓ Ticuri verbale detectate</span>
          )}
          {data.voiceDNA.formalityLevel && (
            <span>Formalitate: {data.voiceDNA.formalityLevel}/10</span>
          )}
        </div>
      </div>

      {/* Memory Layers Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <MetricCard
          icon={<Database className="w-3.5 h-3.5 text-blue-400" />}
          label="Episodic"
          value={data.memory.episodic}
          sub="Ce s-a întâmplat"
        />
        <MetricCard
          icon={<Sparkles className="w-3.5 h-3.5 text-purple-400" />}
          label="Semantic"
          value={data.memory.semantic}
          sub="Ce am învățat"
        />
        <MetricCard
          icon={<Zap className="w-3.5 h-3.5 text-yellow-400" />}
          label="Procedural"
          value={data.memory.procedural}
          sub="Ce funcționează"
        />
        <MetricCard
          icon={<Brain className="w-3.5 h-3.5 text-green-400" />}
          label="Working"
          value={data.memory.working}
          sub="Ce contează acum"
        />
        <MetricCard
          icon={<TrendingUp className="w-3.5 h-3.5 text-orange-400" />}
          label="Metacognitive"
          value={data.memory.metacognitive}
          sub="Calibrare AI"
        />
        {data.accuracy.current !== null && (
          <MetricCard
            icon={<Shield className="w-3.5 h-3.5 text-cyan-400" />}
            label="Acuratețe AI"
            value={`${data.accuracy.current}%`}
            sub={`${data.accuracy.samples} măsurători`}
          />
        )}
      </div>

      {/* Switching Cost Warning */}
      {data.switchingCost.memoriesAccumulated > 5 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-amber-400 mb-1">
                Datele tale nu pot fi transferate
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                AI-ul tău ContentOS a acumulat{" "}
                <strong className="text-white">{data.switchingCost.memoriesAccumulated} memorii</strong>,{" "}
                <strong className="text-white">{data.switchingCost.voiceDNASamples} probe Voice DNA</strong>,{" "}
                <strong className="text-white">{data.switchingCost.patternsDiscovered} pattern-uri</strong> și{" "}
                <strong className="text-white">{data.switchingCost.strategiesProven} strategii dovedite</strong> în{" "}
                <strong className="text-white">{data.switchingCost.daysOfLearning} zile</strong>.
                Aceste date sunt unice pentru tine — niciun alt tool nu le poate replica.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Usage */}
      {data.aiUsage.totalCalls > 0 && (
        <div className="flex gap-3 text-[10px] text-muted-foreground px-1">
          <span>🤖 {data.aiUsage.totalCalls} apeluri AI</span>
          {data.aiUsage.successRate !== null && (
            <span>✅ {data.aiUsage.successRate}% succes</span>
          )}
          <span>💰 ${data.aiUsage.totalCostUsd} investiție AI</span>
        </div>
      )}
    </div>
  );
}
