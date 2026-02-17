"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";

/* ─── Scroll-triggered fade-in wrapper (Framer Motion) ─── */
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
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration: 0.6,
        delay: delay / 1000,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
    <div className="border-b border-white/[0.06]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm sm:text-base font-medium text-white group-hover:text-brand-300 transition">
          {question}
        </span>
        <span
          className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full border border-white/20 text-gray-400 text-xs transition-transform duration-300 ${
            open ? "rotate-45 border-brand-400 text-brand-400" : ""
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
        <p className="text-sm text-gray-400 leading-relaxed pr-10">{answer}</p>
      </div>
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
    name: "Free",
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
    cta: "Alege Starter",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49",
    period: "/ lună",
    desc: "Pentru creatori serioși care vor rezultate",
    features: [
      "5 conturi sociale conectate",
      "Postări nelimitate",
      "Algorithm Scorer complet (9 metrici)",
      "AI Content Coach personalizat",
      "Brain Dump nelimitat",
      "Account Research (10 conturi)",
      "Post History Analytics",
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
      "Conturi nelimitate",
      "Tot din Pro +",
      "Account Research nelimitat",
      "Export & API access",
      "Membri de echipă nelimitați",
      "Suport prioritar",
      "Onboarding dedicat",
    ],
    cta: "Contactează-ne",
    highlighted: false,
  },
];

const earlyAdopters = [
  {
    icon: "🏥",
    label: "Clinici Dentare",
    text: "Calendar complet de postări medicale cu conformitate CMSR, Before/After, testimoniale pacienți.",
  },
  {
    icon: "🍽️",
    label: "Restaurante",
    text: "Conținut food photography, meniu zilnic, promoții sezoniere, stories behind-the-scenes.",
  },
  {
    icon: "💪",
    label: "Fitness & Beauty",
    text: "Transformări, workout tips, rutine de beauty, promoții pachete — totul optimizat per platformă.",
  },
];

const platforms = [
  { name: "Facebook", color: "#1877F2" },
  { name: "Instagram", color: "#E4405F" },
  { name: "TikTok", color: "#FF0050" },
  { name: "YouTube", color: "#FF0000" },
];

const faqs = [
  {
    q: "Ce platforme suportă ContentOS?",
    a: "ContentOS suportă cele mai populare platforme din România: Facebook, Instagram, TikTok și YouTube. Generăm conținut optimizat nativ pentru algoritmul fiecărei platforme, astfel încât postările tale să aibă reach și engagement maxim.",
  },
  {
    q: "E gratuit?",
    a: "Da! Planul Free este gratuit pentru totdeauna și include 1 cont social conectat, 5 postări generate pe lună și acces la Algorithm Scorer basic. Poți face upgrade oricând dacă ai nevoie de mai multe funcționalități.",
  },
  {
    q: "Cum funcționează AI-ul?",
    a: "AI-ul nostru analizează mii de postări de succes din piața românească, învață pattern-urile care funcționează pe fiecare platformă, și generează conținut optimizat. Folosim modele avansate de limbaj antrenate specific pe limba română, cu diacritice corecte și slang actual.",
  },
  {
    q: "Ce limbă înțelege?",
    a: "ContentOS este primul AI de conținut nativ românesc. Înțelege limba română cu toate nuanțele — diacritice, expresii colocviale, slang, referințe culturale și context local. Funcționează și în engleză pentru conturi internaționale.",
  },
  {
    q: "Pot folosi ContentOS pentru clinica dentară?",
    a: "Absolut! Avem un modul dedicat pentru clinici dentare care generează conținut educativ, promoțional și de social proof specific domeniului stomatologic. Include template-uri pentru proceduri, testimoniale pacienți și campanii sezoniere.",
  },
  {
    q: "Datele mele sunt în siguranță?",
    a: "100%. Suntem GDPR compliant și toate datele sunt stocate securizat în Uniunea Europeană. Nu partajăm datele tale cu terți și poți solicita ștergerea completă a contului oricând. Folosim criptare end-to-end pentru toate conexiunile API.",
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

  const handleNavClick = () => setMenuOpen(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A0A0F]">
      {/* ── Background effects ── */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-transparent to-pink-950/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] md:w-[800px] md:h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-1/3 right-0 w-[300px] h-[300px] md:w-[400px] md:h-[400px] bg-pink-500/5 rounded-full blur-[100px]" />

      {/* ── Navigation ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-shadow">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
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
              href="#faq"
              className="text-sm text-gray-400 hover:text-white transition"
            >
              FAQ
            </Link>
            <Link
              href="/login"
              className="group text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-medium transition shadow-md shadow-brand-600/20 hover:shadow-brand-500/30 relative overflow-hidden"
            >
              <span className="relative z-10">Începe gratuit</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
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
            menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="px-4 sm:px-6 pb-6 flex flex-col gap-4 bg-[#0A0A0F]/95 backdrop-blur-xl border-b border-white/[0.06]">
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
              href="#faq"
              onClick={handleNavClick}
              className="text-sm text-gray-400 hover:text-white transition py-2"
            >
              FAQ
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
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 md:pt-36 pb-12 sm:pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            Primul AI de conținut nativ românesc
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-3xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-5 sm:mb-6"
        >
          Conținut viral cu{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-gradient">
              AI românesc
            </span>
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
              className="absolute -bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 rounded-full origin-left"
            />
          </span>
          <br />
          pe toate platformele
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
        >
          ContentOS analizează algoritmii Facebook, Instagram, TikTok și
          YouTube, apoi generează conținut optimizat cu AI care înțelege limba
          română — cu diacritice, slang și context cultural.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          <Link
            href="/register"
            className="group w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-semibold transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 relative overflow-hidden"
          >
            <span className="relative z-10">Încearcă gratuit →</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </Link>
          <Link
            href="#cum-functioneaza"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/[0.08] hover:border-white/[0.15] text-gray-300 hover:text-white font-medium transition-all hover:-translate-y-0.5 backdrop-blur-sm"
          >
            Cum funcționează?
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-2 sm:gap-y-3 text-xs sm:text-sm text-gray-500"
        >
          {["4 platforme", "AI nativ românesc", "GDPR compliant", "Gratis pentru început"].map((label, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-brand-400">✦</span> {label}
            </motion.span>
          ))}
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section
        id="cum-functioneaza"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
            Cum funcționează?
          </h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-12 sm:mb-16 max-w-2xl mx-auto">
            Trei pași simpli de la zero la conținut viral.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6">
          {steps.map((step, i) => (
            <FadeIn key={step.num} delay={i * 150}>
              <div className="relative text-center group">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-brand-500/30 to-transparent" />
                )}
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 group-hover:bg-brand-500/20 transition-all duration-300">
                  {step.icon}
                </div>
                <div className="text-xs font-bold text-brand-400 tracking-widest uppercase mb-2">
                  Pasul {step.num}
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
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
      <section
        id="features"
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
            Tot ce ai nevoie pentru conținut care funcționează
          </h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
            De la analiză la creație, ContentOS îți oferă avantajul AI pe piața
            românească.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 80}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-brand-500/25 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 group cursor-default h-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.03] to-purple-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="text-2xl sm:text-3xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2 group-hover:text-brand-300 transition">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Platforms ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <FadeIn>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 sm:p-8 md:p-10 text-center">
            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-white mb-2">
              Un singur tool. Toate platformele.
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
              Optimizat nativ pentru fiecare algoritm.
            </p>
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-10 flex-wrap">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-2 sm:gap-2.5 group"
                >
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full group-hover:scale-125 transition-transform"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white transition">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
            Prețuri simple, fără surprize
          </h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
            Începe gratuit, fă upgrade când ești gata.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-start">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={i * 100}>
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative rounded-2xl p-6 sm:p-7 h-full flex flex-col transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-gradient-to-b from-brand-500/10 to-pink-500/5 border-2 border-brand-500/40 shadow-xl shadow-brand-500/10"
                    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:shadow-lg hover:shadow-brand-500/5"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-brand-500 to-pink-500 text-[11px] font-bold text-white whitespace-nowrap">
                    Cel mai popular
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {plan.desc}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl sm:text-4xl font-bold text-white">
                    €{plan.price}
                  </span>
                  <span className="text-gray-500 ml-1 text-sm">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-2.5 mb-6 sm:mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                    >
                      <span className="text-brand-400 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`group/cta block text-center px-5 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all relative overflow-hidden ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white shadow-lg shadow-brand-500/25"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                  }`}
                >
                  <span className="relative z-10">{plan.cta}</span>
                  {plan.highlighted && (
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700" />
                  )}
                </Link>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── Early Adopters / Use Cases ── */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
            Pentru cine e ContentOS?
          </h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-14 max-w-2xl mx-auto">
            Orice business din România care vrea conținut profesional fără agenție.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {earlyAdopters.map((item, i) => (
            <FadeIn key={item.label} delay={i * 120}>
              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 h-full flex flex-col">
                <div className="flex-1">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.label}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={400}>
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-sm text-gray-300">
                Beta deschis — <span className="text-white font-medium">locuri limitate</span>
              </span>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20"
      >
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-3 sm:mb-4">
            Întrebări frecvente
          </h2>
          <p className="text-sm sm:text-base text-gray-400 text-center mb-10 sm:mb-14 max-w-xl mx-auto">
            Răspunsuri la cele mai comune întrebări despre ContentOS.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] px-5 sm:px-8">
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
        </FadeIn>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Gata cu ghiceala. Începe cu date.
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mb-8 sm:mb-10 max-w-xl mx-auto">
            Conectează-ți conturile, lasă AI-ul să analizeze, și creează conținut
            care chiar funcționează.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-brand-600 to-pink-600 hover:from-brand-500 hover:to-pink-500 text-white font-bold text-base sm:text-lg transition-all shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5"
          >
            Creează cont gratuit →
          </Link>
        </FadeIn>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                  C
                </div>
                <span className="text-sm font-bold text-white tracking-tight">
                  ContentOS
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                Platformă AI de conținut social media, nativă pentru piața
                românească.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.15] transition-all"
                  aria-label="Facebook"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.15] transition-all"
                  aria-label="Instagram"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.15] transition-all"
                  aria-label="TikTok"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:border-white/[0.15] transition-all"
                  aria-label="YouTube"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
              </div>
            </div>

            {/* Produs */}
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
                <li>
                  <Link
                    href="#faq"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    FAQ
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
                    href="/gdpr"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    GDPR
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Termeni și Condiții
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    Confidențialitate
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Contact
              </h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="mailto:contact@contentos.ro"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    contact@contentos.ro
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:suport@contentos.ro"
                    className="text-sm text-gray-500 hover:text-gray-300 transition"
                  >
                    suport@contentos.ro
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              © 2026 ContentOS. Toate drepturile rezervate.
            </div>
            <div className="text-xs text-gray-600">
              Made in România 🇷🇴
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
