"use client";

import { useState } from "react";
import { safeErrorJson, safeResponseJson } from "@/lib/safe-json";
import {
  BarChart3,
  ArrowRight,
  ChevronDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

const platforms = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
];

interface ScoreResult {
  overallScore: number;
  grade: string;
  metrics: { name: string; score: number; weight: number; explanation: string; suggestion?: string; status: "good" | "warning" | "bad" }[];
  summary: string;
  improvements: string[];
  mode?: "ai" | "deterministic";
  warning?: string;
}

export default function AnalyzePage() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, platform }),
      });

      if (!response.ok) {
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);

      const metrics = Array.isArray(data.metrics) ? data.metrics : [];
      setResult({
        overallScore: data.overallScore ?? 0,
        grade: data.grade ?? "C",
        summary: data.summary ?? "",
        metrics: metrics.map((m: { name?: string; score?: number; weight?: number; explanation?: string; feedback?: string; suggestion?: string }) => ({
          name: m.name ?? "Unknown",
          score: m.score ?? 0,
          weight: m.weight ?? 1,
          explanation: m.explanation ?? m.feedback ?? "",
          suggestion: m.suggestion,
          status: (m.score ?? 0) >= 70 ? "good" as const : (m.score ?? 0) >= 50 ? "warning" as const : "bad" as const,
        })),
        improvements: Array.isArray(data.improvements) ? data.improvements : [],
        mode: data.meta?.mode === "ai" ? "ai" : data.meta?.mode === "deterministic" ? "deterministic" : undefined,
        warning: typeof data.meta?.warning === "string" ? data.meta.warning : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const gradeColors: Record<string, string> = {
    S: "from-yellow-400 to-orange-500",
    A: "from-green-400 to-emerald-500",
    B: "from-blue-400 to-cyan-500",
    C: "from-yellow-500 to-amber-500",
    D: "from-orange-500 to-red-500",
    F: "from-red-500 to-red-700",
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground/80">
                Conținut de analizat
              </label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="appearance-none bg-muted border border-border rounded-lg px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                >
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900">
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lipește sau scrie postarea pe care vrei să o analizezi..."
              rows={10}
              className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={analyze}
            disabled={!content.trim() || isAnalyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Zap className="w-4 h-4 animate-pulse" /> Se analizează...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" /> Analizează conținut
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="h-full flex items-center justify-center rounded-xl bg-card/50 border border-dashed border-border p-8 text-center">
              <div>
                <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Scrie conținut și apasă &quot;Analizează&quot; pentru a vedea scorul
                  algoritmic pe 9 metrici.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall score */}
              <div className="rounded-xl bg-card border border-border p-6 text-center">
                <div
                  className={`inline-flex w-20 h-20 rounded-2xl bg-gradient-to-br ${gradeColors[result.grade] || gradeColors.C} items-center justify-center mb-3`}
                >
                  <div className="text-center text-white">
                    <div className="text-2xl font-bold leading-none">
                      {result.grade}
                    </div>
                    <div className="text-xs opacity-80">
                      {result.overallScore}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Scor general:{" "}
                  <span className="text-white font-medium">
                    {result.overallScore}/100
                  </span>
                </p>
                <div className="mt-2">
                  {result.mode === "ai" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                      ✨ AI
                    </span>
                  ) : result.mode === "deterministic" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                      ⚡ Template
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Warning */}
              {result.warning && (
                <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{result.warning}</span>
                </div>
              )}

              {/* Summary */}
              {result.summary && (
                <div className="rounded-xl bg-card border border-border p-4">
                  <p className="text-sm text-foreground/80">{result.summary}</p>
                </div>
              )}

              {/* Metrics */}
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-sm font-medium text-foreground/80 mb-4">
                  Metrici detaliate
                </h3>
                <div className="space-y-3">
                  {result.metrics.map((metric) => (
                    <div key={metric.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {metric.status === "good" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          ) : metric.status === "warning" ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {metric.name}
                          </span>
                        </div>
                        <span className="text-xs text-white font-medium">
                          {metric.score}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-input overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            metric.status === "good"
                              ? "bg-green-500"
                              : metric.status === "warning"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                      {metric.explanation && (
                        <p className="text-[11px] text-muted-foreground mt-1">{metric.explanation}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div className="rounded-xl bg-card border border-border p-4">
                <h3 className="text-sm font-medium text-foreground/80 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                  Sugestii de îmbunătățire
                </h3>
                <div className="space-y-2">
                  {result.improvements.map((imp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-brand-400 flex-shrink-0" />
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
