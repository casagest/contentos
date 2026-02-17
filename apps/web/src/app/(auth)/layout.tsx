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
    <div className="relative min-h-screen flex items-center justify-center bg-surface-sunken overflow-hidden">
      {/* ── Animated gradient mesh background ── */}
      <div className="absolute inset-0">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/80 via-surface-sunken to-orange-950/40" />

        {/* Animated orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-500/8 blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-orange-500/6 blur-[100px] animate-[pulse_10s_ease-in-out_infinite_2s]" />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-pink-500/5 blur-[80px] animate-[pulse_12s_ease-in-out_infinite_4s]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--surface-sunken))_70%)]" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-shadow">
              C
              <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <span className="text-xl font-bold text-white tracking-tight">
                Content<span className="text-orange-400">OS</span>
              </span>
              <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-wider">AI CONTENT PLATFORM</p>
            </div>
          </Link>
        </div>

        {children}

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-muted-foreground/60">
          © 2026 ContentOS · <Link href="/terms" className="hover:text-muted-foreground transition">Termeni</Link> · <Link href="/privacy" className="hover:text-muted-foreground transition">Confidențialitate</Link>
        </p>
      </div>
    </div>
  );
}
