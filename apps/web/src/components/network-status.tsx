"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true; // assume online during SSR
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function NetworkStatus() {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerSnapshot);
  const isOffline = !isOnline;

  if (!isOffline) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs"
      role="alert"
      aria-live="assertive"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Ești offline. Unele funcționalități nu sunt disponibile.</span>
    </div>
  );
}
