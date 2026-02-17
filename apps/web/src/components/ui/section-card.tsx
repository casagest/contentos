import { cn } from "@/lib/utils";

interface SectionCardProps {
  children: React.ReactNode;
  className?: string;
  /** Padding size */
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function SectionCard({ children, className, padding = "md" }: SectionCardProps) {
  return (
    <div className={cn("rounded-xl bg-card border border-border", paddingStyles[padding], className)}>
      {children}
    </div>
  );
}

interface SectionCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionCardHeader({ children, className }: SectionCardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      {children}
    </div>
  );
}

interface SectionCardTitleProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function SectionCardTitle({ children, icon, className }: SectionCardTitleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {icon}
      <h3 className="text-body font-medium text-foreground">{children}</h3>
    </div>
  );
}
