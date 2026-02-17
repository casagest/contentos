"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  /** Visual variant */
  variant?: "ghost" | "outline";
}

export function CopyButton({ text, label = "Copiază", className, variant = "ghost" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 rounded text-micro transition",
        variant === "ghost"
          ? "px-2 py-0.5 text-muted-foreground hover:text-white bg-muted hover:bg-accent"
          : "px-2 py-1 text-muted-foreground hover:text-foreground border border-border hover:border-foreground/20",
        className,
      )}
      aria-label={copied ? "Copiat" : label}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-400" />
          <span>Copiat</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
