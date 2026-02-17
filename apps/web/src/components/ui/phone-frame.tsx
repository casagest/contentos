interface PhoneFrameProps {
  children: React.ReactNode;
  platform: "facebook" | "instagram" | "tiktok" | "youtube";
  className?: string;
}

const platformBg: Record<string, string> = {
  facebook: "bg-[#1a1a1a]",
  instagram: "bg-black",
  tiktok: "bg-black",
  youtube: "bg-[#0f0f0f]",
};

const platformGlow: Record<string, string> = {
  facebook: "shadow-[0_0_80px_rgba(24,119,242,0.06)]",
  instagram: "shadow-[0_0_80px_rgba(228,64,95,0.06)]",
  tiktok: "shadow-[0_0_80px_rgba(0,242,234,0.06)]",
  youtube: "shadow-[0_0_80px_rgba(255,0,0,0.06)]",
};

export function PhoneFrame({ children, platform, className }: PhoneFrameProps) {
  return (
    <div
      className={`relative w-[320px] shrink-0 rounded-[28px] p-1.5 border border-white/[0.08] bg-black/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03),inset_0_1px_0_rgba(255,255,255,0.06)] ${platformGlow[platform] ?? ""} ${className ?? ""}`}
    >
      {/* Notch */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[100px] h-[22px] bg-black rounded-b-[14px] z-10">
        <div className="absolute top-[7px] left-1/2 -translate-x-1/2 w-10 h-1 bg-white/10 rounded-full" />
      </div>

      {/* Screen */}
      <div className={`rounded-[22px] overflow-hidden ${platformBg[platform] ?? "bg-[#1a1a1a]"}`}>
        {children}
      </div>

      {/* Home indicator */}
      <div className="flex justify-center py-1.5 pb-0.5">
        <div className="w-[100px] h-1 bg-white/15 rounded-full" />
      </div>
    </div>
  );
}
