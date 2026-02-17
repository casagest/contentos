"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

export function RegisterSubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2"
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      {pending ? "Se creează contul..." : children}
    </button>
  );
}
