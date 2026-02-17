import Link from "next/link";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-surface-sunken overflow-hidden py-12">
      {/* ── 3 orbe animate + grid overlay ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.1)_0%,transparent_70%)] blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(236,72,153,0.08)_0%,transparent_70%)] blur-[120px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-[45%] left-[50%] w-[350px] h-[350px] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.06)_0%,transparent_70%)] blur-[120px] animate-[pulse_12s_ease-in-out_infinite_4s]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6 flex flex-col items-center">
        {/* Logo centrat sus */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="group flex flex-col items-center gap-2 transition-transform hover:scale-[1.02]">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/25">
              C
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-white tracking-tight">
                Content<span className="text-orange-400">OS</span>
              </span>
              <p className="text-[10px] text-muted-foreground/80 tracking-[0.15em] uppercase mt-0.5">
                AI CONTENT PLATFORM
              </p>
            </div>
          </Link>
        </div>

        {children}

        {/* Footer mic */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
          <Link href="/terms" className="hover:text-muted-foreground/80 transition">Termeni</Link>
          <span className="mx-1.5">·</span>
          <Link href="/privacy" className="hover:text-muted-foreground/80 transition">Confidențialitate</Link>
        </p>
      </div>
    </div>
  );
}
