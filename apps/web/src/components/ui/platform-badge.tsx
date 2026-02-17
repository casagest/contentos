import { cn } from "@/lib/utils";

const PLATFORM_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  facebook: { dot: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10" },
  instagram: { dot: "bg-pink-500", text: "text-pink-400", bg: "bg-pink-500/10" },
  tiktok: { dot: "bg-gray-500", text: "text-foreground/80", bg: "bg-gray-500/10" },
  youtube: { dot: "bg-red-500", text: "text-red-400", bg: "bg-red-500/10" },
};

interface PlatformBadgeProps {
  platform: string;
  /** Show as dot + label (default) or pill */
  variant?: "dot" | "pill";
  className?: string;
}

export function PlatformBadge({ platform, variant = "dot", className }: PlatformBadgeProps) {
  const style = PLATFORM_STYLES[platform.toLowerCase()] || PLATFORM_STYLES.facebook;
  const label = platform.charAt(0).toUpperCase() + platform.slice(1);

  if (variant === "pill") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium", style.bg, style.text, className)}>
        {label}
      </span>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("w-2 h-2 rounded-full", style.dot)} />
      <span className="text-body font-medium text-foreground">{label}</span>
    </div>
  );
}
