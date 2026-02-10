interface ScoreBadgeProps {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  size?: "sm" | "md" | "lg";
}

const gradeColors = {
  S: "from-yellow-400 to-orange-500",
  A: "from-green-400 to-emerald-500",
  B: "from-blue-400 to-cyan-500",
  C: "from-yellow-500 to-amber-500",
  D: "from-orange-500 to-red-500",
  F: "from-red-500 to-red-700",
};

export function ScoreBadge({ score, grade, size = "md" }: ScoreBadgeProps) {
  const sizeClasses = {
    sm: "w-10 h-10 text-xs",
    md: "w-14 h-14 text-sm",
    lg: "w-20 h-20 text-lg",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br ${gradeColors[grade]} flex flex-col items-center justify-center font-bold text-white shadow-lg`}
    >
      <span className="leading-none">{grade}</span>
      <span className="text-[0.6em] opacity-80">{score}</span>
    </div>
  );
}
