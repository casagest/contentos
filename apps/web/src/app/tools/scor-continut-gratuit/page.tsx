"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Sparkles, ArrowRight, Loader2 } from "lucide-react";

/* ─── Deterministic score (no API call, no auth needed) ─── */
function scoreContent(text: string, platform: string) {
  const len = text.length;
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasEmoji = /\p{Emoji_Presentation}/u.test(text);
  const hasQuestion = /\?/.test(text);
  const hasHashtag = /#\w+/.test(text);
  const hasCTA =
    /salvează|comentează|distribuie|urmărește|link|click|încearcă|descoperă|vezi|apasă/i.test(
      text
    );
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLen = words / Math.max(sentences.length, 1);

  // Platform-specific ideal lengths
  const idealLen: Record<string, [number, number]> = {
    instagram: [100, 300],
    facebook: [80, 400],
    tiktok: [50, 200],
    youtube: [100, 500],
  };

  const [minLen, maxLen] = idealLen[platform] ?? [80, 400];

  let hookScore = 50;
  const firstLine = text.split("\n")[0] ?? "";
  if (firstLine.length > 10 && firstLine.length < 80) hookScore += 20;
  if (/^[A-ZÀ-Ž🔥⚡🎯❌✅💡]/.test(firstLine)) hookScore += 15;
  if (hasQuestion && text.indexOf("?") < 80) hookScore += 15;
  hookScore = Math.min(hookScore, 100);

  let readabilityScore = 60;
  if (avgSentenceLen < 20) readabilityScore += 20;
  if (avgSentenceLen < 12) readabilityScore += 10;
  if (hasEmoji) readabilityScore += 10;
  readabilityScore = Math.min(readabilityScore, 100);

  let ctaScore = 30;
  if (hasCTA) ctaScore += 40;
  if (hasHashtag) ctaScore += 15;
  if (hasQuestion) ctaScore += 15;
  ctaScore = Math.min(ctaScore, 100);

  let engagementScore = 40;
  if (len >= minLen && len <= maxLen) engagementScore += 25;
  else if (len > maxLen) engagementScore += 10;
  if (hasEmoji) engagementScore += 15;
  if (hasCTA) engagementScore += 10;
  if (hasQuestion) engagementScore += 10;
  engagementScore = Math.min(engagementScore, 100);

  const overall = Math.round(
    hookScore * 0.3 + readabilityScore * 0.2 + ctaScore * 0.25 + engagementScore * 0.25
  );

  return {
    overall,
    metrics: [
      { label: "Putere Hook", score: hookScore, color: hookScore >= 70 ? "bg-emerald-400" : hookScore >= 50 ? "bg-yellow-400" : "bg-red-400" },
      { label: "Lizibilitate", score: readabilityScore, color: readabilityScore >= 70 ? "bg-emerald-400" : readabilityScore >= 50 ? "bg-yellow-400" : "bg-red-400" },
      { label: "CTA", score: ctaScore, color: ctaScore >= 70 ? "bg-emerald-400" : ctaScore >= 50 ? "bg-yellow-400" : "bg-red-400" },
      { label: "Potențial Engagement", score: engagementScore, color: engagementScore >= 70 ? "bg-emerald-400" : engagementScore >= 50 ? "bg-yellow-400" : "bg-red-400" },
    ],
    tips: [
      ...(hookScore < 70 ? ["Adaugă un hook mai puternic în prima linie — o întrebare sau afirmație surprinzătoare."] : []),
      ...(ctaScore < 70 ? ["Adaugă un call-to-action clar: 'Salvează', 'Comentează', 'Distribuie'."] : []),
      ...(!hasEmoji ? ["Adaugă 1-2 emoji-uri relevante pentru a crește vizibilitatea."] : []),
      ...(!hasHashtag && platform === "instagram" ? ["Adaugă 5-8 hashtag-uri relevante pentru reach organic."] : []),
      ...(len < minLen ? [`Textul e prea scurt pentru ${platform}. Adaugă mai mult context (minim ${minLen} caractere).`] : []),
      ...(len > maxLen * 1.5 ? [`Textul e prea lung pentru ${platform}. Scurtează la max ${maxLen} caractere.`] : []),
    ],
  };
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", emoji: "📸" },
  { id: "facebook", label: "Facebook", emoji: "📘" },
  { id: "tiktok", label: "TikTok", emoji: "🎵" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
];

export default function ScorContinutGratuit() {
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [result, setResult] = useState<ReturnType<typeof scoreContent> | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  function handleScore() {
    if (text.trim().length < 10) return;
    setLoading(true);
    // Simulate brief processing for UX
    setTimeout(() => {
      setResult(scoreContent(text, platform));
      setLoading(false);
    }, 600);
  }

  return (
    <div className="min-h-screen bg-surface-ground">
      <div className="pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 mb-8 text-sm text-gray-400 hover:text-white transition"
            >
              ← Înapoi la ContentOS
            </Link>
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-orange-400" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              Scor Conținut <span className="text-orange-400">Gratuit</span>
            </h1>
            <p className="text-base text-gray-400 max-w-lg mx-auto">
              Verifică cât de bine va performa postarea ta. Fără cont, fără email
              — scrie și primești scorul instant.
            </p>
          </div>

          {/* Platform selector */}
          <div className="flex justify-center gap-2 mb-6">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPlatform(p.id);
                  setResult(null);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  platform === p.id
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>

          {/* Text input */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              placeholder="Lipește sau scrie postarea ta aici..."
              rows={6}
              className="w-full bg-transparent text-white text-sm p-4 resize-none focus:outline-none placeholder:text-gray-600"
              maxLength={3000}
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-xs text-gray-500">
                {text.length} caractere
              </span>
              <button
                onClick={handleScore}
                disabled={text.trim().length < 10 || loading}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:hover:bg-orange-500 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analizează
              </button>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
              {/* Overall score */}
              <div className="text-center mb-6">
                <div className="text-5xl font-extrabold text-white mb-1">
                  {result.overall}
                  <span className="text-2xl text-gray-400">/100</span>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    result.overall >= 75
                      ? "text-emerald-400"
                      : result.overall >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {result.overall >= 75
                    ? "✓ Excelent — gata de publicare!"
                    : result.overall >= 50
                      ? "⚡ Bun, dar se poate mai bine"
                      : "⚠ Necesită îmbunătățiri"}
                </div>
              </div>

              {/* Metric bars */}
              <div className="space-y-3 mb-6">
                {result.metrics.map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-36 shrink-0">
                      {m.label}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-white/5">
                      <div
                        className={`h-full rounded-full ${m.color} transition-all duration-500`}
                        style={{ width: `${m.score}%` }}
                      />
                    </div>
                    <span className="text-xs text-white font-bold w-8 text-right">
                      {m.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tips */}
              {result.tips.length > 0 && (
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 mb-6">
                  <h4 className="text-sm font-bold text-white mb-2">
                    💡 Sugestii de îmbunătățire:
                  </h4>
                  <ul className="space-y-1.5">
                    {result.tips.map((tip, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-400 flex items-start gap-2"
                      >
                        <span className="text-orange-400 mt-0.5">→</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className="text-center pt-4 border-t border-white/[0.06]">
                <p className="text-sm text-gray-400 mb-3">
                  Vrei <strong className="text-white">scor complet pe 9 metrici</strong> + 
                  generare conținut AI?
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25"
                >
                  Încearcă ContentOS Gratuit 7 Zile
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
