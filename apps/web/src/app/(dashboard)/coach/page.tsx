"use client";

import { useState } from "react";
import { Send, TrendingUp, Lightbulb, Target, Sparkles } from "lucide-react";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { EmptyState } from "@/components/ui/empty-state";
import { TypingIndicator } from "@/components/ui/typing-indicator";
import { SectionCard } from "@/components/ui/section-card";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: "ai" | "deterministic";
  warning?: string;
}

const suggestions = [
  {
    icon: TrendingUp,
    label: "Ce tip de conținut funcționează cel mai bine pe Facebook în România?",
  },
  {
    icon: Lightbulb,
    label: "Dă-mi 5 idei de postări pentru această săptămână.",
  },
  {
    icon: Target,
    label: "Cum să cresc engagement-ul pe Instagram Reels?",
  },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      // Send last 10 messages as conversation history for contextual coaching
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
        const err = await response.json();
        throw new Error(err.error || "Eroare la AI Coach");
      }

      const data = await response.json();

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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyState
              icon={Sparkles}
              title="Salut! Sunt AI Coach-ul tău de conținut."
              description="Cu ce te pot ajuta?"
              size="lg"
            >
              <div className="space-y-2 w-full max-w-lg">
                {suggestions.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.label)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-emerald-500/30 text-left transition"
                    >
                      <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-body text-foreground/80">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </EmptyState>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              role={msg.role}
              mode={msg.mode}
              warning={msg.warning}
              accentColor="emerald"
            >
              {msg.content}
            </ChatBubble>
          ))
        )}
        {isLoading && (
          <SectionCard padding="sm" className="w-fit">
            <TypingIndicator color="emerald" label="AI Coach gândește..." />
          </SectionCard>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Întreabă ceva despre conținut, strategie, algoritmi..."
          aria-label="Mesaj AI Coach"
          className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
