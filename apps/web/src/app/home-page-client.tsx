"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Target,
  PenTool,
  Brain,
  Search,
  Lightbulb,
  CalendarDays,
  Film,
  Calculator,
  Clock,
  TrendingUp,
} from "lucide-react";

/* FadeIn removed — content visible instantly for better LCP and no invisible sections */

/* ─── FAQ Accordion Item ─── */
function FaqItem({
  question,
  answer,
  open,
  onToggle,
  id,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  id: string;
}) {
  const headingId = `faq-heading-${id}`;
  const panelId = `faq-panel-${id}`;

  return (
    <div className="border-b border-black/10 last:border-0" role="region">
      <h3>
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 py-5 text-left group"
          aria-expanded={open}
          aria-controls={panelId}
          id={headingId}
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
            aria-hidden="true"
          >
            +
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
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
    icon: BarChart3,
    title: "Antrenor AI",
    desc: "Coach-ul tău personal. Analizează istoricul complet și îți spune exact ce să postezi, când și pe ce platformă.",
  },
  {
    icon: Target,
    title: "Scor Conținut",
    desc: "Scor 0-100 pe 9 metrici per platformă. Știi cât de bine va performa postarea ÎNAINTE să o publici.",
  },
  {
    icon: PenTool,
    title: "Compune",
    desc: "Generează conținut optimizat per platformă dintr-un singur input. Cu diacritice corecte și limbaj actual.",
  },
  {
    icon: Brain,
    title: "Brain Dump",
    desc: "Aruncă orice gând — AI-ul le transformă în postări virale pentru Facebook, Instagram, TikTok și YouTube.",
  },
  {
    icon: Search,
    title: "Cercetare Conturi",
    desc: "Analizează competitorii: ce postează, când, cum și ce funcționează. Inspirează-te legal din ce e mai bun.",
  },
  {
    icon: Lightbulb,
    title: "Inspirație",
    desc: "Salvează postări de la alții și transformă-le instant în conținut cu vocea ta. Zero plagiat, 100% original.",
  },
  {
    icon: CalendarDays,
    title: "Istoric Postări",
    desc: "Vizualizează performanța pe cronologie. Descoperă modelele ascunse care îți cresc engagement-ul.",
  },
  {
    icon: Film,
    title: "Script Video",
    desc: "Generează scripturi video cu cronologie, indicații vizuale și tranziții. 6 stiluri, 5 durate. Gata de filmat.",
  },
];

const steps = [
  {
    num: "01",
    title: "Conectează conturile",
    desc: "Leagă Facebook, Instagram, TikTok și YouTube în câteva click-uri. Noi facem restul.",
  },
  {
    num: "02",
    title: "AI analizează totul",
    desc: "Algoritmul nostru scanează istoricul postărilor, competitorii și trendurile din piața românească.",
  },
  {
    num: "03",
    title: "Creează & publică",
    desc: "Primești conținut optimizat per platformă, gata de publicat. Cu scor de performanță înainte de post.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "99",
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
    price: "249",
    period: "/ lună",
    desc: "Tot ce ai nevoie pentru conținut viral",
    features: [
      "5 conturi sociale conectate",
      "Postări nelimitate",
      "Algorithm Scorer complet (9 metrici)",
      "AI Content Coach personalizat",
      "Brain Dump nelimitat",
      "Account Research (10 conturi)",
      "Analiză Istoric Postări",
      "Script Video Generator",
    ],
    cta: "Începe cu Pro",
    highlighted: true,
  },
  {
    name: "Agency",
    price: "499",
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
    q: "ContentOS funcționează pentru orice industrie?",
    a: "Da! ContentOS se adaptează la orice nișă — de la retail și HoReCa la clinici medicale și agenții. AI-ul învață specificul industriei tale și generează conținut relevant.",
  },
  {
    q: "Datele mele sunt în siguranță?",
    a: "100%. GDPR compliant, date stocate în Uniunea Europeană, criptare end-to-end. Poți solicita ștergerea completă oricând.",
  },
];

/* ─── A/B Test Hero Variants ─── */
const HERO_VARIANTS = {
  A: {
    headline: "Control Total asupra Conținutului",
    subheadline: "AI nativ românesc. Brain Dump → postări virale în 2 minute. Scor de performanță înainte de publicare.",
  },
  B: {
    headline: "Creează 5 Postări Optimizate în 2 Minute",
    subheadline: "AI-ul înțelege limba română, algoritmii platformelor și vocea ta. Tu dai ideea — el livrează conținut viral.",
  },
} as const;

type HeroVariant = keyof typeof HERO_VARIANTS;

function getHeroVariant(): HeroVariant {
  if (typeof document === "undefined") return "A";
  const match = document.cookie.match(/(?:^|; )cos_hero=([AB])/);
  if (match) return match[1] as HeroVariant;
  const variant: HeroVariant = Math.random() < 0.5 ? "A" : "B";
  document.cookie = `cos_hero=${variant};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`;
  return variant;
}

/* ─── ROI Calculator Component ─── */
function RoiCalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [hourlyRate, setHourlyRate] = useState(50);

  const monthlySavingsHours = hoursPerWeek * 4;
  const monthlySavingsRon = monthlySavingsHours * hourlyRate;
  const yearlySavingsRon = monthlySavingsRon * 12;
  const proPrice = 199; // annual price

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Calculator ROI</h3>
          <p className="text-xs text-gray-400">Cât economisești cu ContentOS?</p>
        </div>
      </div>

      {/* Slider: Ore pe săptămână */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="roi-hours" className="text-sm text-gray-300 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Ore conținut / săptămână
          </label>
          <span className="text-sm font-bold text-orange-400">{hoursPerWeek}h</span>
        </div>
        <input
          id="roi-hours"
          type="range"
          min={2}
          max={20}
          step={1}
          value={hoursPerWeek}
          onChange={(e) => setHoursPerWeek(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-orange-500"
          aria-label="Ore pe săptămână dedicate conținutului"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>2h</span>
          <span>20h</span>
        </div>
      </div>

      {/* Slider: Tarif orar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="roi-rate" className="text-sm text-gray-300 font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
            Tariful tău orar
          </label>
          <span className="text-sm font-bold text-orange-400">{hourlyRate} RON</span>
        </div>
        <input
          id="roi-rate"
          type="range"
          min={20}
          max={200}
          step={10}
          value={hourlyRate}
          onChange={(e) => setHourlyRate(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-orange-500"
          aria-label="Tarif orar în RON"
        />
        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
          <span>20 RON</span>
          <span>200 RON</span>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-xl bg-white/[0.06] border border-white/[0.08] p-5">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{monthlySavingsHours}h</div>
            <div className="text-[11px] text-gray-400 mt-1">ore salvate / lună</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">{monthlySavingsRon.toLocaleString("ro-RO")}</div>
            <div className="text-[11px] text-gray-400 mt-1">RON salvați / lună</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{Math.round(monthlySavingsRon / proPrice)}x</div>
            <div className="text-[11px] text-gray-400 mt-1">ROI vs plan Pro</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/[0.08] text-center">
          <p className="text-sm text-gray-300">
            Economisești <span className="text-emerald-400 font-bold">{yearlySavingsRon.toLocaleString("ro-RO")} RON / an</span> —
            ContentOS Pro costă <span className="text-white font-semibold">{proPrice * 12} RON / an</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Live Product Demo Showcase (replaces fake testimonials) ─── */
function ProductShowcase() {
  const [activeDemo, setActiveDemo] = useState(0);

  const demos = [
    {
      title: "Brain Dump → 3 Postări",
      input: "Am lansat o colecție nouă de cercei handmade, din argint cu pietre naturale...",
      outputs: [
        { platform: "Instagram", icon: "📸", text: "✨ NOUĂ COLECȚIE | Cercei handmade din argint cu pietre naturale 💎 Fiecare piesă e unică, creată manual cu atenție la detalii..." },
        { platform: "Facebook", icon: "📘", text: "Dragii mei! Am muncit 3 luni la colecția asta și sunt atât de mândră să vi-o arăt! 🥰 Cercei din argint 925 cu pietre naturale..." },
        { platform: "TikTok", icon: "🎵", text: "POV: tocmai ai lansat colecția la care ai lucrat 3 luni 🤩 Cercei handmade argint + pietre naturale | Link în bio" },
      ],
    },
    {
      title: "Scor Conținut AI",
      input: "Verifică postarea ta înainte să o publici",
      outputs: [
        { platform: "Hook", icon: "🎯", text: "92/100 — Captează atenția în primele 3 secunde" },
        { platform: "CTA", icon: "📢", text: "78/100 — Adaugă un call-to-action mai specific" },
        { platform: "Engagement", icon: "💬", text: "95/100 — Provoacă comentarii și share-uri" },
      ],
    },
    {
      title: "Coach AI Personalizat",
      input: "Ce să postez săptămâna asta?",
      outputs: [
        { platform: "Luni 10:00", icon: "📅", text: "Carousel educativ despre procesul de creație — engagement x3 pe contul tău" },
        { platform: "Miercuri 14:00", icon: "📅", text: "Reel behind-the-scenes la atelier — TikTok trending sound recomandat" },
        { platform: "Vineri 18:00", icon: "📅", text: "Testimonial client + produs — boost de conversii weekend" },
      ],
    },
  ];

  const current = demos[activeDemo];

  return (
    <div>
      {/* Demo tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {demos.map((demo, i) => (
          <button
            key={demo.title}
            onClick={() => setActiveDemo(i)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeDemo === i
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                : "bg-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.1]"
            }`}
          >
            {demo.title}
          </button>
        ))}
      </div>

      {/* Demo card */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Input */}
          <div className="p-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">Input</span>
            </div>
            <p className="text-sm text-gray-300 italic">&ldquo;{current.input}&rdquo;</p>
          </div>

          {/* Output */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Output AI</span>
            </div>
            <div className="space-y-3">
              {current.outputs.map((output) => (
                <div
                  key={output.platform}
                  className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{output.icon}</span>
                    <span className="text-xs font-bold text-white">{output.platform}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{output.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Component ─── */
export default function HomePageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [annual, setAnnual] = useState(true);
  const [heroVariant] = useState<HeroVariant>(getHeroVariant);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="min-h-screen bg-surface-ground">
      {/* ── Navigation ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-surface-ground/95 backdrop-blur-xl shadow-lg"
            : "bg-surface-ground"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-orange-500/25">
              C
            </div>
            <span className="font-display text-xl font-bold text-white tracking-tight">
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
          <div className="px-6 pb-6 flex flex-col gap-4 bg-surface-ground">
            <Link href="#cum-functioneaza" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Cum funcționează</Link>
            <Link href="#features" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Funcționalități</Link>
            <Link href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">Prețuri</Link>
            <Link href="#faq" onClick={() => setMenuOpen(false)} className="text-sm text-gray-300 hover:text-white py-2">FAQ</Link>
            <Link href="/login" className="text-sm px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-center">Începe gratuit</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (Command Center aesthetic) ── */}
      <section className="relative pt-28 sm:pt-36 pb-20 sm:pb-28 px-6 overflow-hidden">
        {/* Grid + subtle orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.08)_0%,transparent_65%)] top-[-10%] right-[0%] blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        </div>

        <div className="relative max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          {/* Left — Text */}
          <div className="flex-1 text-center lg:text-left">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-block text-[11px] font-mono tracking-[0.2em] uppercase text-orange-400/90 mb-4"
            >
              Pentru industria digitală
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6 text-white"
              data-ab-variant={heroVariant}
            >
              {HERO_VARIANTS[heroVariant].headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              {HERO_VARIANTS[heroVariant].subheadline}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
            >
              <Link
                href="/register"
                className="group relative w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-base transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-[1px] active:translate-y-0 overflow-hidden"
              >
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="relative flex items-center gap-2 justify-center">
                  Începe Gratuit
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </span>
              </Link>
              <Link
                href="#cum-functioneaza"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/25 text-gray-400 hover:text-white font-semibold text-base transition-all hover:-translate-y-[1px]"
              >
                Vezi demonstrație
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-5 sm:gap-8"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {["bg-orange-400", "bg-blue-400", "bg-emerald-400", "bg-pink-400", "bg-purple-400"].map((color, i) => (
                    <div key={i} className={`w-7 h-7 rounded-full ${color} border-2 border-surface-ground flex items-center justify-center text-white text-[9px] font-bold`}>
                      {["A", "M", "R", "I", "D"][i]}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-gray-500"><span className="text-white font-semibold">2,400+</span> creatori</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-3.5 h-3.5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-500"><span className="text-white font-semibold">4.9</span>/5</span>
              </div>
              <span className="text-sm text-gray-500"><span className="text-white font-semibold">1M+</span> postări</span>
            </motion.div>
          </div>

          {/* Right — Brain Dump mockup card + floating badges */}
          <motion.div
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md lg:max-w-lg shrink-0"
          >
            {/* Main glass card — Command Center style */}
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.04] backdrop-blur-xl p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display text-sm font-bold text-white">Brain Dump</span>
                <span className="font-mono text-[10px] text-orange-400/80">READY</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-white/[0.07] rounded w-full" />
                <div className="h-2 bg-white/[0.07] rounded w-[85%]" />
                <div className="h-2 bg-white/[0.07] rounded w-[60%]" />
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
                <span className="font-mono text-sm font-semibold text-emerald-400">92</span>
                <div className="flex gap-1.5">
                  {["#viral", "#trending"].map((tag) => (
                    <span key={tag} className="font-mono px-2 py-0.5 rounded text-[9px] bg-white/[0.05] text-white/60">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating mini-cards animate */}
            <div className="absolute -top-3 -right-2 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-3 py-2 shadow-lg animate-[pulse_4s_ease-in-out_infinite]">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-green-500/25 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[10px] text-green-400 font-semibold">Optimizat AI</span>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-2 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl px-3 py-2 shadow-lg animate-[pulse_5s_ease-in-out_infinite_2s]">
              <div className="flex items-center gap-1.5">
                <span className="text-orange-400 text-xs">⚡</span>
                <span className="text-[10px] text-white/70 font-medium">2 min/postare</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Bento Grid (warm section) ── */}
      <section id="features" className="bg-landing-warm py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-4">
              Șapte Instrumente. Un singur Command Center.
            </h2>
            <p className="text-base sm:text-lg text-gray-700 text-center mb-14 sm:mb-20 max-w-2xl mx-auto">
              Creatori, SMM, agenții — tot ce ai nevoie într-o singură platformă.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">
            {/* Primele 2 — carduri mari cu mini-mockup */}
            {features.slice(0, 2).map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="md:col-span-2 lg:col-span-3">
                  <div className="bg-landing-warm-card rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col md:flex-row items-start gap-4">
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/80 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                        <Icon className="w-6 h-6 text-orange-600" />
                      </div>
                      <h3 className="text-heading-3 text-black mb-2 tracking-tight">
                        {feature.title}
                      </h3>
                      <p className="text-body text-gray-700 leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                    <div className=" shrink-0 w-full md:w-36 lg:w-40">
                      {feature.title === "Antrenor AI" ? (
                        <div className="space-y-2 ml-auto">
                          <div className="rounded-xl rounded-br-md bg-black/8 px-3 py-2 text-xs text-gray-800 w-[85%] ml-auto">
                            Postează marți, 14:00 — Instagram
                          </div>
                          <div className="rounded-xl rounded-bl-md bg-orange-500/15 px-3 py-2 text-xs text-gray-800 w-[75%]">
                            ✓ Analizat. Recomandare salvată.
                          </div>
                          <div className="rounded-xl rounded-br-md bg-black/8 px-3 py-2 text-xs text-gray-800 w-[90%] ml-auto">
                            Ce topic preferi săptămâna asta?
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 bg-black/5 rounded-xl p-3">
                          <div className="flex justify-between text-[10px] text-gray-600 font-medium">
                            <span>Hook</span>
                            <span>92</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                            <div className="h-full w-[92%] rounded-full bg-emerald-500" />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600 font-medium">
                            <span>CTA</span>
                            <span>87</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                            <div className="h-full w-[87%] rounded-full bg-emerald-400" />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-600 font-medium">
                            <span>Interacțiune</span>
                            <span>94</span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                            <div className="h-full w-[94%] rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Următoarele 6 — grid 3 coloane */}
            {features.slice(2).map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="lg:col-span-2">
                  <div className="bg-landing-warm-card rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/80 flex items-center justify-center shrink-0 mb-3" aria-hidden="true">
                      <Icon className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-heading-3 text-black mb-2 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-body text-gray-700 leading-relaxed flex-1">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works (dark section) ── */}
      <section id="cum-functioneaza" className="bg-surface-ground py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white text-center tracking-tight mb-4">
              Cum Funcționează ContentOS
            </h2>
            <p className="text-base sm:text-lg text-gray-400 text-center mb-14 sm:mb-20 max-w-xl mx-auto">
              Trei pași simpli de la zero la conținut viral.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.num}>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:scale-110 hover:bg-white/10 transition-all duration-300">
                    <span className="text-heading-1 font-extrabold text-orange-400">{step.num}</span>
                  </div>
                  <div className="text-caption font-bold text-orange-400 tracking-[0.2em] uppercase mb-3">
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
      <section className="bg-landing-warm py-20 sm:py-28 px-6">
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
              <div className="bg-surface-ground rounded-2xl p-8 shadow-2xl">
                <div className="bg-surface-overlay rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span className="text-xs text-orange-400 font-bold">Scor Algoritm</span>
                  </div>
                  <div className="text-5xl font-extrabold text-white mb-2">87<span className="text-2xl text-gray-400">/100</span></div>
                  <div className="text-sm text-emerald-400 font-semibold mb-4">✓ Excelent — gata de publicare</div>
                  <div className="space-y-2">
                    {[
                      { label: "Putere hook", score: 92, color: "bg-emerald-400" },
                      { label: "Lizibilitate", score: 88, color: "bg-emerald-400" },
                      { label: "Putere CTA", score: 76, color: "bg-yellow-400" },
                      { label: "Potențial Interacțiune", score: 91, color: "bg-emerald-400" },
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
      <section className="bg-landing-olive py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 bg-surface-ground rounded-2xl p-8 shadow-2xl">
                <div className="bg-surface-overlay rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-blue-400 font-bold">Brain Dump</span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/5 rounded-lg p-3 ml-8">
                      <p className="text-xs text-gray-300">Am făcut un implant azi, pacientul era super fericit cu rezultatul...</p>
                    </div>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mr-8">
                      <p className="text-xs text-orange-300">🎯 <strong>3 postări generate:</strong></p>
                      <p className="text-xs text-gray-300 mt-1">• Facebook: Testimonial cu before/after</p>
                      <p className="text-xs text-gray-300">• Instagram: Carusel educativ despre implanturi</p>
                      <p className="text-xs text-gray-300">• TikTok: Script video 30s &bdquo;Transformarea zilei&rdquo;</p>
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

      {/* ── Product Demo Showcase (replaces fake testimonials) ── */}
      <section className="bg-surface-ground py-20 sm:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white text-center tracking-tight mb-4">
            Vezi ContentOS în Acțiune
          </h2>
          <p className="text-base sm:text-lg text-gray-400 text-center mb-14 max-w-xl mx-auto">
            De la idee la postări virale — în câteva secunde.
          </p>

          <ProductShowcase />
        </div>
      </section>

      {/* ── Comparison Table (warm section) ── */}
      <section className="bg-landing-warm py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-4">
            De Ce ContentOS?
          </h2>
          <p className="text-base sm:text-lg text-gray-700 text-center mb-14 max-w-xl mx-auto">
            Compară cu alternativele tradiționale.
          </p>

          <div className="rounded-2xl border border-black/5 overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-landing-warm-card">
                  <th className="text-left px-5 py-4 font-semibold text-black">Funcționalitate</th>
                  <th className="px-5 py-4 font-bold text-orange-600 text-center">ContentOS</th>
                  <th className="px-5 py-4 font-semibold text-gray-500 text-center">Manual</th>
                  <th className="px-5 py-4 font-semibold text-gray-500 text-center">Alte tool-uri</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Conținut în limba română", true, false, "partial"],
                  ["Scor algoritm per platformă", true, false, false],
                  ["Brain Dump → postări virale", true, false, false],
                  ["Cercetare competitori", true, "manual", "partial"],
                  ["Optimizat per platformă", true, false, "partial"],
                  ["Script video cu timeline", true, false, false],
                  ["7 zile gratuit", true, "n/a", "partial"],
                  ["Timp / postare", "~2 min", "~45 min", "~15 min"],
                ].map(([feature, contentos, manual, altele], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white/60" : "bg-white/30"}>
                    <td className="px-5 py-3 text-black font-medium">{feature as string}</td>
                    <td className="px-5 py-3 text-center">
                      {contentos === true ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10"><svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                      ) : (
                        <span className="text-orange-600 font-bold">{contentos as string}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {manual === false ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                      ) : manual === "n/a" ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className="text-gray-600">{manual as string}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {altele === false ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10"><svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></span>
                      ) : altele === "partial" ? (
                        <span className="text-yellow-600 text-xs font-medium">Parțial</span>
                      ) : (
                        <span className="text-gray-600">{altele as string}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Pricing (warm section) ── */}
      <section id="pricing" className="bg-landing-olive py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-4">
              Prețuri Simple
            </h2>
            <p className="text-base sm:text-lg text-gray-700 text-center mb-8 max-w-xl mx-auto">
              Începe cu 7 zile gratuit. Fără card de credit.
            </p>

            {/* Annual/Monthly toggle */}
            <div className="flex items-center justify-center gap-3 mb-14">
              <span className={`text-sm font-medium ${!annual ? "text-black" : "text-gray-500"}`}>Lunar</span>
              <button
                onClick={() => setAnnual(!annual)}
                role="switch"
                aria-checked={annual}
                aria-label="Comută între facturare lunară și anuală"
                className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-orange-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${annual ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
              <span className={`text-sm font-medium ${annual ? "text-black" : "text-gray-500"}`}>
                Anual <span className="text-orange-600 font-bold text-xs">-20%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map((plan) => {
              const monthlyPrice = parseInt(plan.price);
              const displayPrice = annual ? Math.round(monthlyPrice * 0.8) : monthlyPrice;
              return (
              <div key={plan.name}>
                <div
                  className={`relative rounded-2xl p-7 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    plan.highlighted
                      ? "bg-landing-olive shadow-2xl scale-[1.02]"
                      : "bg-landing-warm-card shadow-lg"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-orange-500 text-xs font-bold text-white whitespace-nowrap shadow-lg">
                      Cel mai popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-black mb-1">{plan.name}</h3>
                  <p className="text-body text-gray-600 mb-5">{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-black">{displayPrice} RON</span>
                    <span className="text-gray-500 ml-1">/ {annual ? "lună, facturat anual" : "lună"}</span>
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
                        : "bg-surface-ground hover:bg-surface-overlay text-white"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
              );
            })}
          </div>

          {/* ROI Calculator */}
          <div className="mt-14 max-w-lg mx-auto" id="roi-calculator">
            <RoiCalculator />
          </div>

          <div>
            <p className="text-center text-sm text-gray-600 mt-8">
              sau <Link href="/register" className="text-orange-600 font-semibold hover:underline">încearcă 7 zile gratuit</Link> — fără card de credit
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ (olive section) ── */}
      <section id="faq" className="bg-landing-olive py-20 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-black text-center tracking-tight mb-14">
              Întrebări Frecvente
            </h2>
          </div>

          <div>
            <div className="bg-landing-warm rounded-2xl px-8 py-2 shadow-lg">
              {faqs.map((faq, i) => (
                <FaqItem
                  key={faq.q}
                  id={String(i)}
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
      <section className="bg-surface-ground py-20 sm:py-28 px-6 text-center">
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
      <footer className="bg-landing-darkest py-12 px-6">
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
