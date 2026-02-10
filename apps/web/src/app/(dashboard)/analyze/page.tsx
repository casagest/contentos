"use client";

import { useState } from "react";
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
  metrics: { name: string; score: number; status: "good" | "warning" | "bad" }[];
  improvements: string[];
}

export default function AnalyzePage() {
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState("facebook");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyze = () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);

    // Simulated scoring (will connect to Claude API in production)
    setTimeout(() => {
      setResult({
        overallScore: 72,
        grade: "B",
        metrics: [
          { name: "Hook / captare atenție", score: 85, status: "good" },
          { name: "Optimizare text", score: 70, status: "warning" },
          { name: "Relevanță hashtag-uri", score: 65, status: "warning" },
          { name: "Probabilitate share", score: 78, status: "good" },
          { name: "Profunzime comentarii", score: 60, status: "warning" },
          { name: "Calitate vizuală", score: 50, status: "bad" },
          { name: "Timing publicare", score: 80, status: "good" },
          { name: "Freshness conținut", score: 75, status: "good" },
          { name: "Interacțiune comunitate", score: 68, status: "warning" },
        ],
        improvements: [
          "Adaugă o imagine sau video pentru a crește engagement-ul cu 40%",
          "Reformulează primele 2 rânduri cu un hook mai puternic",
          "Folosește 3-5 hashtag-uri relevante pentru nișa ta",
          "Adaugă un CTA clar la final (întrebare, sondaj, sau call-to-action)",
        ],
      });
      setIsAnalyzing(false);
    }, 2500);
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Algorithm Scorer</h1>
          <p className="text-gray-400 text-sm">
            Verifică scorul algoritmic înainte de publicare
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">
                Conținut de analizat
              </label>
              <div className="relative">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 pr-8 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                >
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id} className="bg-gray-900">
                      {p.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Lipește sau scrie postarea pe care vrei să o analizezi..."
              rows={10}
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
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
        </div>

        {/* Results */}
        <div>
          {!result ? (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06] p-8 text-center">
              <div>
                <BarChart3 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Scrie conținut și apasă &quot;Analizează&quot; pentru a vedea scorul
                  algoritmic pe 9 metrici.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall score */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6 text-center">
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
                <p className="text-sm text-gray-400">
                  Scor general:{" "}
                  <span className="text-white font-medium">
                    {result.overallScore}/100
                  </span>
                </p>
              </div>

              {/* Metrics */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-4">
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
                          <span className="text-xs text-gray-400">
                            {metric.name}
                          </span>
                        </div>
                        <span className="text-xs text-white font-medium">
                          {metric.score}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
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
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvements */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-400" />
                  Sugestii de îmbunătățire
                </h3>
                <div className="space-y-2">
                  {result.improvements.map((imp, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-sm text-gray-400"
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
