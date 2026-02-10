import Link from "next/link";
import { register } from "../actions";

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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
          <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Verifică-ți emailul</h1>
        <p className="mt-2 text-sm text-gray-400">
          Am trimis un link de confirmare la adresa ta de email.
          Verifică inbox-ul și folder-ul de spam.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-brand-400 hover:text-brand-300 font-medium transition"
        >
          Înapoi la conectare
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white">Creează cont</h1>
        <p className="mt-2 text-sm text-gray-400">
          Începe gratuit cu ContentOS
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form action={register} className="space-y-4">
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
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
            Parolă
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            placeholder="Minimum 6 caractere"
            className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/50 transition"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-brand-600 hover:bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition shadow-lg shadow-brand-500/25"
        >
          Creează cont
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-400">
        Ai deja cont?{" "}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition">
          Conectare
        </Link>
      </p>
    </div>
  );
}
