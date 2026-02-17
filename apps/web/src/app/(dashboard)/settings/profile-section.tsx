"use client";

import { useState, useTransition } from "react";
import { User, Check, Loader2 } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { updateUserName } from "./actions";

export default function ProfileSection({
  email,
  initialName,
}: {
  email: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const result = await updateUserName(name);
      if (!result.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-white">Profil</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Email</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-gray-300">
              {email || "—"}
            </div>
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="w-3 h-3" /> Verificat
            </span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Nume</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
            }}
            placeholder="Numele tau"
            className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Se salveaza...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" /> Salvat
            </>
          ) : (
            "Salveaza modificarile"
          )}
        </button>
      </div>
    </div>
  );
}
