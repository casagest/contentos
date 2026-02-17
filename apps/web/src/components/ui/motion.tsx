"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import { type ReactNode, useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// MOTION PRIMITIVES — reusable animation building blocks
// ═══════════════════════════════════════════════════════════════

// --- Fade In ---
export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Stagger Container ---
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function StaggerList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}

// --- Scale on Hover ---
export function HoverScale({
  children,
  scale = 1.02,
  className = "",
}: {
  children: ReactNode;
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Slide In ---
export function SlideIn({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  direction?: "left" | "right" | "up" | "down";
  delay?: number;
  className?: string;
}) {
  const directionMap = {
    left: { x: -24, y: 0 },
    right: { x: 24, y: 0 },
    up: { x: 0, y: -24 },
    down: { x: 0, y: 24 },
  };
  const offset = directionMap[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Page Transition Wrapper ---
export function PageTransition({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// --- Number Counter (count up from 0) ---
export function CountUp({
  value,
  duration = 1.5,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    let start = 0;
    const totalFrames = Math.round(duration * 60);
    const step = value / totalFrames;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      start += step;
      if (frame >= totalFrames) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.round(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString("ro-RO")}</span>;
}

// --- Pulse Dot ---
export function PulseDot({ color = "bg-emerald-400", className = "" }: { color?: string; className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

// --- Glow Card ---
export function GlowCard({
  children,
  className = "",
  glowColor = "brand",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: "brand" | "emerald" | "amber" | "red" | "blue";
}) {
  const glowMap = {
    brand: "hover:shadow-brand-500/10 hover:border-brand-500/20",
    emerald: "hover:shadow-emerald-500/10 hover:border-emerald-500/20",
    amber: "hover:shadow-amber-500/10 hover:border-amber-500/20",
    red: "hover:shadow-red-500/10 hover:border-red-500/20",
    blue: "hover:shadow-blue-500/10 hover:border-blue-500/20",
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`rounded-xl bg-white/[0.02] border border-white/[0.06] transition-shadow duration-300 hover:shadow-xl ${glowMap[glowColor]} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// --- Skeleton Loader ---
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-white/[0.06] ${className}`} />
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// Re-export for convenience
export { motion, AnimatePresence };
