"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Clock,
  ImageIcon,
  MessageCircle,
  ChevronDown,
  Loader2,
  Check,
  RefreshCw,
  Palette,
  Layers,
  Calendar,
  BarChart3,
  Crop,
  FileText,
  Shield,
} from "lucide-react";
import MediaPickerSheet from "./media-picker-sheet";
import { useUser } from "@/components/providers/user-provider";

const HOUR_LABELS: Record<number, string> = {
  0: "00:00", 1: "01:00", 2: "02:00", 3: "03:00", 4: "04:00", 5: "05:00",
  6: "06:00", 7: "07:00", 8: "08:00", 9: "09:00", 10: "10:00", 11: "11:00",
  12: "12:00", 13: "13:00", 14: "14:00", 15: "15:00", 16: "16:00", 17: "17:00",
  18: "18:00", 19: "19:00", 20: "20:00", 21: "21:00", 22: "22:00", 23: "23:00",
};

interface CreativeToolsPanelProps {
  onPromptSelect?: (prompt: string) => void;
  compact?: boolean;
}

export default function CreativeToolsPanel({
  onPromptSelect,
  compact = false,
}: CreativeToolsPanelProps) {
  const { user } = useUser();
  const organizationId = user?.organizationId || "";

  const [expanded, setExpanded] = useState<string | null>(null);
  const [brandVoice, setBrandVoice] = useState<Record<string, unknown> | null>(null);
  const [brandVoiceLoading, setBrandVoiceLoading] = useState(false);
  const [trends, setTrends] = useState<{ topic: string; hashtags: string[] }[]>([]);
  const [bestHours, setBestHours] = useState<{ hour: number; avgEngagement: number; postCount: number }[]>([]);
  const [audienceQuestions, setAudienceQuestions] = useState<Array<{ question: string; contentIdea?: string; priority?: string }>>([]);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [repurposeContent, setRepurposeContent] = useState("");
  const [repurposeResult, setRepurposeResult] = useState<Record<string, unknown> | null>(null);
  const [repurposeLoading, setRepurposeLoading] = useState(false);
  const [moodImages, setMoodImages] = useState<string[]>([]);
  const [moodResult, setMoodResult] = useState<Record<string, unknown> | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [abContent, setAbContent] = useState("");
  const [abResult, setAbResult] = useState<Array<Record<string, unknown>> | null>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [batchTopic, setBatchTopic] = useState("");
  const [batchResult, setBatchResult] = useState<Array<Record<string, unknown>> | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [predContent, setPredContent] = useState("");
  const [predPlatform, setPredPlatform] = useState("instagram");
  const [predResult, setPredResult] = useState<Record<string, unknown> | null>(null);
  const [predLoading, setPredLoading] = useState(false);
  const [altImageUrl, setAltImageUrl] = useState("");
  const [altResult, setAltResult] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const [safetyContent, setSafetyContent] = useState("");
  const [safetyResult, setSafetyResult] = useState<Record<string, unknown> | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState("");
  const [cropResult, setCropResult] = useState<{ platform: string; label: string; aspectRatio: string; width: number; height: number; focusHint: string }[] | null>(null);
  const [cropLoading, setCropLoading] = useState(false);

  const fetchCreativeTools = useCallback(async () => {
    setToolsError(null);
    try {
      const res = await fetch("/api/ai/creative-tools");
      const data = await res.json();
      if (res.ok) {
        setTrends(data.trends || []);
        setBestHours(data.bestHours || []);
      } else {
        setToolsError(data.error || "Eroare la încărcare");
      }
    } catch (e) {
      setToolsError("Eroare de rețea");
    }
  }, []);

  useEffect(() => {
    fetchCreativeTools();
  }, [fetchCreativeTools]);

  const runBrandVoice = async () => {
    setBrandVoiceLoading(true);
    setToolsError(null);
    try {
      const res = await fetch("/api/ai/brand-voice", { method: "POST" });
      const data = await res.json();
      if (data.ok && data.brandVoice) {
        setBrandVoice(data.brandVoice);
      } else if (data.message) {
        setBrandVoice({ summary: data.message });
      } else {
        setToolsError(data.error || "Eroare la analiză");
      }
    } catch {
      setToolsError("Eroare la comunicare");
    } finally {
      setBrandVoiceLoading(false);
    }
  };

  const fetchAudienceQuestions = async () => {
    setAudienceLoading(true);
    try {
      const res = await fetch("/api/ai/audience-questions");
      const data = await res.json();
      if (data.ok && data.questions?.length) {
        setAudienceQuestions(data.questions);
      }
    } catch {
      setAudienceQuestions([]);
    } finally {
      setAudienceLoading(false);
    }
  };

  const runRepurpose = async () => {
    if (!repurposeContent.trim()) return;
    setRepurposeLoading(true);
    setRepurposeResult(null);
    try {
      const res = await fetch("/api/ai/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: repurposeContent.trim(),
          targetPlatforms: ["facebook", "instagram", "tiktok", "youtube"],
        }),
      });
      const data = await res.json();
      if (data.ok && data.platforms) {
        setRepurposeResult(data.platforms);
      }
    } catch {
      setRepurposeResult({ error: "Eroare" });
    } finally {
      setRepurposeLoading(false);
    }
  };

  const runMoodBoard = async () => {
    if (moodImages.length === 0) return;
    setMoodLoading(true);
    setMoodResult(null);
    try {
      const res = await fetch("/api/ai/mood-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: moodImages }),
      });
      const data = await res.json();
      if (data.ok) {
        setMoodResult({
          creativeBrief: data.creativeBrief,
          palette: data.palette,
          style: data.style,
          suggestedHashtags: data.suggestedHashtags,
        });
      }
    } catch {
      setMoodResult({ error: "Eroare" });
    } finally {
      setMoodLoading(false);
    }
  };

  const runAbVariants = async () => {
    if (!abContent.trim()) return;
    setAbLoading(true);
    setAbResult(null);
    try {
      const res = await fetch("/api/ai/ab-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: abContent.trim(), count: 5 }),
      });
      const data = await res.json();
      if (data.ok && data.variants?.length) setAbResult(data.variants);
    } catch {
      setToolsError("Eroare A/B");
    } finally {
      setAbLoading(false);
    }
  };

  const runBatchBrainstorm = async () => {
    setBatchLoading(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/ai/batch-brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: batchTopic.trim() || "conținut variat", count: 20 }),
      });
      const data = await res.json();
      if (data.ok && data.ideas?.length) setBatchResult(data.ideas);
    } catch {
      setToolsError("Eroare batch");
    } finally {
      setBatchLoading(false);
    }
  };

  const runPrediction = async () => {
    if (!predContent.trim()) return;
    setPredLoading(true);
    setPredResult(null);
    try {
      const res = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: predContent.trim(),
          platform: predPlatform,
          contentType: "text",
          language: "ro",
        }),
      });
      const data = await res.json();
      const scoreVal = data.overallScore ?? data.score ?? data.deterministicScore;
      if (scoreVal !== undefined) {
        setPredResult({
          score: Number(scoreVal),
          metrics: data.metrics,
          summary: data.summary,
          improvements: data.improvements,
        });
      }
    } catch {
      setToolsError("Eroare predicție");
    } finally {
      setPredLoading(false);
    }
  };

  const runAltText = async () => {
    if (!altImageUrl.trim() || !altImageUrl.startsWith("http")) return;
    setAltLoading(true);
    setAltResult(null);
    try {
      const res = await fetch("/api/ai/alt-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: altImageUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.altText) setAltResult(data.altText);
    } catch {
      setToolsError("Eroare alt text");
    } finally {
      setAltLoading(false);
    }
  };

  const runBrandSafety = async () => {
    if (!safetyContent.trim()) return;
    setSafetyLoading(true);
    setSafetyResult(null);
    try {
      const res = await fetch("/api/ai/brand-safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: safetyContent.trim() }),
      });
      const data = await res.json();
      if (data.ok) setSafetyResult(data);
    } catch {
      setToolsError("Eroare verificare");
    } finally {
      setSafetyLoading(false);
    }
  };

  const runSmartCrop = async () => {
    if (!cropImageUrl.trim() || !cropImageUrl.startsWith("http")) return;
    setCropLoading(true);
    setCropResult(null);
    try {
      const res = await fetch("/api/ai/smart-crop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: cropImageUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.crops)) setCropResult(data.crops);
    } catch {
      setToolsError("Eroare smart crop");
    } finally {
      setCropLoading(false);
    }
  };

  const toggle = (key: string) =>
    setExpanded((e) => (e === key ? null : key));

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggle("trends")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30"
        >
          <TrendingUp className="w-3 h-3" /> Trend
        </button>
        <button
          onClick={() => toggle("besttime")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
        >
          <Clock className="w-3 h-3" /> Oră optimă
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {toolsError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex items-center justify-between">
          <span>{toolsError}</span>
          <button onClick={() => setToolsError(null)} className="text-red-300 hover:text-red-200">×</button>
        </div>
      )}
      {/* Brand voice */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => toggle("brand")}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-orange-400" />
            Vocea brandului
          </span>
          {brandVoice?.summary ? (
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Salvat
            </span>
          ) : (
            <ChevronDown className={`w-4 h-4 transition ${expanded === "brand" ? "rotate-180" : ""}`} />
          )}
        </button>
        <AnimatePresence>
          {expanded === "brand" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04]"
            >
              <div className="p-3 space-y-2">
                {brandVoice?.summary ? (
                  <p className="text-xs text-white/70">{String(brandVoice.summary)}</p>
                ) : (
                  <p className="text-xs text-white/50">
                    Analizează postările și draft-urile pentru a învăța stilul brandului tău.
                  </p>
                )}
                <button
                  onClick={runBrandVoice}
                  disabled={brandVoiceLoading}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-medium hover:bg-orange-500/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {brandVoiceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {brandVoice?.summary ? "Reanalizează" : "Analizează acum"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trend pulse + Best time */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => toggle("trends")}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Trend pulse & Oră optimă
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "trends" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "trends" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04]"
            >
              <div className="p-3 space-y-3">
                <div>
                  <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Tendințe</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trends.slice(0, 6).map((t, i) => (
                      <button
                        key={i}
                        onClick={() => onPromptSelect?.(t.topic)}
                        className="px-2 py-1 rounded-md text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition"
                      >
                        {t.topic}
                      </button>
                    ))}
                  </div>
                </div>
                {bestHours.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">Oră optimă postare</div>
                    <div className="flex flex-wrap gap-1.5">
                      {bestHours.slice(0, 5).map((h) => (
                        <span
                          key={h.hour}
                          className="px-2 py-1 rounded-md text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                        >
                          {HOUR_LABELS[h.hour] ?? `${h.hour}:00`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Repurpose tree */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => toggle("repurpose")}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <RefreshCw className="w-4 h-4 text-violet-400" />
            Repurposing
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "repurpose" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "repurpose" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04]"
            >
              <div className="p-3 space-y-2">
                <textarea
                  value={repurposeContent}
                  onChange={(e) => setRepurposeContent(e.target.value)}
                  placeholder="Lipește conținutul de repurposat..."
                  className="w-full h-20 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs text-white placeholder:text-white/30 resize-none"
                />
                <button
                  onClick={runRepurpose}
                  disabled={!repurposeContent.trim() || repurposeLoading}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-400 text-xs font-medium hover:bg-violet-500/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {repurposeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Transformă pe platforme
                </button>
                {repurposeResult && !("error" in repurposeResult) && (
                  <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                    {Object.entries(repurposeResult).map(([platform, data]) => {
                      const d = data as Record<string, unknown>;
                      const text =
                        (d.content as string) ||
                        (d.caption as string) ||
                        (d.script as string) ||
                        `${(d.title as string) || ""}\n${(d.description as string) || ""}`.trim();
                      return (
                        <div key={platform} className="rounded-lg bg-white/[0.03] p-2">
                          <div className="text-[10px] font-semibold text-white/60 uppercase mb-1">{platform}</div>
                          <p className="text-xs text-white/80 line-clamp-3">{text?.slice(0, 150)}...</p>
                          <button
                            onClick={() => onPromptSelect?.(text)}
                            className="mt-1 text-[10px] text-violet-400 hover:underline"
                          >
                            Folosește ca prompt
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mood board */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => toggle("mood")}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Palette className="w-4 h-4 text-pink-400" />
            Mood board
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "mood" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "mood" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04]"
            >
              <div className="p-3 space-y-2">
                {organizationId && (
                  <MediaPickerSheet
                    mediaUrls={moodImages}
                    onChange={setMoodImages}
                    organizationId={organizationId}
                    maxImages={5}
                    variant="full"
                  />
                )}
                <button
                  onClick={runMoodBoard}
                  disabled={moodImages.length === 0 || moodLoading}
                  className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-400 text-xs font-medium hover:bg-pink-500/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {moodLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  Extrage stil & generază brief
                </button>
                {moodResult && !("error" in moodResult) && typeof moodResult.creativeBrief === "string" && (
                  <div className="rounded-lg bg-white/[0.03] p-2 mt-2">
                    <p className="text-xs text-white/80">{String(moodResult.creativeBrief)}</p>
                    <button
                      onClick={() => onPromptSelect?.(String(moodResult.creativeBrief))}
                      className="mt-1 text-[10px] text-pink-400 hover:underline"
                    >
                      Folosește ca prompt
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ce întreabă audiența */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button
          onClick={() => toggle("audience")}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="w-4 h-4 text-amber-400" />
            Ce întreabă audiența?
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "audience" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "audience" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04]"
            >
              <div className="p-3 space-y-2">
                <button
                  onClick={fetchAudienceQuestions}
                  disabled={audienceLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-2"
                >
                  {audienceLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Descoperă întrebări
                </button>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {audienceQuestions.slice(0, 8).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onPromptSelect?.(q.contentIdea || q.question)}
                      className="block w-full text-left px-2 py-1.5 rounded-lg text-[11px] bg-white/[0.03] hover:bg-white/[0.06] border border-transparent hover:border-amber-500/20 transition"
                    >
                      {q.question}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Variante A/B */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("ab")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Layers className="w-4 h-4 text-cyan-400" />
            Variante A/B
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "ab" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "ab" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <textarea value={abContent} onChange={(e) => setAbContent(e.target.value)} placeholder="Mesajul de testat..." className="w-full h-16 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs resize-none" />
                <button onClick={runAbVariants} disabled={!abContent.trim() || abLoading} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {abLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  5 variante A/B
                </button>
                {abResult?.map((v, i) => (
                  <button key={i} onClick={() => onPromptSelect?.([v.headline, v.body].filter(Boolean).join("\n"))} className="block w-full text-left rounded-lg bg-white/[0.03] p-2 text-[11px] hover:bg-white/[0.06]">
                    <span className="font-semibold">{String(v.headline || "")}</span>
                    <p className="text-white/60 mt-0.5 line-clamp-2">{String(v.body || "")}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Batch brainstorming */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("batch")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Batch brainstorming
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "batch" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "batch" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <input value={batchTopic} onChange={(e) => setBatchTopic(e.target.value)} placeholder="Temă (opțional)" className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs" />
                <button onClick={runBatchBrainstorm} disabled={batchLoading} className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {batchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  20 idei pentru lună
                </button>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {batchResult?.slice(0, 10).map((idea, i) => (
                    <button key={i} onClick={() => onPromptSelect?.(String(idea.prompt || idea.title))} className="block w-full text-left rounded-lg bg-white/[0.03] p-2 text-[11px] hover:bg-white/[0.06]">
                      {String(idea.title || "")} — {String(idea.type || "")}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Predicție performanță */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("pred")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            Predicție performanță
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "pred" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "pred" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <textarea value={predContent} onChange={(e) => setPredContent(e.target.value)} placeholder="Conținut de evaluat..." className="w-full h-14 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs resize-none" />
                <select value={predPlatform} onChange={(e) => setPredPlatform(e.target.value)} className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 py-1.5 text-[11px]">
                  {["instagram", "facebook", "tiktok", "youtube"].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button onClick={runPrediction} disabled={!predContent.trim() || predLoading} className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {predLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Evaluează
                </button>
                {predResult && (
                  <div className="rounded-lg bg-white/[0.03] p-2 space-y-1">
                    <div>
                      <span className="text-lg font-bold text-teal-400">{Number(predResult.score)}</span>
                      <span className="text-[10px] text-white/50 ml-2">/ 100</span>
                    </div>
                    {predResult.summary != null && <p className="text-[11px] text-white/70">{String(predResult.summary)}</p>}
                    {Array.isArray(predResult.improvements) && predResult.improvements.length > 0 && (
                      <ul className="text-[10px] text-white/50 list-disc list-inside">
                        {(predResult.improvements as string[]).slice(0, 2).map((imp, i) => (
                          <li key={i}>{String(imp)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Alt text AI */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("alt")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <FileText className="w-4 h-4 text-sky-400" />
            Alt text (accesibilitate)
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "alt" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "alt" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={altImageUrl} onChange={(e) => setAltImageUrl(e.target.value)} placeholder="URL imagine" className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs" />
                  {moodImages[0] && (
                    <button onClick={() => setAltImageUrl(moodImages[0])} className="px-2 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 text-[10px]">Din Mood</button>
                  )}
                </div>
                <button onClick={runAltText} disabled={!altImageUrl.trim() || altLoading} className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {altLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Generează alt text
                </button>
                {altResult && <p className="text-xs text-white/80 bg-white/[0.03] p-2 rounded-lg">{altResult}</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Smart crop */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("crop")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Crop className="w-4 h-4 text-emerald-400" />
            Smart crop
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "crop" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "crop" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={cropImageUrl} onChange={(e) => setCropImageUrl(e.target.value)} placeholder="URL imagine" className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs" />
                  {moodImages[0] && (
                    <button onClick={() => setCropImageUrl(moodImages[0])} className="px-2 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px]">Din Mood</button>
                  )}
                </div>
                <button onClick={runSmartCrop} disabled={!cropImageUrl.trim() || cropLoading} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {cropLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Dimensiuni per platformă
                </button>
                {cropResult && (
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {cropResult.map((c, i) => (
                      <div key={i} className="rounded bg-white/[0.03] p-2">
                        <span className="font-medium">{c.label}</span>
                        <p className="text-white/50 mt-0.5">{c.aspectRatio} • {c.width}×{c.height}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Brand safety */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
        <button onClick={() => toggle("safety")} className="w-full flex items-center justify-between px-3 py-2.5 text-left">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-lime-400" />
            Brand safety
          </span>
          <ChevronDown className={`w-4 h-4 transition ${expanded === "safety" ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence>
          {expanded === "safety" && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-white/[0.04]">
              <div className="p-3 space-y-2">
                <textarea value={safetyContent} onChange={(e) => setSafetyContent(e.target.value)} placeholder="Conținut de verificat..." className="w-full h-14 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2.5 py-2 text-xs resize-none" />
                <button onClick={runBrandSafety} disabled={!safetyContent.trim() || safetyLoading} className="px-3 py-1.5 rounded-lg bg-lime-500/20 text-lime-400 text-xs font-medium disabled:opacity-50 flex items-center gap-2">
                  {safetyLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Verifică
                </button>
                {safetyResult && (
                  <div className={`rounded-lg p-2 text-xs space-y-1 ${safetyResult.safe ? "bg-green-500/10 text-green-400" : "bg-amber-500/10 text-amber-400"}`}>
                    <span className="font-semibold">{safetyResult.safe ? "✓ Sigur" : "⚠ Atenție"}</span>
                    {safetyResult.summary != null ? <p className="mt-1">{String(safetyResult.summary)}</p> : null}
                    {Array.isArray(safetyResult.issues) && (safetyResult.issues as string[]).length > 0 && (
                      <ul className="mt-1 list-disc list-inside text-[10px] opacity-90">
                        {(safetyResult.issues as string[]).slice(0, 3).map((iss, i) => (
                          <li key={i}>{String(iss)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
