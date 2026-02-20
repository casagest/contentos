"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, ArrowUp, TrendingUp, BarChart3, Lightbulb } from "lucide-react";
import { safeErrorJson, safeResponseJson } from "@/lib/safe-json";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { EmptyState } from "@/components/ui/empty-state";
import { TypingIndicator } from "@/components/ui/typing-indicator";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "deterministic";
  warning?: string;
}

const SUGGESTIONS = [
  { icon: Lightbulb, label: "Ce să postez azi?", prompt: "Ce să postez azi?" },
  { icon: BarChart3, label: "Analizează performanța mea", prompt: "Analizează performanța mea" },
  { icon: TrendingUp, label: "Tendințe din industrie", prompt: "Ce tendințe sunt în industria mea?" },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text.trim(), conversationHistory: history }),
      });

      if (!response.ok) {
        throw new Error(await safeErrorJson(response));
      }

      const data: any = await safeResponseJson(response);

      let answerText = data.answer;
      if (data.actionItems?.length) {
        answerText += "\n\nPași de acțiune:\n" + data.actionItems.map((item: string) => `- ${item}`).join("\n");
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answerText,
        mode: data.meta?.mode === "ai" ? "ai" : data.meta?.mode === "deterministic" ? "deterministic" : undefined,
        warning: typeof data.meta?.warning === "string" ? data.meta.warning : undefined,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Eroare: ${err instanceof Error ? err.message : "Nu am putut procesa întrebarea. Încearcă din nou."}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Chat area — flex-1 overflow-y-auto */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <EmptyState
              icon={Sparkles}
              title="Salut! Sunt AI Coach-ul tău de conținut."
              size="lg"
              iconInCircle
            >
              <div className="space-y-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.prompt)}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-orange-500/30 text-left transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <Icon className="w-5 h-5 text-orange-400 shrink-0" />
                      <span className="text-sm text-foreground/90 font-medium">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </EmptyState>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                role={msg.role}
                mode={msg.mode}
                warning={msg.warning}
                accentColor="orange"
              >
                {msg.content}
              </ChatBubble>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white/[0.03] border border-white/[0.06] px-4 py-3">
                  <TypingIndicator color="orange" label="AI Coach gândește..." />
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar — sticky bottom, glass */}
      <div className="shrink-0 border-t border-white/[0.06] bg-white/[0.03] backdrop-blur-xl px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Întreabă ceva despre conținut, strategie, algoritmi..."
              aria-label="Mesaj AI Coach"
              rows={1}
              className="flex-1 min-h-[44px] max-h-[120px] py-3 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 resize-none transition-all"
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "44px";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-105"
                  : "bg-white/[0.04] text-white/20"
              }`}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
          {/* Quick buttons row */}
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => sendMessage(s.prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-white bg-white/[0.03] border border-white/[0.06] hover:border-orange-500/30 transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
