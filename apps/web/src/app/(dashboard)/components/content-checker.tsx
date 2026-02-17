"use client";

import { useState } from "react";
import {
  Shield,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Ruler,
  Smartphone,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// PLATFORM MEDIA SPECS
// ═══════════════════════════════════════════════════════════════

export const PLATFORM_SPECS: Record<string, {
  label: string;
  maxChars: number;
  idealChars: [number, number];
  maxHashtags: number;
  idealHashtags: [number, number];
  imageFormats: string[];
  imageSizes: { type: string; size: string; ratio: string }[];
  videoFormats: string[];
  videoSpecs: { type: string; duration: string; ratio: string }[];
  tips: string[];
}> = {
  facebook: {
    label: "Facebook",
    maxChars: 63206,
    idealChars: [40, 280],
    maxHashtags: 30,
    idealHashtags: [2, 5],
    imageFormats: ["JPG", "PNG", "WebP", "GIF"],
    imageSizes: [
      { type: "Post pătrat", size: "1080×1080", ratio: "1:1" },
      { type: "Post landscape", size: "1200×630", ratio: "1.91:1" },
      { type: "Story/Reel", size: "1080×1920", ratio: "9:16" },
      { type: "Cover photo", size: "820×312", ratio: "2.63:1" },
    ],
    videoFormats: ["MP4", "MOV"],
    videoSpecs: [
      { type: "Feed video", duration: "1s–240min", ratio: "1:1 sau 16:9" },
      { type: "Reel", duration: "3s–90s", ratio: "9:16" },
      { type: "Story", duration: "1s–60s", ratio: "9:16" },
    ],
    tips: [
      "Postările cu 1-2 emoji au +25% engagement",
      "Întrebările generează de 2x mai multe comentarii",
      "Video nativ > link YouTube (10x reach)",
    ],
  },
  instagram: {
    label: "Instagram",
    maxChars: 2200,
    idealChars: [70, 200],
    maxHashtags: 30,
    idealHashtags: [8, 15],
    imageFormats: ["JPG", "PNG", "WebP"],
    imageSizes: [
      { type: "Post pătrat", size: "1080×1080", ratio: "1:1" },
      { type: "Post portrait", size: "1080×1350", ratio: "4:5" },
      { type: "Story/Reel", size: "1080×1920", ratio: "9:16" },
      { type: "Carousel", size: "1080×1080", ratio: "1:1" },
    ],
    videoFormats: ["MP4", "MOV"],
    videoSpecs: [
      { type: "Reel", duration: "3s–90s", ratio: "9:16" },
      { type: "Feed video", duration: "3s–60s", ratio: "1:1 sau 4:5" },
      { type: "Story", duration: "1s–60s", ratio: "9:16" },
    ],
    tips: [
      "Carousel = cel mai mare reach organic",
      "Prima linie din caption decide dacă citesc mai departe",
      "Hashtag-urile în comentariu funcționează la fel de bine",
    ],
  },
  tiktok: {
    label: "TikTok",
    maxChars: 4000,
    idealChars: [50, 150],
    maxHashtags: 100,
    idealHashtags: [3, 8],
    imageFormats: ["JPG", "PNG", "WebP"],
    imageSizes: [
      { type: "Photo post", size: "1080×1920", ratio: "9:16" },
    ],
    videoFormats: ["MP4", "MOV", "WebM"],
    videoSpecs: [
      { type: "Video standard", duration: "3s–10min", ratio: "9:16" },
      { type: "Photo slideshow", duration: "Auto", ratio: "9:16" },
    ],
    tips: [
      "Hook în primele 1-3 secunde = totul",
      "Text overlay > caption (mulți nu citesc caption)",
      "Trending sounds = 2-5x reach",
    ],
  },
  youtube: {
    label: "YouTube",
    maxChars: 5000,
    idealChars: [200, 500],
    maxHashtags: 60,
    idealHashtags: [3, 8],
    imageFormats: ["JPG", "PNG"],
    imageSizes: [
      { type: "Thumbnail", size: "1280×720", ratio: "16:9" },
      { type: "Banner", size: "2560×1440", ratio: "16:9" },
    ],
    videoFormats: ["MP4", "MOV", "AVI", "WMV"],
    videoSpecs: [
      { type: "Video lung", duration: "1min–12h", ratio: "16:9" },
      { type: "Short", duration: "15s–60s", ratio: "9:16" },
    ],
    tips: [
      "Thumbnail custom = +30% CTR",
      "Primele 30 sec decid dacă rămân",
      "Descrierea cu timestamps = mai multe views",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════
// CMSR COMPLIANCE RULES (Colegiul Medicilor Stomatologi România)
// ═══════════════════════════════════════════════════════════════

interface ComplianceIssue {
  severity: "error" | "warning";
  rule: string;
  match: string;
  suggestion: string;
}

const CMSR_RULES: {
  pattern: RegExp;
  severity: "error" | "warning";
  rule: string;
  suggestion: string;
}[] = [
  {
    pattern: /\bcel mai bun\b/gi,
    severity: "error",
    rule: "Superlative absolute interzise (CMSR Art. 45)",
    suggestion: "Înlocuiește cu 'experiență de top' sau 'rezultate excelente'",
  },
  {
    pattern: /\bsingurul?\b(?:\s+\w+){0,3}\s+(?:din|care)/gi,
    severity: "error",
    rule: "Afirmații de unicitate interzise (CMSR)",
    suggestion: "Reformulează fără a pretinde exclusivitate",
  },
  {
    pattern: /\bnumărul 1\b|\b#1\b|\bnr\.?\s*1\b/gi,
    severity: "error",
    rule: "Clasamente neautorizate interzise (CMSR)",
    suggestion: "Elimină referința la clasament",
  },
  {
    pattern: /\b(?:reducere|discount|promoție)\s*(?:la|de|pe)\s*(?:\d+|tratament|implant|albire|coroană)/gi,
    severity: "error",
    rule: "Reduceri la acte medicale interzise (CMSR Art. 46)",
    suggestion: "Folosește: 'consultație gratuită' sau 'plan de tratament fără obligații'",
  },
  {
    pattern: /\bgarant(?:ăm|at|ăm|ez)\b/gi,
    severity: "error",
    rule: "Garanții de rezultat interzise (CMSR)",
    suggestion: "Adaugă: 'Rezultatele pot varia de la pacient la pacient'",
  },
  {
    pattern: /\b(?:fără durere|indolor|nedureros)\b/gi,
    severity: "warning",
    rule: "Promisiuni de confort trebuie nuanțate",
    suggestion: "Adaugă: 'disconfort minim' sau 'anestezie locală pentru confort maxim'",
  },
  {
    pattern: /\bbefore\s*(?:&|and|și|\/)\s*after\b/gi,
    severity: "warning",
    rule: "Before/After necesită consimțământ GDPR scris",
    suggestion: "Adaugă: 'Imagini publicate cu acordul scris al pacientului'",
  },
  {
    pattern: /\b(?:mai bun|mai ieftin|mai rapid)\s+(?:decât|ca|față de)\b/gi,
    severity: "error",
    rule: "Comparații cu alți medici/clinici interzise (CMSR)",
    suggestion: "Elimină comparația directă",
  },
  {
    pattern: /\btestimonial\b/gi,
    severity: "warning",
    rule: "Testimonialele necesită consimțământ GDPR",
    suggestion: "Asigură-te că ai formular de consimțământ semnat",
  },
];

export function checkCMSRCompliance(text: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  for (const rule of CMSR_RULES) {
    const matches = text.match(rule.pattern);
    if (matches) {
      for (const match of matches) {
        issues.push({
          severity: rule.severity,
          rule: rule.rule,
          match,
          suggestion: rule.suggestion,
        });
      }
    }
  }
  return issues;
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM FIT CHECK
// ═══════════════════════════════════════════════════════════════

interface FitResult {
  platform: string;
  score: number;
  checks: { label: string; status: "ok" | "warn" | "error"; detail: string }[];
}

export function checkPlatformFit(text: string, hashtags: string[], platform: string): FitResult {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) return { platform, score: 50, checks: [] };

  const checks: FitResult["checks"] = [];
  let score = 100;

  // Character count
  const charCount = text.length;
  if (charCount > spec.maxChars) {
    checks.push({ label: "Lungime text", status: "error", detail: `${charCount}/${spec.maxChars} caractere — depășit!` });
    score -= 30;
  } else if (charCount < spec.idealChars[0]) {
    checks.push({ label: "Lungime text", status: "warn", detail: `${charCount} caractere — prea scurt (ideal: ${spec.idealChars[0]}-${spec.idealChars[1]})` });
    score -= 10;
  } else if (charCount > spec.idealChars[1]) {
    checks.push({ label: "Lungime text", status: "warn", detail: `${charCount} caractere — lung (ideal: ${spec.idealChars[0]}-${spec.idealChars[1]})` });
    score -= 5;
  } else {
    checks.push({ label: "Lungime text", status: "ok", detail: `${charCount} caractere ✓` });
  }

  // Hashtag count
  const hashCount = hashtags.length;
  if (hashCount > spec.maxHashtags) {
    checks.push({ label: "Hashtag-uri", status: "error", detail: `${hashCount}/${spec.maxHashtags} — prea multe!` });
    score -= 20;
  } else if (hashCount < spec.idealHashtags[0]) {
    checks.push({ label: "Hashtag-uri", status: "warn", detail: `${hashCount} — adaugă ${spec.idealHashtags[0] - hashCount} (ideal: ${spec.idealHashtags[0]}-${spec.idealHashtags[1]})` });
    score -= 5;
  } else if (hashCount > spec.idealHashtags[1]) {
    checks.push({ label: "Hashtag-uri", status: "warn", detail: `${hashCount} — cam multe (ideal: ${spec.idealHashtags[0]}-${spec.idealHashtags[1]})` });
    score -= 5;
  } else {
    checks.push({ label: "Hashtag-uri", status: "ok", detail: `${hashCount} hashtag-uri ✓` });
  }

  // Emoji check
  const emojiCount = (text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || []).length;
  if (emojiCount === 0) {
    checks.push({ label: "Emoji", status: "warn", detail: "Fără emoji — adaugă 1-3 pentru engagement" });
    score -= 5;
  } else if (emojiCount > 10) {
    checks.push({ label: "Emoji", status: "warn", detail: `${emojiCount} emoji — prea multe, pare spam` });
    score -= 5;
  } else {
    checks.push({ label: "Emoji", status: "ok", detail: `${emojiCount} emoji ✓` });
  }

  // CTA check
  const hasCTA = /(?:link|click|apasă|programează|sună|scrie|contactează|vezi|descoperă|încearcă|comentează|distribuie|share|dm|mesaj|link in bio)/i.test(text);
  if (!hasCTA) {
    checks.push({ label: "Call-to-Action", status: "warn", detail: "Lipsește CTA — adaugă un îndemn la acțiune" });
    score -= 10;
  } else {
    checks.push({ label: "Call-to-Action", status: "ok", detail: "CTA prezent ✓" });
  }

  // First line hook
  const firstLine = text.split("\n")[0] || "";
  if (firstLine.length > 100) {
    checks.push({ label: "Hook (prima linie)", status: "warn", detail: "Prima linie prea lungă — scurtează sub 100 caractere" });
    score -= 5;
  } else if (firstLine.length < 10) {
    checks.push({ label: "Hook (prima linie)", status: "warn", detail: "Prima linie prea scurtă — captează atenția" });
    score -= 5;
  } else {
    checks.push({ label: "Hook (prima linie)", status: "ok", detail: "Prima linie OK ✓" });
  }

  return { platform, score: Math.max(0, Math.min(100, score)), checks };
}

// ═══════════════════════════════════════════════════════════════
// CONTENT CHECKER PANEL COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ContentCheckerProps {
  text: string;
  hashtags?: string[];
  platforms: string[];
  isDental?: boolean;
  className?: string;
}

export default function ContentChecker({ text, hashtags = [], platforms, isDental, className = "" }: ContentCheckerProps) {
  const [expanded, setExpanded] = useState(true);

  if (!text.trim()) return null;

  const compliance = isDental ? checkCMSRCompliance(text) : [];
  const fits = platforms.map((p) => checkPlatformFit(text, hashtags, p));
  const hasErrors = compliance.some((c) => c.severity === "error");
  const hasWarnings = compliance.some((c) => c.severity === "warning");

  return (
    <div className={`rounded-xl bg-white/[0.02] border border-white/[0.06] overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${hasErrors ? "text-red-400" : hasWarnings ? "text-yellow-400" : "text-emerald-400"}`} />
          <span className="text-sm font-medium text-white">Verificare Conținut</span>
          {compliance.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${hasErrors ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>
              {compliance.length} {compliance.length === 1 ? "problemă" : "probleme"}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* CMSR Compliance */}
          {isDental && compliance.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Conformitate CMSR</p>
              {compliance.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                  issue.severity === "error" ? "bg-red-500/10 border border-red-500/20" :
                  issue.severity === "warning" ? "bg-yellow-500/10 border border-yellow-500/20" :
                  "bg-blue-500/10 border border-blue-500/20"
                }`}>
                  {issue.severity === "error" ? <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" /> :
                   issue.severity === "warning" ? <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" /> :
                   <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                  <div>
                    <p className={`font-medium ${issue.severity === "error" ? "text-red-300" : "text-yellow-300"}`}>
                      &ldquo;{issue.match}&rdquo; — {issue.rule}
                    </p>
                    <p className="text-gray-400 mt-0.5">💡 {issue.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isDental && compliance.length === 0 && text.length > 20 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-300">Conformitate CMSR OK ✓</span>
            </div>
          )}

          {/* Platform Fit */}
          {fits.map((fit) => (
            <div key={fit.platform} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  {PLATFORM_SPECS[fit.platform]?.label || fit.platform}
                </p>
                <span className={`text-xs font-bold ${fit.score >= 80 ? "text-emerald-400" : fit.score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {fit.score}/100
                </span>
              </div>
              {fit.checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  {check.status === "ok" ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> :
                   check.status === "warn" ? <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" /> :
                   <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                  <span className="text-gray-400">{check.label}:</span>
                  <span className={check.status === "ok" ? "text-gray-300" : check.status === "warn" ? "text-yellow-300" : "text-red-300"}>
                    {check.detail}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Media Requirements */}
          {platforms.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Ruler className="w-3 h-3" /> Specificații Media
              </p>
              {platforms.map((p) => {
                const spec = PLATFORM_SPECS[p];
                if (!spec) return null;
                return (
                  <div key={p} className="text-[11px] space-y-0.5">
                    <p className="text-gray-400 font-medium">{spec.label}:</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pl-2">
                      {spec.imageSizes.slice(0, 3).map((s) => (
                        <span key={s.type} className="text-gray-500">
                          <ImageIcon className="w-2.5 h-2.5 inline mr-1" />{s.type}: <span className="text-gray-400">{s.size}</span>
                        </span>
                      ))}
                      {spec.videoSpecs.slice(0, 2).map((v) => (
                        <span key={v.type} className="text-gray-500">
                          <Film className="w-2.5 h-2.5 inline mr-1" />{v.type}: <span className="text-gray-400">{v.duration}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// VISUAL SUGGESTION COMPONENT
// ═══════════════════════════════════════════════════════════════

interface VisualSuggestionProps {
  platform: string;
  contentType?: string;
  isDental?: boolean;
}

export function VisualSuggestion({ platform, contentType, isDental }: VisualSuggestionProps) {
  const spec = PLATFORM_SPECS[platform];
  if (!spec) return null;

  const bestFormat = spec.imageSizes[0];
  const bestVideo = spec.videoSpecs[0];

  const dentalTips = isDental ? [
    "📸 Before/After: folosește split view (stânga-dreapta), aceeași lumină",
    "🎬 Video testimonial: 30-60s, subtitrat, emoție reală > perfecțiune",
    "🦷 Tur clinică: arată echipamentele moderne, sterilizarea, sala de așteptare",
    "👨‍⚕️ Doctor speaking: privește în cameră, vorbește simplu, 15-30s",
  ] : [];

  return (
    <div className="rounded-lg bg-purple-500/5 border border-purple-500/10 p-2.5 space-y-1.5">
      <p className="text-[10px] font-medium text-purple-300 uppercase tracking-wider flex items-center gap-1">
        <Smartphone className="w-3 h-3" /> Sugestie vizuală — {spec.label}
      </p>
      <div className="text-[11px] text-gray-400 space-y-0.5">
        <p>📐 Format recomandat: <span className="text-white">{bestFormat.size}</span> ({bestFormat.ratio})</p>
        <p>🎬 Video: <span className="text-white">{bestVideo.ratio}</span>, {bestVideo.duration}</p>
        {dentalTips.length > 0 && dentalTips.map((tip, i) => (
          <p key={i}>{tip}</p>
        ))}
        {spec.tips.slice(0, 2).map((tip, i) => (
          <p key={`tip-${i}`} className="text-gray-500">💡 {tip}</p>
        ))}
      </div>
    </div>
  );
}
