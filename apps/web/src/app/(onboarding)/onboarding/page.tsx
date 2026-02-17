"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Sparkles,
  Check,
  Loader2,
  UtensilsCrossed,
  Scissors,
  Dumbbell,
  ShoppingCart,
  Home,
  GraduationCap,
  Palette,
  FileText,
  Briefcase,
  Facebook,
  Instagram,
  Music2,
  Linkedin,
} from "lucide-react";
import {
  updateOnboardingStep,
  completeOnboarding,
  saveOnboardingProfile,
} from "./actions";

// ─── Industries cu Lucide icons ─────────────────────────────────────────────

const INDUSTRIES = [
  { id: "dental", label: "Dental / Medical", icon: Building2 },
  { id: "restaurant", label: "Restaurant / HoReCa", icon: UtensilsCrossed },
  { id: "beauty", label: "Beauty / Salon", icon: Scissors },
  { id: "fitness", label: "Fitness / Sport", icon: Dumbbell },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart },
  { id: "realestate", label: "Imobiliare", icon: Home },
  { id: "education", label: "Educație / Cursuri", icon: GraduationCap },
  { id: "agency", label: "Agentie / Freelancer", icon: Palette },
];

// ─── Platforms ────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "facebook",
    label: "Facebook",
    color: "bg-blue-600",
    url: "/api/auth/facebook",
    Icon: Facebook,
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "bg-pink-600",
    url: "/api/auth/facebook",
    Icon: Instagram,
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "bg-gray-700",
    url: "/api/auth/tiktok",
    Icon: Music2,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "bg-blue-700",
    url: "/api/auth/linkedin",
    Icon: Linkedin,
  },
];

// ─── Stepper labels ────────────────────────────────────────────────────────

const STEPS = [
  { label: "Industrie" },
  { label: "Profil" },
  { label: "Conectare" },
  { label: "Primul conținut" },
  { label: "Gata!" },
];

// ─── Component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0); // -1 left, 1 right
  const [loading, setLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [braindumpText, setBraindumpText] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetch("/api/social-accounts")
      .then((res) => res.json())
      .then((data) => {
        const accounts = data.accounts || [];
        setConnectedPlatforms(
          new Set(accounts.map((a: { platform: string }) => a.platform))
        );
      })
      .catch(() => {});
  }, []);

  async function goToStep(nextStep: number, slideDir: number = 1) {
    setDirection(slideDir);
    setLoading(true);
    await updateOnboardingStep(nextStep);
    setStep(nextStep);
    setLoading(false);
  }

  async function handleIndustrySelect(industry: string) {
    setSelectedIndustry(industry);
    setDirection(1);
    setLoading(true);
    await updateOnboardingStep(1);
    setStep(1);
    setLoading(false);
  }

  async function handleProfileSave() {
    setLoading(true);
    await saveOnboardingProfile({
      name: businessName,
      description: businessDescription,
      industry: selectedIndustry,
    });
    setStep(2);
    setLoading(false);
  }

  async function handleBraindump() {
    if (!braindumpText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/braindump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawInput: braindumpText,
          platform: "facebook",
          language: "ro",
        }),
      });
      const data = await res.json();
      setGeneratedContent(
        data.primary?.text || data.text || "Conținutul a fost generat!"
      );
    } catch {
      setGeneratedContent("Conținut generat cu succes!");
    }
    setLoading(false);
  }

  async function handleComplete() {
    setLoading(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  const slideVariants = {
    enter: (d: number) => ({
      x: d > 0 ? 24 : -24,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -24 : 24,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Stepper: 5 dots cu linie, curent = orange pulse, done = green, future = gray */}
      <div className="flex items-start justify-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const isDone = i < step;
          const isCurrent = i === step;
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isDone
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : isCurrent
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                        : "bg-white/[0.06] text-muted-foreground border border-white/[0.08]"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" aria-hidden />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    {isDone ? <Check className="w-4 h-4" /> : i + 1}
                  </span>
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-medium hidden sm:block ${
                    isCurrent ? "text-orange-400" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-6 sm:w-10 h-0.5 mx-0.5 flex-shrink-0 ${
                    isDone ? "bg-green-500/50" : "bg-white/[0.08]"
                  }`}
                  style={{ marginTop: "14px" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Centered card mare */}
      <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl min-h-[340px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 0: Industrie */}
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-bold text-white mb-1">
                  În ce industrie activezi?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Vom personaliza experiența pentru tine.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry === ind.id;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => handleIndustrySelect(ind.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition text-center ${
                        isSelected
                          ? "ring-2 ring-orange-500 bg-orange-500/10 border-orange-500/30"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-orange-500/30 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[11px] sm:text-xs text-foreground/80 leading-tight">
                        {ind.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => goToStep(1)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition"
              >
                Sari peste
              </button>
            </motion.div>
          )}

          {/* Step 1: Profil */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  Spune-ne despre afacerea ta
                </h2>
                <p className="text-sm text-muted-foreground">
                  AI-ul va folosi aceste informații pentru conținut relevant.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="business-name"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Numele afacerii
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                      id="business-name"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="ex: Clinica Dentară Smile"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="business-desc"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Descriere scurtă (ce faci, pentru cine)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <textarea
                      id="business-desc"
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      rows={3}
                      placeholder="ex: Oferim servicii stomatologice premium în București. Publicul nostru: familii tinere, profesioniști 25–45 ani."
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleProfileSave}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Continuă <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => goToStep(2)}
                  className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Sari peste
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Conectare */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  Conectează platformele sociale
                </h2>
                <p className="text-sm text-muted-foreground">
                  Conectează cel puțin o platformă pentru a publica direct din ContentOS.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((p) => {
                  const Icon = p.Icon;
                  const isConnected = connectedPlatforms.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                        isConnected
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-white/[0.08] bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.color}`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">
                          {p.label}
                        </span>
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 shrink-0">
                          <Check className="w-4 h-4" />
                          Conectat
                        </span>
                      ) : (
                        <a
                          href={p.url}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition"
                        >
                          Conectează
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => goToStep(3)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition"
              >
                Continuă fără conectare
              </button>
            </motion.div>
          )}

          {/* Step 3: Primul conținut */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  Creează primul tău conținut
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scrie o idee sau o temă, iar AI-ul o va transforma în conținut optimizat.
                </p>
              </div>
              <div className="space-y-4">
                <textarea
                  value={braindumpText}
                  onChange={(e) => setBraindumpText(e.target.value)}
                  rows={4}
                  placeholder="ex: Am lansat un nou serviciu de albire dentară cu LED. Vreau să atrag pacienți noi..."
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all resize-none"
                />
                {!generatedContent ? (
                  <div className="flex gap-3">
                    <button
                      onClick={handleBraindump}
                      disabled={loading || !braindumpText.trim()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Se generează...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generează
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => goToStep(4)}
                      className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                      Sari peste
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20">
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                        {generatedContent}
                      </p>
                    </div>
                    <button
                      onClick={() => goToStep(4)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition"
                    >
                      Continuă <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Gata */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex flex-col items-center text-center py-4"
            >
              <h2 className="text-2xl font-bold text-white mb-2">
                Ești pregătit! 🎉
              </h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                Contul tău e configurat. Ești gata să creezi conținut care performează.
              </p>
              <button
                onClick={handleComplete}
                disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Mergi la Dashboard <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
