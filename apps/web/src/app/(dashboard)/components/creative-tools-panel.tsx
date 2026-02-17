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
    </div>
  );
}
