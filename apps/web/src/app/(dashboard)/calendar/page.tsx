"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Trash2,
  Clock,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  Save,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CalendarDraft {
  id: string;
  title: string | null;
  body: string;
  target_platforms: string[];
  platform_versions: Record<string, unknown>;
  status: string;
  scheduled_at: string | null;
  source: string;
  created_at: string;
}

interface CalendarPost {
  id: string;
  platform: string;
  text_content: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  published_at: string;
  platform_url: string | null;
}

interface DayData {
  date: Date;
  dateStr: string;
  label: string;
  isToday: boolean;
  drafts: CalendarDraft[];
  posts: CalendarPost[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DAY_NAMES = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];

const PLATFORM_OPTIONS = [
  { id: "facebook", label: "Facebook", icon: Facebook, color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", icon: Instagram, color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", icon: Music2, color: "bg-gray-500" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "bg-red-500" },
];

const platformBadge: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-foreground/80",
  youtube: "bg-red-500/10 text-red-400",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

async function readApiError(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    // Ignore parse issues and fall back to generic text.
  }

  return fallback;
}

function getWeekDays(weekStart: Date): DayData[] {
  const today = toDateStr(new Date());
  const days: DayData[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = toDateStr(date);

    days.push({
      date,
      dateStr,
      label: DAY_NAMES[date.getDay()],
      isToday: dateStr === today,
      drafts: [],
      posts: [],
    });
  }

  return days;
}

function getMonthDays(monthStart: Date): DayData[] {
  const today = toDateStr(new Date());
  const days: DayData[] = [];
  const monday = getMonday(monthStart);
  const daysToShow = 42; // 6 weeks
  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    const dateStr = toDateStr(date);
    days.push({
      date,
      dateStr,
      label: DAY_NAMES[date.getDay()],
      isToday: dateStr === today,
      drafts: [],
      posts: [],
    });
  }
  return days;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString("ro-RO", { day: "numeric", month: "short" });
  const endStr = end.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
  return `${startStr} — ${endStr}`;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
}

function getMonthStart(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

const PLATFORM_DOT: Record<string, string> = {
  facebook: "bg-blue-500",
  instagram: "bg-pink-500",
  tiktok: "bg-gray-500",
  youtube: "bg-red-500",
};

// ─── Draft Card ─────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onClick,
}: {
  draft: CalendarDraft;
  onClick: () => void;
}) {
  const time = draft.scheduled_at
    ? new Date(draft.scheduled_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2 rounded-lg bg-orange-500/5 border border-orange-500/20 hover:border-orange-500/40 transition group"
    >
      <div className="flex items-center gap-1 mb-1">
        <div className="flex gap-0.5">
          {draft.target_platforms.map((p) => (
            <span
              key={p}
              className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[p] || "bg-gray-500"}`}
            />
          ))}
        </div>
        {time && (
          <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {time}
          </span>
        )}
      </div>
      <p className="text-[11px] text-foreground/80 truncate">
        {draft.title || draft.body.slice(0, 60) || "Draft fără titlu"}
      </p>
    </button>
  );
}

// ─── Published Post Card ────────────────────────────────────────────────────

function PostCard({ post }: { post: CalendarPost }) {
  const engagement = post.likes_count + post.comments_count + post.shares_count;

  return (
    <div className="w-full p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-1 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${PLATFORM_DOT[post.platform] || "bg-gray-500"}`} />
        <span className="text-[9px] text-muted-foreground ml-auto">
          {engagement > 0 ? `${engagement} eng.` : ""}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground truncate">
        {post.text_content || "—"}
      </p>
    </div>
  );
}

// ─── Create/Edit Modal ──────────────────────────────────────────────────────

function DraftModal({
  draft,
  initialDate,
  onSave,
  onDelete,
  onClose,
}: {
  draft: CalendarDraft | null;
  initialDate?: string;
  onSave: (data: {
    id?: string;
    title: string;
    body: string;
    target_platforms: string[];
    scheduled_at: string | null;
    status: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const isEditing = !!draft;
  const [title, setTitle] = useState(draft?.title || "");
  const [body, setBody] = useState(draft?.body || "");
  const [platforms, setPlatforms] = useState<string[]>(
    draft?.target_platforms || ["facebook"]
  );
  const [scheduledAt, setScheduledAt] = useState(
    draft?.scheduled_at
      ? draft.scheduled_at.slice(0, 16)
      : initialDate
        ? `${initialDate}T10:00`
        : ""
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(id: string) {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSave(asDraft: boolean) {
    if (!body.trim() || platforms.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: draft?.id,
        title: title.trim(),
        body: body.trim(),
        target_platforms: platforms,
        scheduled_at: !asDraft && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: !asDraft && scheduledAt ? "scheduled" : "draft",
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu s-a putut salva draft-ul."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!draft?.id || !onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(draft.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nu s-a putut sterge draft-ul."
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-modal-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-lg rounded-2xl bg-surface-overlay/95 backdrop-blur-xl border border-white/[0.08] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 id="draft-modal-title" className="text-lg font-semibold text-white">
            {isEditing ? "Editează Draft" : "Creează Draft"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-white transition"
            aria-label="Închide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <input
          type="text"
          placeholder="Titlu (opțional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />

        {/* Body */}
        <textarea
          placeholder="Scrie conținutul postării..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
        />

        {/* Platforms */}
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1.5">Platforme</div>
          <div className="flex gap-2">
            {PLATFORM_OPTIONS.map((p) => {
              const Icon = p.icon;
              const selected = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selected
                      ? "bg-accent text-white border border-border"
                      : "bg-muted text-muted-foreground border border-border hover:text-foreground/80"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule date/time */}
        <div className="mb-5">
          <div className="text-xs text-muted-foreground mb-1.5">Programează pentru</div>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 [color-scheme:dark]"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !body.trim() || platforms.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 disabled:opacity-50 text-white text-sm font-medium transition"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CalendarCheck className="w-4 h-4" />
            )}
            {scheduledAt ? "Programează" : "Salvează Draft"}
          </button>
          {scheduledAt && (
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-muted hover:bg-accent text-foreground/80 text-sm font-medium transition"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
          {isEditing && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"month" | "week">("week");
  const [periodStart, setPeriodStart] = useState(() => getMonday(new Date()));
  const [days, setDays] = useState<DayData[]>(() => getWeekDays(getMonday(new Date())));
  const [loading, setLoading] = useState(true);
  const [modalDraft, setModalDraft] = useState<CalendarDraft | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadPeriod = useCallback(async (start: Date, dayCount: number) => {
    setLoading(true);
    const isMonth = dayCount > 7;
    const periodDays = isMonth ? getMonthDays(getMonthStart(start)) : getWeekDays(start);
    const startStr = toDateStr(periodDays[0].date);
    const endDate = new Date(periodDays[periodDays.length - 1].date);
    endDate.setDate(endDate.getDate() + 1);
    const endStr = toDateStr(endDate);

    try {
      const [draftsRes, postsRes] = await Promise.all([
        fetch(`/api/drafts?status=all&start=${startStr}&end=${endStr}`),
        fetch(`/api/posts?start=${startStr}&end=${endStr}&limit=200`),
      ]);

      if (draftsRes.ok) {
        const { drafts } = await draftsRes.json();
        for (const draft of drafts as CalendarDraft[]) {
          const draftDate = draft.scheduled_at
            ? toDateStr(new Date(draft.scheduled_at))
            : toDateStr(new Date(draft.created_at));
          const day = periodDays.find((d) => d.dateStr === draftDate);
          if (day) day.drafts.push(draft);
        }
      }

      if (postsRes.ok) {
        const { posts } = await postsRes.json();
        for (const post of posts as CalendarPost[]) {
          if (!post.published_at) continue;
          const postDate = toDateStr(new Date(post.published_at));
          const day = periodDays.find((d) => d.dateStr === postDate);
          if (day) day.posts.push(post);
        }
      }
    } catch {
      // Calendar load error — silent in production
    }

    setDays(periodDays);
    setLoading(false);
  }, []);

  useEffect(() => {
    const start = viewMode === "month" ? getMonthStart(periodStart) : periodStart;
    const dayCount = viewMode === "month" ? 42 : 7;
    const id = setTimeout(() => {
      void loadPeriod(start, dayCount);
    }, 0);
    return () => clearTimeout(id);
  }, [periodStart, viewMode, loadPeriod]);

  function navigatePeriod(direction: -1 | 1) {
    if (viewMode === "month") {
      const next = new Date(periodStart.getFullYear(), periodStart.getMonth() + direction, 1);
      setPeriodStart(getMonday(next));
    } else {
      const next = new Date(periodStart);
      next.setDate(next.getDate() + direction * 7);
      setPeriodStart(next);
    }
  }

  function goToToday() {
    setPeriodStart(getMonday(new Date()));
  }

  function openCreate(dateStr: string) {
    setModalDraft(null);
    setModalDate(dateStr);
    setShowModal(true);
  }

  function openEdit(draft: CalendarDraft) {
    setModalDraft(draft);
    setModalDate(null);
    setShowModal(true);
  }

  async function handleSave(data: {
    id?: string;
    title: string;
    body: string;
    target_platforms: string[];
    scheduled_at: string | null;
    status: string;
  }) {
    let response: Response;

    if (data.id) {
      response = await fetch(`/api/drafts/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          source: "manual",
        }),
      });
    }

    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Nu s-a putut salva draft-ul.")
      );
    }

    await loadPeriod(viewMode === "month" ? getMonthStart(periodStart) : periodStart, viewMode === "month" ? 42 : 7);
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Nu s-a putut sterge draft-ul.")
      );
    }
    await loadPeriod(viewMode === "month" ? getMonthStart(periodStart) : periodStart, viewMode === "month" ? 42 : 7);
  }

  const isEmpty = days.every((d) => d.drafts.length === 0 && d.posts.length === 0);
  const displayMonth = viewMode === "month" ? getMonthStart(periodStart) : new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);

  return (
    <div>
      {/* Header: month nav + view toggle + Adaugă Draft */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigatePeriod(-1)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition"
              aria-label="Luna precedentă"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white min-w-[140px] text-center capitalize">
              {formatMonthYear(displayMonth)}
            </h2>
            <button
              onClick={() => navigatePeriod(1)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/[0.04] transition"
              aria-label="Luna următoare"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          {/* View toggle pills */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.06] rounded-full p-0.5">
            <button
              onClick={() => {
                setViewMode("month");
                setPeriodStart((prev) => getMonday(getMonthStart(prev)));
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                viewMode === "month" ? "bg-orange-500/15 text-orange-400" : "text-muted-foreground hover:text-white/80"
              }`}
            >
              Lună
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                viewMode === "week" ? "bg-orange-500/15 text-orange-400" : "text-muted-foreground hover:text-white/80"
              }`}
            >
              Săptămână
            </button>
          </div>
        </div>
        <button
          onClick={() => openCreate(toDateStr(new Date()))}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-sm font-semibold transition shadow-lg shadow-orange-500/25 hover:-translate-y-0.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Adaugă Draft
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {/* Day headers (week view or month view) */}
      {!loading && viewMode === "month" && (
        <div className="max-lg:hidden lg:grid grid-cols-7 gap-2 mb-1">
          {DAY_NAMES.map((name) => (
            <div key={name} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {name}
            </div>
          ))}
        </div>
      )}

      {/* Calendar grid — 7-col pe lg, list pe mobile */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {days.map((day) => {
            const hasContent = day.drafts.length > 0 || day.posts.length > 0;
            const isCurrentMonth = viewMode === "month" && day.date.getMonth() === displayMonth.getMonth();
            return (
              <div
                key={day.dateStr}
                className={`rounded-lg border p-3 min-h-[100px] sm:min-h-[120px] lg:min-h-[140px] flex flex-col transition group ${
                  day.isToday
                    ? "ring-2 ring-orange-500/50 bg-orange-500/5 border-orange-500/30"
                    : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]"
                } ${viewMode === "month" && !isCurrentMonth ? "opacity-40" : ""}`}
              >
                {/* Day header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`text-[10px] font-medium ${day.isToday ? "text-brand-400" : "text-muted-foreground"}`}>
                      {day.label}
                    </div>
                    <div className={`text-sm font-semibold ${day.isToday ? "text-white" : "text-foreground/80"}`}>
                      {day.date.getDate()}
                    </div>
                    {hasContent && (
                      <span className="text-[9px] text-muted-foreground lg:hidden">
                        ({day.drafts.length + day.posts.length})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => openCreate(day.dateStr)}
                    className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-brand-400 transition opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    aria-label={`Creează draft pentru ${day.label} ${day.date.getDate()}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Draft cards */}
                <div className="space-y-1.5 flex-1">
                  {day.drafts.map((draft) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      onClick={() => openEdit(draft)}
                    />
                  ))}

                  {/* Published posts */}
                  {day.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>

                {/* Empty day click area */}
                {!hasContent && (
                  <button
                    onClick={() => openCreate(day.dateStr)}
                    className="flex-1 flex items-center justify-center text-gray-700 hover:text-brand-400 transition"
                    aria-label={`Adaugă conținut pentru ${day.label}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
          <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">
            Nicio postare programată
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Creează un draft sau programează conținut din Brain Dump sau Composer.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => openCreate(toDateStr(new Date()))}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Creează Draft
            </button>
            <button
              onClick={() => router.push("/braindump")}
              className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-foreground/80 text-sm font-medium transition"
            >
              Brain Dump
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <DraftModal
            key="draft-modal"
            draft={modalDraft}
            initialDate={modalDate || undefined}
            onSave={handleSave}
            onDelete={modalDraft ? handleDelete : undefined}
            onClose={() => {
              setShowModal(false);
              setModalDraft(null);
              setModalDate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
