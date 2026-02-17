import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface-ground flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-orange-500/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-[100px]" />

      <div className="relative z-10 text-center max-w-lg">
        {/* Large 404 */}
        <div className="mb-6">
          <span className="text-[120px] sm:text-[160px] font-extrabold leading-none bg-gradient-to-b from-white/20 to-white/5 bg-clip-text text-transparent select-none">
            404
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
          Pagina nu a fost găsită
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Pagina pe care o cauți nu există sau a fost mutată. Verifică URL-ul sau întoarce-te la pagina principală.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-[1px]"
          >
            <Home className="w-4 h-4" />
            Pagina principală
          </Link>
          <Link
            href="/braindump"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-muted-foreground hover:text-white font-medium text-sm transition-all hover:-translate-y-[1px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Mergi la Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
