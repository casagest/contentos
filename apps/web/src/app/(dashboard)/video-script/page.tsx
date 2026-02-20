"use client";

import { useState, useCallback } from "react";
import { safeErrorJson, safeResponseJson } from "@/lib/safe-json";
import {
  Film,
  Play,
  Clock,
  Camera,
  Music,
  Wrench,
  Lightbulb,
  Loader2,
  Copy,
  Check,
  Download,
} from "lucide-react";

interface ScriptSection {
  timestamp: string;
  type: "hook" | "content" | "cta" | "transition";
  visual: string;
  audio: string;
  textOverlay?: string;
  notes?: string;
}

interface VideoScript {
  title: string;
  sections: ScriptSection[];
  musicSuggestion?: string;
  equipmentNeeded?: string[];
  estimatedProductionTime?: string;
  tips?: string[];
}

const PLATFORMS = [
  { id: "tiktok", label: "TikTok", color: "bg-white" },
  { id: "instagram", label: "Instagram Reels", color: "bg-pink-500" },
  { id: "youtube", label: "YouTube Shorts", color: "bg-red-500" },
  { id: "facebook", label: "Facebook Reels", color: "bg-blue-500" },
];

const DURATIONS = [
  { id: "15s", label: "15 secunde" },
  { id: "30s", label: "30 secunde" },
  { id: "60s", label: "1 minut" },
  { id: "3min", label: "3 minute" },
  { id: "10min", label: "10 minute" },
];

const STYLES = [
  { id: "educational", label: "Educativ", emoji: "📚" },
  { id: "testimonial", label: "Testimonial", emoji: "🗣️" },
  { id: "behind-scenes", label: "Behind the Scenes", emoji: "🎬" },
  { id: "how-to", label: "How-To / Tutorial", emoji: "🔧" },
  { id: "storytelling", label: "Storytelling", emoji: "📖" },
  { id: "comparison", label: "Comparație", emoji: "⚖️" },
];

const TYPE_COLORS: Record<string, string> = {
  hook: "bg-red-500/20 text-red-300 border-red-500/30",
  content: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  cta: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  transition: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

export default function VideoScriptPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [duration, setDuration] = useState("60s");
  const [style, setStyle] = useState("educational");
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript] = useState<VideoScript | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setScript(null);

    try {
      const res = await fetch("/api/ai/video-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, duration, style }),
      });

      if (!res.ok) {
        throw new Error(await safeErrorJson(res));
      }

      const data = await safeResponseJson<{ script?: VideoScript }>(res);
      if (data.script?.sections) {
        setScript(data.script);
      } else {
        throw new Error("Răspuns invalid");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, platform, duration, style]);

  const copyFullScript = useCallback(() => {
    if (!script) return;
    const text = script.sections
      .map((s) => `[${s.timestamp}] ${s.type.toUpperCase()}\n🎥 ${s.visual}\n🎤 ${s.audio}${s.textOverlay ? `\n📝 ${s.textOverlay}` : ""}${s.notes ? `\n📌 ${s.notes}` : ""}`)
      .join("\n\n");
    navigator.clipboard.writeText(`${script.title}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [script]);

  const downloadScript = useCallback(() => {
    if (!script) return;
    const text = `# ${script.title}\n\nPlatformă: ${platform}\nDurată: ${duration}\nStil: ${style}\n\n` +
      script.sections.map((s) =>
        `## [${s.timestamp}] ${s.type.toUpperCase()}\n\n**Vizual:** ${s.visual}\n\n**Audio:** ${s.audio}\n${s.textOverlay ? `\n**Text overlay:** ${s.textOverlay}\n` : ""}${s.notes ? `\n**Note:** ${s.notes}\n` : ""}`
      ).join("\n---\n\n") +
      (script.musicSuggestion ? `\n\n## Muzică\n${script.musicSuggestion}` : "") +
      (script.tips ? `\n\n## Tips\n${script.tips.map((t) => `- ${t}`).join("\n")}` : "");

    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `script-${platform}-${Date.now()}.md`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [script, platform, duration, style]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Input form */}
      <div className="rounded-xl bg-card border border-border p-4 space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Subiect / Idee video</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: 5 trucuri de productivitate — explicat simplu in 60 de secunde"
            rows={3}
            className="w-full bg-transparent text-sm text-white placeholder:text-muted-foreground focus:outline-none resize-none border border-border rounded-lg p-3"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Platformă</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition ${
                    platform === p.id
                      ? "bg-accent text-white border-brand-500/30"
                      : "bg-card text-muted-foreground border-border hover:text-white"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Durată</label>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] border transition ${
                    duration === d.id
                      ? "bg-brand-600/20 text-brand-300 border-brand-500/40"
                      : "bg-card text-muted-foreground border-border hover:text-white"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Stil</label>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`px-2 py-1 rounded-lg text-[11px] border transition ${
                    style === s.id
                      ? "bg-brand-600/20 text-brand-300 border-brand-500/40"
                      : "bg-card text-muted-foreground border-border hover:text-white"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={!topic.trim() || isGenerating}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 text-white font-medium text-sm transition flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Se generează scriptul...</>
          ) : (
            <><Film className="w-4 h-4" /> Generează Script</>
          )}
        </button>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Generated script */}
      {script && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">{script.title}</h2>
            <div className="flex gap-2">
              <button onClick={copyFullScript} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-white bg-muted transition">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiat!" : "Copiază"}
              </button>
              <button onClick={downloadScript} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-white bg-muted transition">
                <Download className="w-3 h-3" /> .md
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            {script.sections.map((section, i) => (
              <div key={i} className={`rounded-xl border p-3 space-y-2 ${TYPE_COLORS[section.type] || "bg-card border-border"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-medium">{section.timestamp}</span>
                  <span className="text-[10px] uppercase tracking-wider font-bold">{section.type}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-start gap-1.5">
                    <Camera className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                    <p className="text-xs">{section.visual}</p>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Play className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                    <p className="text-xs font-medium">{section.audio}</p>
                  </div>
                </div>
                {section.textOverlay && (
                  <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                    📝 Text overlay: <span className="font-medium">&ldquo;{section.textOverlay}&rdquo;</span>
                  </div>
                )}
                {section.notes && (
                  <div className="text-[10px] opacity-60 italic">📌 {section.notes}</div>
                )}
              </div>
            ))}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {script.musicSuggestion && (
              <div className="rounded-lg bg-card border border-border p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Music className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Muzică</span>
                </div>
                <p className="text-xs text-foreground/80">{script.musicSuggestion}</p>
              </div>
            )}
            {script.equipmentNeeded && script.equipmentNeeded.length > 0 && (
              <div className="rounded-lg bg-card border border-border p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Echipament</span>
                </div>
                <p className="text-xs text-foreground/80">{script.equipmentNeeded.join(", ")}</p>
              </div>
            )}
            {script.estimatedProductionTime && (
              <div className="rounded-lg bg-card border border-border p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Timp producție</span>
                </div>
                <p className="text-xs text-foreground/80">{script.estimatedProductionTime}</p>
              </div>
            )}
          </div>

          {script.tips && script.tips.length > 0 && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-medium text-amber-300 uppercase tracking-wider">Tips</span>
              </div>
              <ul className="space-y-1">
                {script.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
