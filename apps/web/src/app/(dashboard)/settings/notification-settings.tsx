"use client";

import { useState, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { saveNotificationPrefs } from "./actions";

const NOTIFICATION_OPTIONS = [
  { key: "weeklyReport", label: "Raport saptamanal de performanta", defaultOn: true },
  { key: "lowEngagement", label: "Alerte de engagement scazut", defaultOn: true },
  { key: "aiSuggestions", label: "Sugestii AI de continut", defaultOn: false },
  { key: "newsletter", label: "Newsletter si noutati", defaultOn: false },
];

export default function NotificationSettings({
  initialPrefs,
}: {
  initialPrefs: Record<string, boolean> | null;
}) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    if (initialPrefs) return initialPrefs;
    const defaults: Record<string, boolean> = {};
    for (const opt of NOTIFICATION_OPTIONS) {
      defaults[opt.key] = opt.defaultOn;
    }
    return defaults;
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistPrefs = useCallback((updated: Record<string, boolean>) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNotificationPrefs(updated);
    }, 500);
  }, []);

  function toggle(key: string) {
    setPrefs((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      persistPrefs(updated);
      return updated;
    });
  }

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-gray-400" />
        <h2 className="text-base font-semibold text-white">Notificari</h2>
      </div>
      <div className="space-y-3">
        {NOTIFICATION_OPTIONS.map((item) => {
          const isOn = prefs[item.key] ?? item.defaultOn;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-gray-300">{item.label}</span>
              <button
                type="button"
                onClick={() => toggle(item.key)}
                className={`w-9 h-5 rounded-full transition ${
                  isOn ? "bg-brand-600" : "bg-white/[0.1]"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    isOn ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
