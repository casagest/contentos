"use client";

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-muted ${className}`}
    />
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-3">
      <div className="flex gap-2">
        <Shimmer className="h-8 w-24" />
        <Shimmer className="h-8 w-24" />
        <Shimmer className="h-8 w-20" />
        <Shimmer className="h-8 w-20" />
      </div>
      <div className="flex-1 rounded-xl bg-card/50 border border-border p-4 space-y-4">
        <div className="flex justify-center">
          <Shimmer className="w-14 h-14 rounded-2xl" />
        </div>
        <Shimmer className="h-4 w-48 mx-auto" />
        <Shimmer className="h-3 w-64 mx-auto" />
        <div className="flex gap-2 justify-center mt-4">
          <Shimmer className="h-8 w-56" />
          <Shimmer className="h-8 w-48" />
        </div>
      </div>
      <Shimmer className="h-24 rounded-xl" />
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Shimmer className="h-8 w-20" />
        <Shimmer className="h-1 w-8 self-center" />
        <Shimmer className="h-8 w-20" />
        <Shimmer className="h-1 w-8 self-center" />
        <Shimmer className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Shimmer className="h-48 rounded-xl" />
          <Shimmer className="h-16 rounded-xl" />
          <Shimmer className="h-28 rounded-xl" />
          <Shimmer className="h-12 rounded-xl" />
        </div>
        <Shimmer className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Shimmer className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Shimmer className="h-80 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Shimmer className="h-9 w-24" />
        <Shimmer className="h-9 w-40" />
      </div>
      <Shimmer className="h-10 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <Shimmer key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Shimmer className="h-8 w-32" />
        <Shimmer className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Shimmer key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <Shimmer className="h-12 rounded-none" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-t border-border">
            <Shimmer className="h-6 w-16 rounded" />
            <Shimmer className="h-4 flex-1" />
            <Shimmer className="h-4 w-12" />
            <Shimmer className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Shimmer className="h-9 w-9" />
          <Shimmer className="h-9 w-9" />
          <Shimmer className="h-9 w-14" />
        </div>
        <Shimmer className="h-5 w-40" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <Shimmer className="h-20 rounded-xl" />
      <Shimmer className="h-12 rounded-xl" />
      <Shimmer className="h-12 rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        <Shimmer className="h-24 rounded-xl" />
        <Shimmer className="h-24 rounded-xl" />
        <Shimmer className="h-24 rounded-xl" />
      </div>
      <Shimmer className="h-12 rounded-xl" />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      {Array.from({ length: 4 }).map((_, i) => (
        <Shimmer key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
