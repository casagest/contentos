import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";

export const metadata = {
  title: "GDPR și Drepturile Tale",
  description:
    "Informații despre conformitatea GDPR și exercitarea drepturilor tale (access, rectification, erasure, portability) în cadrul ContentOS.",
  alternates: { canonical: "/gdpr" },
  openGraph: { url: `${baseUrl}/gdpr` },
};

export default function GdprPage() {
  return (
    <main className="min-h-screen bg-surface-sunken text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"
        >
          ← Înapoi
        </Link>
        <h1 className="text-3xl font-bold mb-6">GDPR și Drepturile Tale</h1>
        <p className="text-gray-400 mb-8">
          Ultima actualizare: 17 februarie 2026
        </p>
        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <p>
            ContentOS respectă Regulamentul General privind Protecția Datelor (GDPR)
            și îți oferă control complet asupra datelor tale.
          </p>
          <h2 className="text-xl font-semibold text-white">Drepturile tale</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Acces</strong>: Poți solicita o copie a datelor tale.</li>
            <li><strong>Rectificare</strong>: Poți corecta datele inexacte.</li>
            <li><strong>Ștergere</strong>: Poți solicita ștergerea completă a contului.</li>
            <li><strong>Portabilitate</strong>: Poți exporta datele tale într-un format portabil.</li>
          </ul>
          <p>
            Pentru a exercita aceste drepturi, contactează-ne la{" "}
            <a href="mailto:privacy@contentos.ro" className="text-brand-400 hover:underline">
              privacy@contentos.ro
            </a>
          </p>
          <p>
            <Link href="/privacy" className="text-brand-400 hover:underline">
              Citește Politica de Confidențialitate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
