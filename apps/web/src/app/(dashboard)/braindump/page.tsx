"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MediaUpload from "../compose/media-upload";
import ContentChecker, { VisualSuggestion } from "../components/content-checker";
import VoiceInput from "../components/voice-input";
import { useUser } from "@/components/providers/user-provider";
import { ScoreRing } from "@/components/ui/score-ring";
import { PhoneFrame } from "@/components/ui/phone-frame";
import { FacebookPostMock, InstagramPostMock, TikTokPostMock } from "@/components/ui/platform-post-mock";
import {
  Brain,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  Hash,
  Lightbulb,
  Clock,
  Volume2,
  Type,
  Send,
  Save,
  TrendingUp,
  Zap,
  MessageSquare,
  Target,
  Bookmark,
  Plus,
  ArrowUp,
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
  meta?: Record<string, unknown>;
}

interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    intent?: { intent: string; confidence: number };
    isGeneration?: boolean;
    platforms?: string[];
  };
}

interface ClarificationQuestion {
  id: string;
  question: string;
  options?: string[];
  category: string;
}

type Objective = "engagement" | "reach" | "leads" | "saves";
type Phase = "idle" | "generating" | "done";

// ─── Config ─────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Fb", color: "#1877F2", dotClass: "bg-blue-500" },
  { id: "instagram", label: "Ig", color: "#E4405F", dotClass: "bg-pink-500" },
  { id: "tiktok", label: "Tk", color: "#00f2ea", dotClass: "bg-gray-500" },
  { id: "youtube", label: "Yt", color: "#FF0000", dotClass: "bg-red-500" },
] as const;

const OBJECTIVES: { id: Objective; label: string; icon: typeof TrendingUp }[] = [
  { id: "engagement", label: "Engagement", icon: TrendingUp },
  { id: "reach", label: "Reach", icon: Zap },
  { id: "leads", label: "Leads", icon: Target },
  { id: "saves", label: "Saves", icon: Bookmark },
];

const QUICK_ACTIONS = [
  {
    icon: MessageSquare,
    label: "Testimonial client",
    sub: "Poveste reală, emoțională",
    prompt: "Creează un testimonial al unui client mulțumit, cu emoție și rezultate concrete",
  },
  {
    icon: Lightbulb,
    label: "Post educativ",
    sub: "Explică simplu un concept",
    prompt: "Creează un post educativ care explică pe înțelesul tuturor un concept din industria mea",
  },
  {
    icon: TrendingUp,
    label: "Behind the scenes",
    sub: "Arată procesul din culise",
    prompt: "Arată procesul din spatele scenei al echipei mele, cum lucrăm și ce ne diferențiază",
  },
  {
    icon: Target,
    label: "Ofertă cu CTA",
    sub: "Promovare cu call-to-action",
    prompt: "Promovează o ofertă specială cu call-to-action puternic și urgență",
  },
  {
    icon: Sparkles,
    label: "Social proof",
    sub: "Recenzii și rezultate",
    prompt: "Post bazat pe recenzii și testimoniale reale ale clienților noștri",
  },
  {
    icon: Brain,
    label: "FAQ audiență",
    sub: "Răspunsuri la întrebări frecvente",
    prompt: "Răspunde la cele mai frecvente întrebări pe care le primim de la clienți",
  },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function HashtagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map((tag) => (
        <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20">
          {tag.startsWith("#") ? tag : `#${tag}`}
        </span>
      ))}
    </div>
  );
}

function TipsList({ tips }: { tips: string[] }) {
  if (!tips.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
      {tips.map((tip, i) => (
        <p key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500/60" />
          {tip}
        </p>
      ))}
    </div>
  );
}

function InlineCopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition">
      {copied ? <><Check className="w-3 h-3 text-green-400" /> Copiat</> : <><Copy className="w-3 h-3" /> {label}</>}
    </button>
  );
}

function getScore(result: FacebookResult | InstagramResult | TikTokResult | YouTubeResult): number {
  if ("estimatedEngagement" in result) {
    return result.estimatedEngagement === "Viral Potential" ? 92 : result.estimatedEngagement === "High" ? 85 : 72;
  }
  return 78;
}

// ─── Platform Detail Cards ──────────────────────────────────────────────────

function FacebookCard({ data }: { data: FacebookResult }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-sm hover:border-white/[0.08] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-white">Facebook</span>
          <ScoreRing score={getScore(data)} size={28} />
        </div>
        <InlineCopyButton text={data.content} label="Copiază" />
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{data.content}</p>
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function InstagramCard({ data }: { data: InstagramResult }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-sm hover:border-white/[0.08] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="text-sm font-medium text-white">Instagram</span>
          <ScoreRing score={getScore(data)} size={28} />
          {data.bestTimeToPost && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {data.bestTimeToPost}
            </span>
          )}
        </div>
        <InlineCopyButton text={data.caption} label="Copiază" />
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{data.caption}</p>
      {data.altText && <p className="text-[10px] text-muted-foreground mt-2">Alt: {data.altText}</p>}
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function TikTokCard({ data }: { data: TikTokResult }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-sm hover:border-white/[0.08] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-sm font-medium text-white">TikTok</span>
          <ScoreRing score={getScore(data)} size={28} />
        </div>
        <InlineCopyButton text={`${data.hook}\n\n${data.script}`} label="Copiază" />
      </div>
      <div className="bg-white/[0.04] rounded-lg p-2.5 mb-2 border border-white/[0.06]">
        <span className="text-[10px] text-orange-400 uppercase tracking-wider font-medium">Hook</span>
        <p className="text-sm text-white font-medium mt-0.5">{data.hook}</p>
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{data.script}</p>
      {data.soundSuggestion && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Volume2 className="w-3 h-3" /> {data.soundSuggestion}
        </p>
      )}
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function YouTubeCard({ data }: { data: YouTubeResult }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 backdrop-blur-sm hover:border-white/[0.08] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-white">YouTube</span>
          <ScoreRing score={getScore(data)} size={28} />
        </div>
        <InlineCopyButton text={`${data.title}\n\n${data.description}`} label="Copiază" />
      </div>
      <div className="bg-white/[0.04] rounded-lg p-2.5 mb-2 border border-white/[0.06]">
        <span className="text-[10px] text-orange-400 uppercase tracking-wider font-medium">Titlu</span>
        <p className="text-sm text-white font-medium mt-0.5">{data.title}</p>
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{data.description}</p>
      {data.thumbnailIdea && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
          <Type className="w-3 h-3" /> Thumbnail: {data.thumbnailIdea}
        </p>
      )}
      <HashtagList tags={data.tags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

// ─── Chat History ───────────────────────────────────────────────────────────

const CHAT_HISTORY_KEY = "contentos:braindump:history";
const MAX_HISTORY = 50;

function loadHistory(): ConversationMessage[] {
  try {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(msgs: ConversationMessage[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch { /* silent */ }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function BrainDumpPage() {
  // ── State ──
  const [messages, setMessages] = useState<ConversationMessage[]>(() => loadHistory());
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [phase, setPhase] = useState<Phase>(() => (loadHistory().some((m) => m.metadata?.isGeneration) ? "done" : "idle"));
  const [progress, setProgress] = useState(0);
  const [visiblePlatforms, setVisiblePlatforms] = useState<string[]>([]);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram", "tiktok"]);
  const [objective, setObjective] = useState<Objective>("engagement");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const [results, setResults] = useState<AIResponse | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const { user: currentUser } = useUser();
  const organizationId = currentUser?.organizationId || "";
  const isDental = currentUser?.industry?.toLowerCase().includes("dental") || currentUser?.industry?.toLowerCase().includes("stomatolog") || false;

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist history
  useEffect(() => {
    if (messages.length > 0) saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, results]);

  // ── Handlers ──
  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id]
    );
  };

  const sendMessage = useCallback(async (text?: string) => {
    const input = (text || inputText).trim();
    if (!input || isProcessing) return;
    if (!text) setInputText("");

    setIsProcessing(true);
    setError(null);
    setClarifications([]);
    setPhase("generating");
    setProgress(0);
    setVisiblePlatforms([]);

    const userMsg: ConversationMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: input,
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Progress simulation
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 6 + 2;
      if (p >= 95) { p = 95; clearInterval(progressInterval); }
      setProgress(Math.min(p, 95));

      if (p > 20) setVisiblePlatforms((v) => [...new Set([...v, selectedPlatforms[0] ?? "facebook"])]);
      if (p > 45 && selectedPlatforms.length > 1) setVisiblePlatforms((v) => [...new Set([...v, selectedPlatforms[1] ?? "instagram"])]);
      if (p > 70 && selectedPlatforms.length > 2) setVisiblePlatforms((v) => [...new Set([...v, selectedPlatforms[2] ?? "tiktok"])]);
    }, 200);

    try {
      const response = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: input,
          platforms: selectedPlatforms,
          language: "ro",
          qualityMode: "economy",
          objective,
          conversationMode: true,
          conversationHistory: messages,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la procesare");
      }

      const data = await response.json();

      // Conversation response
      if (data.type === "conversation") {
        setProgress(100);
        if (data.action === "answer" && data.messages) {
          const aiMsgs = (data.messages as ConversationMessage[]).filter((m) => m.role === "assistant");
          const last = aiMsgs[aiMsgs.length - 1];
          if (last) setMessages([...updatedMessages, last]);
        }
        if (data.action === "clarify") {
          const aiMsgs = (data.messages as ConversationMessage[]).filter((m) => m.role === "assistant");
          const last = aiMsgs[aiMsgs.length - 1];
          if (last) setMessages([...updatedMessages, last]);
          if (data.clarifications) setClarifications(data.clarifications);
        }
        setPhase("idle");
        return;
      }

      // Generation result
      setProgress(100);
      const aiResponse: AIResponse = { platforms: data.platforms || {}, meta: data.meta };
      setResults(aiResponse);
      setVisiblePlatforms(selectedPlatforms);

      const assistantMsg: ConversationMessage = {
        id: `msg_${Date.now()}_gen`,
        role: "assistant",
        content: "Am generat conținut pentru platformele selectate!",
        metadata: { isGeneration: true, platforms: selectedPlatforms },
      };
      setMessages([...updatedMessages, assistantMsg]);
      setTimeout(() => setPhase("done"), 500);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
      setPhase("idle");
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, messages, selectedPlatforms, objective, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const saveDraft = async () => {
    if (!results) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const p = results.platforms;
      const body = p.facebook?.content || p.instagram?.caption || "";
      const hashtags = p.facebook?.hashtags || p.instagram?.hashtags || [];
      const versions: Record<string, unknown> = {};
      if (p.facebook) versions.facebook = p.facebook;
      if (p.instagram) versions.instagram = p.instagram;
      if (p.tiktok) versions.tiktok = p.tiktok;
      if (p.youtube) versions.youtube = p.youtube;

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.slice(0, 60).split("\n")[0],
          body, hashtags,
          target_platforms: selectedPlatforms,
          platform_versions: versions,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
          ai_suggestions: { meta: results.meta || {} },
          source: "braindump",
        }),
      });
      if (res.ok) {
        setDraftSaved("Draft salvat! Mergi la Calendar pentru a programa.");
        setTimeout(() => setDraftSaved(null), 4000);
      }
    } catch { /* silent */ }
    finally { setSavingDraft(false); }
  };

  const startOver = () => {
    setMessages([]);
    setResults(null);
    setClarifications([]);
    setError(null);
    setInputText("");
    setPhase("idle");
    setProgress(0);
    setVisiblePlatforms([]);
    try { localStorage.removeItem(CHAT_HISTORY_KEY); } catch { /* silent */ }
  };

  // ── Helpers for phone mocks ──
  function buildMockData(platform: string): { text: string; score: number; likes: string; comments: string; shares?: string } {
    const p = results?.platforms;
    if (platform === "facebook" && p?.facebook) {
      return { text: p.facebook.content, score: getScore(p.facebook), likes: "2.4K", comments: "187", shares: "342" };
    }
    if (platform === "instagram" && p?.instagram) {
      return { text: p.instagram.caption, score: getScore(p.instagram), likes: "1.8K", comments: "94" };
    }
    if (platform === "tiktok" && p?.tiktok) {
      return { text: `${p.tiktok.hook}\n\n${p.tiktok.script}`, score: getScore(p.tiktok), likes: "12.3K", comments: "891" };
    }
    return { text: "Se generează conținut...", score: 0, likes: "—", comments: "—" };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col">
      {/* ── Background mesh ── */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.06)_0%,transparent_70%)] top-[-10%] left-[10%] blur-[80px] animate-mesh-move" />
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,transparent_70%)] bottom-[10%] right-[5%] blur-[80px] animate-mesh-move-2" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ════ IDLE STATE — Quick Actions ════ */}
      {phase === "idle" && messages.length === 0 && !results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1 flex flex-col items-center justify-center px-4 pb-48"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-center bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent mb-4">
            Ce vrei să creezi?
          </h1>
          <p className="text-muted-foreground text-sm mb-12 text-center max-w-md">
            Scrie orice idee. AI-ul cunoaște industria ta, audiența și fiecare platformă.
          </p>

          {/* Quick actions grid 2x3 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-[640px] w-full">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.label}
                onClick={() => { setInputText(q.prompt); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="group bg-white/[0.015] border border-white/[0.04] rounded-2xl p-4 text-left transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-0.5"
              >
                <q.icon className="w-5 h-5 text-orange-400/60 group-hover:text-orange-400 transition mb-2.5" />
                <div className="text-white font-semibold text-[13px]">{q.label}</div>
                <div className="text-white/40 text-[11px] mt-0.5">{q.sub}</div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ════ GENERATING STATE — Progress + Phone Previews ════ */}
      {phase === "generating" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 px-4 pt-4"
        >
          {/* Progress bar cu gradient shimmer */}
          <div className="max-w-[700px] mx-auto mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">
                Generez pentru {selectedPlatforms.length} platforme...
              </span>
              <span className="text-sm font-mono font-semibold text-orange-400 tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300 ease-out animate-progress-shimmer"
                style={{
                  width: `${progress}%`,
                  backgroundImage: "linear-gradient(90deg, rgb(249,115,22), rgb(236,72,153), rgb(168,85,247), rgb(249,115,22))",
                  backgroundSize: "200% 100%",
                }}
              />
            </div>
          </div>

          {/* Phone frame previews */}
          <div className="flex gap-5 justify-center flex-wrap pb-48">
            {selectedPlatforms.map((platform, i) => (
              visiblePlatforms.includes(platform) && (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 40, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.15 }}
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-xs font-semibold" style={{ color: PLATFORMS.find((p) => p.id === platform)?.color }}>
                      ● {PLATFORMS.find((p) => p.id === platform)?.label}
                    </span>
                    <div className="w-6 h-6 rounded-full border-2 border-white/[0.06] border-t-orange-500 animate-spin" />
                  </div>
                  <PhoneFrame platform={platform as "facebook" | "instagram" | "tiktok" | "youtube"}>
                    <div className="min-h-[480px] flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-orange-500 animate-spin" />
                        <span className="text-white/40 text-xs">Se generează...</span>
                      </div>
                    </div>
                  </PhoneFrame>
                </motion.div>
              )
            ))}
          </div>
        </motion.div>
      )}

      {/* ════ DONE STATE — Results ════ */}
      {phase === "done" && results && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 px-4 pt-2"
        >
          {/* Success bar verde subtil */}
          <div className="max-w-[700px] mx-auto mb-6 flex items-center gap-3 bg-green-500/[0.06] border border-green-500/20 rounded-xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-green-400/80 animate-pulse" />
            <Sparkles className="w-4 h-4 text-green-400/90" />
            <span className="text-sm text-green-300/90 font-medium">
              {selectedPlatforms.length} versiuni generate · Adaptate per platformă
            </span>
            <div className="flex-1" />
            <button
              onClick={startOver}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-muted-foreground text-[11px] font-semibold hover:text-white hover:bg-white/[0.08] transition"
            >
              ✦ Nou
            </button>
          </div>

          {/* Phone frame previews row */}
          <div className="flex gap-5 justify-center flex-wrap mb-8">
            {selectedPlatforms.map((platform, i) => {
              const mockData = buildMockData(platform);
              return (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-xs font-semibold" style={{ color: PLATFORMS.find((p) => p.id === platform)?.color }}>
                      ● {PLATFORMS.find((p) => p.id === platform)?.label}
                    </span>
                    <ScoreRing score={mockData.score} size={36} delay={i * 100} />
                  </div>
                  <PhoneFrame platform={platform as "facebook" | "instagram" | "tiktok" | "youtube"}>
                    {platform === "facebook" && <FacebookPostMock data={mockData} />}
                    {platform === "instagram" && <InstagramPostMock data={mockData} />}
                    {platform === "tiktok" && <TikTokPostMock data={mockData} />}
                    {platform === "youtube" && (
                      <div className="min-h-[480px] flex items-center justify-center p-4">
                        <p className="text-white/60 text-xs text-center">YouTube preview</p>
                      </div>
                    )}
                  </PhoneFrame>
                </motion.div>
              );
            })}
          </div>

          {/* Detailed result cards */}
          <div className="max-w-3xl mx-auto space-y-3 pb-48">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Detalii conținut</span>
              {results.meta?.mode === "ai" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">✨ AI</span>
              )}
            </div>

            {typeof results.meta?.warning === "string" && results.meta.warning && (
              <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-xs text-yellow-400 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{results.meta.warning}</span>
              </div>
            )}

            {results.platforms.facebook && <FacebookCard data={results.platforms.facebook} />}
            {results.platforms.instagram && <InstagramCard data={results.platforms.instagram} />}
            {results.platforms.tiktok && <TikTokCard data={results.platforms.tiktok} />}
            {results.platforms.youtube && <YouTubeCard data={results.platforms.youtube} />}

            <ContentChecker
              text={Object.values(results.platforms).map((p) => ("text" in p ? (p as { text: string }).text : "")).join("\n")}
              hashtags={Object.values(results.platforms).flatMap((p) => ("hashtags" in p ? (p as { hashtags: string[] }).hashtags : []))}
              platforms={selectedPlatforms}
              isDental={isDental}
            />
            {selectedPlatforms.map((p) => (
              <VisualSuggestion key={p} platform={p} isDental={isDental} />
            ))}

            {/* Save draft — orange gradient + shine sweep */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={saveDraft}
                disabled={savingDraft}
                className="group relative flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 text-white font-semibold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Save className="w-4 h-4 relative" />
                <span className="relative">{savingDraft ? "Se salvează..." : "Salvează ca Draft"}</span>
              </button>
            </div>
            {draftSaved && (
              <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                {draftSaved}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ════ Conversation messages (idle with history) ════ */}
      {phase === "idle" && messages.length > 0 && !results && (
        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-48">
          {messages.length > 0 && (
            <div className="flex justify-end mb-2">
              <button onClick={startOver} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-1.5">
                <RotateCcw className="w-3 h-3" /> Start nou
              </button>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                layout
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === "user"
                    ? "bg-orange-500/10 text-white border border-orange-500/20 rounded-br-md"
                    : "bg-white/[0.03] text-foreground/80 border border-white/[0.06] rounded-bl-md"
                }`}>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-orange-400" />
                      <span className="text-[10px] text-orange-400 font-medium">ContentOS AI</span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Clarifications */}
          {clarifications.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-4">
              {clarifications.map((c) => (
                <div key={c.id} className="space-y-1.5">
                  {c.options?.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => { setInputText(opt); sendMessage(opt); }}
                      className="block px-3 py-1.5 rounded-lg text-xs text-foreground/80 bg-white/[0.03] border border-white/[0.06] hover:border-orange-500/30 hover:text-white transition"
                    >
                      {opt}
                    </button>
                  )) ?? <p className="text-xs text-muted-foreground italic">{c.question}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         FLOATING INPUT BAR — glass morphism
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none" style={{ paddingLeft: "var(--sidebar-width, 0px)" }}>
        <div className="pointer-events-auto px-6 pb-5 pt-8 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className={`max-w-[640px] mx-auto rounded-2xl shadow-[0_-4px_40px_rgba(0,0,0,0.4)] bg-white/[0.03] backdrop-blur-xl border border-white/[0.07] ${phase === "idle" ? "animate-border-glow" : ""}`}>
            {/* Platform toggles row */}
            <div className="flex items-center gap-1 px-3 pt-3 pb-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    selectedPlatforms.includes(p.id)
                      ? "border-current/20"
                      : "text-white/20 border-transparent"
                  }`}
                  style={selectedPlatforms.includes(p.id) ? { color: p.color, background: `${p.color}18`, borderColor: `${p.color}30` } : undefined}
                >
                  {p.label}
                </button>
              ))}
              <div className="w-px h-4 bg-white/[0.06] mx-1" />
              {OBJECTIVES.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setObjective(o.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    objective === o.id
                      ? "bg-orange-500/15 text-orange-400 border border-orange-500/30"
                      : "text-white/20 border border-transparent hover:text-white/40"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="flex items-end px-1.5 pb-1.5">
              <div className="flex items-center gap-1 px-1">
                {organizationId && (
                  <MediaUpload
                    mediaUrls={mediaUrls}
                    onChange={setMediaUrls}
                    organizationId={organizationId}
                    maxImages={10}
                  />
                )}
                <VoiceInput
                  onTranscript={(text) => setInputText((prev) => prev + (prev ? " " : "") + text)}
                  language="ro-RO"
                />
              </div>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Descrie postarea pe care o vrei..."
                aria-label="Mesaj Brain Dump"
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none resize-none py-2 px-2 min-h-[34px] max-h-[100px]"
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "34px";
                  el.style.height = Math.min(el.scrollHeight, 100) + "px";
                }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!inputText.trim() || isProcessing}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 m-0.5 transition-all ${
                  inputText.trim()
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_28px_rgba(249,115,22,0.55)] hover:scale-105"
                    : "bg-white/[0.03] text-white/12"
                }`}
              >
                {isProcessing ? (
                  <RotateCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {/* Hint */}
          <div className="max-w-[640px] mx-auto flex justify-center mt-1.5">
            <span className="text-[10px] text-white/10">Enter generează · Shift+Enter linie nouă</span>
          </div>
        </div>
      </div>
    </div>
  );
}
