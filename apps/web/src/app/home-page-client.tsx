"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* FadeIn removed — content visible instantly for better LCP and no invisible sections */

/* ─── FAQ Accordion Item ─── */
function FaqItem({
  question,
  answer,
  open,
  onToggle,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/10 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-base font-semibold text-black group-hover:text-orange-600 transition">
          {question}
        </span>
        <span
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300 ${
            open
              ? "rotate-45 border-orange-500 text-orange-500 bg-orange-50"
              : "border-gray-300 text-gray-400"
          }`}
        >
          +
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-48 pb-5" : "max-h-0"
        }`}
      >
        <p className="text-sm text-gray-600 leading-relaxed pr-10">{answer}</p>
      </div>
    </div>
  );
}

/* ─── Data ─── */
const features = [
  {
    icon: "📊",
    title: "AI Content Coach",
    desc: "Coach-ul tău personal. Analizează istoricul tău complet și îți spune exact ce să postezi, când și pe ce platformă.",
  },
  {
    icon: "🎯",
    title: "Algorithm Scorer",
    desc: "Scor 0-100 pe 9 metrici per platformă. Știi cât de bine va performa postarea ÎNAINTE să o publici.",
  },
  {
    icon: "✍️",
    title: "Content Composer",
    desc: "Generează conținut optimizat per platformă dintr-un singur input. Cu diacritice corecte și slang actual.",
  },
  {
    icon: "🧠",
    title: "AI Brain Dump",
    desc: "Aruncă orice gând — AI-ul le transformă în postări virale pentru Facebook, Instagram, TikTok și YouTube.",
  },
  {
    icon: "🔍",
    title: "Account Research",
    desc: "Analizează competitorii: ce postează, când, cum, și ce funcționează. Fură ce-i mai bun, legal.",
  },
  {
    icon: "💡",
    title: "AI Inspirație",
    desc: "Salvează postări de la alții și transformă-le instant în conținut cu vocea ta. Zero plagiat, 100% original.",
  },
  {
    icon: "📅",
    title: "Post History",
    desc: "Vizualizează performanța pe timeline. Descoperă pattern-urile ascunse care îți cresc engagement-ul.",
  },
  {
    icon: "🎬",
    title: "Script Video",
    desc: "Generează scripturi video cu timeline, cue-uri vizuale și tranziții. 6 stiluri, 5 durate. Gata de filmat.",
  },
];

const steps = [
  {
    num: "01",
    title: "Conectează conturile",
    desc: "Leagă Facebook, Instagram, TikTok și YouTube în câteva click-uri. Noi facem restul.",
    icon: "🔗",
  },
  {
    num: "02",
    title: "AI analizează totul",
    desc: "Algoritmul nostru scanează istoricul postărilor, competitorii și trendurile din piața românească.",
    icon: "⚡",
  },
  {
    num: "03",
    title: "Creează & publică",
    desc: "Primești conținut optimizat per platformă, gata de publicat. Cu scor de performanță înainte de post.",
    icon: "🚀",
  },
];

const plans = [
  {
    name: "Starter",
    price: "19",
    period: "/ lună",
    desc: "Pentru creatori la început de drum",
    features: [
      "2 conturi sociale conectate",
      "30 postări generate / lună",
      "Algorithm Scorer (5 metrici)",
      "AI Content Coach basic",
      "Brain Dump nelimitat",
    ],
    cta: "Începe cu Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49",
    period: "/ lună",
    desc: "Tot ce ai nevoie pentru conținut viral",
    features: [
      "5 conturi sociale conectate",
      "Postări nelimitate",
      "Algorithm Scorer complet (9 metrici)",
      "AI Content Coach personalizat",
      "Brain Dump nelimitat",
      "Account Research (10 conturi)",
      "Post History Analytics",
      "Script Video Generator",
    ],
    cta: "Începe cu Pro",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "99",
    period: "/ lună",
    desc: "Pentru echipe și agenții de marketing",
    features: [
      "Tot din Pro +",
      "Conturi nelimitate",
      "Account Research nelimitat",
      "Export & API access",
      "Membri de echipă nelimitați",
      "Suport prioritar",
    ],
    cta: "Contactează-ne",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "Ce platforme suportă ContentOS?",
    a: "Facebook, Instagram, TikTok și YouTube. Generăm conținut optimizat nativ pentru algoritmul fiecărei platforme.",
  },
  {
    q: "E gratuit să încerc?",
    a: "Da! Ai 7 zile free trial cu acces complet la toate funcționalitățile. Fără card de credit necesar.",
  },
  {
    q: "Cum funcționează AI-ul?",
    a: "AI-ul analizează mii de postări de succes din piața românească, învață pattern-urile care funcționează pe fiecare platformă, și generează conținut optimizat. Folosim modele avansate antrenate specific pe limba română.",
  },
  {
    q: "Ce limbă înțelege?",
    a: "ContentOS este primul AI de conținut nativ românesc. Înțelege diacritice, expresii colocviale, slang, referințe culturale și context local. Funcționează și în engleză.",
  },
  {
    q: "Pot folosi ContentOS pentru clinica mea?",
    a: "Absolut! Avem un modul dedicat pentru clinici dentare cu conformitate CMSR, template-uri pentru proceduri, testimoniale pacienți și campanii sezoniere.",
  },
  {
    q: "Datele mele sunt în siguranță?",
    a: "100%. GDPR compliant, date stocate în Uniunea Europeană, criptare end-to-end. Poți solicita ștergerea completă oricând.",
  },
];

/* ─── Page Component ─── */
export default function HomePageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-[#0F1728]">
      {/* ── Navigation ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0F1728]/95 backdrop-blur-xl shadow-lg"
            : "bg-[#0F1728]"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/25">
              C
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              Content<span className="text-orange-400">OS</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#cum-functioneaza" className="text-sm text-gray-300 hover:text-white transition font-medium">
              Cum funcționează
            </Link>
            <Link href="#features" className="text-sm text-gray-300 hover:text-white transition font-medium">
              Funcționalități
            </Link>
            <Link href="#pricing" className="text-sm text-gray-300 hover:text-white transition font-medium">
              Prețuri
            </Link>
            <Link href="#faq" className="text-sm text-gray-300 hover:text-white transition font-medium">
              FAQ
            </Link>
            <Link
              href="/login"
              className="text-sm px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-400/40 hover:-translate-y-0.5 active:translate-y-0"
            >
              Începe gratuit
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden relative w-8 h-8 flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Închide meniul" : "Deschide meniul"}
          >
            <span className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "rotate-45" : "-translate-y-1.5"}`} />
            <span className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? "-rotate-45" : "translate-y-1.5"}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? "max-h-80" : "max-h-0"}`}>
          <div className="px-6 pb-6 flex flex-col gap-4 bg-[#0F1728]">
            <Link href="#cum-functioneaza" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Cum funcționează</Link>
            <Link href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Funcționalități</Link>
            <Link href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Prețuri</Link>
            <Link href="#faq" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">FAQ</Link>
            <Link href="/login" className="text-sm px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-center">Începe gratuit</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (dark section) ── */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-6 text-center overflow-hidden">
        {/* Subtle gradient glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-orange-500/8 rounded-full blur-[120px]" />

        <div className="relative max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
            Conținut Viral Cu{" "}
            <span className="text-orange-400">Un Click</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crește-ți audiența, engagement-ul și vinde mai mult cu cel mai
            puternic tool AI de conținut creat pentru România.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-400/50 hover:-translate-y-0.5 active:translate-y-0 tracking-wide"
            >
              ÎNCEARCĂ GRATUIT
            </Link>
            <Link
              href="#cum-functioneaza"
              className="w-full sm:w-auto px-10 py-4 rounded-xl border-2 border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white font-bold text-lg transition-all hover:-translate-y-0.5"
            >
              Vezi cum funcționează
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features Grid (warm section) ── */}
      <section id="features" className="bg-[#E0DACE] py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-4">
              8 Tool-uri AI Puternice
            </h2>
            <p className="text-base sm:text-lg text-gray-700 text-center mb-14 sm:mb-20 max-w-2xl mx-auto">
              Tot ce ai nevoie pentru a crea conținut care crește engagement-ul și audiența.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature, i) => (
              <div>
                <div className="bg-[#d6d0c2] rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col items-center">
                  <div className="text-5xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-black mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (dark section) ── */}
      <section id="cum-functioneaza" className="bg-[#0F1728] py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white text-center tracking-tight mb-4">
              Cum Funcționează ContentOS
            </h2>
            <p className="text-base sm:text-lg text-gray-400 text-center mb-14 sm:mb-20 max-w-xl mx-auto">
              Trei pași simpli de la zero la conținut viral.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl hover:scale-110 hover:bg-white/10 transition-all duration-300">
                    {step.icon}
                  </div>
                  <div className="text-xs font-bold text-orange-400 tracking-[0.2em] uppercase mb-3">
                    Pasul {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefit 1 (warm section) ── */}
      <section className="bg-[#E0DACE] py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black tracking-tight mb-6 leading-tight">
                  Creează Conținut Pe Care Algoritmul Îl Iubește
                </h2>
                <ul className="space-y-4">
                  {[
                    "Scor de performanță ÎNAINTE de publicare",
                    "Optimizat nativ per platformă (Facebook, Instagram, TikTok, YouTube)",
                    "Nu rămâi niciodată fără idei",
                    "Înțelege zilele și orele cu cel mai mare engagement",
                    "Creează conținut AI adaptat vocii tale",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-base text-black font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#0F1728] rounded-2xl p-8 shadow-2xl">
                <div className="bg-[#1a2340] rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-xs text-orange-400 font-bold">Algorithm Score</span>
                  </div>
                  <div className="text-5xl font-extrabold text-white mb-2">87<span className="text-2xl text-gray-400">/100</span></div>
                  <div className="text-sm text-emerald-400 font-semibold mb-4">✓ Excelent — gata de publicare</div>
                  <div className="space-y-2">
                    {[
                      { label: "Hook Power", score: 92, color: "bg-emerald-400" },
                      { label: "Readability", score: 88, color: "bg-emerald-400" },
                      { label: "CTA Strength", score: 76, color: "bg-yellow-400" },
                      { label: "Engagement Potential", score: 91, color: "bg-emerald-400" },
                    ].map((m) => (
                      <div key={m.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-32 shrink-0">{m.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-white/5">
                          <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.score}%` }} />
                        </div>
                        <span className="text-xs text-white font-bold w-8 text-right">{m.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefit 2 (olive section) ── */}
      <section className="bg-[#939482] py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 bg-[#0F1728] rounded-2xl p-8 shadow-2xl">
                <div className="bg-[#1a2340] rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-blue-400 font-bold">AI Brain Dump</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-lg p-3 ml-8">
                      <p className="text-xs text-gray-300">Am făcut un implant azi, pacientul era super fericit cu rezultatul...</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mr-8">
                      <p className="text-xs text-orange-300">🎯 <strong>3 postări generate:</strong></p>
                      <p className="text-xs text-gray-300 mt-1">• Facebook: Testimonial cu before/after</p>
                      <p className="text-xs text-gray-300">• Instagram: Carusel educativ despre implanturi</p>
                      <p className="text-xs text-gray-300">• TikTok: Script video 30s „Transformarea zilei"</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black tracking-tight mb-6 leading-tight">
                  Singurul AI Antrenat Pe Tot Conținutul Tău
                </h2>
                <ul className="space-y-4">
                  {[
                    "Învață vocea și stilul tău unic",
                    "Generează conținut care sună ca tine, nu ca un robot",
                    "Adaptează tonul per platformă automat",
                    "Înțelege limba română cu diacritice și slang",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-base text-black font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing (warm section) ── */}
      <section id="pricing" className="bg-[#E0DACE] py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-4">
              Prețuri Simple
            </h2>
            <p className="text-base sm:text-lg text-gray-700 text-center mb-14 max-w-xl mx-auto">
              Începe cu 7 zile gratuit. Fără card de credit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan, i) => (
              <div>
                <div
                  className={`relative rounded-2xl p-7 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    plan.highlighted
                      ? "bg-[#939482] shadow-2xl scale-[1.02]"
                      : "bg-[#d6d0c2] shadow-lg"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-orange-500 text-xs font-bold text-white whitespace-nowrap shadow-lg">
                      Cel mai popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-black mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-600 mb-5">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-black">€{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-black">
                        <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-orange-500/15 flex items-center justify-center">
                          <svg className="w-3 h-3 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block text-center px-6 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                      plan.highlighted
                        ? "bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/30"
                        : "bg-[#0F1728] hover:bg-[#1a2744] text-white"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div>
            <p className="text-center text-sm text-gray-600 mt-8">
              sau <Link href="/register" className="text-orange-600 font-semibold hover:underline">încearcă 7 zile gratuit</Link> — fără card de credit
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ (olive section) ── */}
      <section id="faq" className="bg-[#939482] py-20 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-14">
              Întrebări Frecvente
            </h2>
          </div>

          <div>
            <div className="bg-[#E0DACE] rounded-2xl px-8 py-2 shadow-lg">
              {faqs.map((faq, i) => (
                <FaqItem
                  key={i}
                  question={faq.q}
                  answer={faq.a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA (dark) ── */}
      <section className="bg-[#0F1728] py-20 sm:py-28 px-6 text-center">
        <div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight">
            Gata Să-ți Transformi<br />Crearea De Conținut?
          </h2>
          <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            Alătură-te creatorilor care folosesc AI-ul ca să crească mai repede.
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-400/50 hover:-translate-y-0.5 active:translate-y-0 tracking-wide"
          >
            ÎNCEPE GRATUIT ACUM
          </Link>
        </div>
      </section>

      {/* ── Footer (darkest) ── */}
      <footer className="bg-[#0a0f1a] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                  C
                </div>
                <span className="text-lg font-bold text-white">
                  Content<span className="text-orange-400">OS</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Platformă AI de conținut social media, nativă pentru piața românească.
              </p>
            </div>

            {/* Produs */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Produs</h4>
              <ul className="space-y-2.5">
                <li><Link href="#features" className="text-sm text-gray-400 hover:text-white transition">Funcționalități</Link></li>
                <li><Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition">Prețuri</Link></li>
                <li><Link href="#cum-functioneaza" className="text-sm text-gray-400 hover:text-white transition">Cum funcționează</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="/gdpr" className="text-sm text-gray-400 hover:text-white transition">GDPR</Link></li>
                <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition">Termeni și Condiții</Link></li>
                <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition">Confidențialitate</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-2.5">
                <li><a href="mailto:contact@contentos.ro" className="text-sm text-gray-400 hover:text-white transition">contact@contentos.ro</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500">© 2026 ContentOS. Toate drepturile rezervate.</span>
            <span className="text-xs text-gray-500">Made in România 🇷🇴</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
