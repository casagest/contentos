"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { type HTMLAttributes } from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-white/[0.06] text-gray-300 border border-white/[0.08]",
        brand: "bg-brand-500/10 text-brand-300 border border-brand-500/20",
        success: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
        warning: "bg-yellow-500/10 text-yellow-300 border border-yellow-500/20",
        danger: "bg-red-500/10 text-red-300 border border-red-500/20",
        info: "bg-blue-500/10 text-blue-300 border border-blue-500/20",
        facebook: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        instagram: "bg-pink-500/10 text-pink-400 border border-pink-500/20",
        tiktok: "bg-white/[0.08] text-white border border-white/[0.12]",
        youtube: "bg-red-500/10 text-red-400 border border-red-500/20",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  dotColor?: string;
}

export function Badge({ className, variant, size, dot, dotColor, children, ...props }: BadgeProps) {
  return (
    <span className={clsx(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColor || "bg-current"}`} />}
      {children}
    </span>
  );
}
