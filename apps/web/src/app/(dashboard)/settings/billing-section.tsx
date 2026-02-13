"use client";

import { useState } from "react";
import { CreditCard, Loader2, ExternalLink, Check } from "lucide-react";
import { PLANS } from "@contentos/shared";
import type { Plan } from "@contentos/database";

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["1 platforma", "50 postari/luna", "AI de baza"],
  starter: ["2 platforme", "Postari nelimitate", "AI avansat", "Programare postari"],
  pro: ["5 platforme", "Postari nelimitate", "AI premium", "Analytics complet", "Suport prioritar"],
  agency: ["5 platforme", "Postari nelimitate", "AI premium", "White-label", "API access", "Echipa multi-user"],
  dental: ["5 platforme", "Postari nelimitate", "AI dental specializat", "Template-uri CMSR", "Analytics dental"],
};

export default function BillingSection({
  currentPlan,
  hasStripeCustomer,
}: {
  currentPlan: Plan;
  hasStripeCustomer: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const planConfig = PLANS[currentPlan];
  const isPaid = currentPlan !== "free";

  async function handleUpgrade(planId: string) {
    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch {
      // Silently fail — user can retry
    }
    setLoading(null);
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch {
      // Silently fail
    }
    setLoading(null);
  }

  const upgradePlans = (Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][])
    .filter(([key]) => key !== "free" && key !== currentPlan);

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-4 h-4 text-gray-400" />
        <h2 className="text-base font-semibold text-white">Abonament</h2>
      </div>

      {/* Current plan */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] mb-4">
        <div>
          <div className="text-sm font-medium text-white">{planConfig.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {planConfig.platforms} {planConfig.platforms === 1 ? "platforma" : "platforme"}
            {" / "}
            {planConfig.postsPerMonth === -1 ? "postari nelimitate" : `${planConfig.postsPerMonth} postari/luna`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPaid && (
            <span className="text-sm font-bold text-white">
              {planConfig.priceEur}&euro;/luna
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-600/10 text-brand-300 border border-brand-500/20">
            Activ
          </span>
        </div>
      </div>

      {/* Manage subscription (paid users) */}
      {isPaid && hasStripeCustomer && (
        <button
          onClick={handleManage}
          disabled={loading === "portal"}
          className="mb-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-gray-300 hover:bg-white/[0.06] transition disabled:opacity-50"
        >
          {loading === "portal" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Gestioneaza abonamentul
        </button>
      )}

      {/* Upgrade options */}
      {upgradePlans.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {isPaid ? "Schimba planul:" : "Upgradeaza pentru mai multe functionalitati:"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upgradePlans.map(([key, plan]) => {
              const features = PLAN_FEATURES[key] || [];
              const isLoading = loading === key;

              return (
                <div
                  key={key}
                  className="p-4 rounded-lg border border-white/[0.06] hover:border-brand-500/30 transition"
                >
                  <div className="text-sm font-medium text-white mb-1">
                    {plan.name}
                  </div>
                  <ul className="space-y-1 mb-3">
                    {features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Check className="w-3 h-3 text-brand-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-white">
                      {plan.priceEur}&euro;
                      <span className="text-xs text-gray-500 font-normal">/luna</span>
                    </div>
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={!!loading}
                      className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        "Upgradeaza"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
