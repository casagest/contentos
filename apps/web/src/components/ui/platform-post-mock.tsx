"use client";

import { useState } from "react";

/* ─── Types ─── */
interface PostData {
  text: string;
  score: number;
  likes: string;
  comments: string;
  shares?: string;
}

/* ─── Facebook Post ─── */
export function FacebookPostMock({ data, brandName = "ContentOS" }: { data: PostData; brandName?: string }) {
  const [showFull, setShowFull] = useState(false);
  const lines = data.text.split("\n");
  const preview = showFull ? data.text : lines.slice(0, 5).join("\n");

  return (
    <div className="min-h-[480px]">
      {/* Status bar */}
      <div className="h-11 bg-[#242526] flex items-center justify-between px-4 pt-5">
        <span className="text-[#e4e6eb] text-xs font-semibold">9:41</span>
        <div className="flex gap-1 text-[#e4e6eb] text-[10px]">
          <span>■■■</span>
          <span>📶</span>
          <span>100%</span>
        </div>
      </div>
      {/* FB Nav */}
      <div className="h-10 bg-[#242526] flex items-center px-3 gap-3 border-b border-white/5">
        <span className="text-[#1877F2] text-xl font-extrabold">f</span>
        <div className="flex-1 bg-white/10 rounded-full px-3 py-1.5">
          <span className="text-white/30 text-xs">🔍 Caută</span>
        </div>
      </div>
      {/* Post */}
      <div className="bg-[#242526] mt-2">
        <div className="px-3 pt-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-sm font-bold text-white">
            {brandName[0]}
          </div>
          <div>
            <div className="text-[#e4e6eb] text-[13px] font-semibold">{brandName}</div>
            <div className="text-[#b0b3b8] text-[11px] flex items-center gap-1">Sponsorizat · 🌍</div>
          </div>
          <span className="ml-auto text-[#b0b3b8] text-lg cursor-pointer">···</span>
        </div>
        <div className="px-3 py-2 text-[#e4e6eb] text-[13px] leading-relaxed whitespace-pre-wrap">
          {preview}
          {!showFull && lines.length > 5 && (
            <button onClick={() => setShowFull(true)} className="text-[#b0b3b8] font-medium ml-1">
              ...Mai mult
            </button>
          )}
        </div>
        {/* Reactions */}
        <div className="px-3 py-1 flex items-center border-y border-white/[0.04]">
          <div className="flex -space-x-0.5 text-sm">
            <span>👍</span><span>❤️</span><span>😮</span>
          </div>
          <span className="text-[#b0b3b8] text-xs ml-1">{data.likes}</span>
          <span className="text-[#b0b3b8] text-xs ml-auto">{data.comments} · {data.shares ?? "0"}</span>
        </div>
        {/* Actions */}
        <div className="flex">
          {["👍 Like", "💬 Comment", "↗ Share"].map((a) => (
            <div key={a} className="flex-1 text-center py-2 text-[#b0b3b8] text-xs font-semibold">{a}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Instagram Post ─── */
export function InstagramPostMock({ data, brandName = "contentos" }: { data: PostData; brandName?: string }) {
  return (
    <div className="min-h-[480px]">
      {/* Status bar */}
      <div className="h-11 bg-black flex items-center justify-between px-4 pt-5">
        <span className="text-white text-xs font-semibold">9:41</span>
        <div className="flex gap-1 text-white text-[10px]">
          <span>■■■</span>
          <span>📶</span>
          <span>100%</span>
        </div>
      </div>
      {/* IG Nav */}
      <div className="h-10 bg-black flex items-center px-3.5 border-b border-white/[0.08]">
        <span className="text-white text-lg font-bold italic tracking-tight">Instagram</span>
        <div className="ml-auto flex gap-4 text-lg">
          <span>♡</span>
          <span>💬</span>
        </div>
      </div>
      {/* Post header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black">
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white">
            {brandName[0]?.toUpperCase()}
          </div>
        </div>
        <span className="text-white text-[13px] font-semibold">{brandName}</span>
        <span className="text-[#0095f6] text-xs font-semibold ml-1">Urmărește</span>
        <span className="ml-auto text-white">···</span>
      </div>
      {/* Image placeholder */}
      <div className="w-full aspect-[4/5] bg-gradient-to-br from-surface-ground via-brand-950 to-surface-overlay flex flex-col items-center justify-center relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(99,102,241,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(236,72,153,0.1)_0%,transparent_40%)]" />
        <div className="relative z-10 text-white text-xl font-extrabold text-center leading-tight px-5">
          Conținut viral<br />generat cu AI
        </div>
        <div className="relative z-10 text-white/50 text-[11px] mt-2">CAROUSEL · 5 SLIDES</div>
        <div className="absolute bottom-3 flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-[#0095f6]" : "bg-white/30"}`} />
          ))}
        </div>
      </div>
      {/* Actions */}
      <div className="px-3 py-2 flex gap-3.5 bg-black text-[22px]">
        <span>♡</span><span>💬</span><span>↗️</span>
        <span className="ml-auto">🔖</span>
      </div>
      <div className="px-3 pb-3 bg-black">
        <div className="text-white text-xs font-semibold">{data.likes} aprecieri</div>
        <div className="mt-1 text-xs">
          <span className="text-white font-semibold">{brandName} </span>
          <span className="text-[#e0e0e0]">{data.text.split("\n")[0]}</span>
        </div>
        <div className="text-[#a8a8a8] text-[11px] mt-1">Vezi toate cele {data.comments} comentarii</div>
      </div>
    </div>
  );
}

/* ─── TikTok Post ─── */
export function TikTokPostMock({ data, brandName = "contentos" }: { data: PostData; brandName?: string }) {
  return (
    <div className="min-h-[480px] bg-black relative">
      {/* Video bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0020] to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,246,0.15)_0%,transparent_50%)]" />
      </div>
      {/* Status bar */}
      <div className="relative z-10 h-11 flex items-center justify-between px-4 pt-5">
        <span className="text-white text-xs font-semibold">9:41</span>
        <div className="flex gap-1 text-white text-[10px]">
          <span>■■■</span>
          <span>📶</span>
          <span>100%</span>
        </div>
      </div>
      {/* Top nav */}
      <div className="relative z-10 flex justify-center gap-5 py-2">
        <span className="text-white/50 text-sm font-medium">Urmăriri</span>
        <span className="text-white text-sm font-bold border-b-2 border-white pb-0.5">Pentru tine</span>
      </div>
      {/* Center */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[260px] px-10">
        <div className="text-5xl mb-2">🚀</div>
        <div className="text-white text-[22px] font-extrabold text-center leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">
          Conținut viral<br />în 2 minute
        </div>
        <div className="text-white/60 text-xs mt-2">✨ Generat cu AI...</div>
      </div>
      {/* Right sidebar */}
      <div className="absolute right-2.5 bottom-[100px] z-10 flex flex-col items-center gap-[18px]">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 border-white">
            {brandName[0]?.toUpperCase()}
          </div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] rounded-full bg-[#fe2c55] flex items-center justify-center text-xs text-white">+</div>
        </div>
        {[
          { icon: "♡", count: data.likes },
          { icon: "💬", count: data.comments },
          { icon: "🔖", count: "2.1K" },
          { icon: "↗️", count: "Share" },
        ].map((a) => (
          <div key={a.icon} className="text-center">
            <div className="text-2xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{a.icon}</div>
            <div className="text-white text-[10px] font-medium mt-0.5">{a.count}</div>
          </div>
        ))}
      </div>
      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-[60px] z-10">
        <div className="text-white text-sm font-bold">@{brandName}</div>
        <div className="text-white/85 text-xs mt-1 leading-relaxed">
          {data.text.split("\n").slice(0, 2).join(" ")}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[11px]">🎵</span>
          <span className="text-white/60 text-[11px] truncate">trending sound — sunet original</span>
        </div>
      </div>
    </div>
  );
}
