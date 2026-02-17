export default function DashboardBusinessLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-8 w-16 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-card border border-border p-4 h-48" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl bg-card border border-border p-4 h-40" />
        </div>
      </div>
    </div>
  );
}
