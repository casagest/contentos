"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Type,
  Download,
  RotateCcw,
  Palette,
  Bold,
  AlignCenter,
  AlignLeft,
  Image as ImageIcon,
  Sparkles,
  Quote,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// QUOTE CARD MAKER
// Creates Instagram-ready quote cards with pre-built templates.
// One-click export at 1080×1080 for social media.
// ═══════════════════════════════════════════════════════════════

interface QuoteTemplate {
  id: string;
  name: string;
  bgType: "gradient" | "solid";
  bgValue: string; // CSS gradient or color
  textColor: string;
  accentColor: string;
  authorColor: string;
  fontStyle: "serif" | "sans";
  layout: "centered" | "left-aligned" | "bottom-heavy";
  icon: string;
}

const TEMPLATES: QuoteTemplate[] = [
  {
    id: "dark-orange",
    name: "Brand ContentOS",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #0F1728 0%, #1a1f3a 50%, #0F1728 100%)",
    textColor: "#ffffff",
    accentColor: "#F97316",
    authorColor: "#F97316",
    fontStyle: "sans",
    layout: "centered",
    icon: "🔥",
  },
  {
    id: "minimal-light",
    name: "Minimal Alb",
    bgType: "solid",
    bgValue: "#fafafa",
    textColor: "#1a1a1a",
    accentColor: "#6366f1",
    authorColor: "#6b7280",
    fontStyle: "serif",
    layout: "centered",
    icon: "✨",
  },
  {
    id: "deep-purple",
    name: "Purple Gradient",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #2e1065 100%)",
    textColor: "#f5f3ff",
    accentColor: "#a78bfa",
    authorColor: "#c4b5fd",
    fontStyle: "sans",
    layout: "centered",
    icon: "💜",
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    bgType: "gradient",
    bgValue: "linear-gradient(180deg, #0c4a6e 0%, #0369a1 50%, #075985 100%)",
    textColor: "#ffffff",
    accentColor: "#38bdf8",
    authorColor: "#7dd3fc",
    fontStyle: "sans",
    layout: "left-aligned",
    icon: "🌊",
  },
  {
    id: "sunset-warm",
    name: "Sunset Cald",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #7c2d12 0%, #c2410c 40%, #ea580c 100%)",
    textColor: "#fff7ed",
    accentColor: "#fdba74",
    authorColor: "#fed7aa",
    fontStyle: "serif",
    layout: "bottom-heavy",
    icon: "🌅",
  },
  {
    id: "forest-green",
    name: "Forest Green",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #052e16 0%, #166534 50%, #14532d 100%)",
    textColor: "#f0fdf4",
    accentColor: "#4ade80",
    authorColor: "#86efac",
    fontStyle: "sans",
    layout: "centered",
    icon: "🌿",
  },
  {
    id: "noir",
    name: "Noir Elegant",
    bgType: "solid",
    bgValue: "#0a0a0a",
    textColor: "#e5e5e5",
    accentColor: "#fbbf24",
    authorColor: "#a3a3a3",
    fontStyle: "serif",
    layout: "centered",
    icon: "🖤",
  },
  {
    id: "rose-gold",
    name: "Rose Gold",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #1c1917 0%, #44403c 50%, #292524 100%)",
    textColor: "#fecdd3",
    accentColor: "#fb7185",
    authorColor: "#fda4af",
    fontStyle: "serif",
    layout: "bottom-heavy",
    icon: "🌹",
  },
];

const CANVAS_SIZE = 1080;

interface ImageEditorProps {
  imageUrl?: string;
  width?: number;
  height?: number;
  onSave?: (dataUrl: string) => void;
  className?: string;
}

export default function ImageEditor({
  onSave,
  className = "",
}: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quoteText, setQuoteText] = useState("Scrie citatul tău aici...");
  const [authorText, setAuthorText] = useState("— Numele tău");
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate>(TEMPLATES[0]);
  const [fontSize, setFontSize] = useState(52);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("bold");
  const [textAlign, setTextAlign] = useState<"left" | "center">("center");
  const [showWatermark, setShowWatermark] = useState(true);

  // ── Render Canvas ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = 1; // Always render at 1080px
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;

    const displayScale = 0.38;
    canvas.style.width = `${CANVAS_SIZE * displayScale}px`;
    canvas.style.height = `${CANVAS_SIZE * displayScale}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // ── Background ──
    if (selectedTemplate.bgType === "gradient") {
      drawCSSGradient(ctx, selectedTemplate.bgValue, CANVAS_SIZE, CANVAS_SIZE);
    } else {
      ctx.fillStyle = selectedTemplate.bgValue;
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }

    // ── Decorative accent lines ──
    ctx.save();
    ctx.strokeStyle = selectedTemplate.accentColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 3;

    if (selectedTemplate.layout === "centered") {
      // Top and bottom accent lines
      const lineW = 120;
      ctx.beginPath();
      ctx.moveTo(CANVAS_SIZE / 2 - lineW / 2, 180);
      ctx.lineTo(CANVAS_SIZE / 2 + lineW / 2, 180);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CANVAS_SIZE / 2 - lineW / 2, CANVAS_SIZE - 180);
      ctx.lineTo(CANVAS_SIZE / 2 + lineW / 2, CANVAS_SIZE - 180);
      ctx.stroke();
    } else if (selectedTemplate.layout === "left-aligned") {
      // Left accent bar
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, 200);
      ctx.lineTo(80, CANVAS_SIZE - 250);
      ctx.stroke();
    }
    ctx.restore();

    // ── Quote mark ──
    ctx.save();
    ctx.fillStyle = selectedTemplate.accentColor;
    ctx.globalAlpha = 0.15;
    const quoteFont = selectedTemplate.fontStyle === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : "Inter, system-ui, sans-serif";
    ctx.font = `bold 200px ${quoteFont}`;
    ctx.textAlign = "center";

    const openQuote = "\u201C"; // "
    if (selectedTemplate.layout === "centered") {
      ctx.fillText(openQuote, CANVAS_SIZE / 2, 280);
    } else if (selectedTemplate.layout === "left-aligned") {
      ctx.textAlign = "left";
      ctx.fillText(openQuote, 60, 300);
    } else {
      ctx.fillText(openQuote, CANVAS_SIZE / 2, 240);
    }
    ctx.restore();

    // ── Quote text ──
    const font = selectedTemplate.fontStyle === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : "Inter, system-ui, sans-serif";

    ctx.fillStyle = selectedTemplate.textColor;
    ctx.font = `${fontWeight} ${fontSize}px ${font}`;
    ctx.textAlign = textAlign;

    const padding = selectedTemplate.layout === "left-aligned" ? 120 : 100;
    const maxWidth = CANVAS_SIZE - padding * 2;
    const lines = wrapText(ctx, quoteText, maxWidth);
    const lineHeight = fontSize * 1.45;

    let startY: number;
    if (selectedTemplate.layout === "bottom-heavy") {
      startY = CANVAS_SIZE - 280 - lines.length * lineHeight;
    } else {
      startY = (CANVAS_SIZE - lines.length * lineHeight) / 2;
    }

    const textX = textAlign === "center"
      ? CANVAS_SIZE / 2
      : selectedTemplate.layout === "left-aligned"
        ? padding + 10
        : padding;

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, startY + i * lineHeight);
    }

    // ── Author ──
    if (authorText.trim()) {
      ctx.fillStyle = selectedTemplate.authorColor;
      ctx.font = `normal ${Math.round(fontSize * 0.45)}px ${font}`;
      ctx.textAlign = textAlign;
      const authorY = selectedTemplate.layout === "bottom-heavy"
        ? CANVAS_SIZE - 160
        : startY + lines.length * lineHeight + fontSize * 0.8;
      ctx.fillText(authorText, textX, authorY);
    }

    // ── Watermark ──
    if (showWatermark) {
      ctx.fillStyle = selectedTemplate.textColor;
      ctx.globalAlpha = 0.15;
      ctx.font = `500 16px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("contentos.ro", CANVAS_SIZE / 2, CANVAS_SIZE - 30);
      ctx.globalAlpha = 1;
    }
  }, [quoteText, authorText, selectedTemplate, fontSize, fontWeight, textAlign, showWatermark]);

  // ── Export ──
  const exportImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (onSave) {
      onSave(dataUrl);
    } else {
      const link = document.createElement("a");
      link.download = `quote-card-${selectedTemplate.id}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    }
  }, [selectedTemplate, onSave]);

  const reset = useCallback(() => {
    setQuoteText("Scrie citatul tău aici...");
    setAuthorText("— Numele tău");
    setFontSize(52);
    setFontWeight("bold");
    setTextAlign("center");
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Quote className="w-5 h-5 text-orange-400" />
        <div>
          <h2 className="text-sm font-semibold text-white">Quote Card Maker</h2>
          <p className="text-[10px] text-muted-foreground">
            Creează carduri vizuale pentru Instagram, Facebook, LinkedIn — export 1080×1080
          </p>
        </div>
      </div>

      {/* Template selector */}
      <div>
        <label className="block text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">
          Template
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t)}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition ${
                selectedTemplate.id === t.id
                  ? "border-orange-500/40 bg-orange-500/10 text-orange-300"
                  : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.05] hover:text-white"
              }`}
              title={t.name}
            >
              <span className="text-lg">{t.icon}</span>
              <span className="truncate w-full text-center">{t.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        {/* Canvas preview */}
        <div className="rounded-xl bg-black/20 border border-white/[0.06] p-3 flex-shrink-0">
          <canvas ref={canvasRef} className="rounded-lg" />
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Quote input */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              Citat / Text
            </label>
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              rows={4}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-2.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/30 resize-none"
              placeholder="Scrie citatul sau mesajul tău..."
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
              Autor / Brand
            </label>
            <input
              type="text"
              value={authorText}
              onChange={(e) => setAuthorText(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-orange-500/30"
              placeholder="— Numele tău sau brand-ul"
            />
          </div>

          {/* Font controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Type className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <input
                type="range"
                min={28}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-[10px] text-muted-foreground w-6">{fontSize}</span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
                className={`p-1.5 rounded-lg transition ${
                  fontWeight === "bold"
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign("left")}
                className={`p-1.5 rounded-lg transition ${
                  textAlign === "left"
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="Aliniere stânga"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTextAlign("center")}
                className={`p-1.5 rounded-lg transition ${
                  textAlign === "center"
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-muted-foreground hover:text-white"
                }`}
                title="Centrat"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Watermark toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWatermark}
              onChange={(e) => setShowWatermark(e.target.checked)}
              className="rounded border-white/20 bg-white/[0.04] text-orange-500 focus:ring-orange-500/30"
            />
            <span className="text-[10px] text-muted-foreground">
              Watermark contentos.ro
            </span>
          </label>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={exportImage}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-orange-500 text-white text-xs font-medium hover:from-orange-500 hover:to-orange-400 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Descarcă PNG (1080×1080)
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] text-muted-foreground text-xs hover:text-white hover:bg-white/[0.04] transition"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* AI suggestion */}
      <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[10px] font-medium text-orange-300 uppercase tracking-wider">
            Tip
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Quote card-urile cu citatul tău personal + culori de brand performează cu <strong className="text-white">3.4x mai multe salvări</strong> decât
          postările text simple pe Instagram. Ideal pentru carousel-uri educative, stories cu tips, sau LinkedIn posts.
        </p>
      </div>
    </div>
  );
}

// ─── Canvas Helpers ─────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

function drawCSSGradient(
  ctx: CanvasRenderingContext2D,
  cssGradient: string,
  width: number,
  height: number
) {
  // Parse simple linear-gradient
  const angleMatch = cssGradient.match(/(\d+)deg/);
  const angle = angleMatch ? parseInt(angleMatch[1]) * (Math.PI / 180) : Math.PI / 4;

  const colorStops = cssGradient.match(/#[0-9a-fA-F]{6}\s+\d+%/g) || [];
  const parsed = colorStops.map((stop) => {
    const [color, pct] = stop.split(/\s+/);
    return { color, offset: parseInt(pct) / 100 };
  });

  if (parsed.length < 2) {
    // Fallback
    ctx.fillStyle = "#0F1728";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const cx = width / 2;
  const cy = height / 2;
  const len = Math.sqrt(width * width + height * height) / 2;
  const x0 = cx - Math.cos(angle) * len;
  const y0 = cy - Math.sin(angle) * len;
  const x1 = cx + Math.cos(angle) * len;
  const y1 = cy + Math.sin(angle) * len;

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const { color, offset } of parsed) {
    gradient.addColorStop(offset, color);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}
