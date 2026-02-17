import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { icon: "w-8 h-8", title: "text-body", desc: "text-caption", wrapper: "py-6" },
  md: { icon: "w-12 h-12", title: "text-heading-3", desc: "text-body", wrapper: "py-12" },
  lg: { icon: "w-14 h-14", title: "text-heading-2", desc: "text-body", wrapper: "py-16" },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
  size = "md",
}: EmptyStateProps) {
  const s = sizeStyles[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", s.wrapper, className)}>
      <Icon className={cn(s.icon, "text-muted-foreground/40 mb-3")} />
      <p className={cn(s.title, "font-semibold text-foreground mb-1")}>{title}</p>
      {description && (
        <p className={cn(s.desc, "text-muted-foreground max-w-md")}>{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
