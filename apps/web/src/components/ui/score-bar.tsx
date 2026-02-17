import { cn } from "@/lib/utils";

interface ScoreBarProps {
  label: string;
  score: number;
  max?: number;
  /** Auto-detect color from score, or provide explicitly */
  color?: string;
  /** Show score number */
  showValue?: boolean;
  className?: string;
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "bg-emerald-400";
  if (pct >= 60) return "bg-yellow-400";
  if (pct >= 40) return "bg-amber-400";
  return "bg-red-400";
}

export function ScoreBar({
  label,
  score,
  max = 100,
  color,
  showValue = true,
  className,
}: ScoreBarProps) {
  const barColor = color || getScoreColor(score, max);
  const pct = Math.min((score / max) * 100, 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-caption text-muted-foreground w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/5">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="text-caption text-foreground font-bold w-8 text-right">{score}</span>
      )}
    </div>
  );
}
