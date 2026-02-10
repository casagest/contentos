"use client";

import { useState } from "react";
import {
  Brain,
  Wand2,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const platformLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export default function BrainDumpPage() {
  const [dump, setDump] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<
    Record<string, { text: string; hashtags: string[] }> | null
  >(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<string, boolean>>({
    facebook: true,
    instagram: true,
    tiktok: true,
    youtube: true,
  });

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => ({ ...prev, [platform]: !prev[platform] }));
  };

  const processDump = () => {
    if (!dump.trim()) return;
    setIsProcessing(true);

    // Simulated processing (will connect to Claude API in production)
    setTimeout(() => {
      const allResults: Record<string, { text: string; hashtags: string[] }> = {
        facebook: {
          text: `Am avut o realizare importantă astăzi: ${dump.slice(0, 80)}...\n\nCe am învățat? Că cei mai buni creatori nu sunt perfecți — sunt consistenți.\n\nVoi? Ce v-a învățat ultima lună despre conținut?`,
          hashtags: [
            "#ContentCreator",
            "#SocialMedia",
            "#Romania",
            "#ContentTips",
          ],
        },
        instagram: {
          text: `Știi momentul ăla când totul face click?\n\n${dump.slice(0, 60)}...\n\nAm transformat această idee brută într-o lecție valoroasă.\n\nSalvează postarea dacă rezonezi.`,
          hashtags: [
            "#contentcreator",
            "#socialmedia",
            "#romania",
            "#instagramromania",
            "#creativitate",
          ],
        },
        tiktok: {
          text: `POV: Ai un brain dump și AI-ul îl transformă în conținut viral\n\n${dump.slice(0, 50)}...\n\n#fyp #romania #contentcreator`,
          hashtags: [
            "#fyp",
            "#romania",
            "#contentcreator",
            "#braindump",
            "#viral",
          ],
        },
        youtube: {
          text: `${dump.slice(0, 60)}... — Cum am transformat o idee brută într-o strategie de conținut\n\nÎn acest video vă arăt procesul meu de la Brain Dump la postare finală, optimizată pentru fiecare platformă.`,
          hashtags: [
            "#ContentStrategy",
            "#ContentCreator",
            "#YouTube",
            "#Romania",
          ],
        },
      };
      // Filter to only selected platforms
      const filtered: Record<string, { text: string; hashtags: string[] }> = {};
      for (const [key, value] of Object.entries(allResults)) {
        if (selectedPlatforms[key]) {
          filtered[key] = value;
        }
      }
      setResults(filtered);
      setIsProcessing(false);
    }, 2000);
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Brain Dump</h1>
          <p className="text-gray-400 text-sm">
            Aruncă gândurile brute, AI-ul le transformă în postări
          </p>
        </div>
      </div>

      {/* Input area */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Scrie tot ce-ți vine în minte
        </label>
        <textarea
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          placeholder="Aruncă gândurile aici..."
          rows={6}
          className="w-full bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none resize-none"
        />
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-xs text-gray-500 mr-1">Platforme:</span>
          {Object.entries(platformLabels).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedPlatforms[key]}
                onChange={() => togglePlatform(key)}
                className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] text-brand-600 focus:ring-brand-500/40 focus:ring-offset-0"
              />
              <span className="text-xs text-gray-400">{label}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-xs text-gray-500">
            {dump.length} caractere
          </span>
          <div className="flex gap-2">
            {dump.trim() && (
              <button
                onClick={() => {
                  setDump("");
                  setResults(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition"
              >
                <RotateCcw className="w-3 h-3" /> Resetează
              </button>
            )}
            <button
              onClick={processDump}
              disabled={!dump.trim() || isProcessing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium transition"
            >
              {isProcessing ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />{" "}
                  Procesează...
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" /> Procesează cu AI
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {!results ? (
        <div className="rounded-xl bg-white/[0.01] border border-dashed border-white/[0.06] p-10 text-center">
          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Scrie tot ce ai în minte — idei, note, fragmente de gânduri.
            AI-ul ContentOS va transforma totul în postări optimizate pentru
            Facebook, Instagram, TikTok și YouTube.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" /> Postări generate
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(results).map(([platform, data]) => (
              <div
                key={platform}
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">
                    {platformLabels[platform]}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${data.text}\n\n${data.hashtags.join(" ")}`,
                        platform
                      )
                    }
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.06] transition"
                  >
                    {copiedKey === platform ? (
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
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed mb-3">
                  {data.text}
                </p>
                <div className="flex flex-wrap gap-1">
                  {data.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <a
              href="/compose"
              className="inline-flex items-center gap-1 text-sm text-brand-400 hover:text-brand-300 transition"
            >
              Editează în Composer <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
