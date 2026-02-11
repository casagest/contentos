"use client";

import { useState } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Target,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text.trim() }),
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Content Coach</h1>
            <p className="text-gray-400 text-sm">
              Întreabă orice despre strategia ta de conținut
            </p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              Salut! Sunt AI Coach-ul tău de conținut.
            </h2>
            <p className="text-sm text-gray-400 max-w-md mb-8">
              Cu ce te pot ajuta?
            </p>
            <div className="space-y-2 w-full max-w-lg">
              {suggestions.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => sendMessage(s.label)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/30 text-left transition"
                  >
                    <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white/[0.04] border border-white/[0.06] text-gray-300"
                }`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-brand-400" />
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0.15s]" />
                <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Întreabă ceva despre conținut, strategie, algoritmi..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40"
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
