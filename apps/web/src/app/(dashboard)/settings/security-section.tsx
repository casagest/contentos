"use client";

import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";

export default function SecuritySection({ email }: { email: string }) {
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "loading">("idle");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handlePasswordReset() {
    setPasswordStatus("loading");
    try {
      const res = await fetch("/api/account/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setPasswordStatus("sent");
        setTimeout(() => setPasswordStatus("idle"), 5000);
      } else {
        setPasswordStatus("idle");
      }
    } catch {
      setPasswordStatus("idle");
    }
  }

  async function handleExport() {
    setExportStatus("loading");
    try {
      const res = await fetch("/api/account/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `contentos-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // silent fail
    }
    setExportStatus("idle");
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        window.location.assign("/login");
      }
    } catch {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-gray-400" />
        <h2 className="text-base font-semibold text-white">Securitate</h2>
      </div>
      <div className="space-y-3">
        <button
          onClick={handlePasswordReset}
          disabled={passwordStatus !== "idle"}
          className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition text-sm text-gray-300 disabled:opacity-50 flex items-center gap-2"
        >
          {passwordStatus === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {passwordStatus === "sent"
            ? "Link de resetare trimis pe email"
            : "Schimba parola"}
        </button>

        <button
          onClick={handleExport}
          disabled={exportStatus === "loading"}
          className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition text-sm text-gray-300 disabled:opacity-50 flex items-center gap-2"
        >
          {exportStatus === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {exportStatus === "loading" ? "Se exporta..." : "Exporta datele mele (GDPR)"}
        </button>

        {!deleteConfirm ? (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="w-full text-left p-3 rounded-lg bg-white/[0.02] hover:bg-red-500/5 transition text-sm text-red-400"
          >
            Sterge contul
          </button>
        ) : (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-3">
            <p className="text-sm text-red-300">
              Esti sigur? Aceasta actiune va dezactiva contul tau si toate datele asociate.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Da, sterge contul
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] text-gray-300 text-xs font-medium transition hover:bg-white/[0.1]"
              >
                Anuleaza
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
