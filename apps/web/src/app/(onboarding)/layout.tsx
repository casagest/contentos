export const metadata = {
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-surface-sunken">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-pink-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center min-h-screen py-12 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-12">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            C
          </div>
          <span className="text-xl font-bold text-white tracking-tight">ContentOS</span>
        </div>

        <div className="w-full max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
