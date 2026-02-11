"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Wand2,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  AlertCircle,
  CalendarPlus,
  Pencil,
  Hash,
  Lightbulb,
  TrendingUp,
  Clock,
  ImageIcon,
  Volume2,
  Type,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface AIResponse {
  platforms: {
    facebook?: FacebookResult;
    instagram?: InstagramResult;
    tiktok?: TikTokResult;
    youtube?: YouTubeResult;
  };
}

type PlatformKey = "facebook" | "instagram" | "tiktok" | "youtube";

// ─── Constants ──────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<
  PlatformKey,
  { label: string; icon: typeof Facebook; color: string; maxChars: number }
> = {
  facebook: {
    label: "Facebook",
    icon: Facebook,
    color: "from-blue-500 to-blue-600",
    maxChars: 63206,
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    color: "from-pink-500 to-purple-600",
    maxChars: 2200,
  },
  tiktok: {
    label: "TikTok",
    icon: Music2,
    color: "from-gray-100 to-gray-300",
    maxChars: 4000,
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    color: "from-red-500 to-red-600",
    maxChars: 5000,
  },
};

const ENGAGEMENT_COLORS: Record<string, string> = {
  Low: "text-gray-400 bg-gray-500/10",
  Medium: "text-yellow-400 bg-yellow-500/10",
  High: "text-green-400 bg-green-500/10",
  "Viral Potential": "text-purple-400 bg-purple-500/10",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getContentText(platform: PlatformKey, data: unknown): string {
  switch (platform) {
    case "facebook":
      return (data as FacebookResult).content || "";
    case "instagram":
      return (data as InstagramResult).caption || "";
    case "tiktok": {
      const tk = data as TikTokResult;
      return `${tk.hook}\n\n${tk.script}`;
    }
    case "youtube": {
      const yt = data as YouTubeResult;
      return `${yt.title}\n\n${yt.description}`;
    }
    default:
      return "";
  }
}

function getHashtags(platform: PlatformKey, data: unknown): string[] {
  switch (platform) {
    case "facebook":
      return (data as FacebookResult).hashtags || [];
    case "instagram":
      return (data as InstagramResult).hashtags || [];
    case "tiktok":
      return (data as TikTokResult).hashtags || [];
    case "youtube":
      return (data as YouTubeResult).tags || [];
    default:
      return [];
  }
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
        <div className="h-4 w-24 rounded bg-white/[0.06]" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full rounded bg-white/[0.04]" />
        <div className="h-3 w-5/6 rounded bg-white/[0.04]" />
        <div className="h-3 w-4/6 rounded bg-white/[0.04]" />
        <div className="h-3 w-3/4 rounded bg-white/[0.04]" />
      </div>
      <div className="flex gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-5 w-16 rounded-full bg-white/[0.04]" />
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-48 rounded bg-white/[0.03]" />
        <div className="h-3 w-40 rounded bg-white/[0.03]" />
      </div>
    </div>
  );
}

// ─── Platform Result Cards ──────────────────────────────────────────────────

function FacebookCard({
  data,
  onCopy,
  copied,
}: {
  data: FacebookResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Content */}
      <div className="relative group">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {data.content}
        </p>
        <button
          onClick={() =>
            onCopy(`${data.content}\n\n${data.hashtags.join(" ")}`)
          }
          className="absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" /> Copiat
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copiază
            </>
          )}
        </button>
      </div>

      {/* Character count */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Type className="w-3 h-3" />
        {data.content.length} / {PLATFORM_CONFIG.facebook.maxChars} caractere
      </div>

      {/* Engagement */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500">Engagement estimat:</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENGAGEMENT_COLORS[data.estimatedEngagement] || ENGAGEMENT_COLORS.Medium}`}
        >
          {data.estimatedEngagement}
        </span>
      </div>

      {/* Hashtags */}
      <HashtagList hashtags={data.hashtags} onCopy={onCopy} />

      {/* Tips */}
      <TipsList tips={data.tips} />
    </div>
  );
}

function InstagramCard({
  data,
  onCopy,
  copied,
}: {
  data: InstagramResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Caption */}
      <div className="relative group">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {data.caption}
        </p>
        <button
          onClick={() =>
            onCopy(`${data.caption}\n\n${data.hashtags.join(" ")}`)
          }
          className="absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" /> Copiat
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copiază
            </>
          )}
        </button>
      </div>

      {/* Character count */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Type className="w-3 h-3" />
        {data.caption.length} / {PLATFORM_CONFIG.instagram.maxChars} caractere
      </div>

      {/* Alt text */}
      {data.altText && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <ImageIcon className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-0.5">
              Alt Text
            </span>
            <span className="text-xs text-gray-400">{data.altText}</span>
          </div>
        </div>
      )}

      {/* Best time to post */}
      {data.bestTimeToPost && (
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs text-gray-500">Ora optimă:</span>
          <span className="text-xs text-gray-300">{data.bestTimeToPost}</span>
        </div>
      )}

      {/* Hashtags */}
      <HashtagList hashtags={data.hashtags} onCopy={onCopy} />

      {/* Tips */}
      <TipsList tips={data.tips} />
    </div>
  );
}

function TikTokCard({
  data,
  onCopy,
  copied,
}: {
  data: TikTokResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const fullText = `${data.hook}\n\n${data.script}`;
  return (
    <div className="space-y-4">
      {/* Hook */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20">
        <span className="text-[10px] uppercase tracking-wider text-pink-400 block mb-1">
          Hook (primele 2 secunde)
        </span>
        <p className="text-sm text-white font-medium">{data.hook}</p>
      </div>

      {/* Script */}
      <div className="relative group">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {data.script}
        </p>
        <button
          onClick={() => onCopy(fullText)}
          className="absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" /> Copiat
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copiază
            </>
          )}
        </button>
      </div>

      {/* Character count */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Type className="w-3 h-3" />
        {fullText.length} / {PLATFORM_CONFIG.tiktok.maxChars} caractere
      </div>

      {/* Sound suggestion */}
      {data.soundSuggestion && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <Volume2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-0.5">
              Sound sugerat
            </span>
            <span className="text-xs text-gray-300">
              {data.soundSuggestion}
            </span>
          </div>
        </div>
      )}

      {/* Hashtags */}
      <HashtagList hashtags={data.hashtags} onCopy={onCopy} />

      {/* Tips */}
      <TipsList tips={data.tips} />
    </div>
  );
}

function YouTubeCard({
  data,
  onCopy,
  copied,
}: {
  data: YouTubeResult;
  onCopy: (text: string) => void;
  copied: boolean;
}) {
  const fullText = `${data.title}\n\n${data.description}\n\nTags: ${data.tags.join(", ")}`;
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <span className="text-[10px] uppercase tracking-wider text-red-400 block mb-1">
          Titlu
        </span>
        <p className="text-sm text-white font-medium">{data.title}</p>
      </div>

      {/* Description */}
      <div className="relative group">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
          {data.description}
        </p>
        <button
          onClick={() => onCopy(fullText)}
          className="absolute top-0 right-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition opacity-0 group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" /> Copiat
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" /> Copiază
            </>
          )}
        </button>
      </div>

      {/* Character count */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Type className="w-3 h-3" />
        {data.description.length} / {PLATFORM_CONFIG.youtube.maxChars} caractere
        (descriere)
      </div>

      {/* Thumbnail idea */}
      {data.thumbnailIdea && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <ImageIcon className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-0.5">
              Idee Thumbnail
            </span>
            <span className="text-xs text-gray-400">{data.thumbnailIdea}</span>
          </div>
        </div>
      )}

      {/* Tags */}
      <HashtagList hashtags={data.tags} onCopy={onCopy} label="Tags" />

      {/* Tips */}
      <TipsList tips={data.tips} />
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function HashtagList({
  hashtags,
  onCopy,
  label = "Hashtags",
}: {
  hashtags: string[];
  onCopy: (text: string) => void;
  label?: string;
}) {
  if (!hashtags.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Hash className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          {label} ({hashtags.length})
        </span>
        <button
          onClick={() => onCopy(hashtags.join(" "))}
          className="ml-auto text-[10px] text-gray-500 hover:text-gray-300 transition"
        >
          Copiază toate
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((tag, i) => (
          <button
            key={i}
            onClick={() => onCopy(tag)}
            className="px-2 py-0.5 rounded-full text-[11px] bg-white/[0.04] text-gray-400 hover:bg-white/[0.08] hover:text-gray-200 transition cursor-pointer"
          >
            {tag.startsWith("#") ? tag : `#${tag}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function TipsList({ tips }: { tips: string[] }) {
  if (!tips.length) return null;
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-1.5 mb-2">
        <Lightbulb className="w-3 h-3 text-yellow-500" />
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          Tips
        </span>
      </div>
      <ul className="space-y-1">
        {tips.map((tip, i) => (
          <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
            <span className="text-gray-600 mt-0.5">•</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function BrainDumpPage() {
  const router = useRouter();
  const [dump, setDump] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformKey>("facebook");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Record<PlatformKey, boolean>
  >({
    facebook: true,
    instagram: true,
    tiktok: true,
    youtube: true,
  });

  const togglePlatform = (platform: PlatformKey) => {
    setSelectedPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const getSelectedPlatforms = (): PlatformKey[] => {
    return (Object.entries(selectedPlatforms) as [PlatformKey, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k);
  };

  const copyToClipboard = useCallback(async (text: string, key?: string) => {
    await navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }, []);

  const saveDraft = async (scheduled: boolean) => {
    if (!results) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const platformData = results.platforms[activeTab];
      const body = getContentText(activeTab, platformData);
      const hashtags = getHashtags(activeTab, platformData);

      const activePlatforms = getSelectedPlatforms();
      const platformVersions: Record<string, unknown> = {};
      for (const p of activePlatforms) {
        if (results.platforms[p]) {
          platformVersions[p] = results.platforms[p];
        }
      }

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.slice(0, 60).split("\n")[0],
          body,
          hashtags,
          target_platforms: activePlatforms,
          platform_versions: platformVersions,
          source: "braindump",
          scheduled_at: scheduled && scheduleDate ? new Date(scheduleDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        if (scheduled) {
          setDraftSaved("Postare programată cu succes!");
          setTimeout(() => router.push("/calendar"), 1500);
        } else {
          setDraftSaved("Draft salvat cu succes!");
          setTimeout(() => setDraftSaved(null), 3000);
        }
      }
    } catch {
      setDraftSaved(null);
    } finally {
      setSavingDraft(false);
      setShowSchedulePicker(false);
    }
  };

  const processDump = async () => {
    const selected = getSelectedPlatforms();
    if (!dump.trim() || !selected.length) return;

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: dump,
          platforms: selected,
          language: "ro" as const,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare necunoscută. Încearcă din nou.");
        return;
      }

      setResults(data);
      // Set active tab to first available platform
      const firstPlatform = selected.find(
        (p) => data.platforms?.[p]
      );
      if (firstPlatform) setActiveTab(firstPlatform);
    } catch {
      setError(
        "Nu s-a putut conecta la server. Verifică conexiunea la internet."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const regeneratePlatform = async (platform: PlatformKey) => {
    if (!dump.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: dump,
          platforms: [platform],
          language: "ro" as const,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Eroare la regenerare. Încearcă din nou.");
        return;
      }

      // Merge the regenerated platform into existing results
      setResults((prev) => {
        if (!prev) return data;
        return {
          platforms: {
            ...prev.platforms,
            ...data.platforms,
          },
        };
      });
    } catch {
      setError("Nu s-a putut regenera conținutul. Încearcă din nou.");
    } finally {
      setIsProcessing(false);
    }
  };

  const availablePlatforms = results
    ? (Object.keys(results.platforms) as PlatformKey[]).filter(
        (p) => results.platforms[p]
      )
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Brain Dump</h1>
          <p className="text-gray-400 text-sm">
            Aruncă gândurile brute, AI-ul le transformă în postări optimizate
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Scrie tot ce-ți vine în minte
        </label>
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          placeholder="Aruncă gândurile aici... De exemplu: Am făcut azi o procedură de albire dentară la un pacient care nu mai zâmbea de 5 ani. Rezultatul a fost incredibil. Vreau să postez despre asta."
          rows={6}
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
        />
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-xs text-gray-500 mr-1">Platforme:</span>
          {(Object.entries(PLATFORM_CONFIG) as [PlatformKey, typeof PLATFORM_CONFIG.facebook][]).map(
            ([key, config]) => {
              const Icon = config.icon;
              return (
                <label
                  key={key}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms[key]}
                    onChange={() => togglePlatform(key)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] text-brand-600 focus:ring-brand-500/40 focus:ring-offset-0"
                  />
                  <Icon className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-400">{config.label}</span>
                </label>
              );
            }
          )}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-xs text-gray-500">{dump.length} caractere</span>
          <div className="flex gap-2">
            {dump.trim() && (
              <button
                onClick={() => {
                  setDump("");
                  setResults(null);
                  setError(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition"
              >
                <RotateCcw className="w-3 h-3" /> Resetează
              </button>
            )}
            <button
              onClick={processDump}
              disabled={
                !dump.trim() || isProcessing || !getSelectedPlatforms().length
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition"
            >
              {isProcessing ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />{" "}
                  Procesează...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" /> Procesează cu AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-300">{error}</p>
            <button
              onClick={processDump}
              className="text-xs text-red-400 hover:text-red-300 mt-1 underline underline-offset-2"
            >
              Încearcă din nou
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isProcessing && !results && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-sm text-gray-400">
              AI-ul generează conținut optimizat...
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getSelectedPlatforms().map((p) => (
              <SkeletonCard key={p} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!results && !isProcessing && !error && (
        <div className="rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06] p-10 text-center">
          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Scrie tot ce ai în minte — idei, note, fragmente de gânduri. AI-ul
            ContentOS va transforma totul în postări optimizate pentru Facebook,
            Instagram, TikTok și YouTube.
          </p>
        </div>
      )}

      {/* Results with tabs */}
      {results && availablePlatforms.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> Postări generate
          </h2>

          {/* Platform tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            {availablePlatforms.map((platform) => {
              const config = PLATFORM_CONFIG[platform];
              const Icon = config.icon;
              const isActive = activeTab === platform;
              return (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition flex-1 justify-center ${
                    isActive
                      ? "bg-white/[0.08] text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active platform content */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
            {/* Platform header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                {(() => {
                  const config = PLATFORM_CONFIG[activeTab];
                  const Icon = config.icon;
                  return (
                    <>
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-white">
                        {config.label}
                      </span>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => regeneratePlatform(activeTab)}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] disabled:opacity-40 transition"
                >
                  <RotateCcw
                    className={`w-3 h-3 ${isProcessing ? "animate-spin" : ""}`}
                  />
                  Regenerează
                </button>
                <button
                  onClick={() => {
                    const data = results.platforms[activeTab];
                    if (data) {
                      const text = getContentText(activeTab, data);
                      const tags = getHashtags(activeTab, data);
                      copyToClipboard(
                        `${text}\n\n${tags.join(" ")}`,
                        `tab-${activeTab}`
                      );
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition"
                >
                  {copiedKey === `tab-${activeTab}` ? (
                    <>
                      <Check className="w-3 h-3 text-green-400" /> Copiat!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copiază tot
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Platform-specific content */}
            {activeTab === "facebook" && results.platforms.facebook && (
              <FacebookCard
                data={results.platforms.facebook}
                onCopy={(text) => copyToClipboard(text, "fb-content")}
                copied={copiedKey === "fb-content"}
              />
            )}
            {activeTab === "instagram" && results.platforms.instagram && (
              <InstagramCard
                data={results.platforms.instagram}
                onCopy={(text) => copyToClipboard(text, "ig-content")}
                copied={copiedKey === "ig-content"}
              />
            )}
            {activeTab === "tiktok" && results.platforms.tiktok && (
              <TikTokCard
                data={results.platforms.tiktok}
                onCopy={(text) => copyToClipboard(text, "tt-content")}
                copied={copiedKey === "tt-content"}
              />
            )}
            {activeTab === "youtube" && results.platforms.youtube && (
              <YouTubeCard
                data={results.platforms.youtube}
                onCopy={(text) => copyToClipboard(text, "yt-content")}
                copied={copiedKey === "yt-content"}
              />
            )}

            {/* Action buttons */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              {draftSaved && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                  {draftSaved}
                </div>
              )}
              <div className="flex items-center gap-2">
                {showSchedulePicker ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 [color-scheme:dark]"
                    />
                    <button
                      onClick={() => saveDraft(true)}
                      disabled={savingDraft || !scheduleDate}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 text-white font-medium transition"
                    >
                      <CalendarPlus className="w-4 h-4" /> Confirmă
                    </button>
                    <button
                      onClick={() => setShowSchedulePicker(false)}
                      className="px-3 py-2 rounded-lg text-sm bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 transition"
                    >
                      Anulează
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSchedulePicker(true)}
                      disabled={savingDraft}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium transition"
                    >
                      <CalendarPlus className="w-4 h-4" /> Programează
                    </button>
                    <button
                      onClick={() => saveDraft(false)}
                      disabled={savingDraft}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white transition"
                    >
                      <Pencil className="w-4 h-4" /> Salvează Draft
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
