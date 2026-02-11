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
    <div className="relative min-h-screen flex items-center justify-center bg-[#0A0A0F]">
      {/* Gradient Background — matches landing page */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-pink-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ContentOS</span>
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
