"use client";

import { Sparkles, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  /** Optional AI mode badge */
  mode?: "ai" | "deterministic";
  /** Optional warning text */
  warning?: string;
  /** Accent color for assistant avatar (default: brand) */
  accentColor?: "brand" | "emerald";
  /** Assistant label */
  assistantLabel?: string;
  className?: string;
}

const accentStyles = {
  brand: {
    avatar: "bg-brand-500/10 text-brand-400",
    label: "text-brand-400",
    icon: Sparkles,
  },
  emerald: {
    avatar: "bg-emerald-500/10 text-emerald-400",
    label: "text-emerald-400",
    icon: Bot,
  },
};

export function ChatBubble({
  role,
  children,
  mode,
  warning,
  accentColor = "brand",
  assistantLabel,
  className,
}: ChatBubbleProps) {
  const accent = accentStyles[accentColor];
  const AvatarIcon = accent.icon;

  return (
    <div className={cn("flex gap-3", role === "user" ? "justify-end" : "", className)}>
      {role === "assistant" && (
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", accent.avatar)}>
          <AvatarIcon className="w-4 h-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-body",
          role === "user"
            ? "bg-brand-600/15 text-white border border-brand-500/20 rounded-br-md"
            : "bg-muted text-foreground/80 border border-border rounded-bl-md",
        )}
      >
        {role === "assistant" && assistantLabel && (
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3 h-3" />
            <span className={cn("text-micro font-medium", accent.label)}>{assistantLabel}</span>
          </div>
        )}

        {mode && (
          <div className="mb-2">
            {mode === "ai" ? (
              <span className="px-1.5 py-0.5 rounded text-micro font-medium bg-green-500/15 text-green-400 border border-green-500/25">
                ✨ AI
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-micro font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                ⚡ Template
              </span>
            )}
          </div>
        )}

        <div className="whitespace-pre-wrap leading-relaxed">{children}</div>

        {warning && (
          <div className="mt-2 pt-2 border-t border-border text-micro text-yellow-400/70">
            ⚠️ {warning}
          </div>
        )}
      </div>
      {role === "user" && (
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-brand-400" />
        </div>
      )}
    </div>
  );
}
