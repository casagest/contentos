"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MediaUpload from "../compose/media-upload";
import ContentChecker, { VisualSuggestion } from "../components/content-checker";
import VoiceInput from "../components/voice-input";
import { createClient } from "@/lib/supabase/client";
import {
  Brain,
  Wand2,
  RotateCcw,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CalendarPlus,
  Hash,
  Lightbulb,
  TrendingUp,
  Clock,
  Volume2,
  Type,
  Send,
  MessageCircle,
  HelpCircle,
  ChevronDown,
  Save,
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

// ─── Platform Config ────────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
  facebook: { label: "Facebook", color: "bg-blue-500", textColor: "text-blue-400" },
  instagram: { label: "Instagram", color: "bg-pink-500", textColor: "text-pink-400" },
  tiktok: { label: "TikTok", color: "bg-gray-500", textColor: "text-gray-300" },
  youtube: { label: "YouTube", color: "bg-red-500", textColor: "text-red-400" },
};

const platforms = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
];

const objectives: { id: Objective; label: string }[] = [
  { id: "engagement", label: "Engagement" },
  { id: "reach", label: "Reach" },
  { id: "leads", label: "Leads" },
  { id: "saves", label: "Saves" },
];

// ─── Platform Cards ─────────────────────────────────────────────────────────

function HashtagList({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
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
  if (!tips.length) return null;
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

function CopyButton({ text, label }: { text: string; label: string }) {
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

function FacebookCard({ data }: { data: FacebookResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium text-white">Facebook</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
            data.estimatedEngagement === "High" || data.estimatedEngagement === "Viral Potential"
              ? "bg-green-500/10 text-green-400"
              : "bg-white/[0.06] text-gray-400"
          }`}>{data.estimatedEngagement}</span>
        </div>
        <CopyButton text={data.content} label="Copiaza" />
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.content}</p>
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function InstagramCard({ data }: { data: InstagramResult }) {
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
        <CopyButton text={data.caption} label="Copiaza" />
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{data.caption}</p>
      {data.altText && <p className="text-[10px] text-gray-500 mt-2">Alt: {data.altText}</p>}
      <HashtagList tags={data.hashtags} />
      <TipsList tips={data.tips} />
    </div>
  );
}

function TikTokCard({ data }: { data: TikTokResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-sm font-medium text-white">TikTok</span>
        </div>
        <CopyButton text={`${data.hook}\n\n${data.script}`} label="Copiaza" />
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

function YouTubeCard({ data }: { data: YouTubeResult }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-sm font-medium text-white">YouTube</span>
        </div>
        <CopyButton text={`${data.title}\n\n${data.description}`} label="Copiaza" />
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

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 animate-pulse">
      <div className="h-3 w-24 bg-white/[0.06] rounded mb-3" />
      <div className="space-y-2">
        <div className="h-2.5 bg-white/[0.04] rounded w-full" />
        <div className="h-2.5 bg-white/[0.04] rounded w-4/5" />
        <div className="h-2.5 bg-white/[0.04] rounded w-3/5" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const CHAT_HISTORY_KEY = "contentos:braindump:history";
const MAX_HISTORY_MESSAGES = 50;

function loadChatHistory(): ConversationMessage[] {
  try {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_HISTORY_MESSAGES);
  } catch {
    return [];
  }
}

function saveChatHistory(messages: ConversationMessage[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)));
  } catch {
    // silent — storage full or unavailable
  }
}

export default function BrainDumpPage() {
  // Chat state — persisted in localStorage
  const [messages, setMessages] = useState<ConversationMessage[]>(() => loadChatHistory());
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Persist chat history on message changes
  useEffect(() => {
    if (messages.length > 0) saveChatHistory(messages);
  }, [messages]);

  // Config state
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["facebook", "instagram"]);
  const [objective, setObjective] = useState<Objective>("engagement");
  const [qualityMode, setQualityMode] = useState<"economy" | "balanced" | "premium">("economy");

  // Media state
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [isDental, setIsDental] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("organization_id").eq("id", user.id).single()
        .then(({ data }) => {
          if (data?.organization_id) {
            setOrganizationId(data.organization_id);
            supabase
              .from("business_profiles")
              .select("industry")
              .eq("organization_id", data.organization_id)
              .single()
              .then(({ data: bp }) => {
                if (bp?.industry?.toLowerCase().includes("dental") || bp?.industry?.toLowerCase().includes("stomatolog")) {
                  setIsDental(true);
                }
              });
          }
        });
    });
  }, []);

  // Results state
  const [results, setResults] = useState<AIResponse | null>(null);
  const [clarifications, setClarifications] = useState<ClarificationQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, results]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const sendMessage = useCallback(async (text?: string) => {
    const input = (text || inputText).trim();
    if (!input || isProcessing) return;
    if (!text) setInputText("");

    setIsProcessing(true);
    setError(null);
    setClarifications([]);

    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: input,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: input,
          platforms: selectedPlatforms,
          language: "ro",
          qualityMode,
          objective,
          conversationMode: true,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la procesare");
      }

      const data = await response.json();

      // Handle conversational responses
      if (data.type === "conversation") {
        if (data.action === "answer" && data.messages) {
          const aiMessages = (data.messages as ConversationMessage[]).filter(
            (m) => m.role === "assistant"
          );
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          if (lastAiMessage) {
            setMessages([...updatedMessages, lastAiMessage]);
          }
          return;
        }

        if (data.action === "clarify") {
          const aiMessages = (data.messages as ConversationMessage[]).filter(
            (m) => m.role === "assistant"
          );
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          if (lastAiMessage) {
            setMessages([...updatedMessages, lastAiMessage]);
          }
          if (data.clarifications) {
            setClarifications(data.clarifications);
          }
          return;
        }
      }

      // Handle generation results (standard brain dump response)
      const aiResponse: AIResponse = {
        platforms: data.platforms || {},
        meta: data.meta,
      };

      setResults(aiResponse);

      const assistantMessage: ConversationMessage = {
        id: `msg_${Date.now()}_gen`,
        role: "assistant",
        content: "Am generat continut pentru platformele selectate!",
        metadata: { isGeneration: true, platforms: selectedPlatforms },
      };
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscuta");
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, messages, selectedPlatforms, qualityMode, objective, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClarificationClick = (option: string) => {
    setInputText(option);
    sendMessage(option);
  };

  const saveDraft = async () => {
    if (!results) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const firstPlatform = selectedPlatforms[0];
      const platformData = results.platforms;
      const fb = platformData.facebook;
      const ig = platformData.instagram;
      const body = fb?.content || ig?.caption || "";
      const hashtags = fb?.hashtags || ig?.hashtags || [];

      const platformVersions: Record<string, unknown> = {};
      if (fb) platformVersions.facebook = fb;
      if (ig) platformVersions.instagram = ig;
      if (platformData.tiktok) platformVersions.tiktok = platformData.tiktok;
      if (platformData.youtube) platformVersions.youtube = platformData.youtube;

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.slice(0, 60).split("\n")[0],
          body,
          hashtags,
          target_platforms: selectedPlatforms,
          platform_versions: platformVersions,
          media_urls: mediaUrls.length > 0 ? mediaUrls : undefined,
          ai_suggestions: { meta: results.meta || {} },
          source: "braindump",
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

  const startOver = () => {
    setMessages([]);
    setResults(null);
    setClarifications([]);
    setError(null);
    setInputText("");
    try { localStorage.removeItem(CHAT_HISTORY_KEY); } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Brain Dump</h1>
            <p className="text-gray-400 text-sm">
              Spune-mi orice — intrebare, idee, sau text brut
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={startOver}
            className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" /> Start nou
          </button>
        )}
      </div>

      {/* Config bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1.5">
          {platforms.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlatform(p.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                selectedPlatforms.includes(p.id)
                  ? "bg-white/[0.08] text-white border border-brand-500/30"
                  : "bg-white/[0.02] text-gray-500 border border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
              {p.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex gap-1.5">
          {objectives.map((o) => (
            <button
              key={o.id}
              onClick={() => setObjective(o.id)}
              className={`px-2 py-1 rounded-lg text-[10px] border transition ${
                objective === o.id
                  ? "bg-brand-600/20 text-brand-300 border-brand-500/40"
                  : "bg-white/[0.03] text-gray-500 border-white/[0.06] hover:text-gray-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Upload */}
      {organizationId && (
        <div className="mb-3">
          <MediaUpload
            mediaUrls={mediaUrls}
            onChange={setMediaUrls}
            organizationId={organizationId}
            maxImages={10}
          />
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.01] border border-white/[0.06] p-4 space-y-3 mb-3">
        {messages.length === 0 && !results && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="w-14 h-14 text-gray-600 mb-4" />
            <p className="text-gray-400 text-sm mb-2">
              Scrie orice ai in minte
            </p>
            <p className="text-gray-600 text-xs max-w-md">
              Poti sa pui o intrebare, sa arunci o idee vaga, sau sa dai un text complet.
              AI-ul va detecta ce vrei si va raspunde inteligent.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {[
                "Am o clinica dentara si vreau sa postez pe social media",
                "Cum sa cresc engagement-ul pe Instagram?",
                "Top 5 sfaturi de nutritie pentru pacienti",
                "Vreau sa promovez o oferta de Black Friday",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setInputText(suggestion);
                    sendMessage(suggestion);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-400 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:text-gray-300 transition text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
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
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-brand-600/15 text-white border border-brand-500/20 rounded-br-md"
                  : "bg-white/[0.03] text-gray-300 border border-white/[0.06] rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-brand-400" />
                  <span className="text-[10px] text-brand-400 font-medium">ContentOS AI</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>

        {/* Clarification buttons */}
        {clarifications.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-4">
            {clarifications.map((c) => (
              <div key={c.id} className="space-y-1.5">
                {c.options ? (
                  c.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleClarificationClick(option)}
                      className="block px-3 py-1.5 rounded-lg text-xs text-gray-300 bg-white/[0.04] border border-white/[0.08] hover:border-brand-500/30 hover:text-white transition"
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">{c.question}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex justify-start"
          >
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-gray-500">ContentOS gândește...</span>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Results */}
        {results && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span className="text-sm font-medium text-brand-300">Continut generat</span>
              {results.meta?.mode === "ai" ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                  ✨ AI
                </span>
              ) : results.meta?.mode === "deterministic" ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                  ⚡ Template
                </span>
              ) : null}
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

            {/* Content Checker */}
            <ContentChecker
              text={Object.values(results.platforms).map((p) => ("text" in p ? (p as { text: string }).text : "")).join("\n")}
              hashtags={Object.values(results.platforms).flatMap((p) => ("hashtags" in p ? (p as { hashtags: string[] }).hashtags : []))}
              platforms={selectedPlatforms}
              isDental={isDental}
            />
            {selectedPlatforms.map((p) => (
              <VisualSuggestion key={p} platform={p} isDental={isDental} />
            ))}

            {/* Save draft */}
            <div className="flex gap-2">
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

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scrie ideea, intrebarea sau textul brut..."
            rows={2}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!inputText.trim() || isProcessing}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white transition shrink-0"
          >
            {isProcessing ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <VoiceInput
              onTranscript={(text) => setInputText((prev) => prev + (prev ? " " : "") + text)}
              language="ro-RO"
            />
            <span className="text-[10px] text-gray-600">Shift+Enter pentru linie nouă</span>
          </div>
          <span className="text-[10px] text-gray-600">{inputText.length} caractere</span>
        </div>
      </div>
    </div>
  );
}
