import { cn } from "@/lib/utils";

interface AiModeBadgeProps {
  mode: "ai" | "deterministic" | string;
  className?: string;
}

export function AiModeBadge({ mode, className }: AiModeBadgeProps) {
  if (mode === "ai") {
    return (
      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium bg-green-500/15 text-green-400 border border-green-500/25", className)}>
        ✨ AI
      </span>
    );
  }

  if (mode === "deterministic") {
    return (
      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/25", className)}>
        ⚡ Template
      </span>
    );
  }

  return null;
}
