"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PenTool,
  Copy,
  Check,
  Hash,
  Smile,
  ChevronDown,
  Wand2,
  RotateCcw,
  Save,
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Trophy,
  FlaskConical,
  Compass,
  AlertCircle,
  MessageCircle,
  Image as ImageIcon,
} from "lucide-react";
import MediaUpload from "./media-upload";

// ---------- Types ----------
type Objective = "engagement" | "reach" | "leads" | "saves";
type Phase = "input" | "explore" | "generate";

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

interface IntentResult {
  intent: "content_idea" | "question" | "vague_idea" | "command";
  confidence: number;
  reason: string;
  clarificationNeeded?: string;
  suggestedFollowUp?: string;
}

interface PlatformVersion {
  text: string;
  hashtags: string[];
  algorithmScore?: { overallScore: number; grade: string };
  alternativeVersions: string[];
  selectedVariant?: number;
}

// ---------- Constants ----------
const platforms = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
];

const tones = [
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Profesional" },
  { id: "funny", label: "Amuzant" },
  { id: "educational", label: "Educativ" },
  { id: "inspirational", label: "Inspirational" },
];

const objectives: { id: Objective; label: string; icon: typeof Target }[] = [
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

// ---------- Component ----------
export default function ComposePage() {
  // Phase state
  const [phase, setPhase] = useState<Phase>("input");

  // Input state
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook"]);
  const [tone, setTone] = useState("casual");
  const [objective, setObjective] = useState<Objective>("engagement");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);

  // Media state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  // Load organization ID for media uploads
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

  // Explore state
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [intentResult, setIntentResult] = useState<IntentResult | null>(null);
  const [isExploring, setIsExploring] = useState(false);

  // Generate state
  const [generatedContent, setGeneratedContent] = useState<Record<string, PlatformVersion>>({});
  const [generationMeta, setGenerationMeta] = useState<Record<string, unknown> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Phase 1 → Phase 2: Explore creative angles
  const explore = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setIsExploring(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: content,
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

      // Handle intent redirects
      if (data.meta?.mode === "intent_redirect") {
        setIntentResult(data.intent);
        setError(data.meta.message);
        return;
      }

      if (data.meta?.mode === "clarification_needed") {
        setIntentResult(data.intent);
        setError(data.meta.message);
        return;
      }

      setAngles(data.angles || []);
      setIntentResult(data.intent || null);
      setSelectedAngleId(data.angles?.[0]?.id || null);
      setPhase("explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setIsExploring(false);
    }
  }, [content, selectedPlatforms, objective, tone, includeHashtags, includeEmoji]);

  // Phase 2 → Phase 3: Generate with selected angle
  const generate = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: content,
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
      setGenerationMeta(
        typeof data.meta === "object" && data.meta !== null
          ? (data.meta as Record<string, unknown>)
          : null
      );
      setPhase("generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setIsGenerating(false);
    }
  }, [content, selectedPlatforms, objective, tone, includeHashtags, includeEmoji, selectedAngleId]);

  const copyToClipboard = async (text: string, platform: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const saveDraft = async () => {
    if (Object.keys(generatedContent).length === 0) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const firstPlatform = selectedPlatforms[0];
      const firstResult = generatedContent[firstPlatform];
      const body = firstResult?.text || content;
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
        setDraftSaved("Draft salvat! Mergi la Calendar pentru a programa.");
        setTimeout(() => setDraftSaved(null), 4000);
      }
    } catch {
      // silent
    } finally {
      setSavingDraft(false);
    }
  };

  const resetToInput = () => {
    setPhase("input");
    setAngles([]);
    setSelectedAngleId(null);
    setGeneratedContent({});
    setGenerationMeta(null);
    setError(null);
    setMediaUrls([]);
  };

  const backToExplore = () => {
    setPhase("explore");
    setGeneratedContent({});
    setGenerationMeta(null);
  };

  // ---------- Render ----------
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <PenTool className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Content Composer</h1>
          <p className="text-gray-400 text-sm">
            Genius creativ cu inteligenta bazata pe date
          </p>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="flex items-center gap-2 mb-6">
        {(["input", "explore", "generate"] as Phase[]).map((p, idx) => (
          <div key={p} className="flex items-center gap-2">
            {idx > 0 && <div className="w-8 h-px bg-white/10" />}
            <button
              onClick={() => {
                if (p === "input") resetToInput();
                else if (p === "explore" && phase === "generate") backToExplore();
              }}
              disabled={
                (p === "explore" && phase === "input") ||
                (p === "generate" && phase !== "generate")
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                phase === p
                  ? "bg-brand-600/20 text-brand-300 border border-brand-500/40"
                  : phase === "generate" && p === "input"
                    ? "bg-white/[0.03] text-gray-500 border border-white/[0.06] cursor-pointer hover:text-gray-300"
                    : "bg-white/[0.03] text-gray-500 border border-white/[0.06]"
              }`}
            >
              {p === "input" && <><PenTool className="w-3 h-3" /> Ideea</>}
              {p === "explore" && <><Brain className="w-3 h-3" /> Unghiuri</>}
              {p === "generate" && <><Sparkles className="w-3 h-3" /> Rezultat</>}
            </button>
          </div>
        ))}
      </div>

      {/* ============ PHASE 1: INPUT ============ */}
      {phase === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Content input */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ideea ta
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scrie ideea, mesajul sau textul brut... Fii cat de vag sau specific vrei — AI-ul te va ghida."
                rows={8}
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex gap-2">
                  <button
                    onClick={() => setIncludeHashtags(!includeHashtags)}
                    className={`p-1.5 rounded-lg transition ${includeHashtags ? "text-brand-400 bg-brand-600/10" : "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`}
                  >
                    <Hash className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIncludeEmoji(!includeEmoji)}
                    className={`p-1.5 rounded-lg transition ${includeEmoji ? "text-brand-400 bg-brand-600/10" : "text-gray-500 hover:text-white hover:bg-white/[0.04]"}`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {content.length} caractere
                </span>
              </div>
            </div>

            {/* Media Upload */}
            {organizationId && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Media
                </label>
                <MediaUpload
                  mediaUrls={mediaUrls}
                  onChange={setMediaUrls}
                  organizationId={organizationId}
                />
              </div>
            )}

            {/* Platform selection */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Platforme
              </label>
              <div className="flex flex-wrap gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                      selectedPlatforms.includes(p.id)
                        ? "bg-white/[0.08] text-white border border-brand-500/30"
                        : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options: tone + objective */}
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Ton</span>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {tones.map((t) => (
                      <option key={t.id} value={t.id} className="bg-gray-900">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm text-gray-400 block">Obiectiv</span>
                <div className="grid grid-cols-2 gap-2">
                  {objectives.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setObjective(item.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition ${
                          objective === item.id
                            ? "bg-brand-600/20 text-brand-300 border-brand-500/40"
                            : "bg-white/[0.03] text-gray-400 border-white/[0.08] hover:text-gray-300"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Explore button */}
            <button
              onClick={explore}
              disabled={!content.trim() || selectedPlatforms.length === 0 || isExploring}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {isExploring ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> Analizam unghiurile creative...</>
              ) : (
                <><Brain className="w-4 h-4" /> Exploreaza Unghiuri Creative</>
              )}
            </button>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right side: empty state */}
          <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06] p-8 text-center">
            <div>
              <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">
                Scrie ideea ta si apasa &quot;Exploreaza&quot;
              </p>
              <p className="text-xs text-gray-600">
                AI-ul va analiza datele tale de performance si va genera unghiuri creative
                personalizate cu predictii de scor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ PHASE 2: EXPLORE ANGLES ============ */}
      {phase === "explore" && (
        <div className="space-y-4">
          {/* Input summary bar */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <PenTool className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-300 truncate">{content.slice(0, 120)}{content.length > 120 ? "..." : ""}</p>
            </div>
            <button
              onClick={resetToInput}
              className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg hover:bg-white/[0.04] transition shrink-0"
            >
              Modifica
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
                        angle.isContrarian
                          ? "bg-amber-500/10"
                          : isSelected
                            ? "bg-brand-600/15"
                            : "bg-white/[0.04]"
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
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">
                    {angle.description}
                  </p>
                  <p className="text-[10px] text-gray-500 italic">
                    {angle.reasoning}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetToInput}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Inapoi
            </button>
            <button
              onClick={generate}
              disabled={!selectedAngleId || isGenerating}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> Se genereaza continut genius...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Genereaza cu {angles.find((a) => a.id === selectedAngleId)?.name || "unghiul selectat"}</>
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

      {/* ============ PHASE 3: GENERATED RESULTS ============ */}
      {phase === "generate" && (
        <div className="space-y-4">
          {/* Selected angle summary */}
          {selectedAngleId && angles.length > 0 && (
            <div className="rounded-xl bg-brand-600/5 border border-brand-500/20 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-brand-300">
                  Generat cu: <strong>{angles.find((a) => a.id === selectedAngleId)?.name}</strong>
                </span>
              </div>
              <button
                onClick={backToExplore}
                className="text-xs text-brand-400 hover:text-brand-300 px-2 py-1 rounded-lg hover:bg-brand-600/10 transition flex items-center gap-1"
              >
                <FlaskConical className="w-3 h-3" /> Alt unghi
              </button>
            </div>
          )}

          {/* Warning banner for deterministic fallback */}
          {typeof generationMeta?.warning === "string" && generationMeta.warning && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{String(generationMeta.warning)}</span>
            </div>
          )}

          {/* Platform results */}
          {selectedPlatforms.map((platformId) => {
            const platform = platforms.find((p) => p.id === platformId);
            const result = generatedContent[platformId];
            if (!platform || !result) return null;
            return (
              <div
                key={platformId}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${platform.color}`} />
                    <span className="text-sm font-medium text-white">
                      {platform.label}
                    </span>
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
                    {typeof result.selectedVariant === "number" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-600/15 text-brand-300 border border-brand-500/25">
                        v{result.selectedVariant}
                      </span>
                    )}
                    {generationMeta?.mode === "ai" ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                        ✨ AI
                      </span>
                    ) : generationMeta?.mode === "deterministic" ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                        ⚡ Template
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => copyToClipboard(result.text, platformId)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition"
                  >
                    {copiedPlatform === platformId ? (
                      <><Check className="w-3 h-3 text-green-400" /> Copiat</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copiaza</>
                    )}
                  </button>
                </div>
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
              </div>
            );
          })}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={backToExplore}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Alt unghi
            </button>
            <button
              onClick={resetToInput}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Idee noua
            </button>
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2 text-sm"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? "Se salveaza..." : "Salveaza ca Draft"}
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
