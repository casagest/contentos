"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Bookmark,
  ExternalLink,
  Wand2,
  Plus,
  X,
  Heart,
  Eye,
  MessageCircle,
  Filter,
  Loader2,
  Globe,
  RotateCcw,
} from "lucide-react";

type ScrapeSource = "firecrawl" | "fallback" | "manual";

interface SavedPost {
  id: string;
  platform: string;
  author: string;
  text: string;
  title?: string;
  url?: string;
  likes: number;
  comments: number;
  views: number;
  savedAt: string;
  tags: string[];
  source: ScrapeSource;
}

interface InspirationsResponseItem {
  id: string;
  platform: string;
  url: string;
  authorUsername?: string;
  authorName?: string;
  text?: string;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  title?: string;
  source?: ScrapeSource;
  savedAt: string;
}

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-foreground/80",
  youtube: "bg-red-500/10 text-red-400",
  twitter: "bg-cyan-500/10 text-cyan-400",
  other: "bg-white/10 text-foreground/80",
};

function isLikelyUrl(value: string): boolean {
  const text = value.trim();
  return /^https?:\/\//i.test(text);
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "link";
  }
}

function inferPlatformFromUrl(url: string): string {
  const value = url.toLowerCase();
  if (value.includes("instagram")) return "instagram";
  if (value.includes("tiktok")) return "tiktok";
  if (value.includes("youtube") || value.includes("youtu.be")) return "youtube";
  if (value.includes("twitter") || value.includes("x.com")) return "twitter";
  if (value.includes("facebook")) return "facebook";
  return "other";
}

function extractTags(text: string): string[] {
  const words = text.toLowerCase().match(/\p{L}{4,}/gu) ?? [];
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);
}

function mapApiItemToSavedPost(item: InspirationsResponseItem): SavedPost {
  const date = new Date(item.savedAt);
  const savedAt = Number.isNaN(date.getTime())
    ? item.savedAt
    : date.toISOString().split("T")[0];

  return {
    id: item.id,
    platform: item.platform || "other",
    author: item.authorUsername || item.authorName || (item.url ? hostnameFromUrl(item.url) : "notita"),
    text: item.text || "",
    title: item.title,
    url: item.url,
    likes: item.likes || 0,
    comments: item.comments || 0,
    views: item.views || 0,
    savedAt,
    tags: item.tags || [],
    source: item.source || "manual",
  };
}

export default function InspirationPage() {
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInput, setNewInput] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allTags = useMemo(() => {
    return Array.from(new Set(savedPosts.flatMap((post) => post.tags))).sort();
  }, [savedPosts]);

  const filtered = filterTag
    ? savedPosts.filter((post) => post.tags.includes(filterTag))
    : savedPosts;

  const loadInspirations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inspirations", { cache: "no-store" });
      const payload = (await response.json()) as {
        inspirations?: InspirationsResponseItem[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Nu s-a putut incarca inspiratia.");
        return;
      }

      const mapped = (payload.inspirations || []).map(mapApiItemToSavedPost);
      setSavedPosts(mapped);
    } catch {
      setError("Nu s-a putut incarca inspiratia.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadInspirations();
  }, []);

  const removePost = async (id: string) => {
    try {
      const response = await fetch(`/api/inspirations/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error || "Nu s-a putut sterge inspiratia.");
        return;
      }
      setSavedPosts((prev) => prev.filter((post) => post.id !== id));
    } catch {
      setError("Nu s-a putut sterge inspiratia.");
    }
  };

  const addEntry = async () => {
    const input = newInput.trim();
    if (!input || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      if (isLikelyUrl(input)) {
        const scrapeResponse = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input, maxChars: 5000 }),
        });

        const scrapePayload = (await scrapeResponse.json()) as {
          content?: string;
          title?: string;
          source?: ScrapeSource;
          error?: string;
        };

        if (!scrapeResponse.ok || !scrapePayload.content) {
          setError(scrapePayload.error || "Nu am putut extrage continutul din URL.");
          return;
        }

        const platform = inferPlatformFromUrl(input);
        const text = scrapePayload.content.slice(0, 900);
        const tags = ["scraped", ...extractTags(text)].slice(0, 5);

        const createResponse = await fetch("/api/inspirations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            platformUrl: input,
            authorUsername: hostnameFromUrl(input),
            textContent: text,
            likesCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            commentsCount: 0,
            tags,
            title: scrapePayload.title,
            source: scrapePayload.source || "fallback",
          }),
        });

        const createPayload = (await createResponse.json()) as {
          id?: string;
          createdAt?: string;
          error?: string;
        };

        if (!createResponse.ok || !createPayload.id) {
          setError(createPayload.error || "Nu s-a putut salva inspiratia.");
          return;
        }

        const item: SavedPost = {
          id: createPayload.id,
          platform,
          author: hostnameFromUrl(input),
          text,
          title: scrapePayload.title,
          url: input,
          likes: 0,
          comments: 0,
          views: 0,
          savedAt: (createPayload.createdAt || new Date().toISOString()).split("T")[0],
          tags,
          source: scrapePayload.source || "fallback",
        };

        setSavedPosts((prev) => [item, ...prev]);
      } else {
        const tags = ["manual", ...extractTags(input)].slice(0, 5);

        const createResponse = await fetch("/api/inspirations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: "other",
            platformUrl: `note://${Date.now()}`,
            authorUsername: "notita",
            textContent: input,
            likesCount: 0,
            sharesCount: 0,
            viewsCount: 0,
            commentsCount: 0,
            tags,
            source: "manual",
          }),
        });

        const createPayload = (await createResponse.json()) as {
          id?: string;
          createdAt?: string;
          error?: string;
        };

        if (!createResponse.ok || !createPayload.id) {
          setError(createPayload.error || "Nu s-a putut salva intrarea.");
          return;
        }

        const item: SavedPost = {
          id: createPayload.id,
          platform: "other",
          author: "notita",
          text: input,
          likes: 0,
          comments: 0,
          views: 0,
          savedAt: (createPayload.createdAt || new Date().toISOString()).split("T")[0],
          tags,
          source: "manual",
        };

        setSavedPosts((prev) => [item, ...prev]);
      }

      setNewInput("");
      setShowAddForm(false);
    } catch {
      setError("Nu s-a putut salva intrarea.");
    } finally {
      setIsSaving(false);
    }
  };

  const repurposeWithAI = (post: SavedPost) => {
    const seed = post.title ? `${post.title}\n\n${post.text}` : post.text;
    sessionStorage.setItem("braindumpSeed", seed.slice(0, 3500));
    router.push("/braindump");
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <div>
      <div className="flex items-center justify-end mb-6 gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadInspirations()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-input hover:bg-accent text-xs text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Salveaza intrare
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="rounded-xl bg-muted border border-brand-500/20 p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="Lipeste URL-ul postarii sau scrie o idee..."
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addEntry();
                }
              }}
            />
            <button
              onClick={() => void addEntry()}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition"
            >
              {isSaving ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvez...
                </span>
              ) : (
                "Salveaza"
              )}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 text-muted-foreground hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs transition ${
              !filterTag
                ? "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                : "bg-card text-muted-foreground border border-border hover:border-border"
            }`}
          >
            Toate
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag === filterTag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs transition ${
                filterTag === tag
                  ? "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                  : "bg-card text-muted-foreground border border-border hover:border-border"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-muted-foreground text-sm">
          Incarc inspiratiile...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Bookmark className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Nicio intrare salvata</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Salveaza URL-uri publice (blog, articol, video) sau idei manuale. Le poti trimite
            instant in BrainDump pentru repurposing.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const color = platformColors[post.platform] || platformColors.other;
            return (
              <div
                key={post.id}
                className="rounded-xl bg-card border border-border p-4 hover:border-border transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${color}`}
                      >
                        {post.platform}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.author}</span>
                      <span className="text-xs text-muted-foreground">{post.savedAt}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-input text-muted-foreground uppercase inline-flex items-center gap-1">
                        <Globe className="w-3 h-3" /> {post.source}
                      </span>
                    </div>

                    {post.title ? (
                      <p className="text-sm text-brand-300 mb-1 line-clamp-1">{post.title}</p>
                    ) : null}

                    <p className="text-sm text-foreground/80 mb-3 whitespace-pre-wrap line-clamp-5">{post.text}</p>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {formatNumber(post.likes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {formatNumber(post.comments)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {formatNumber(post.views)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <span
                          key={`${post.id}-${tag}`}
                          className="px-2 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => repurposeWithAI(post)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-brand-400 hover:bg-muted transition"
                      title="Trimite in BrainDump"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>

                    {post.url ? (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-muted transition"
                        title="Deschide sursa"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : null}

                    <button
                      onClick={() => void removePost(post.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-muted transition"
                      title="Sterge"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
