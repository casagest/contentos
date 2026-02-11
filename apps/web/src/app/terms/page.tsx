import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";

export const metadata = {
  title: "Termeni și Condiții",
  description:
    "Termenii și condițiile de utilizare a platformei ContentOS. AI Content Intelligence pentru România.",
  alternates: { canonical: "/terms" },
  openGraph: { url: `${baseUrl}/terms` },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"
        >
          ← Înapoi
        </Link>
        <h1 className="text-3xl font-bold mb-6">Termeni și Condiții</h1>
        <p className="text-gray-400 mb-8">
          Ultima actualizare: {new Date().toLocaleDateString("ro-RO")}
        </p>
        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <p>
            Prin accesarea și utilizarea ContentOS, acceptezi acești termeni și
            condiții.
          </p>
          <h2 className="text-xl font-semibold text-white">1. Serviciul</h2>
          <p>
            ContentOS oferă instrumente de creare și optimizare conținut pentru
            social media, bazate pe inteligență artificială.
          </p>
          <h2 className="text-xl font-semibold text-white">2. Cont și responsabilitate</h2>
          <p>
            Ești responsabil pentru menținerea confidențialității contului tău
            și pentru acțiunile efectuate prin intermediul acestuia.
          </p>
          <h2 className="text-xl font-semibold text-white">3. Modificări</h2>
          <p>
            Ne rezervăm dreptul de a modifica acești termeni. Modificările
            semnificative vor fi comunicate prin email sau în aplicație.
          </p>
          <p>
            Pentru întrebări:{" "}
            <a href="mailto:contact@contentos.ro" className="text-brand-400 hover:underline">
              contact@contentos.ro
            </a>
          </p>
          <p>
            <Link href="/privacy" className="text-brand-400 hover:underline">
              Politica de Confidențialitate
            </Link>
            {" · "}
            <Link href="/gdpr" className="text-brand-400 hover:underline">
              GDPR
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
