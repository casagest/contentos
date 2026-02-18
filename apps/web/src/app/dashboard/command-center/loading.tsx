export default function CommandCenterLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-lg bg-white/5" />
          <div className="h-3 w-40 rounded bg-white/5" />
        </div>
        <div className="h-9 w-24 rounded-lg bg-white/5" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
            <div className="h-3 w-16 rounded bg-white/5" />
            <div className="h-8 w-20 rounded bg-white/10" />
            <div className="h-2 w-full rounded bg-white/5" />
          </div>
        ))}
      </div>
      <div>
        <div className="h-4 w-28 rounded bg-white/5 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl h-20 bg-white/[0.02] border border-white/[0.06]" />
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.02] h-64" />
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] h-32" />
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] h-24" />
        </div>
      </div>
    </div>
  );
}
