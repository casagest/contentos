"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import MediaUpload from "../compose/media-upload";
import {
  Wand2,
  Copy,
  Check,
  Hash,
  Smile,
  ChevronDown,
  RotateCcw,
  Save,
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Zap,
  ArrowLeft,
  Lightbulb,
  Trophy,
  Compass,
  AlertCircle,
  MessageCircle,
  Image as ImageIcon,
  FlaskConical,
  Link,
  Send,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Objective = "engagement" | "reach" | "leads" | "saves";
type Mode = "compose" | "explore" | "result";

interface CreativeAngle {
  id: string;
  name: string;
  description: string;
  hookType: string;
  framework: string;
  ctaType: string;
  memoryKey: string;
  predictedScore: number;
  isContrarian: boolean;
  reasoning: string;
}

interface PlatformVersion {
  text: string;
  hashtags: string[];
  algorithmScore?: { overallScore: number; grade: string };
  alternativeVersions: string[];
  selectedVariant?: number;
}

// Braindump-style platform results
interface BraindumpPlatformResult {
  content?: string;
  caption?: string;
  hook?: string;
  script?: string;
  title?: string;
  description?: string;
  hashtags?: string[];
  tags?: string[];
  tips?: string[];
  estimatedEngagement?: string;
  altText?: string;
  bestTimeToPost?: string;
  soundSuggestion?: string;
  thumbnailIdea?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500", emoji: "📘" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500", emoji: "📸" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600", emoji: "🎵" },
  { id: "youtube", label: "YouTube", color: "bg-red-500", emoji: "🎬" },
];

const TONES = [
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Profesional" },
  { id: "funny", label: "Amuzant" },
  { id: "educational", label: "Educativ" },
  { id: "inspirational", label: "Inspirational" },
];

const OBJECTIVES: { id: Objective; label: string; icon: typeof Target }[] = [
  { id: "engagement", label: "Engagement", icon: MessageCircle },
  { id: "reach", label: "Reach", icon: TrendingUp },
  { id: "leads", label: "Leads", icon: Target },
  { id: "saves", label: "Saves", icon: Save },
];

const ANGLE_ICONS: Record<string, typeof Trophy> = {
  proven_winner: Trophy,
  contrarian: Zap,
  exploration: Compass,
  objective_engagement: MessageCircle,
  objective_reach: TrendingUp,
  objective_leads: Target,
  objective_saves: Save,
};

function getAngleIcon(angleId: string) {
  for (const [key, Icon] of Object.entries(ANGLE_ICONS)) {
    if (angleId.startsWith(key)) return Icon;
  }
  if (angleId.startsWith("platform_native")) return Sparkles;
  return Lightbulb;
}

/** Extract main text from various braindump platform response shapes */
function extractPlatformText(result: BraindumpPlatformResult): string {
  return result.content || result.caption || result.script || result.description || "";
}

/** Extract hashtags from various shapes */
function extractHashtags(result: BraindumpPlatformResult): string[] {
  return result.hashtags || result.tags || [];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function CreatePage() {
  // ── Core state ──
  const [mode, setMode] = useState<Mode>("compose");
  const [input, setInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [tone, setTone] = useState("casual");
  const [objective, setObjective] = useState<Objective>("engagement");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [showOptions, setShowOptions] = useState(false);

  // ── Media state ──
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  // ── Explore state ──
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);

  // ── Result state ──
  const [generatedContent, setGeneratedContent] = useState<Record<string, PlatformVersion>>({});
  const [generationMeta, setGenerationMeta] = useState<Record<string, unknown> | null>(null);

  // ── UI state ──
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("");
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load organization ID ──
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("users")
        .select("organization_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.organization_id) setOrganizationId(data.organization_id);
        });
    });
  }, []);

  // ── Auto-resize textarea ──
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, el.scrollHeight)}px`;
  }, [input]);

  // ── Detect input type ──
  const hasUrl = /https?:\/\/\S+/.test(input);
  const isLong = input.length > 300;
  const inputHint = hasUrl
    ? "🔗 URL detectat — va fi analizat automat"
    : isLong
      ? "📝 Text lung detectat — modul Brain Dump"
      : input.length > 0
        ? "✨ Gata de generare"
        : "";

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ── Quick Generate (braindump-style, one shot) ──
  const quickGenerate = useCallback(async () => {
    if (!input.trim() || selectedPlatforms.length === 0) return;
    setIsLoading(true);
    setLoadingLabel("Se generează conținut...");
    setError(null);

    try {
      // Use braindump route for long text/URLs, generate route otherwise
      const useBraindump = isLong || hasUrl;

      if (useBraindump) {
        const response = await fetch("/api/ai/braindump", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rawInput: input,
            platforms: selectedPlatforms,
            objective,
            language: "ro",
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Eroare la generare");
        }

        const data = await response.json();

        // Normalize braindump response to same shape as generate
        const normalized: Record<string, PlatformVersion> = {};
        const platformData = data.platforms || {};
        for (const p of selectedPlatforms) {
          const raw = platformData[p] as BraindumpPlatformResult | undefined;
          if (raw) {
            normalized[p] = {
              text: extractPlatformText(raw),
              hashtags: extractHashtags(raw),
              algorithmScore: undefined,
              alternativeVersions: [],
            };
          }
        }
        setGeneratedContent(normalized);
        setGenerationMeta(data.meta || null);
      } else {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input,
            platforms: selectedPlatforms,
            objective,
            tone,
            includeHashtags,
            includeEmoji,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Eroare la generare");
        }

        const data = await response.json();
        setGeneratedContent(data.platformVersions || {});
        setGenerationMeta(data.meta || null);
      }

      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsLoading(false);
      setLoadingLabel("");
    }
  }, [input, selectedPlatforms, objective, tone, includeHashtags, includeEmoji, isLong, hasUrl]);

  // ── Explore Angles ──
  const exploreAngles = useCallback(async () => {
    if (!input.trim() || selectedPlatforms.length === 0) return;
    setIsLoading(true);
    setLoadingLabel("Se analizează unghiuri creative...");
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          platforms: selectedPlatforms,
          objective,
          tone,
          includeHashtags,
          includeEmoji,
          exploreOnly: true,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la explorare");
      }

      const data = await response.json();
      setAngles(data.angles || []);
      setSelectedAngleId(data.angles?.[0]?.id || null);
      setMode("explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsLoading(false);
      setLoadingLabel("");
    }
  }, [input, selectedPlatforms, objective, tone, includeHashtags, includeEmoji]);

  // ── Generate with selected angle ──
  const generateWithAngle = useCallback(async () => {
    if (!input.trim() || selectedPlatforms.length === 0) return;
    setIsLoading(true);
    setLoadingLabel("Se generează cu unghiul selectat...");
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          platforms: selectedPlatforms,
          objective,
          tone,
          includeHashtags,
          includeEmoji,
          selectedAngleId: selectedAngleId || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la generare");
      }

      const data = await response.json();
      setGeneratedContent(data.platformVersions || {});
      setGenerationMeta(data.meta || null);
      setMode("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsLoading(false);
      setLoadingLabel("");
    }
  }, [input, selectedPlatforms, objective, tone, includeHashtags, includeEmoji, selectedAngleId]);

  // ── Copy ──
  const copyToClipboard = async (text: string, platform: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  // ── Save Draft ──
  const saveDraft = async () => {
    if (Object.keys(generatedContent).length === 0) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const firstPlatform = selectedPlatforms[0];
      const firstResult = generatedContent[firstPlatform];
      const body = firstResult?.text || input;
      const hashtags = firstResult?.hashtags || [];

      const platformVersions: Record<string, unknown> = {};
      const algorithmScores: Record<string, unknown> = {};
      for (const p of selectedPlatforms) {
        if (generatedContent[p]) {
          platformVersions[p] = {
            text: generatedContent[p].text,
            hashtags: generatedContent[p].hashtags,
            alternativeVersions: generatedContent[p].alternativeVersions || [],
            selectedVariant:
              typeof generatedContent[p].selectedVariant === "number"
                ? generatedContent[p].selectedVariant
                : 0,
          };
          if (generatedContent[p].algorithmScore) {
            algorithmScores[p] = generatedContent[p].algorithmScore;
          }
        }
      }

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.slice(0, 60).split("\n")[0],
          body,
          hashtags,
          media_urls: mediaUrls,
          target_platforms: selectedPlatforms,
          platform_versions: platformVersions,
          algorithm_scores: algorithmScores,
          ai_suggestions: {
            meta: {
              ...(generationMeta || {}),
              objective,
              selectedAngleId,
            },
          },
          source: "ai_generated",
        }),
      });

      if (res.ok) {
        setDraftSaved("✅ Draft salvat! Mergi la Calendar pentru a programa.");
        setTimeout(() => setDraftSaved(null), 4000);
      }
    } catch {
      // silent
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Reset ──
  const resetAll = () => {
    setMode("compose");
    setAngles([]);
    setSelectedAngleId(null);
    setGeneratedContent({});
    setGenerationMeta(null);
    setError(null);
    setDraftSaved(null);
  };

  const canGenerate = input.trim().length > 0 && selectedPlatforms.length > 0 && !isLoading;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Creează Conținut</h1>
          <p className="text-gray-400 text-sm">
            Scrie, lipește sau dă un link — AI-ul face restul
            {generationMeta?.cognitiveMemory ? (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/25">
                🧠 Memorie activă
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {/* ════════════════════ COMPOSE MODE ════════════════════ */}
      {mode === "compose" && (
        <div className="space-y-4">
          {/* Main input area */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie ideea ta, lipește un text, sau adaugă un URL...

Exemple:
• &quot;Postare despre beneficiile albiririi dentare&quot;
• &quot;https://blog.ro/articol-nou&quot; → extrage și transformă
• Lipește un paragraf lung → Brain Dump automat"
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none p-4 min-h-[120px]"
            />

            {/* Input footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.01]">
              <div className="flex items-center gap-3">
                {/* Quick toggles */}
                <button
                  onClick={() => setIncludeHashtags(!includeHashtags)}
                  title="Hashtags"
                  className={`p-1.5 rounded-lg transition ${includeHashtags ? "text-brand-400 bg-brand-600/10" : "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`}
                >
                  <Hash className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIncludeEmoji(!includeEmoji)}
                  title="Emoji"
                  className={`p-1.5 rounded-lg transition ${includeEmoji ? "text-brand-400 bg-brand-600/10" : "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`}
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  title="Opțiuni avansate"
                  className={`p-1.5 rounded-lg transition ${showOptions ? "text-brand-400 bg-brand-600/10" : "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`}
                >
                  <ChevronDown className={`w-4 h-4 transition ${showOptions ? "rotate-180" : ""}`} />
                </button>

                {/* Input hint */}
                {inputHint && (
                  <span className="text-xs text-gray-500 ml-1">{inputHint}</span>
                )}
              </div>

              <span className="text-xs text-gray-600">{input.length} caractere</span>
            </div>
          </div>

          {/* Advanced options (collapsible) */}
          {showOptions && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Tone */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Ton</span>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id} className="bg-gray-900">{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Objective */}
              <div className="space-y-2">
                <span className="text-sm text-gray-400">Obiectiv</span>
                <div className="grid grid-cols-4 gap-2">
                  {OBJECTIVES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setObjective(item.id)}
                        className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs border transition ${
                          objective === item.id
                            ? "bg-brand-600/20 text-brand-300 border-brand-500/40"
                            : "bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-gray-300"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media */}
              {organizationId && (
                <div>
                  <span className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Media
                  </span>
                  <MediaUpload
                    mediaUrls={mediaUrls}
                    onChange={setMediaUrls}
                    organizationId={organizationId}
                  />
                </div>
              )}
            </div>
          )}

          {/* Platform selector */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  selectedPlatforms.includes(p.id)
                    ? "bg-white/[0.08] text-white border border-brand-500/30 shadow-sm shadow-brand-500/10"
                    : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                <span>{p.emoji}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={quickGenerate}
              disabled={!canGenerate}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-500/20"
            >
              {isLoading ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> {loadingLabel}</>
              ) : (
                <><Send className="w-4 h-4" /> Generează</>
              )}
            </button>
            <button
              onClick={exploreAngles}
              disabled={!canGenerate}
              className="px-5 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 hover:text-white hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed font-medium transition flex items-center gap-2 text-sm"
              title="Explorează unghiuri creative înainte de a genera"
            >
              <FlaskConical className="w-4 h-4" /> Explorează
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ EXPLORE MODE ════════════════════ */}
      {mode === "explore" && (
        <div className="space-y-4">
          {/* Input summary */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Wand2 className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-300 truncate">{input.slice(0, 120)}{input.length > 120 ? "..." : ""}</p>
            </div>
            <button
              onClick={resetAll}
              className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/[0.04] transition shrink-0"
            >
              Modifică
            </button>
          </div>

          {/* Angles grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {angles.map((angle) => {
              const Icon = getAngleIcon(angle.id);
              const isSelected = selectedAngleId === angle.id;
              return (
                <button
                  key={angle.id}
                  onClick={() => setSelectedAngleId(angle.id)}
                  className={`text-left rounded-xl border p-4 transition ${
                    isSelected
                      ? "bg-brand-600/10 border-brand-500/40 ring-1 ring-brand-500/20"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        angle.isContrarian ? "bg-amber-500/10" : isSelected ? "bg-brand-600/15" : "bg-white/[0.04]"
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          angle.isContrarian ? "text-amber-400" : isSelected ? "text-brand-400" : "text-gray-400"
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">{angle.name}</h3>
                        {angle.isContrarian && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            CONTRARIAN
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      angle.predictedScore >= 80
                        ? "bg-green-500/10 text-green-400"
                        : angle.predictedScore >= 65
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {angle.predictedScore}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-1">{angle.description}</p>
                  <p className="text-[10px] text-gray-500 italic">{angle.reasoning}</p>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetAll}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi
            </button>
            <button
              onClick={generateWithAngle}
              disabled={!selectedAngleId || isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> {loadingLabel}</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generează cu {angles.find((a) => a.id === selectedAngleId)?.name || "unghiul selectat"}</>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ RESULT MODE ════════════════════ */}
      {mode === "result" && (
        <div className="space-y-4">
          {/* Meta bar */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedAngleId && angles.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-brand-300 bg-brand-600/10 px-2 py-1 rounded-lg">
                  <FlaskConical className="w-3 h-3" />
                  {angles.find((a) => a.id === selectedAngleId)?.name}
                </span>
              )}
              {generationMeta?.mode === "ai" && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">✨ AI</span>
              )}
              {generationMeta?.mode === "deterministic" && (
                <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">⚡ Template</span>
              )}
              {generationMeta?.cognitiveMemory ? (
                <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-purple-500/15 text-purple-400 border border-purple-500/25">🧠 Memorie</span>
              ) : null}
            </div>
            <button
              onClick={resetAll}
              className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/[0.04] transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Nou
            </button>
          </div>

          {/* Warning */}
          {typeof generationMeta?.warning === "string" && generationMeta.warning && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{String(generationMeta.warning)}</span>
            </div>
          )}

          {/* Platform results */}
          {selectedPlatforms.map((platformId) => {
            const platform = PLATFORMS.find((p) => p.id === platformId);
            const result = generatedContent[platformId];
            if (!platform || !result) return null;
            return (
              <div key={platformId} className="rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                {/* Platform header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{platform.emoji}</span>
                    <span className="text-sm font-medium text-white">{platform.label}</span>
                    {result.algorithmScore && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        result.algorithmScore.overallScore >= 80
                          ? "bg-green-500/10 text-green-400"
                          : result.algorithmScore.overallScore >= 65
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-white/[0.06] text-gray-300"
                      }`}>
                        {result.algorithmScore.grade} ({result.algorithmScore.overallScore})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.text, platformId)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition"
                  >
                    {copiedPlatform === platformId ? (
                      <><Check className="w-3 h-3 text-green-400" /> Copiat</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copiază</>
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {result.text}
                  </div>
                  {result.hashtags?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <p className="text-xs text-brand-400">
                        {result.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                      </p>
                    </div>
                  )}
                  {result.alternativeVersions?.length > 0 && (
                    <details className="mt-3 pt-3 border-t border-white/[0.06]">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 transition">
                        {result.alternativeVersions.length} versiuni alternative
                      </summary>
                      <div className="mt-2 space-y-2">
                        {result.alternativeVersions.map((alt, i) => (
                          <div key={i} className="text-xs text-gray-400 bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                            {alt}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3">
            {angles.length > 0 && (
              <button
                onClick={() => setMode("explore")}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
              >
                <FlaskConical className="w-4 h-4" /> Alt unghi
              </button>
            )}
            <button
              onClick={resetAll}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Idee nouă
            </button>
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? "Se salvează..." : "Salvează ca Draft"}
            </button>
          </div>

          {draftSaved && (
            <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              {draftSaved}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
