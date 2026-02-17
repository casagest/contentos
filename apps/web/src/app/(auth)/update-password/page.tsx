"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Parolele nu se potrivesc.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Parolă nouă
        </h1>
        <p className="text-sm text-muted-foreground">
          Alege o parolă nouă pentru contul tău
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
            Parolă nouă
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minim 6 caractere"
            required
            minLength={6}
            className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
            Confirmă parola
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repetă parola"
            required
            minLength={6}
            className="w-full px-3 py-2.5 rounded-lg bg-muted border border-border text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm transition"
        >
          {loading ? "Se salvează..." : "Salvează parola nouă"}
        </button>
      </form>
    </div>
  );
}
