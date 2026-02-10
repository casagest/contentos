import Link from "next/link";
import { login } from "../actions";

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
  const redirectTo = params.redirect || "";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Bine ai revenit</h1>
        <p className="mt-2 text-sm text-gray-400">
          Conectează-te la contul tău ContentOS
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error === "Invalid login credentials"
            ? "Email sau parolă incorectă."
            : error}
        </div>
      )}

      <form action={login} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="tu@exemplu.ro"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300">
              Parolă
            </label>
            <Link
              href="/reset-password"
              className="text-xs text-brand-400 hover:text-brand-300 transition"
            >
              Ai uitat parola?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-brand-500/25"
        >
          Conectare
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Nu ai cont?{" "}
        <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium transition">
          Creează cont gratuit
        </Link>
      </p>
    </div>
  );
}
