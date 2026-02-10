"use client";

import { useState } from "react";
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
} from "lucide-react";

interface SavedPost {
  id: string;
  platform: string;
  author: string;
  text: string;
  likes: number;
  comments: number;
  views: number;
  savedAt: string;
  tags: string[];
}

const demoSaved: SavedPost[] = [
  {
    id: "1",
    platform: "instagram",
    author: "@design.romania",
    text: "Cele 5 principii de design care mi-au transformat feed-ul. Thread",
    likes: 1200,
    comments: 89,
    views: 15000,
    savedAt: "2026-02-09",
    tags: ["design", "instagram", "tips"],
  },
  {
    id: "2",
    platform: "tiktok",
    author: "@marketing.pro",
    text: "Cum am crescut de la 0 la 10K followers în 30 de zile folosind doar conținut organic",
    likes: 3400,
    comments: 234,
    views: 89000,
    savedAt: "2026-02-08",
    tags: ["growth", "organic", "strategy"],
  },
  {
    id: "3",
    platform: "facebook",
    author: "Social Media Romania",
    text: "Engagement bait vs. engagement real. Ghid complet pentru creatorii români care vor rezultate pe termen lung.",
    likes: 456,
    comments: 67,
    views: 5600,
    savedAt: "2026-02-07",
    tags: ["engagement", "strategy", "longform"],
  },
];

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-gray-300",
  youtube: "bg-red-500/10 text-red-400",
};

export default function InspirationPage() {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>(demoSaved);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [filterTag, setFilterTag] = useState<string | null>(null);

  const allTags = Array.from(
    new Set(savedPosts.flatMap((p) => p.tags))
  ).sort();

  const filtered = filterTag
    ? savedPosts.filter((p) => p.tags.includes(filterTag))
    : savedPosts;

  const removePost = (id: string) => {
    setSavedPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const addFromUrl = () => {
    if (!newUrl.trim()) return;
    const newPost: SavedPost = {
      id: Date.now().toString(),
      platform: newUrl.includes("instagram")
        ? "instagram"
        : newUrl.includes("tiktok")
          ? "tiktok"
          : newUrl.includes("youtube")
            ? "youtube"
            : "facebook",
      author: "Link salvat",
      text: newUrl,
      likes: 0,
      comments: 0,
      views: 0,
      savedAt: new Date().toISOString().split("T")[0],
      tags: ["saved"],
    };
    setSavedPosts((prev) => [newPost, ...prev]);
    setNewUrl("");
    setShowAddForm(false);
  };

  const formatNumber = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Inspirație</h1>
            <p className="text-gray-400 text-sm">
              Salvează conținut inspirațional și repurposează cu AI
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Salvează postare
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl bg-white/[0.03] border border-brand-500/20 p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Lipește URL-ul postării sau notează ideea..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              onKeyDown={(e) => e.key === "Enter" && addFromUrl()}
            />
            <button
              onClick={addFromUrl}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
            >
              Salvează
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 text-gray-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setFilterTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs transition ${
              !filterTag
                ? "bg-brand-600/20 text-brand-300 border border-brand-500/30"
                : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
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
                  : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Saved posts */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
          <Bookmark className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Nicio postare salvată
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto">
            Salvează postări de la alți creatori pentru inspirație. Le poți
            repurposa cu AI direct din ContentOS.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.1] transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${platformColors[post.platform]}`}
                    >
                      {post.platform}
                    </span>
                    <span className="text-xs text-gray-500">
                      {post.author}
                    </span>
                    <span className="text-xs text-gray-600">
                      {post.savedAt}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">{post.text}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {formatNumber(post.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />{" "}
                      {formatNumber(post.comments)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {formatNumber(post.views)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="p-2 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-white/[0.04] transition">
                    <Wand2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removePost(post.id)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.04] transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-600 text-center mt-6">
        Datele sunt demo. Funcționalitatea completă de repurposing va fi
        disponibilă în curând.
      </p>
    </div>
  );
}
