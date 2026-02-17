import Link from "next/link";
import { register } from "../actions";
import { RegisterSubmitButton } from "./submit-button";
import { Mail, Lock, User, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

export const metadata = {
  title: "Înregistrare — ContentOS",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const success = params.success === "true";

  if (success) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 backdrop-blur-xl shadow-2xl shadow-black/20 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Verifică-ți emailul</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Am trimis un link de confirmare la adresa ta de email. Verifică inbox-ul și folder-ul de spam.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 font-semibold transition"
        >
          Înapoi la conectare
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl shadow-2xl shadow-black/20">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Sparkles className="h-5 w-5 text-orange-400" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Creează cont</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          7 zile gratuit · Fără card de credit
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-red-400 shrink-0 animate-pulse" />
          <span>{error}</span>
        </div>
      )}

      <form action={register} className="space-y-5">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">
            Nume
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="Numele tău complet"
              aria-required="true"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

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
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Parolă
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="Minimum 6 caractere"
              aria-required="true"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        <RegisterSubmitButton>
          <span>Creează cont gratuit</span>
          <ArrowRight className="w-4 h-4" />
        </RegisterSubmitButton>
      </form>

      {/* Features list */}
      <div className="mt-6 pt-6 border-t border-white/[0.06]">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {["Fără card de credit", "7 zile gratuit", "Anulare oricând"].map((feature) => (
            <span key={feature} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <CheckCircle2 className="w-3 h-3 text-green-500/60" />
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Sign in link */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Ai deja cont?{" "}
        <Link href="/login" className="text-orange-400 hover:text-orange-300 font-semibold transition">
          Conectare
        </Link>
      </p>
    </div>
  );
}
