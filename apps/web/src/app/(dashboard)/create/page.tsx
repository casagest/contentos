"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  Zap,
  RefreshCw,
  Brain,
  PenTool,
  Copy,
  Check,
  Hash,
  Smile,
  ChevronDown,
  Save,
  Target,
  TrendingUp,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Trophy,
  FlaskConical,
  Compass,
  AlertCircle,
  Image as ImageIcon,
  Link2,
  Mic,
  Send,
  RotateCcw,
  Clock,
  Volume2,
  Type,
  Upload,
  X,
} from "lucide-react";
import MediaUpload from "./media-upload";

// ─── Types ──────────────────────────────────────────────────────────────────

type InputMode = "rapid" | "guided" | "repurpose";
type Objective = "engagement" | "reach" | "leads" | "saves";
type Phase = "input" | "explore" | "result";

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

// Braindump platform result types
interface FacebookResult {
  content: string;
  hashtags: string[];
  estimatedEngagement: string;
  tips: string[];
}

interface InstagramResult {
  caption: string;
  hashtags: string[];
  altText: string;
  bestTimeToPost: string;
  tips: string[];
}

interface TikTokResult {
  hook: string;
  script: string;
  hashtags: string[];
  soundSuggestion: string;
  tips: string[];
}

interface YouTubeResult {
  title: string;
  description: string;
  tags: string[];
  thumbnailIdea: string;
  tips: string[];
}

// Unified result — can hold either format
interface UnifiedResult {
  source: "generate" | "braindump";
  // From generate route
  platformVersions?: Record<string, PlatformVersion>;
  // From braindump route
  platforms?: {
    facebook?: FacebookResult;
    instagram?: InstagramResult;
    tiktok?: TikTokResult;
    youtube?: YouTubeResult;
  };
  meta?: Record<string, unknown>;
  angles?: CreativeAngle[];
  selectedAngleId?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
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

const MODE_CONFIG = {
  rapid: {
    icon: Zap,
    label: "Rapid",
    description: "Aruncă ideea, AI-ul face restul",
    gradient: "from-amber-500 to-orange-600",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  guided: {
    icon: Compass,
    label: "Ghidat",
    description: "Alege ton, obiectiv, explorează unghiuri",
    gradient: "from-brand-500 to-purple-600",
    border: "border-brand-500/30",
    bg: "bg-brand-500/10",
    text: "text-brand-400",
  },
  repurpose: {
    icon: RefreshCw,
    label: "Repurpose",
    description: "Transformă un articol, URL sau text lung",
    gradient: "from-emerald-500 to-teal-600",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
};

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

// ─── Auto-detect input mode ────────────────────────────────────────────────

function detectInputMode(text: string): InputMode {
  const trimmed = text.trim();

  // URL detection
  if (/^https?:\/\//i.test(trimmed)) return "repurpose";

  // Long text = repurpose (>500 chars usually means existing content)
  if (trimmed.length > 500) return "repurpose";

  // Short text = rapid
  return "rapid";
}

// ─── Platform Result Cards ─────────────────────────────────────────────────

function HashtagList({ tags }: { tags: string[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag) => (
        <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] bg-brand-600/10 text-brand-400 border border-brand-500/20">
          {tag.startsWith("#") ? tag : `#${tag}`}
        </span>
      ))}
    </div>
  );
}

function TipsList({ tips }: { tips: string[] }) {
  if (!tips?.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
      {tips.map((tip, i) => (
        <p key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/60" />
          {tip}
        </p>
      ))}
    </div>
  );
}

function CopyBtn({ text, label = "Copiază" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-gray-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition"
    >
      {copied ? <><Check className="w-3 h-3 text-green-400" /> Copiat</> : <><Copy className="w-3 h-3" /> {label}</>}
    </button>
  );
}

// Braindump-style cards (richer format)
function BraindumpFacebookCard({ data }: { data: FacebookResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-white">Facebook</span>
          {data.estimatedEngagement && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              data.estimatedEngagement === "High" || data.estimatedEngagement === "Viral Potential"
                ? "bg-green-500/10 text-green-400" : "bg-white/[0.06] text-gray-400"
            }`}>{data.estimatedEngagement}</span>
          )}
        </div>
        <CopyBtn text={data.content} />
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.content}</p>
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function BraindumpInstagramCard({ data }: { data: InstagramResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="text-sm font-medium text-white">Instagram</span>
          {data.bestTimeToPost && (
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {data.bestTimeToPost}
            </span>
          )}
        </div>
        <CopyBtn text={data.caption} />
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.caption}</p>
      {data.altText && <p className="text-[10px] text-gray-500 mt-2">Alt: {data.altText}</p>}
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function BraindumpTikTokCard({ data }: { data: TikTokResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-sm font-medium text-white">TikTok</span>
        </div>
        <CopyBtn text={`${data.hook}\n\n${data.script}`} />
      </div>
      <div className="bg-white/[0.03] rounded-lg p-2.5 mb-2">
        <span className="text-[10px] text-brand-400 uppercase tracking-wider">Hook</span>
        <p className="text-sm text-white font-medium mt-0.5">{data.hook}</p>
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.script}</p>
      {data.soundSuggestion && (
        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> {data.soundSuggestion}
        </p>
      )}
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function BraindumpYouTubeCard({ data }: { data: YouTubeResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-white">YouTube</span>
        </div>
        <CopyBtn text={`${data.title}\n\n${data.description}`} />
      </div>
      <div className="bg-white/[0.03] rounded-lg p-2.5 mb-2">
        <span className="text-[10px] text-brand-400 uppercase tracking-wider">Titlu</span>
        <p className="text-sm text-white font-medium mt-0.5">{data.title}</p>
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.description}</p>
      {data.thumbnailIdea && (
        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
          <Type className="w-3 h-3" /> Thumbnail: {data.thumbnailIdea}
        </p>
      )}
      <HashtagList tags={data.tags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

// Generate-style card (compact format)
function GenerateCard({
  platformId,
  result,
  meta,
}: {
  platformId: string;
  result: PlatformVersion;
  meta?: Record<string, unknown> | null;
}) {
  const platform = PLATFORMS.find((p) => p.id === platformId);
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!platform) return null;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${platform.color}`} />
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
          {typeof result.selectedVariant === "number" && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-600/15 text-brand-300 border border-brand-500/25">
              v{result.selectedVariant}
            </span>
          )}
          {meta?.mode === "ai" ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">
              ✨ AI
            </span>
          ) : meta?.mode === "deterministic" ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
              ⚡ Template
            </span>
          ) : null}
        </div>
        <button
          onClick={copyText}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition"
        >
          {copied ? <><Check className="w-3 h-3 text-green-400" /> Copiat</> : <><Copy className="w-3 h-3" /> Copiază</>}
        </button>
      </div>
      <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{result.text}</div>
      {result.hashtags?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-xs text-brand-400">
            {result.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CreatePage() {
  // Core state
  const [mode, setMode] = useState<InputMode>("rapid");
  const [phase, setPhase] = useState<Phase>("input");
  const [content, setContent] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [tone, setTone] = useState("casual");
  const [objective, setObjective] = useState<Objective>("engagement");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);

  // Media state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [result, setResult] = useState<UnifiedResult | null>(null);
  const [angles, setAngles] = useState<CreativeAngle[]>([]);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);

  // Save state
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load organization ID
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

  // Auto-detect mode when content changes
  const handleContentChange = (text: string) => {
    setContent(text);
    // Only auto-switch if user hasn't explicitly chosen guided
    if (mode !== "guided") {
      const detected = detectInputMode(text);
      setMode(detected);
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // ─── Rapid Mode: Direct generation via braindump route ──────────────

  const generateRapid = useCallback(async () => {
    const input = (content || urlInput).trim();
    if (!input || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: input,
          platforms: selectedPlatforms,
          language: "ro",
          qualityMode: "balanced",
          objective,
          conversationMode: false,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la generare");
      }

      const data = await response.json();

      // Handle conversational responses
      if (data.type === "conversation") {
        // If braindump wants to clarify, show the message as error/info
        const msgs = data.messages?.filter((m: { role: string }) => m.role === "assistant");
        if (msgs?.length) {
          setError(msgs[msgs.length - 1].content);
        }
        return;
      }

      setResult({
        source: "braindump",
        platforms: data.platforms || {},
        meta: data.meta,
      });
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsProcessing(false);
    }
  }, [content, urlInput, selectedPlatforms, objective, isProcessing]);

  // ─── Repurpose Mode: URL scraping via braindump route ───────────────

  const generateRepurpose = useCallback(async () => {
    const input = urlInput.trim() || content.trim();
    if (!input || isProcessing) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: input,
          platforms: selectedPlatforms,
          language: "ro",
          qualityMode: "balanced",
          objective,
          conversationMode: false,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la procesare");
      }

      const data = await response.json();

      if (data.type === "conversation") {
        const msgs = data.messages?.filter((m: { role: string }) => m.role === "assistant");
        if (msgs?.length) {
          setError(msgs[msgs.length - 1].content);
        }
        return;
      }

      setResult({
        source: "braindump",
        platforms: data.platforms || {},
        meta: data.meta,
      });
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsProcessing(false);
    }
  }, [content, urlInput, selectedPlatforms, objective, isProcessing]);

  // ─── Guided Mode: Explore angles via generate route ─────────────────

  const exploreAngles = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0 || isProcessing) return;
    setIsProcessing(true);
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

      if (data.meta?.mode === "intent_redirect" || data.meta?.mode === "clarification_needed") {
        setError(data.meta.message);
        return;
      }

      setAngles(data.angles || []);
      setSelectedAngleId(data.angles?.[0]?.id || null);
      setPhase("explore");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsProcessing(false);
    }
  }, [content, selectedPlatforms, objective, tone, includeHashtags, includeEmoji, isProcessing]);

  const generateWithAngle = useCallback(async () => {
    if (!content.trim() || selectedPlatforms.length === 0 || isProcessing) return;
    setIsProcessing(true);
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
      setResult({
        source: "generate",
        platformVersions: data.platformVersions || {},
        meta: typeof data.meta === "object" && data.meta !== null ? data.meta as Record<string, unknown> : undefined,
        angles,
        selectedAngleId: selectedAngleId || undefined,
      });
      setPhase("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsProcessing(false);
    }
  }, [content, selectedPlatforms, objective, tone, includeHashtags, includeEmoji, selectedAngleId, angles, isProcessing]);

  // ─── Actions ────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (mode === "rapid") generateRapid();
    else if (mode === "repurpose") generateRepurpose();
    else if (mode === "guided") exploreAngles();
  };

  const resetAll = () => {
    setPhase("input");
    setContent("");
    setUrlInput("");
    setResult(null);
    setAngles([]);
    setSelectedAngleId(null);
    setError(null);
    setMediaUrls([]);
    setDraftSaved(null);
  };

  const backToInput = () => {
    setPhase("input");
    setResult(null);
    setAngles([]);
    setSelectedAngleId(null);
    setError(null);
  };

  const backToExplore = () => {
    setPhase("explore");
    setResult(null);
  };

  const saveDraft = async () => {
    if (!result) return;
    setSavingDraft(true);
    setDraftSaved(null);

    try {
      let body = "";
      let hashtags: string[] = [];
      const platformVersions: Record<string, unknown> = {};

      if (result.source === "generate" && result.platformVersions) {
        const firstPlatform = selectedPlatforms[0];
        const firstResult = result.platformVersions[firstPlatform];
        body = firstResult?.text || content;
        hashtags = firstResult?.hashtags || [];
        for (const p of selectedPlatforms) {
          if (result.platformVersions[p]) {
            platformVersions[p] = result.platformVersions[p];
          }
        }
      } else if (result.source === "braindump" && result.platforms) {
        const fb = result.platforms.facebook;
        const ig = result.platforms.instagram;
        body = fb?.content || ig?.caption || content;
        hashtags = fb?.hashtags || ig?.hashtags || [];
        if (fb) platformVersions.facebook = fb;
        if (ig) platformVersions.instagram = ig;
        if (result.platforms.tiktok) platformVersions.tiktok = result.platforms.tiktok;
        if (result.platforms.youtube) platformVersions.youtube = result.platforms.youtube;
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
          ai_suggestions: { meta: result.meta || {} },
          source: mode === "guided" ? "ai_generated" : "braindump",
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

  // ─── Render ───────────────────────────────────────────────────────────

  const ModeIcon = MODE_CONFIG[mode].icon;
  const modeConf = MODE_CONFIG[mode];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${modeConf.gradient} flex items-center justify-center transition-all duration-300`}>
          <ModeIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Creator</h1>
          <p className="text-gray-400 text-sm">
            Un singur loc pentru tot conținutul tău social media
          </p>
        </div>
      </div>

      {/* ═══════ PHASE: INPUT ═══════ */}
      {phase === "input" && (
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(MODE_CONFIG) as InputMode[]).map((m) => {
              const conf = MODE_CONFIG[m];
              const Icon = conf.icon;
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`relative rounded-xl border p-3 text-left transition-all ${
                    active
                      ? `${conf.bg} ${conf.border} ring-1 ring-inset ring-white/5`
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${active ? conf.text : "text-gray-500"}`} />
                    <span className={`text-sm font-medium ${active ? "text-white" : "text-gray-400"}`}>
                      {conf.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500">{conf.description}</p>
                  {active && (
                    <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r ${conf.gradient}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: Main input area (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Smart input */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">
                    {mode === "repurpose" ? "Conținut de transformat" : "Ideea ta"}
                  </label>
                  <span className="text-[10px] text-gray-600">{content.length} caractere</span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder={
                    mode === "rapid"
                      ? "Scrie ideea, aruncă un gând brut... AI-ul face restul ⚡"
                      : mode === "repurpose"
                        ? "Lipește articolul, newsletter-ul, sau textul lung de transformat..."
                        : "Descrie ce vrei să comunici — vei putea alege unghiul creativ..."
                  }
                  rows={mode === "repurpose" ? 10 : 6}
                  className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
                />

                {/* URL input for repurpose */}
                {mode === "repurpose" && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="Sau lipește un URL (articol, blog, pagină web)..."
                        className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Bottom bar: toggles */}
                {mode === "guided" && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
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
                )}
              </div>

              {/* Media upload */}
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
            </div>

            {/* Right: Config panel (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Platforms */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <label className="block text-sm font-medium text-gray-300 mb-3">Platforme</label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${
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

              {/* Objective */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <label className="block text-sm font-medium text-gray-300 mb-3">Obiectiv</label>
                <div className="grid grid-cols-2 gap-2">
                  {OBJECTIVES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setObjective(item.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs border transition ${
                          objective === item.id
                            ? `${modeConf.bg} ${modeConf.text} ${modeConf.border}`
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

              {/* Tone (guided only) */}
              {mode === "guided" && (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">Ton</span>
                    <div className="relative">
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                      >
                        {TONES.map((t) => (
                          <option key={t.id} value={t.id} className="bg-gray-900">
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={(!content.trim() && !urlInput.trim()) || selectedPlatforms.length === 0 || isProcessing}
                className={`w-full py-3 rounded-xl bg-gradient-to-r ${modeConf.gradient} hover:opacity-90 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2`}
              >
                {isProcessing ? (
                  <><RotateCcw className="w-4 h-4 animate-spin" /> Se procesează...</>
                ) : mode === "guided" ? (
                  <><Brain className="w-4 h-4" /> Explorează Unghiuri</>
                ) : mode === "repurpose" ? (
                  <><RefreshCw className="w-4 h-4" /> Transformă în Postări</>
                ) : (
                  <><Zap className="w-4 h-4" /> Generează Instant</>
                )}
              </button>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ PHASE: EXPLORE (guided mode only) ═══════ */}
      {phase === "explore" && (
        <div className="space-y-4">
          {/* Input summary */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <PenTool className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="text-sm text-gray-300 truncate">{content.slice(0, 120)}{content.length > 120 ? "..." : ""}</p>
            </div>
            <button
              onClick={backToInput}
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
                        angle.isContrarian
                          ? "bg-amber-500/10"
                          : isSelected ? "bg-brand-600/15" : "bg-white/[0.04]"
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
                  <p className="text-xs text-gray-400 leading-relaxed mb-2">{angle.description}</p>
                  <p className="text-[10px] text-gray-500 italic">{angle.reasoning}</p>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={backToInput}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi
            </button>
            <button
              onClick={generateWithAngle}
              disabled={!selectedAngleId || isProcessing}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:opacity-90 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <><RotateCcw className="w-4 h-4 animate-spin" /> Se generează...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generează cu {angles.find((a) => a.id === selectedAngleId)?.name || "unghiul selectat"}</>
              )}
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ═══════ PHASE: RESULT ═══════ */}
      {phase === "result" && result && (
        <div className="space-y-4">
          {/* Source badge + angle info */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${modeConf.bg} ${modeConf.border} border`}>
              <ModeIcon className={`w-3.5 h-3.5 ${modeConf.text}`} />
              <span className={`text-xs font-medium ${modeConf.text}`}>{modeConf.label}</span>
            </div>
            {result.meta?.mode === "ai" ? (
              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                ✨ AI Generated
              </span>
            ) : result.meta?.mode === "deterministic" ? (
              <span className="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                ⚡ Template Fallback
              </span>
            ) : null}
            {result.selectedAngleId && result.angles && (
              <span className="text-xs text-gray-400">
                Unghi: <strong className="text-brand-300">{result.angles.find((a) => a.id === result.selectedAngleId)?.name}</strong>
              </span>
            )}
          </div>

          {/* Warning */}
          {typeof result.meta?.warning === "string" && result.meta.warning && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{String(result.meta.warning)}</span>
            </div>
          )}

          {/* Results: Generate format */}
          {result.source === "generate" && result.platformVersions && (
            <div className="space-y-3">
              {selectedPlatforms.map((platformId) => {
                const version = result.platformVersions?.[platformId];
                if (!version) return null;
                return (
                  <GenerateCard
                    key={platformId}
                    platformId={platformId}
                    result={version}
                    meta={result.meta}
                  />
                );
              })}
            </div>
          )}

          {/* Results: Braindump format */}
          {result.source === "braindump" && result.platforms && (
            <div className="space-y-3">
              {result.platforms.facebook && <BraindumpFacebookCard data={result.platforms.facebook} />}
              {result.platforms.instagram && <BraindumpInstagramCard data={result.platforms.instagram} />}
              {result.platforms.tiktok && <BraindumpTikTokCard data={result.platforms.tiktok} />}
              {result.platforms.youtube && <BraindumpYouTubeCard data={result.platforms.youtube} />}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {mode === "guided" && result.source === "generate" && (
              <button
                onClick={backToExplore}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
              >
                <FlaskConical className="w-4 h-4" /> Alt unghi
              </button>
            )}
            <button
              onClick={resetAll}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-gray-300 hover:text-white text-sm transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Conținut nou
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
