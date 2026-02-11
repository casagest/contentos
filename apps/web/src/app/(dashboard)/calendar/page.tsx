"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  tiktok: "bg-gray-500/10 text-gray-300",
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
      className="w-full text-left p-2 rounded-lg bg-brand-500/10 border border-brand-500/20 hover:border-brand-500/40 transition group"
    >
      <div className="flex items-center gap-1 mb-1">
        {draft.target_platforms.map((p) => (
          <span
            key={p}
            className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${platformBadge[p] || "bg-gray-500/10 text-gray-400"}`}
          >
            {p.slice(0, 2)}
          </span>
        ))}
        {time && (
          <span className="text-[9px] text-gray-500 ml-auto flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> {time}
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-300 truncate">
        {draft.title || draft.body.slice(0, 60) || "Draft fără titlu"}
      </p>
    </button>
  );
}

// ─── Published Post Card ────────────────────────────────────────────────────

function PostCard({ post }: { post: CalendarPost }) {
  const engagement = post.likes_count + post.comments_count + post.shares_count;

  return (
    <div className="w-full p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-1 mb-1">
        <span className={`px-1 py-0.5 rounded text-[8px] font-bold uppercase ${platformBadge[post.platform] || "bg-gray-500/10 text-gray-400"}`}>
          {post.platform.slice(0, 2)}
        </span>
        <span className="text-[9px] text-gray-600 ml-auto">
          {engagement > 0 ? `${engagement} eng.` : ""}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 truncate">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f1117] border border-white/[0.1] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? "Editează Draft" : "Creează Draft"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-white transition"
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
          className="w-full mb-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />

        {/* Body */}
        <textarea
          placeholder="Scrie conținutul postării..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full mb-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
        />

        {/* Platforms */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1.5">Platforme</div>
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
                      ? "bg-white/[0.1] text-white border border-white/[0.15]"
                      : "bg-white/[0.03] text-gray-500 border border-white/[0.06] hover:text-gray-300"
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
          <div className="text-xs text-gray-500 mb-1.5">Programează pentru</div>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 [color-scheme:dark]"
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
              className="px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium transition"
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
      </div>
    </div>
  );
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [days, setDays] = useState<DayData[]>(() => getWeekDays(getMonday(new Date())));
  const [loading, setLoading] = useState(true);
  const [modalDraft, setModalDraft] = useState<CalendarDraft | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const loadWeek = useCallback(async (start: Date) => {
    setLoading(true);
    const weekDays = getWeekDays(start);
    const startStr = toDateStr(start);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 7);
    const endStr = toDateStr(endDate);

    try {
      const [draftsRes, postsRes] = await Promise.all([
        fetch(`/api/drafts?status=all&start=${startStr}&end=${endStr}`),
        fetch(`/api/posts?start=${startStr}&end=${endStr}&limit=100`),
      ]);

      if (draftsRes.ok) {
        const { drafts } = await draftsRes.json();
        for (const draft of drafts as CalendarDraft[]) {
          const draftDate = draft.scheduled_at
            ? toDateStr(new Date(draft.scheduled_at))
            : toDateStr(new Date(draft.created_at));
          const day = weekDays.find((d) => d.dateStr === draftDate);
          if (day) day.drafts.push(draft);
        }
      }

      if (postsRes.ok) {
        const { posts } = await postsRes.json();
        for (const post of posts as CalendarPost[]) {
          if (!post.published_at) continue;
          const postDate = toDateStr(new Date(post.published_at));
          const day = weekDays.find((d) => d.dateStr === postDate);
          if (day) day.posts.push(post);
        }
      }
    } catch (err) {
      console.error("Calendar load error:", err);
    }

    setDays(weekDays);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadWeek fetches async data then sets state; this is the intended pattern
    void loadWeek(weekStart);
  }, [weekStart, loadWeek]);

  function navigateWeek(direction: -1 | 1) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + direction * 7);
    setWeekStart(next);
  }

  function goToToday() {
    setWeekStart(getMonday(new Date()));
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

    await loadWeek(weekStart);
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(
        await readApiError(response, "Nu s-a putut sterge draft-ul.")
      );
    }
    await loadWeek(weekStart);
  }

  const isEmpty = days.every((d) => d.drafts.length === 0 && d.posts.length === 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar Conținut</h1>
            <p className="text-gray-400 text-sm">
              Planifică și programează postările
            </p>
          </div>
        </div>

        <button
          onClick={() => openCreate(toDateStr(new Date()))}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Creează Draft
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-gray-400 hover:text-white transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-xs text-gray-400 hover:text-white transition"
          >
            Azi
          </button>
        </div>
        <span className="text-sm text-gray-400 font-medium">
          {formatDateRange(weekStart)}
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* Weekly grid */}
      {!loading && (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <div
              key={day.dateStr}
              className={`rounded-xl border p-3 min-h-[180px] flex flex-col transition ${
                day.isToday
                  ? "bg-brand-500/5 border-brand-500/20"
                  : "bg-white/[0.02] border-white/[0.06]"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className={`text-[10px] font-medium ${day.isToday ? "text-brand-400" : "text-gray-500"}`}>
                    {day.label}
                  </div>
                  <div className={`text-sm font-semibold ${day.isToday ? "text-white" : "text-gray-300"}`}>
                    {day.date.getDate()}
                  </div>
                </div>
                <button
                  onClick={() => openCreate(day.dateStr)}
                  className="p-1 rounded-md hover:bg-white/[0.06] text-gray-600 hover:text-brand-400 transition opacity-0 group-hover:opacity-100"
                  style={{ opacity: 1 }}
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
              {day.drafts.length === 0 && day.posts.length === 0 && (
                <button
                  onClick={() => openCreate(day.dateStr)}
                  className="flex-1 flex items-center justify-center text-gray-700 hover:text-brand-400 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && isEmpty && (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
          <CalendarCheck className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-white mb-1">
            Nicio postare programată
          </h3>
          <p className="text-xs text-gray-500 mb-4">
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
              className="px-4 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-sm font-medium transition"
            >
              Brain Dump
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <DraftModal
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
    </div>
  );
}
