"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="group relative w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-[1px] active:translate-y-0 flex items-center justify-center gap-2 overflow-hidden"
    >
      {/* Shine sweep effect on hover */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? (
        <span>Se conectează...</span>
      ) : (
        <span className="relative flex items-center gap-2">{children}</span>
      )}
    </button>
  );
}
