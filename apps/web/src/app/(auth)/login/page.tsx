import Link from "next/link";
import { login } from "../actions";
import { SubmitButton } from "./submit-button";
import { sanitizeRedirectPath } from "@/lib/redirect";
import { Mail, Lock, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Conectare — ContentOS",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  // Sanitize la nivel de pagină: nu punem niciodată URL-uri externe în formular
  const redirectTo = sanitizeRedirectPath(params.redirect);

  return (
    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Bine ai revenit</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Conectează-te pentru a continua
        </p>
      </div>

      {/* Error alert — dot roșu animat + text */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
          <span>{error === "Invalid login credentials" ? "Email sau parolă incorectă." : error}</span>
        </div>
      )}

      <form action={login} className="space-y-5">
        <input type="hidden" name="redirect" value={redirectTo} />

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@exemplu.ro"
              aria-required="true"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Parolă
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-muted-foreground/80 hover:text-muted-foreground transition"
            >
              Ai uitat parola?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              aria-required="true"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
            />
          </div>
        </div>

        <SubmitButton>
          <span>Conectare</span>
          <ArrowRight className="w-4 h-4" />
        </SubmitButton>
      </form>

      {/* Divider — linie subtilă */}
      <div className="relative my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 text-xs text-muted-foreground/50 bg-white/[0.03]">sau</span>
        </div>
      </div>

      {/* Sign up link */}
      <p className="text-center text-sm text-muted-foreground">
        Nu ai cont?{" "}
        <Link href="/register" className="text-orange-400 hover:text-orange-300 font-semibold transition">
          Creează cont gratuit
        </Link>
      </p>
    </div>
  );
}
