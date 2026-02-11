"use client";

import { useState } from "react";
import {
  PenTool,
  Copy,
  Check,
  Hash,
  AtSign,
  Smile,
  Image as ImageIcon,
  ChevronDown,
  Wand2,
  RotateCcw,
  Save,
} from "lucide-react";

const platforms = [
  { id: "facebook", label: "Facebook", color: "bg-blue-500" },
  { id: "instagram", label: "Instagram", color: "bg-pink-500" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-600" },
  { id: "youtube", label: "YouTube", color: "bg-red-500" },
];

const tones = [
  { id: "casual", label: "Casual" },
  { id: "professional", label: "Profesional" },
  { id: "funny", label: "Amuzant" },
  { id: "educational", label: "Educativ" },
  { id: "inspirational", label: "Inspirațional" },
];

export default function ComposePage() {
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "facebook",
  ]);
  const [tone, setTone] = useState("casual");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<
    Record<string, { text: string; hashtags: string[]; algorithmScore?: { overallScore: number; grade: string }; alternativeVersions: string[] }>
  >({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState<string | null>(null);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const generate = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: content,
          platforms: selectedPlatforms,
          tone,
          includeHashtags,
          includeEmoji,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Eroare la generare");
      }

      const data = await response.json();
      setGeneratedContent(data.platformVersions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, platform: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const saveDraft = async () => {
    if (Object.keys(generatedContent).length === 0) return;
    setSavingDraft(true);
    setDraftSaved(null);
    try {
      const firstPlatform = selectedPlatforms[0];
      const firstResult = generatedContent[firstPlatform];
      const body = firstResult?.text || content;
      const hashtags = firstResult?.hashtags || [];

      const platformVersions: Record<string, unknown> = {};
      const algorithmScores: Record<string, unknown> = {};
      for (const p of selectedPlatforms) {
        if (generatedContent[p]) {
          platformVersions[p] = { text: generatedContent[p].text, hashtags: generatedContent[p].hashtags };
          if (generatedContent[p].algorithmScore) {
            algorithmScores[p] = generatedContent[p].algorithmScore;
          }
        }
      }

      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.slice(0, 60).split("\n")[0],
          body,
          hashtags,
          target_platforms: selectedPlatforms,
          platform_versions: platformVersions,
          algorithm_scores: algorithmScores,
          source: "ai_generated",
        }),
      });

      if (res.ok) {
        setDraftSaved("Draft salvat! Mergi la Calendar pentru a programa.");
        setTimeout(() => setDraftSaved(null), 4000);
      }
    } catch {
      // silent
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <PenTool className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Content Composer</h1>
          <p className="text-gray-400 text-sm">
            Scrie o dată, optimizează pentru toate platformele
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input side */}
        <div className="space-y-4">
          {/* Content input */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conținutul tău
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrie ideea, mesajul sau textul brut aici..."
              rows={8}
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex gap-2">
                <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition">
                  <Hash className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition">
                  <AtSign className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition">
                  <Smile className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.04] transition">
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {content.length} caractere
              </span>
            </div>
          </div>

          {/* Platform selection */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Platforme țintă
            </label>
            <div className="flex flex-wrap gap-2">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    selectedPlatforms.includes(p.id)
                      ? "bg-white/[0.08] text-white border border-brand-500/30"
                      : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:border-white/[0.1]"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Opțiuni
            </label>
            <div className="space-y-3">
              {/* Tone */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Ton</span>
                <div className="relative">
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 pr-8 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    {tones.map((t) => (
                      <option key={t.id} value={t.id} className="bg-gray-900">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* Hashtags toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Include hashtag-uri</span>
                <button
                  onClick={() => setIncludeHashtags(!includeHashtags)}
                  className={`w-9 h-5 rounded-full transition ${
                    includeHashtags ? "bg-brand-600" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      includeHashtags ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>

              {/* Emoji toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Include emoji</span>
                <button
                  onClick={() => setIncludeEmoji(!includeEmoji)}
                  className={`w-9 h-5 rounded-full transition ${
                    includeEmoji ? "bg-brand-600" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      includeEmoji ? "translate-x-[18px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={
              !content.trim() || selectedPlatforms.length === 0 || isGenerating
            }
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium transition flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" /> Se generează...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" /> Generează conținut
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Output side */}
        <div className="space-y-4">
          {Object.keys(generatedContent).length === 0 ? (
            <div className="h-full flex items-center justify-center rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06] p-8 text-center">
              <div>
                <Wand2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Scrie conținut și apasă &quot;Generează&quot; pentru a vedea versiunile
                  optimizate per platformă.
                </p>
              </div>
            </div>
          ) : (
            <>
              {selectedPlatforms.map((platformId) => {
                const platform = platforms.find((p) => p.id === platformId);
                const result = generatedContent[platformId];
                if (!platform || !result) return null;
                return (
                  <div
                    key={platformId}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${platform.color}`}
                        />
                        <span className="text-sm font-medium text-white">
                          {platform.label}
                        </span>
                        {result.algorithmScore && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-gray-300">
                            {result.algorithmScore.grade} ({result.algorithmScore.overallScore})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(result.text, platformId)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition"
                      >
                        {copiedPlatform === platformId ? (
                          <>
                            <Check className="w-3 h-3 text-green-400" /> Copiat
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copiază
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {result.text}
                    </div>
                    {result.hashtags?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <p className="text-xs text-brand-400">
                          {result.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Save draft */}
              {draftSaved && (
                <div className="px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                  {draftSaved}
                </div>
              )}
              <button
                onClick={saveDraft}
                disabled={savingDraft}
                className="w-full py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white font-medium transition flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4 h-4" />
                {savingDraft ? "Se salvează..." : "Salvează ca Draft"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
