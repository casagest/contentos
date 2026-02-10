"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";

/* ─── Scroll-triggered fade-in wrapper ─── */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ─── Data ─── */
const features = [
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
    name: "Gratuit",
    price: "0",
    period: "pentru totdeauna",
    desc: "Perfect pentru a testa platforma",
    features: [
      "1 cont social conectat",
      "5 postări generate / lună",
      "Algorithm Scorer basic",
      "Brain Dump (3 / lună)",
    ],
    cta: "Începe gratuit",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "29",
    period: "/ lună",
    desc: "Pentru creatori serioși care vor rezultate",
    features: [
      "4 conturi sociale conectate",
      "Postări nelimitate",
      "Algorithm Scorer complet (9 metrici)",
      "AI Content Coach personalizat",
      "Brain Dump nelimitat",
      "Account Research (5 conturi)",
      "Post History Analytics",
    ],
    cta: "Începe cu Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "79",
    period: "/ lună",
    desc: "Pentru echipe și agenții de marketing",
    features: [
      "Conturi nelimitate",
      "Tot din Pro +",
      "Account Research nelimitat",
      "Export & API access",
      "Suport prioritar",
      "Onboarding dedicat",
    ],
    cta: "Contactează-ne",
    highlighted: false,
  },
];

const testimonials = [
  {
    name: "Alexandra Popescu",
    role: "Content Creator, 120K followers",
    text: "De când folosesc ContentOS, engagement-ul meu pe Instagram a crescut cu 40%. AI-ul chiar înțelege cum vorbim noi, românii.",
  },
  {
    name: "Mihai Ionescu",
    role: "Marketing Manager, Agenție Digitală",
    text: "Am redus timpul de creare conținut de la 3 ore la 30 de minute per client. Algorithm Scorer-ul e game changer.",
  },
  {
    name: "Dr. Ana Dumitrescu",
    role: "Medic Dentist, Clinica DentaVita",
    text: "Nu știam cum să fac conținut pentru clinică. ContentOS mi-a generat un calendar complet de postări, toate pe românește corect.",
  },
];

const platforms = [
  { name: "Facebook", color: "#1877F2" },
  { name: "Instagram", color: "#E4405F" },
  { name: "TikTok", color: "#FF0050" },
  { name: "YouTube", color: "#FF0000" },
];

/* ─── Page Component ─── */
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on anchor navigation
  const handleNavClick = () => setMenuOpen(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F]">
      {/* ── Background effects ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-pink-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-0 w-[400px] h-[400px] bg-pink-500/5 rounded-full blur-[100px]" />

      {/* ── Navigation ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm group-hover:shadow-lg group-hover:shadow-brand-500/30 transition-shadow">
              C
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              ContentOS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="#cum-functioneaza"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Cum funcționează
            </Link>
            <Link
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Funcționalități
            </Link>
            <Link
              href="#pricing"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Prețuri
            </Link>
            <Link
              href="/login"
              className="text-sm px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition shadow-md shadow-brand-600/20 hover:shadow-brand-500/30"
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
            <span
              className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${
                menuOpen ? "rotate-45" : "-translate-y-1.5"
              }`}
            />
            <span
              className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute w-5 h-0.5 bg-white transition-all duration-300 ${
                menuOpen ? "-rotate-45" : "translate-y-1.5"
              }`}
            />
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ${
            menuOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-6 pb-6 flex flex-col gap-4 bg-[#0A0A0F]/95 backdrop-blur-xl">
            <Link
              href="#cum-functioneaza"
              onClick={handleNavClick}
              className="text-sm text-gray-400 hover:text-white transition py-2"
            >
              Cum funcționează
            </Link>
            <Link
              href="#features"
              onClick={handleNavClick}
              className="text-sm text-gray-400 hover:text-white transition py-2"
            >
              Funcționalități
            </Link>
            <Link
              href="#pricing"
              onClick={handleNavClick}
              className="text-sm text-gray-400 hover:text-white transition py-2"
            >
              Prețuri
            </Link>
            <Link
              href="/login"
              className="text-sm px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition text-center"
            >
              Începe gratuit
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-32 md:pt-36 pb-16 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Primul AI de conținut nativ românesc
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Conținut viral cu{" "}
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              AI românesc
            </span>
            <br />
            pe toate platformele
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            ContentOS analizează algoritmii Facebook, Instagram, TikTok și
            YouTube, apoi generează conținut optimizat cu AI care înțelege limba
            română — cu diacritice, slang și context cultural.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
            >
              Încearcă gratuit →
            </Link>
            <Link
              href="#cum-functioneaza"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium transition-all hover:-translate-y-0.5"
            >
              Cum funcționează?
            </Link>
          </div>
        </FadeIn>

        {/* Social proof */}
        <FadeIn delay={400}>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="text-brand-400">✦</span> 4 platforme
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-brand-400">✦</span> AI nativ românesc
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-brand-400">✦</span> GDPR compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-brand-400">✦</span> Gratis pentru început
            </span>
          </div>
        </FadeIn>
      </section>

      {/* ── How it works ── */}
      <section
        id="cum-functioneaza"
        className="relative z-10 max-w-5xl mx-auto px-6 py-20"
      >
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Cum funcționează?
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Trei pași simpli de la zero la conținut viral.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 150}>
              <div className="relative text-center group">
                {/* Connector line (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand-500/30 to-transparent" />
                )}
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-300">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">
                  Pasul {step.num}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Tot ce ai nevoie pentru conținut care funcționează
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-2xl mx-auto">
            De la analiză la creație, ContentOS îți oferă avantajul AI pe piața
            românească.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 80}>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/30 hover:bg-white/[0.04] transition-all duration-300 group cursor-default h-full">
                <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-brand-300 transition">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <FadeIn>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-8 md:p-10 text-center">
            <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">
              Un singur tool. Toate platformele.
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              Optimizat nativ pentru fiecare algoritm.
            </p>
            <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-2.5 group"
                >
                  <div
                    className="w-3 h-3 rounded-full group-hover:scale-125 transition-transform"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white transition">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Prețuri simple, fără surprize
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-2xl mx-auto">
            Începe gratuit, fă upgrade când ești gata.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 120}>
              <div
                className={`relative rounded-2xl p-8 h-full flex flex-col ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-brand-500/10 to-pink-500/5 border-2 border-brand-500/40 shadow-xl shadow-brand-500/10"
                    : "bg-white/[0.02] border border-white/[0.06]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 text-xs font-bold text-white">
                    Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-500">{plan.desc}</p>
                </div>
                <div className="mb-8">
                  <span className="text-4xl font-bold text-white">
                    €{plan.price}
                  </span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-gray-300"
                    >
                      <span className="text-brand-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center px-6 py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/25"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Ce spun utilizatorii
          </h2>
          <p className="text-gray-400 text-center mb-14 max-w-2xl mx-auto">
            Creatori și business-uri din România care folosesc ContentOS.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 120}>
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] h-full flex flex-col">
                <div className="flex-1">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="text-yellow-400 text-sm">
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-6 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Gata cu ghiceala. Începe cu date.
          </h2>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto">
            Conectează-ți conturile, lasă AI-ul să analizeze, și creează conținut
            care chiar funcționează.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white font-bold text-lg transition-all shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5"
          >
            Creează cont gratuit →
          </Link>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                  C
                </div>
                <span className="text-sm font-bold text-white tracking-tight">
                  ContentOS
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Platformă AI de conținut social media, nativă pentru piața
                românească.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Produs
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Funcționalități
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Prețuri
                  </Link>
                </li>
                <li>
                  <Link
                    href="#cum-functioneaza"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Cum funcționează
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Companie
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/about"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Despre noi
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:contact@contentos.ro"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Confidențialitate
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Termeni
                  </Link>
                </li>
                <li>
                  <Link
                    href="/gdpr"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    GDPR
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-gray-600">
              © 2026 ContentOS. Toate drepturile rezervate.
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Făcut cu ❤️ în România</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
