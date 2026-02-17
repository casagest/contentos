"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  TrendingUp,
  Calendar,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  Globe,
  RotateCcw,
} from "lucide-react";

type Platform = "facebook" | "instagram" | "tiktok" | "youtube" | "twitter";
type ScrapeSource = "firecrawl" | "fallback";
type AnalysisMode = "ai" | "deterministic";

interface CompetitorAnalysis {
  id: string;
  url: string;
  username: string;
  platform: Platform;
  title?: string;
  description?: string;
  summary: string;
  contentStrategy: string;
  topTopics: string[];
  bestPostingTimes: string[];
  recommendations: string[];
  scrapeSource: ScrapeSource;
  mode: AnalysisMode;
  warning?: string;
  createdAt?: string;
  cached?: boolean;
}

interface SearchIdea {
  title: string;
  url: string;
  snippet: string;
}

const platformColors: Record<string, string> = {
  facebook: "bg-blue-500/10 text-blue-400",
  instagram: "bg-pink-500/10 text-pink-400",
  tiktok: "bg-gray-500/10 text-foreground/80",
  youtube: "bg-red-500/10 text-red-400",
  twitter: "bg-cyan-500/10 text-cyan-400",
};

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "link";
  }
}

function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ResearchPage() {
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState<Platform>("instagram");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ideaQuery, setIdeaQuery] = useState("");
  const [ideas, setIdeas] = useState<SearchIdea[]>([]);
  const [isSearchingIdeas, setIsSearchingIdeas] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return competitors;
    return competitors.filter((item) => {
      return (
        item.username.toLowerCase().includes(q) ||
        item.platform.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.topTopics.some((topic) => topic.toLowerCase().includes(q))
      );
    });
  }, [competitors, searchQuery]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch("/api/ai/research", { cache: "no-store" });
      const payload = (await response.json()) as {
        analyses?: CompetitorAnalysis[];
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Nu s-a putut incarca istoricul.");
        return;
      }

      setCompetitors(payload.analyses || []);
    } catch {
      setError("Nu s-a putut incarca istoricul de research.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const addCompetitor = async (forceRefresh = false) => {
    const url = newUrl.trim();
    if (!url || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          platform: newPlatform,
          forceRefresh,
        }),
      });

      const payload = (await response.json()) as Partial<CompetitorAnalysis> & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Analiza a esuat. Incearca din nou.");
        return;
      }

      const item: CompetitorAnalysis = {
        id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        username: payload.username || hostnameFromUrl(url),
        platform: (payload.platform as Platform) || newPlatform,
        title: payload.title,
        description: payload.description,
        summary: payload.summary || "Fara rezumat.",
        contentStrategy: payload.contentStrategy || "Fara analiza de strategie.",
        topTopics: payload.topTopics || [],
        bestPostingTimes: payload.bestPostingTimes || [],
        recommendations: payload.recommendations || [],
        scrapeSource: (payload.scrapeSource as ScrapeSource) || "fallback",
        mode: (payload.mode as AnalysisMode) || "deterministic",
        warning: payload.warning,
        cached: payload.cached,
        createdAt: new Date().toISOString(),
      };

      setCompetitors((prev) => [item, ...prev.filter((entry) => entry.id !== item.id)]);
      setNewUrl("");
      setShowAddForm(false);
    } catch {
      setError("Nu s-a putut contacta serverul.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshAnalysis = async (item: CompetitorAnalysis) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: item.url,
          platform: item.platform,
          forceRefresh: true,
        }),
      });

      const payload = (await response.json()) as Partial<CompetitorAnalysis> & {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error || "Reanaliza a esuat.");
        return;
      }

      setCompetitors((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                summary: payload.summary || entry.summary,
                contentStrategy: payload.contentStrategy || entry.contentStrategy,
                topTopics: payload.topTopics || entry.topTopics,
                bestPostingTimes: payload.bestPostingTimes || entry.bestPostingTimes,
                recommendations: payload.recommendations || entry.recommendations,
                scrapeSource: (payload.scrapeSource as ScrapeSource) || entry.scrapeSource,
                mode: (payload.mode as AnalysisMode) || entry.mode,
                warning: payload.warning,
                cached: payload.cached,
                createdAt: new Date().toISOString(),
              }
            : entry
        )
      );
    } catch {
      setError("Nu s-a putut reanaliza competitorul.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeCompetitor = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/research/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error || "Nu s-a putut sterge analiza.");
        return;
      }
      setCompetitors((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("Nu s-a putut sterge analiza.");
    }
  };

  const searchIdeas = async () => {
    const query = ideaQuery.trim();
    if (!query || isSearchingIdeas) return;

    setIsSearchingIdeas(true);
    setIdeasError(null);

    try {
      const response = await fetch("/api/scrape/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 8, lang: "ro" }),
      });

      const payload = (await response.json()) as {
        results?: SearchIdea[];
        error?: string;
      };

      if (!response.ok) {
        setIdeasError(payload.error || "Cautarea nu este disponibila acum.");
        setIdeas([]);
        return;
      }

      setIdeas(payload.results || []);
    } catch {
      setIdeasError("Nu s-a putut executa cautarea.");
      setIdeas([]);
    } finally {
      setIsSearchingIdeas(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Account Research</h1>
            <p className="text-muted-foreground text-sm">
              Analiza reala din URL-uri publice cu Firecrawl + AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadHistory()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-input hover:bg-accent text-xs text-white transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" /> Adauga competitor
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="rounded-xl bg-muted border border-brand-500/20 p-4 mb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL competitor (ex: https://site.ro/blog/postare)"
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addCompetitor(false);
                }
              }}
            />
            <select
              value={newPlatform}
              onChange={(e) => setNewPlatform(e.target.value as Platform)}
              className="bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="instagram" className="bg-gray-900">Instagram</option>
              <option value="facebook" className="bg-gray-900">Facebook</option>
              <option value="tiktok" className="bg-gray-900">TikTok</option>
              <option value="youtube" className="bg-gray-900">YouTube</option>
              <option value="twitter" className="bg-gray-900">X / Twitter</option>
            </select>
            <button
              onClick={() => void addCompetitor(false)}
              disabled={isAnalyzing}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition"
            >
              {isAnalyzing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Analizez...
                </span>
              ) : (
                "Analizeaza"
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

      <div className="rounded-xl bg-card border border-border p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            value={ideaQuery}
            onChange={(e) => setIdeaQuery(e.target.value)}
            placeholder="Cauta idei creative (ex: campanii stomatologie UK)"
            className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchIdeas();
              }
            }}
          />
          <button
            onClick={() => void searchIdeas()}
            disabled={isSearchingIdeas}
            className="px-4 py-2 rounded-lg bg-input hover:bg-accent disabled:opacity-50 text-white text-sm transition"
          >
            {isSearchingIdeas ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Caut...
              </span>
            ) : (
              "Cauta idei"
            )}
          </button>
        </div>

        {ideasError && <p className="text-xs text-amber-300 mt-2">{ideasError}</p>}

        {ideas.length > 0 && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {ideas.map((idea) => (
              <a
                key={idea.url}
                href={idea.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-border bg-card p-3 hover:border-brand-500/40 transition"
              >
                <div className="text-xs text-brand-300 mb-1 line-clamp-1">{idea.title}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-2">{idea.snippet}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cauta in analize..."
          className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loadingHistory ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Incarc istoricul...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl bg-card border border-border p-5 hover:border-border transition"
            >
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{item.username}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{hostnameFromUrl(item.url)}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${platformColors[item.platform]}`}
                    >
                      {item.platform}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-300 uppercase">
                      {item.mode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-input text-muted-foreground uppercase inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {item.scrapeSource}
                    </span>
                    {item.cached && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 uppercase">
                        cache
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => void refreshAnalysis(item)}
                    className="p-1 text-muted-foreground hover:text-brand-300 transition"
                    title="Reanalizeaza"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-muted-foreground hover:text-white transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => void removeCompetitor(item.id)}
                    className="p-1 text-muted-foreground hover:text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-foreground/80 leading-relaxed mb-3">{item.summary}</p>

              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Strategie
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.contentStrategy}</p>
              </div>

              {item.topTopics.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Topicuri principale
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.topTopics.slice(0, 6).map((topic) => (
                      <span
                        key={topic}
                        className="px-2 py-0.5 rounded text-[10px] bg-input text-foreground/80"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.bestPostingTimes.length > 0 && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Ore recomandate
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.bestPostingTimes.slice(0, 3).map((time) => (
                      <span
                        key={time}
                        className="px-2 py-0.5 rounded text-[10px] bg-brand-500/10 text-brand-300"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.recommendations.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Recomandari</div>
                  <ul className="space-y-1">
                    {item.recommendations.slice(0, 3).map((rec, index) => (
                      <li key={`${item.id}-rec-${index}`} className="text-xs text-muted-foreground leading-relaxed">
                        - {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(item.warning || item.createdAt) && (
                <div className="mt-3 text-[11px] text-muted-foreground">
                  {item.warning ? <div className="text-amber-300 mb-1">{item.warning}</div> : null}
                  {item.createdAt ? <div>Actualizat: {formatDate(item.createdAt)}</div> : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loadingHistory && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {searchQuery
            ? "Nu exista rezultate pentru cautarea curenta."
            : "Adauga un URL competitor pentru analiza reala a strategiei de continut."}
        </div>
      )}
    </div>
  );
}
