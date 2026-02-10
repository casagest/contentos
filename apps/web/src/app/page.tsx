import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F]">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-pink-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ContentOS</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#features" className="text-sm text-gray-400 hover:text-white transition">
            Funcționalități
          </Link>
          <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition">
            Prețuri
          </Link>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition"
          >
            Începe gratuit
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Primul AI de conținut nativ românesc
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Conținut viral cu{" "}
          <span className="bg-gradient-to-r from-brand-400 to-pink-400 bg-clip-text text-transparent">
            AI românesc
          </span>
          <br />
          pe toate platformele
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          ContentOS analizează algoritmii Facebook, Instagram, TikTok și YouTube,
          apoi generează conținut optimizat cu AI care înțelege limba română —
          cu diacritice, slang și context cultural.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold transition shadow-lg shadow-brand-500/25"
          >
            Încearcă gratuit →
          </Link>
          <Link
            href="#demo"
            className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 font-medium transition"
          >
            Vezi demo
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500">
          <span>✦ 4 platforme</span>
          <span>✦ AI nativ românesc</span>
          <span>✦ GDPR compliant</span>
          <span>✦ Gratis pentru început</span>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-4">
          Tot ce ai nevoie pentru conținut care funcționează
        </h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          De la analiză la creație, ContentOS îți oferă avantajul AI pe piața românească.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: "🎯",
              title: "AI Content Coach",
              desc: "Recomandări personalizate bazate pe performanța contului tău. Știe ce funcționează pe piața românească.",
            },
            {
              icon: "📊",
              title: "Algorithm Scorer",
              desc: "Scor 0-100 pe 9 metrici per platformă. Știi exact cât de bine va performa postarea înainte să o publici.",
            },
            {
              icon: "✍️",
              title: "Content Composer",
              desc: "Generează conținut optimizat per platformă dintr-un singur input. Cu diacritice corecte, slang actual.",
            },
            {
              icon: "🧠",
              title: "Brain Dump",
              desc: "Aruncă gândurile brute — AI le transformă în postări optimizate pentru Facebook, Instagram, TikTok și YouTube.",
            },
            {
              icon: "🔍",
              title: "Account Research",
              desc: "Analizează competitorii: ce postează, când, cum, și ce funcționează. Fură ce-i mai bun, legal.",
            },
            {
              icon: "📅",
              title: "Post History Analytics",
              desc: "Vizualizează performanța pe timeline. Găsește pattern-urile ascunse care îți cresc engagement-ul.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/30 transition group"
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-brand-300 transition">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-6">
            Un singur tool. Toate platformele.
          </h3>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {[
              { name: "Facebook", color: "#1877F2" },
              { name: "Instagram", color: "#E4405F" },
              { name: "TikTok", color: "#FF0050" },
              { name: "YouTube", color: "#FF0000" },
            ].map((platform) => (
              <div key={platform.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                <span className="text-sm font-medium text-gray-300">{platform.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Gata cu ghiceala. Începe cu date.
        </h2>
        <p className="text-gray-400 mb-8">
          Conectează-ți conturile, lasă AI-ul să analizeze, și creează conținut care chiar funcționează.
        </p>
        <Link
          href="/register"
          className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white font-bold text-lg transition shadow-xl shadow-brand-500/20"
        >
          Creează cont gratuit →
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] mt-10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            © 2026 ContentOS. Toate drepturile rezervate.
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300 transition">
              Confidențialitate
            </Link>
            <Link href="/terms" className="hover:text-gray-300 transition">
              Termeni
            </Link>
            <Link href="/gdpr" className="hover:text-gray-300 transition">
              GDPR
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
