"use client";

import { useState, useEffect } from "react";

interface ScoreRingProps {
  score: number;
  size?: number;
  delay?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 85) return "#10b981";
  if (score >= 70) return "#f59e0b";
  return "#ef4444";
}

function getScoreGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  return "C";
}

export function ScoreRing({ score, size = 48, delay = 0, className }: ScoreRingProps) {
  const [animated, setAnimated] = useState(false);
  const r = (size - 5) / 2;
  const circumference = 2 * Math.PI * r;
  const color = getScoreColor(score);
  const grade = getScoreGrade(score);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay + 300);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-white/[0.06]"
          strokeWidth={4}
        />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference * (1 - score / 100) : circumference}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-extrabold leading-none font-mono"
          style={{ fontSize: size * 0.32, color }}
        >
          {grade}
        </span>
        <span
          className="font-semibold leading-none text-white/35"
          style={{ fontSize: size * 0.19 }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
