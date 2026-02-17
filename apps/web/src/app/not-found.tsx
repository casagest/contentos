import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-surface-ground flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-extrabold text-white/10 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          Pagina nu a fost găsită
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Pagina pe care o cauți nu există sau a fost mutată.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25"
          >
            Acasă
          </Link>
          <Link
            href="/braindump"
            className="px-6 py-2.5 rounded-xl border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-medium text-sm transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
