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
    // Log to error reporting in production
    if (process.env.NODE_ENV === "production") {
      // Future: Sentry/LogRocket integration
    }
  }, [error]);

  return (
    <main className="min-h-screen bg-[#0F1728] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">
          Ceva nu a mers bine
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          A apărut o eroare neașteptată. Încearcă să reîncarci pagina sau revino la pagina principală.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mb-6 text-left text-[11px] text-red-400/70 bg-red-500/5 rounded-lg p-3 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25"
          >
            <RotateCcw className="w-4 h-4" />
            Reîncearcă
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            Acasă
          </Link>
        </div>
      </div>
    </main>
  );
}
