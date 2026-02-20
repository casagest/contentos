"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pushNotification } from "@/components/notification-center";
import { safeErrorJson, safeResponseJson } from "@/lib/safe-json";
import { useUser } from "@/components/providers/user-provider";
import ContentChecker, { VisualSuggestion } from "../components/content-checker";
import VoiceInput from "../components/voice-input";
import {
  PenTool,
  Copy,
  Check,
  Hash,
  Smile,
  Wand2,
  RotateCcw,
  Save,
  Sparkles,
  Brain,
  Target,
  TrendingUp,
  MessageSquare,
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
  Pencil,
} from "lucide-react";
import MediaUpload from "./media-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { user: currentUser } = useUser();
  const organizationId = currentUser?.organizationId || "";
  const isDental = currentUser?.industry?.toLowerCase().includes("dental") || currentUser?.industry?.toLowerCase().includes("stomatolog") || false;

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

  // Refinement state
  const [refinementInput, setRefinementInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  // Human Touch Points state
  const [humanTouch, setHumanTouch] = useState({
    personalDetail: "",
    toneNuance: "" as "" | "warmer" | "direct" | "ironic" | "vulnerable" | "perfect",
    humanSurprise: "",
  });
  const [isWeaving, setIsWeaving] = useState(false);

  // Weave human touch points into generated content
  const weaveHumanTouches = useCallback(async () => {
    if (Object.keys(generatedContent).length === 0) return;
    const hasInput = humanTouch.personalDetail.trim() || humanTouch.humanSurprise.trim() || (humanTouch.toneNuance && humanTouch.toneNuance !== "perfect");
    if (!hasInput) return;

    setIsWeaving(true);
    setError(null);

    try {
      const currentTexts = Object.entries(generatedContent)
        .map(([p, v]) => `[${p}]: ${v.text}`)
        .join("\n\n");

      const toneMap: Record<string, string> = {
        warmer: "Mai cald și prietenos, ca și cum vorbești cu un prieten bun",
        direct: "Mai direct și concis, fără ocolișuri",
        ironic: "Cu o notă de ironie și umor subtil",
        vulnerable: "Mai vulnerabil și autentic, arată imperfecțiunile",
      };

      const instructions = [
        "IMPORTANT: Integrează natural (nu lipi!) aceste elemente umane în textul existent:",
      ];
      if (humanTouch.personalDetail.trim()) {
        instructions.push(`DETALIU PERSONAL de integrat: "${humanTouch.personalDetail}"`);
      }
      if (humanTouch.toneNuance && humanTouch.toneNuance !== "perfect") {
        instructions.push(`AJUSTARE TON: ${toneMap[humanTouch.toneNuance] || humanTouch.toneNuance}`);
      }
      if (humanTouch.humanSurprise.trim()) {
        instructions.push(`GÂND SURPRIZĂ de țesut natural: "${humanTouch.humanSurprise}"`);
      }
      instructions.push("Păstrează structura, CTA și hashtag-urile. Variază lungimea propozițiilor. Evită formulări tipic AI.");

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `Conținutul actual:\n${currentTexts}\n\n${instructions.join("\n")}`,
          platforms: selectedPlatforms,
          objective,
          tone,
          includeHashtags,
          includeEmoji,
        }),
      });

      if (!response.ok) {
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);
      if (data.platformVersions) {
        setGeneratedContent(data.platformVersions);
      }
      // Reset touch points after successful weave
      setHumanTouch({ personalDetail: "", toneNuance: "", humanSurprise: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la umanizare");
    } finally {
      setIsWeaving(false);
    }
  }, [humanTouch, generatedContent, selectedPlatforms, objective, tone, includeHashtags, includeEmoji]);

  const refineContent = useCallback(async () => {
    if (!refinementInput.trim() || Object.keys(generatedContent).length === 0) return;
    setIsRefining(true);
    setError(null);

    try {
      // Get current content for the first platform
      const currentTexts = Object.entries(generatedContent)
        .map(([p, v]) => `[${p}]: ${v.text}`)
        .join("\n\n");

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: `Conținutul actual:\n${currentTexts}\n\nInstrucțiune de rafinare: ${refinementInput}`,
          platforms: selectedPlatforms,
          objective,
          tone,
          includeHashtags,
          includeEmoji,
        }),
      });

      if (!response.ok) {
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);
      if (data.platformVersions) {
        setGeneratedContent(data.platformVersions);
      }
      if (data.meta) {
        setGenerationMeta(data.meta);
      }
      setRefinementInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la rafinare");
    } finally {
      setIsRefining(false);
    }
  }, [refinementInput, generatedContent, selectedPlatforms, objective, tone, includeHashtags, includeEmoji]);

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
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);

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
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);
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

    // Optimistic: show success immediately
    setSavingDraft(true);
    setDraftSaved("Draft salvat! Mergi la Calendar pentru a programa.");

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

      if (!res.ok) {
        // Revert optimistic state on server error
        setDraftSaved("Eroare la salvare. Încearcă din nou.");
        pushNotification({ type: "error", title: "Eroare salvare draft", message: "Serverul a returnat o eroare. Încearcă din nou." });
        setTimeout(() => setDraftSaved(null), 3000);
        return;
      }
      // Server confirmed — keep optimistic success, auto-dismiss
      pushNotification({ type: "success", title: "Draft salvat", message: content.slice(0, 60) || "Draft nou" });
      setTimeout(() => setDraftSaved(null), 4000);
    } catch {
      // Revert optimistic state on network error
      setDraftSaved("Eroare de rețea. Verifică conexiunea.");
      setTimeout(() => setDraftSaved(null), 3000);
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
      {/* Stepper vizual — 3 cercuri conectate cu linie */}
      <div className="flex items-center justify-center mb-8">
        {(["input", "explore", "generate"] as Phase[]).map((p, idx) => {
          const phaseOrder = ["input", "explore", "generate"] as const;
          const currentIdx = phaseOrder.indexOf(phase);
          const stepIdx = phaseOrder.indexOf(p);
          const isCurrent = phase === p;
          const isCompleted = currentIdx > stepIdx;
          const canClick = (p === "input") || (p === "explore" && phase === "generate");
          return (
            <div key={p} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`w-6 sm:w-12 h-px mx-0.5 transition-colors ${
                    isCompleted ? "bg-green-500/50" : "bg-white/10"
                  }`}
                />
              )}
              <button
                onClick={() => {
                  if (p === "input") resetToInput();
                  else if (p === "explore" && phase === "generate") backToExplore();
                }}
                disabled={!canClick}
                className={`flex flex-col sm:flex-row items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg transition ${
                  canClick ? "cursor-pointer hover:opacity-90" : "cursor-default"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isCurrent
                      ? "bg-orange-500 text-white animate-pulse shadow-lg shadow-orange-500/30"
                      : isCompleted
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-white/5 text-white/30 border border-white/10"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <>
                      {p === "input" && <PenTool className="w-4 h-4" />}
                      {p === "explore" && <Brain className="w-4 h-4" />}
                      {p === "generate" && <Sparkles className="w-4 h-4" />}
                    </>
                  )}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${
                  isCurrent ? "text-orange-400" : isCompleted ? "text-green-400/90" : "text-muted-foreground"
                }`}>
                  {p === "input" && "Ideea ta"}
                  {p === "explore" && "Unghiuri creative"}
                  {p === "generate" && "Conținut final"}
                </span>
              </button>
              {idx < 2 && (
                <div
                  className={`w-6 sm:w-12 h-px mx-0.5 transition-colors ${
                    stepIdx < currentIdx ? "bg-green-500/50" : "bg-white/10"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ============ PHASE 1: INPUT ============ */}
      <AnimatePresence mode="wait">
      {phase === "input" && (
        <motion.div
          key="input"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="space-y-4">
            {/* Content input — card glass */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4">
              <label className="block text-sm font-medium text-foreground/80 mb-2">
                Ideea ta
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Scrie ideea, mesajul sau textul brut... Fii cat de vag sau specific vrei — AI-ul te va ghida."
                rows={8}
                className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none resize-none rounded-lg"
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <div className="flex gap-2 items-center">
                  <VoiceInput
                    onTranscript={(text) => setContent((prev) => prev + (prev ? " " : "") + text)}
                    language="ro-RO"
                  />
                  <button
                    onClick={() => setIncludeHashtags(!includeHashtags)}
                    className={`p-1.5 rounded-lg transition ${includeHashtags ? "text-brand-400 bg-brand-600/10" : "text-muted-foreground hover:text-white hover:bg-muted"}`}
                  >
                    <Hash className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIncludeEmoji(!includeEmoji)}
                    className={`p-1.5 rounded-lg transition ${includeEmoji ? "text-brand-400 bg-brand-600/10" : "text-muted-foreground hover:text-white hover:bg-muted"}`}
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {content.length} caractere
                </span>
              </div>
            </div>

            {/* Media Upload */}
            {organizationId && (
              <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4">
                <label className="text-sm font-medium text-foreground/80 mb-2 flex items-center gap-2">
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

            {/* Platform selection — dot-uri colorate */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4">
              <label className="block text-sm font-medium text-foreground/80 mb-3" id="compose-platforms-label">
                Platforme
              </label>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="compose-platforms-label">
                {platforms.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    role="switch"
                    aria-checked={selectedPlatforms.includes(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition border ${
                      selectedPlatforms.includes(p.id)
                        ? "bg-accent text-white border-orange-500/30"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.color}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Options: tone pills + objective */}
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4 space-y-3">
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground block">Ton</span>
                <div className="flex flex-wrap gap-2">
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                        tone === t.id
                          ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                          : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:text-white/80 hover:border-white/[0.1]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm text-muted-foreground block">Obiectiv</span>
                <div className="grid grid-cols-2 gap-2">
                  {objectives.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setObjective(item.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition ${
                          objective === item.id
                            ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                            : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:text-white/80 hover:border-white/[0.1]"
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

          {/* Right side: intent analysis / help */}
          <div className="rounded-2xl bg-white/[0.02] backdrop-blur-sm border border-dashed border-white/[0.06] p-6 space-y-4">
            {intentResult ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${
                    intentResult.confidence > 0.7 ? "bg-emerald-400" : intentResult.confidence > 0.4 ? "bg-yellow-400" : "bg-gray-400"
                  }`} />
                  <span className="text-xs font-medium text-foreground/80">
                    Intenție detectată: <span className="text-white capitalize">{intentResult.intent.replace("_", " ")}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({Math.round(intentResult.confidence * 100)}%)
                  </span>
                </div>
                {intentResult.reason && (
                  <p className="text-xs text-muted-foreground">{intentResult.reason}</p>
                )}
                {intentResult.clarificationNeeded && (
                  <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <p className="text-xs text-yellow-300 font-medium mb-1">💡 Sugestie:</p>
                    <p className="text-xs text-yellow-200/80">{intentResult.clarificationNeeded}</p>
                  </div>
                )}
                {intentResult.suggestedFollowUp && (
                  <button
                    onClick={() => setContent((prev) => prev + "\n\n" + intentResult!.suggestedFollowUp)}
                    className="text-xs text-brand-400 hover:text-brand-300 underline"
                  >
                    + {intentResult.suggestedFollowUp}
                  </button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Scrie ideea ta si apasă &quot;Explorează&quot;
                </p>
                <p className="text-xs text-muted-foreground">
                  AI-ul va analiza datele tale de performance si va genera unghiuri creative
                  personalizate cu predicții de scor.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ============ PHASE 2: EXPLORE ANGLES ============ */}
      {phase === "explore" && (
        <motion.div
          key="explore"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-4"
        >
          {/* Input summary bar */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <PenTool className="w-4 h-4 text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground/80 truncate">{content.slice(0, 120)}{content.length > 120 ? "..." : ""}</p>
            </div>
            <button
              onClick={resetToInput}
              className="text-xs text-muted-foreground hover:text-white px-2 py-1 rounded-lg hover:bg-muted transition shrink-0"
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
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "ring-2 ring-orange-500 bg-orange-500/5 border-orange-500/40"
                      : "bg-white/[0.03] border-white/[0.06] hover:border-orange-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        angle.isContrarian
                          ? "bg-amber-500/10"
                          : isSelected
                            ? "bg-orange-500/20"
                            : "bg-white/[0.05]"
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          angle.isContrarian ? "text-amber-400" : isSelected ? "text-orange-400" : "text-muted-foreground"
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
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                      angle.predictedScore >= 80
                        ? "bg-green-500/15 text-green-400 border border-green-500/20"
                        : angle.predictedScore >= 65
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                          : "bg-white/[0.08] text-muted-foreground border border-white/[0.06]"
                    }`}>
                      {angle.predictedScore}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                    {angle.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground italic">
                    {angle.reasoning}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={resetToInput}
              className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-foreground/80 hover:text-white hover:border-white/[0.1] text-sm transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi
            </button>
            <button
              onClick={explore}
              disabled={isExploring}
              className="px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-white hover:border-white/[0.1] text-sm transition flex items-center gap-2"
            >
              {isExploring ? <RotateCcw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Regenerează
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
        </motion.div>
      )}

      {/* ============ PHASE 3: GENERATED RESULTS ============ */}
      {phase === "generate" && (
        <motion.div
          key="generate"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="space-y-4"
        >
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

          {/* Content output cu Radix Tabs per platformă */}
          <Tabs
            defaultValue={selectedPlatforms.find((p) => generatedContent[p]) || selectedPlatforms[0] || "facebook"}
            className="w-full"
          >
            <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] overflow-hidden">
              <TabsList className="w-full justify-start rounded-none border-b border-white/[0.06] bg-transparent p-0 h-auto">
                {selectedPlatforms.map((platformId) => {
                  const platform = platforms.find((p) => p.id === platformId);
                  const result = generatedContent[platformId];
                  if (!platform || !result) return null;
                  return (
                    <TabsTrigger
                      key={platformId}
                      value={platformId}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-orange-500/5 data-[state=active]:text-orange-400 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-white transition-all"
                    >
                      <div className={`w-2 h-2 rounded-full mr-2 ${platform.color}`} />
                      {platform.label}
                      {result.algorithmScore && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          result.algorithmScore.overallScore >= 80
                            ? "bg-green-500/15 text-green-400"
                            : result.algorithmScore.overallScore >= 65
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-white/10 text-muted-foreground"
                        }`}>
                          {result.algorithmScore.grade} {result.algorithmScore.overallScore}
                        </span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {selectedPlatforms.map((platformId) => {
                const platform = platforms.find((p) => p.id === platformId);
                const result = generatedContent[platformId];
                if (!platform || !result) return null;
                return (
                  <TabsContent key={platformId} value={platformId} className="m-0 p-4">
                    <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {result.text}
                    </div>
                    {result.hashtags?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-orange-400">
                          {result.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                        </p>
                      </div>
                    )}
                    <ContentChecker
                      text={result.text}
                      hashtags={result.hashtags}
                      platforms={[platformId]}
                      isDental={isDental}
                    />
                    <VisualSuggestion platform={platformId} isDental={isDental} />
                  </TabsContent>
                );
              })}
            </div>
          </Tabs>

          {/* Copy / Save / Edit buttons row */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedPlatforms.map((platformId) => {
              const platform = platforms.find((p) => p.id === platformId);
              const result = generatedContent[platformId];
              if (!platform || !result) return null;
              return (
                <button
                  key={platformId}
                  onClick={() => copyToClipboard(result.text, platformId)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-white hover:border-white/[0.1] text-sm transition"
                >
                  {copiedPlatform === platformId ? (
                    <><Check className="w-4 h-4 text-green-400" /> Copiat</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiază {platform.label}</>
                  )}
                </button>
              );
            })}
            <button
              onClick={saveDraft}
              disabled={savingDraft}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 text-white font-medium transition flex-1 min-w-[140px]"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? "Se salvează..." : "Salvează ca Draft"}
            </button>
            <button
              onClick={backToExplore}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-white hover:border-white/[0.1] text-sm transition"
            >
              <Pencil className="w-4 h-4" /> Edit / Alt unghi
            </button>
            <button
              onClick={resetToInput}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-muted-foreground hover:text-white hover:border-white/[0.1] text-sm transition"
            >
              <RotateCcw className="w-4 h-4" /> Idee nouă
            </button>
          </div>

          {draftSaved && (
            <div className={`px-3 py-2 rounded-lg text-sm ${
              draftSaved.startsWith("Eroare")
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : "bg-green-500/10 border border-green-500/20 text-green-400"
            }`}>
              {draftSaved}
            </div>
          )}

          {/* ── Human Touch Points ── */}
          <div className="rounded-2xl bg-gradient-to-br from-orange-500/5 to-purple-500/5 border border-orange-500/15 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">🧬 Atingeri Umane</p>
                <p className="text-[10px] text-muted-foreground">3 micro-inputuri care fac textul imposibil de detectat ca AI</p>
              </div>
            </div>

            {/* 1. Personal Detail */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                1. Detaliu personal real
              </label>
              <input
                type="text"
                value={humanTouch.personalDetail}
                onChange={(e) => setHumanTouch((prev) => ({ ...prev, personalDetail: e.target.value }))}
                placeholder="Ex: Am scris asta din cafeneaua de lângă Unirii, cu al 3-lea espresso..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              />
            </div>

            {/* 2. Tone Nuance */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                2. Nuanță de ton
              </label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["warmer", "☀️ Mai cald"],
                  ["direct", "🎯 Mai direct"],
                  ["ironic", "😏 Mai ironic"],
                  ["vulnerable", "💔 Mai vulnerabil"],
                  ["perfect", "✅ Perfect așa"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setHumanTouch((prev) => ({ ...prev, toneNuance: prev.toneNuance === value ? "" : value }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition border ${
                      humanTouch.toneNuance === value
                        ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
                        : "bg-white/[0.03] text-muted-foreground border-white/[0.06] hover:text-white hover:border-white/[0.1]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Human Surprise */}
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                3. Gând surpriză (ce n-ai spune public, dar gândești)
              </label>
              <input
                type="text"
                value={humanTouch.humanSurprise}
                onChange={(e) => setHumanTouch((prev) => ({ ...prev, humanSurprise: e.target.value }))}
                placeholder="Ex: Sincer, și eu am făcut greșeala asta luna trecută..."
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
              />
            </div>

            {/* Weave button */}
            <button
              onClick={weaveHumanTouches}
              disabled={isWeaving || (!humanTouch.personalDetail.trim() && !humanTouch.humanSurprise.trim() && (!humanTouch.toneNuance || humanTouch.toneNuance === "perfect"))}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-400 hover:to-purple-500 disabled:opacity-40 text-white font-medium text-sm transition flex items-center justify-center gap-2"
            >
              {isWeaving ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> Se țese...</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Regenerează cu atingerile tale</>
              )}
            </button>
          </div>

          {/* Refinement chat */}
          <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Rafinează rezultatul</p>
            <div className="flex items-end gap-2">
              <textarea
                value={refinementInput}
                onChange={(e) => setRefinementInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    refineContent();
                  }
                }}
                placeholder="Ex: fă-l mai scurt, schimbă tonul în profesional, adaugă CTA..."
                rows={2}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none resize-none"
              />
              <button
                onClick={refineContent}
                disabled={!refinementInput.trim() || isRefining}
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition shrink-0"
              >
                {isRefining ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {["Fă-l mai scurt", "Ton mai profesional", "Adaugă CTA", "Mai multă emoție", "Adaugă urgency"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setRefinementInput(suggestion);
                  }}
                  className="text-[10px] px-2 py-1 rounded-lg bg-muted border border-border text-muted-foreground hover:text-white hover:border-border transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
