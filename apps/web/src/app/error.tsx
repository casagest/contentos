"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error("[ContentOS Error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface-ground flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-20%] right-[20%] w-[500px] h-[500px] rounded-full bg-red-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] rounded-full bg-orange-500/5 blur-[100px]" />

      <div className="relative z-10 text-center max-w-lg">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Ceva nu a funcționat
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          A apărut o eroare neașteptată. Echipa noastră a fost notificată.
          Încearcă să reîncarci pagina sau revino mai târziu.
        </p>

        {error.digest && (
          <p className="mb-6 text-xs text-muted-foreground/50 font-mono">
            Cod eroare: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-[1px]"
          >
            <RotateCcw className="w-4 h-4" />
            Reîncearcă
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-muted-foreground hover:text-white font-medium text-sm transition-all hover:-translate-y-[1px]"
          >
            <Home className="w-4 h-4" />
            Pagina principală
          </Link>
        </div>
      </div>
    </main>
  );
}
