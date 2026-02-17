"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Check, Trash2, X, Save, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CENTER
// Shows recent system events: drafts, syncs, limits, AI actions
// ═══════════════════════════════════════════════════════════════

export type NotificationType = "success" | "info" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const typeConfig: Record<NotificationType, { icon: React.ReactNode; color: string }> = {
  success: { icon: <Check className="w-3.5 h-3.5" />, color: "text-green-400 bg-green-500/10" },
  info: { icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/10" },
  warning: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/10" },
  error: { icon: <X className="w-3.5 h-3.5" />, color: "text-red-400 bg-red-500/10" },
};

// Simple event emitter for components to push notifications
type NotificationPayload = Omit<Notification, "id" | "timestamp" | "read">;
type Listener = (n: Notification) => void;

const listeners = new Set<Listener>();

export function pushNotification(payload: NotificationPayload) {
  const notification: Notification = {
    ...payload,
    id: crypto.randomUUID(),
    timestamp: new Date(),
    read: false,
  };
  listeners.forEach((fn) => fn(notification));
}

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handler: Listener = (n) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  // Seed initial notifications from recent activity
  useEffect(() => {
    let cancelled = false;
    async function loadRecent() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Fetch recent drafts as notifications
        const { data: drafts } = await supabase
          .from("drafts")
          .select("id, title, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        if (drafts && !cancelled) {
          const draftNotifications: Notification[] = drafts.map((d) => ({
            id: `draft-${d.id}`,
            type: "success" as NotificationType,
            title: "Draft salvat",
            message: d.title || "Draft fără titlu",
            timestamp: new Date(d.created_at),
            read: true,
          }));
          setNotifications((prev) => [...prev, ...draftNotifications]);
        }
      } catch {
        // Silent — notifications are non-critical
      }
    }
    loadRecent();
    return () => { cancelled = true; };
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "acum";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}z`;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
        aria-label={`Notificări${unreadCount > 0 ? ` (${unreadCount} necitite)` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden"
          role="dialog"
          aria-label="Centru notificări"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notificări</h3>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition"
                  aria-label="Șterge toate notificările"
                  title="Șterge tot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition"
                aria-label="Închide notificări"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nicio notificare</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Vei primi actualizări aici</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => {
                  const config = typeConfig[n.type];
                  return (
                    <li
                      key={n.id}
                      className={`px-4 py-3 hover:bg-muted/30 transition ${!n.read ? "bg-brand-500/5" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 p-1 rounded-md ${config.color}`}>
                          {config.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap mt-0.5">
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
