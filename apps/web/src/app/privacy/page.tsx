import Link from "next/link";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://contentos.ro";

export const metadata = {
  title: "Politica de Confidențialitate",
  description:
    "Politica de confidențialitate ContentOS. Cum colectăm, folosim și protejăm datele tale în conformitate cu GDPR.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: `${baseUrl}/privacy` },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface-sunken text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8"
        >
          ← Înapoi
        </Link>
        <h1 className="text-3xl font-bold mb-6">Politica de Confidențialitate</h1>
        <p className="text-gray-400 mb-8">
          Ultima actualizare: 17 februarie 2026
        </p>
        <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
          <p>
            Această politică descrie cum colectăm, folosim și protejăm datele tale
            personale în conformitate cu GDPR.
          </p>
          <h2 className="text-xl font-semibold text-white">Date pe care le colectăm</h2>
          <p>
            Colectăm date de identificare (email, nume), date de conectare la
            platforme sociale (prin OAuth), și date de utilizare necesare pentru
            funcționarea serviciului.
          </p>
          <h2 className="text-xl font-semibold text-white">Finalitate</h2>
          <p>
            Folosim datele pentru furnizarea și îmbunătățirea serviciului,
            comunicare, și conformitate legală.
          </p>
          <h2 className="text-xl font-semibold text-white">Stocare și securitate</h2>
          <p>
            Datele sunt stocate în Uniunea Europeană, cu măsuri tehnice și
            organizatorice adecvate. Nu partajăm date cu terți în scopuri de
            marketing.
          </p>
          <h2 className="text-xl font-semibold text-white">Drepturile tale</h2>
          <p>
            Poți accesa, rectifica, șterge datele sau solicita portabilitatea.
            Vezi{" "}
            <Link href="/gdpr" className="text-brand-400 hover:underline">
              pagină GDPR
            </Link>
            .
          </p>
          <p>
            Contact:{" "}
            <a href="mailto:privacy@contentos.ro" className="text-brand-400 hover:underline">
              privacy@contentos.ro
            </a>
          </p>
          <p>
            <Link href="/terms" className="text-brand-400 hover:underline">
              Termeni și Condiții
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
