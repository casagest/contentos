"use client";

import { cn } from "@/lib/utils";

export interface PlatformOption {
  id: string;
  label: string;
  color: string; // Tailwind bg class, e.g. "bg-blue-500"
}

interface PlatformSelectorProps {
  platforms: PlatformOption[];
  selected: string[];
  onToggle: (id: string) => void;
  /** Compact mode for toolbars */
  size?: "sm" | "md";
  className?: string;
}

export function PlatformSelector({
  platforms,
  selected,
  onToggle,
  size = "md",
  className,
}: PlatformSelectorProps) {
  return (
    <div
      className={cn("flex flex-wrap gap-1.5", className)}
      role="group"
      aria-label="Selectează platforme"
    >
      {platforms.map((p) => {
        const isActive = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            role="switch"
            aria-checked={isActive}
            aria-label={`${p.label} ${isActive ? "activat" : "dezactivat"}`}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border transition",
              size === "sm" ? "px-2 py-0.5 text-micro" : "px-2.5 py-1 text-caption",
              isActive
                ? "bg-accent text-white border-brand-500/30"
                : "bg-card text-muted-foreground border-border hover:border-foreground/20",
            )}
          >
            <div className={cn("rounded-full", p.color, size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5")} aria-hidden="true" />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export const DEFAULT_PLATFORMS: PlatformOption[] = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
];
