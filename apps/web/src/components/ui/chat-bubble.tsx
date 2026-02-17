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
  accentColor?: "brand" | "emerald" | "orange";
  /** Assistant label */
  assistantLabel?: string;
  className?: string;
}

const accentStyles = {
  brand: {
    avatar: "bg-brand-500/10 text-brand-400",
    label: "text-brand-400",
    icon: Sparkles,
    userBubble: "bg-brand-600/15 text-white border border-brand-500/20 rounded-br-md",
    userAvatar: "bg-brand-500/10 text-brand-400",
    assistantBubble: "bg-muted text-foreground/80 border border-border rounded-bl-md",
  },
  emerald: {
    avatar: "bg-emerald-500/10 text-emerald-400",
    label: "text-emerald-400",
    icon: Bot,
    userBubble: "bg-brand-600/15 text-white border border-brand-500/20 rounded-br-md",
    userAvatar: "bg-brand-500/10 text-brand-400",
    assistantBubble: "bg-muted text-foreground/80 border border-border rounded-bl-md",
  },
  orange: {
    avatar: "bg-orange-500/10 text-orange-400",
    label: "text-orange-400",
    icon: Sparkles,
    userBubble: "bg-orange-500/10 text-white border border-orange-500/20 rounded-br-md",
    userAvatar: "bg-orange-500/10 text-orange-400",
    assistantBubble: "bg-white/[0.03] text-foreground/80 border border-white/[0.06] rounded-bl-md",
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
          role === "user" ? accent.userBubble : accent.assistantBubble,
        )}
      >
        {role === "assistant" && (assistantLabel != null || accentColor === "orange") && (
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className={cn("w-3 h-3", accent.label)} />
            <span className={cn("text-micro font-medium", accent.label)}>{assistantLabel ?? "ContentOS AI"}</span>
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
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", accent.userAvatar)}>
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
