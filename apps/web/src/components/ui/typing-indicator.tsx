import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  label?: string;
  /** Dot color */
  color?: "brand" | "emerald" | "gray" | "orange";
  className?: string;
}

const colorMap = {
  brand: "bg-brand-400",
  emerald: "bg-emerald-400",
  gray: "bg-gray-500",
  orange: "bg-orange-400",
};

export function TypingIndicator({ label, color = "brand", className }: TypingIndicatorProps) {
  const dotColor = colorMap[color];

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex gap-1">
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", dotColor)} style={{ animationDelay: "0ms" }} />
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", dotColor)} style={{ animationDelay: "150ms" }} />
        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", dotColor)} style={{ animationDelay: "300ms" }} />
      </div>
      {label && <span className="text-caption text-muted-foreground">{label}</span>}
    </div>
  );
}
