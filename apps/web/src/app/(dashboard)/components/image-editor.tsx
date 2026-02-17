"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Type,
  Download,
  RotateCcw,
  Square,
  Palette,
  Bold,
  AlignCenter,
  AlignLeft,
  Layers,
  X,
  Image as ImageIcon,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// IMAGE TEXT OVERLAY EDITOR
// Creates social media ready images with text overlay
// ═══════════════════════════════════════════════════════════════

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center";
  bgColor: string;
  bgOpacity: number;
}

interface ImageEditorProps {
  imageUrl?: string;
  width?: number;
  height?: number;
  onSave?: (dataUrl: string) => void;
  className?: string;
}

const PRESET_SIZES = [
  { label: "Post pătrat (1:1)", width: 1080, height: 1080 },
  { label: "Story/Reel (9:16)", width: 1080, height: 1920 },
  { label: "Portrait (4:5)", width: 1080, height: 1350 },
  { label: "Landscape (16:9)", width: 1920, height: 1080 },
  { label: "Thumbnail YT", width: 1280, height: 720 },
];

const PRESET_COLORS = [
  "#ffffff", "#000000", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4",
];

const PRESET_BG_COLORS = [
  "transparent", "#000000", "#ffffff", "#1e293b",
  "#0f172a", "#7c3aed", "#dc2626", "#059669",
];

export default function ImageEditor({
  imageUrl,
  width: initialWidth = 1080,
  height: initialHeight = 1080,
  onSave,
  className = "",
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(initialWidth);
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);
  const [bgColor, setBgColor] = useState("#1e293b");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // Load image if URL provided
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLoadedImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  const addTextOverlay = useCallback(() => {
    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      text: "Textul tău aici",
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      fontSize: 48,
      color: "#ffffff",
      fontWeight: "bold",
      textAlign: "center",
      bgColor: "#000000",
      bgOpacity: 0.5,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedId(newOverlay.id);
  }, [canvasWidth, canvasHeight]);

  const updateOverlay = useCallback((id: string, updates: Partial<TextOverlay>) => {
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  }, []);

  const removeOverlay = useCallback((id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const displayScale = 0.35;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.width = `${canvasWidth * displayScale}px`;
    canvas.style.height = `${canvasHeight * displayScale}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    if (loadedImage) {
      ctx.drawImage(loadedImage, 0, 0, canvasWidth, canvasHeight);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw overlays
    for (const overlay of overlays) {
      ctx.save();
      ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = overlay.textAlign;
      ctx.textBaseline = "middle";

      // Text background
      if (overlay.bgColor !== "transparent" && overlay.bgOpacity > 0) {
        const metrics = ctx.measureText(overlay.text);
        const padding = overlay.fontSize * 0.3;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = overlay.fontSize * 1.4;

        ctx.fillStyle = overlay.bgColor;
        ctx.globalAlpha = overlay.bgOpacity;
        const bgX = overlay.textAlign === "center" ? overlay.x - bgWidth / 2 : overlay.x - padding;
        ctx.fillRect(bgX, overlay.y - bgHeight / 2, bgWidth, bgHeight);
        ctx.globalAlpha = 1;
      }

      // Text with shadow
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, overlay.x, overlay.y);

      // Selection indicator
      if (overlay.id === selectedId) {
        ctx.strokeStyle = "#8b5cf6";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        const metrics = ctx.measureText(overlay.text);
        const w = metrics.width + 20;
        const h = overlay.fontSize * 1.6;
        const rx = overlay.textAlign === "center" ? overlay.x - w / 2 : overlay.x - 10;
        ctx.strokeRect(rx, overlay.y - h / 2, w, h);
      }

      ctx.restore();
    }
  }, [overlays, canvasWidth, canvasHeight, bgColor, loadedImage, selectedId]);

  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Re-render at full resolution without selection indicators
    const tempSelected = selectedId;
    setSelectedId(null);

    requestAnimationFrame(() => {
      const dataUrl = canvas.toDataURL("image/png");
      if (onSave) {
        onSave(dataUrl);
      } else {
        const link = document.createElement("a");
        link.download = `contentos-${canvasWidth}x${canvasHeight}.png`;
        link.href = dataUrl;
        link.click();
      }
      setSelectedId(tempSelected);
    });
  }, [selectedId, canvasWidth, canvasHeight, onSave]);

  const selectedOverlay = overlays.find((o) => o.id === selectedId);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={addTextOverlay}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 text-brand-300 border border-brand-500/30 hover:bg-brand-600/30 text-xs transition"
        >
          <Type className="w-3.5 h-3.5" /> Adaugă Text
        </button>

        {/* Size presets */}
        <select
          value={`${canvasWidth}x${canvasHeight}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split("x").map(Number);
            setCanvasWidth(w);
            setCanvasHeight(h);
          }}
          className="px-2 py-1.5 rounded-lg bg-muted border border-border text-xs text-foreground/80 focus:outline-none"
        >
          {PRESET_SIZES.map((s) => (
            <option key={`${s.width}x${s.height}`} value={`${s.width}x${s.height}`}>
              {s.label} ({s.width}×{s.height})
            </option>
          ))}
        </select>

        {!loadedImage && (
          <div className="flex items-center gap-1">
            <Palette className="w-3 h-3 text-muted-foreground" />
            {PRESET_BG_COLORS.filter((c) => c !== "transparent").map((color) => (
              <button
                key={color}
                onClick={() => setBgColor(color)}
                className={`w-5 h-5 rounded border-2 transition ${bgColor === color ? "border-white" : "border-transparent"}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={() => { setOverlays([]); setSelectedId(null); }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white transition"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
        <button
          onClick={exportImage}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs transition"
        >
          <Download className="w-3.5 h-3.5" /> Descarcă PNG
        </button>
      </div>

      {/* Canvas */}
      <div className="flex gap-4">
        <div className="rounded-xl bg-card border border-border p-2 overflow-auto">
          <canvas
            ref={canvasRef}
            onClick={(e) => {
              if (!selectedId) return;
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const scaleX = canvasWidth / rect.width;
              const scaleY = canvasHeight / rect.height;
              const x = (e.clientX - rect.left) * scaleX;
              const y = (e.clientY - rect.top) * scaleY;
              updateOverlay(selectedId, { x, y });
            }}
            className="cursor-crosshair"
          />
        </div>

        {/* Properties panel */}
        {selectedOverlay && (
          <div className="w-52 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground/80 flex items-center gap-1">
                <Layers className="w-3 h-3" /> Text Layer
              </span>
              <button onClick={() => removeOverlay(selectedOverlay.id)} className="text-muted-foreground hover:text-red-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <textarea
              value={selectedOverlay.text}
              onChange={(e) => updateOverlay(selectedOverlay.id, { text: e.target.value })}
              rows={2}
              className="w-full bg-muted border border-border rounded-lg p-2 text-xs text-white focus:outline-none resize-none"
            />

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-12">Mărime</label>
              <input
                type="range"
                min={16}
                max={120}
                value={selectedOverlay.fontSize}
                onChange={(e) => updateOverlay(selectedOverlay.id, { fontSize: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-6">{selectedOverlay.fontSize}</span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground w-12">Culoare</span>
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateOverlay(selectedOverlay.id, { color })}
                  className={`w-4 h-4 rounded-full border transition ${selectedOverlay.color === color ? "border-brand-400 scale-125" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => updateOverlay(selectedOverlay.id, { fontWeight: selectedOverlay.fontWeight === "bold" ? "normal" : "bold" })}
                className={`p-1.5 rounded-lg text-xs transition ${selectedOverlay.fontWeight === "bold" ? "bg-brand-600/20 text-brand-300" : "text-muted-foreground hover:text-white"}`}
              >
                <Bold className="w-3 h-3" />
              </button>
              <button
                onClick={() => updateOverlay(selectedOverlay.id, { textAlign: "left" })}
                className={`p-1.5 rounded-lg text-xs transition ${selectedOverlay.textAlign === "left" ? "bg-brand-600/20 text-brand-300" : "text-muted-foreground hover:text-white"}`}
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => updateOverlay(selectedOverlay.id, { textAlign: "center" })}
                className={`p-1.5 rounded-lg text-xs transition ${selectedOverlay.textAlign === "center" ? "bg-brand-600/20 text-brand-300" : "text-muted-foreground hover:text-white"}`}
              >
                <AlignCenter className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground w-12">Opacitate</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={selectedOverlay.bgOpacity}
                onChange={(e) => updateOverlay(selectedOverlay.id, { bgOpacity: Number(e.target.value) })}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {overlays.length === 0 && (
        <div className="text-center py-6">
          <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Click &quot;Adaugă Text&quot; pentru a suprapune text pe imagine</p>
          <p className="text-[10px] text-muted-foreground">Click pe canvas pentru a poziționa textul</p>
        </div>
      )}
    </div>
  );
}
