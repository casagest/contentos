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
  Globe,
  Search,
  AlertCircle,
  Pencil,
  Facebook,
  Instagram,
  Music2,
  Linkedin,
} from "lucide-react";
import {
  updateOnboardingStep,
  completeOnboarding,
  saveResearchedProfile,
} from "./actions";

// ─── Industries ─────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { id: "dental", label: "Dental / Medical", icon: Building2 },
  { id: "restaurant", label: "Restaurant / HoReCa", icon: UtensilsCrossed },
  { id: "beauty", label: "Beauty / Salon", icon: Scissors },
  { id: "fitness", label: "Fitness / Sport", icon: Dumbbell },
  { id: "ecommerce", label: "E-commerce", icon: ShoppingCart },
  { id: "real_estate", label: "Imobiliare", icon: Home },
  { id: "education", label: "Educație / Cursuri", icon: GraduationCap },
  { id: "altele", label: "Altele", icon: Palette },
];

// ─── Platforms ────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "bg-blue-600", url: "/api/auth/facebook", Icon: Facebook },
  { id: "instagram", label: "Instagram", color: "bg-pink-600", url: "/api/auth/facebook", Icon: Instagram },
  { id: "tiktok", label: "TikTok", color: "bg-gray-700", url: "/api/auth/tiktok", Icon: Music2 },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-700", url: "/api/auth/linkedin", Icon: Linkedin },
];

// ─── Steps ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Industrie" },
  { label: "Website" },
  { label: "Profil" },
  { label: "Conectare" },
  { label: "Gata!" },
];

// ─── Types ────────────────────────────────────────────────────────────────

interface ResearchedProfile {
  name?: string;
  description?: string;
  industry?: string;
  targetAudience?: string;
  usps?: string;
  tones?: string[];
  preferredPhrases?: string;
  avoidPhrases?: string;
  website?: string;
  compliance?: string[];
  language?: string;
}

interface ResearchResult {
  profile: ResearchedProfile;
  intel: {
    pagesScraped: number;
    completeness: number;
    missingData: string[];
    socialAccounts: number;
  };
  source: string;
}

// ═════════════════════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // Step 1 — Website research
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);

  // Step 2 — Profile confirmation
  const [profile, setProfile] = useState<ResearchedProfile>({});

  // Step 3 — Platform connection
  const [connectedPlatforms, setConnectedPlatforms] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/social-accounts")
      .then((res) => res.json())
      .then((data) => {
        const accounts = data.accounts || [];
        setConnectedPlatforms(new Set(accounts.map((a: { platform: string }) => a.platform)));
      })
      .catch(() => {});
  }, []);

  // ── Navigation ──
  async function goToStep(nextStep: number) {
    setDirection(nextStep > step ? 1 : -1);
    setLoading(true);
    setError(null);
    await updateOnboardingStep(nextStep);
    setStep(nextStep);
    setLoading(false);
  }

  // ── Step 0: Industry ──
  async function handleIndustrySelect(industry: string) {
    setSelectedIndustry(industry);
    await goToStep(1);
  }

  // ── Step 1: Website Research ──
  async function handleResearch() {
    if (!websiteUrl.trim()) return;
    setResearching(true);
    setError(null);
    setResearchProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setResearchProgress((p) => {
        if (p >= 90) { clearInterval(interval); return 90; }
        return p + Math.random() * 12 + 3;
      });
    }, 300);

    try {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      const res = await fetch("/api/ai/research-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: url, industry: selectedIndustry }),
      });

      clearInterval(interval);
      setResearchProgress(100);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Eroare de rețea" }));
        throw new Error(data.error || `Eroare ${res.status}`);
      }

      const result: ResearchResult = await res.json();
      setResearchResult(result);
      setProfile({
        ...result.profile,
        industry: selectedIndustry || result.profile.industry,
        website: url,
      });

      setTimeout(() => goToStep(2), 500);
    } catch (err) {
      clearInterval(interval);
      setResearchProgress(0);
      setError(err instanceof Error ? err.message : "Cercetarea a eșuat.");
    } finally {
      setResearching(false);
    }
  }

  // ── Step 2: Save Profile ──
  async function handleProfileSave() {
    setLoading(true);
    await saveResearchedProfile(profile as Record<string, unknown>);
    await goToStep(3);
    setLoading(false);
  }

  // ── Step 4: Complete ──
  async function handleComplete() {
    setLoading(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  // ── Profile field update ──
  function updateField(field: keyof ResearchedProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  // ── Animations ──
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -24 : 24, opacity: 0 }),
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all";

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Stepper */}
      <div className="flex items-start justify-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const isDone = i < step;
          const isCurrent = i === step;
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  isDone ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : isCurrent ? "bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                    : "bg-white/[0.06] text-muted-foreground border border-white/[0.08]"
                }`}>
                  {isCurrent && <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" aria-hidden />}
                  <span className="relative z-10">{isDone ? <Check className="w-4 h-4" /> : i + 1}</span>
                </div>
                <span className={`mt-1.5 text-[10px] font-medium hidden sm:block ${isCurrent ? "text-orange-400" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 sm:w-10 h-0.5 mx-0.5 ${isDone ? "bg-green-500/50" : "bg-white/[0.08]"}`} style={{ marginTop: "14px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-8 shadow-2xl min-h-[340px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ═══ Step 0: Industrie ═══ */}
          {step === 0 && (
            <motion.div key="s0" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
              <div className="text-center">
                <h1 className="text-xl font-bold text-white mb-1">În ce industrie activezi?</h1>
                <p className="text-sm text-muted-foreground">Vom personaliza AI-ul pentru industria ta.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  return (
                    <button key={ind.id} onClick={() => handleIndustrySelect(ind.id)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition text-center ${
                        selectedIndustry === ind.id
                          ? "ring-2 ring-orange-500 bg-orange-500/10 border-orange-500/30"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-orange-500/30"
                      }`}>
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[11px] text-foreground/80">{ind.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ Step 1: Website URL + Auto Research ═══ */}
          {step === 1 && (
            <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Care e website-ul afacerii?</h2>
                <p className="text-sm text-muted-foreground">
                  Vom cerceta automat totul — servicii, prețuri, echipă, contact — și vom construi profilul tău complet.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleResearch(); }}
                  placeholder="ex: medicalcor.ro"
                  disabled={researching}
                  className={`${inputClass} pl-10`}
                />
              </div>

              {/* Research progress */}
              {researching && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-300 animate-progress-shimmer"
                      style={{
                        width: `${researchProgress}%`,
                        backgroundImage: "linear-gradient(90deg, rgb(249,115,22), rgb(236,72,153), rgb(168,85,247), rgb(249,115,22))",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {researchProgress < 30 && "Se scanează homepage-ul..."}
                    {researchProgress >= 30 && researchProgress < 60 && "Se cercetează paginile interne..."}
                    {researchProgress >= 60 && researchProgress < 85 && "Se extrag servicii, prețuri, echipă..."}
                    {researchProgress >= 85 && "Se construiește profilul..."}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleResearch}
                  disabled={!websiteUrl.trim() || researching}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {researching ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Se cercetează...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Cercetează automat</>
                  )}
                </button>
                <button onClick={() => goToStep(2)} className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition">
                  Completez manual
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 2: Confirm / Edit Auto-Populated Profile ═══ */}
          {step === 2 && (
            <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  {researchResult ? "Verifică profilul descoperit" : "Completează profilul"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {researchResult
                    ? `Am scanat ${researchResult.intel.pagesScraped} pagini. Verifică și corectează dacă e nevoie.`
                    : "Spune-ne despre afacerea ta."}
                </p>
              </div>

              {/* Research stats */}
              {researchResult && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/[0.06] border border-green-500/20 text-xs text-green-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>{researchResult.intel.pagesScraped} pagini scanate · Profil auto-populat din {researchResult.source === "ai_extracted" ? "AI" : "crawl"}</span>
                </div>
              )}

              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Numele afacerii</label>
                  <input type="text" value={profile.name || ""} onChange={(e) => updateField("name", e.target.value)}
                    placeholder="ex: Clinica MedicalCor" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Descriere <span className="text-white/30">({(profile.description || "").length}/2000)</span>
                  </label>
                  <textarea value={profile.description || ""} onChange={(e) => updateField("description", e.target.value.slice(0, 2000))}
                    placeholder="Ce face afacerea ta?" rows={3} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Public țintă</label>
                  <textarea value={profile.targetAudience || ""} onChange={(e) => updateField("targetAudience", e.target.value.slice(0, 1500))}
                    placeholder="Cine sunt clienții tăi?" rows={2} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">USP-uri / Diferențiatori</label>
                  <textarea value={profile.usps || ""} onChange={(e) => updateField("usps", e.target.value.slice(0, 2000))}
                    placeholder="Ce te face diferit?" rows={3} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Expresii preferate (telefon, brand, produse)</label>
                  <input type="text" value={profile.preferredPhrases || ""} onChange={(e) => updateField("preferredPhrases", e.target.value)}
                    placeholder="ex: One Step ALL-ON-X®, 0729 122 422" className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleProfileSave} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Pencil className="w-4 h-4" /> Confirmă profilul</>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 3: Connect Platforms ═══ */}
          {step === 3 && (
            <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">Conectează platformele</h2>
                <p className="text-sm text-muted-foreground">Conectează cel puțin o platformă pentru a publica direct.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORMS.map((p) => {
                  const Icon = p.Icon;
                  const isConnected = connectedPlatforms.has(p.id);
                  return (
                    <div key={p.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                      isConnected ? "border-green-500/30 bg-green-500/5" : "border-white/[0.08] bg-white/[0.02]"
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${p.color}`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{p.label}</span>
                      </div>
                      {isConnected ? (
                        <span className="flex items-center gap-1 text-xs text-green-400 shrink-0"><Check className="w-4 h-4" />Conectat</span>
                      ) : (
                        <a href={p.url} className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition">Conectează</a>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => goToStep(4)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] text-white text-sm font-medium transition">
                Continuă <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ═══ Step 4: Done ═══ */}
          {step === 4 && (
            <motion.div key="s4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="flex flex-col items-center text-center py-4">
              <h2 className="text-2xl font-bold text-white mb-2">Ești pregătit! 🎉</h2>
              <p className="text-muted-foreground text-sm mb-2 max-w-xs">
                Profilul afacerii tale e configurat cu date reale.
              </p>
              <p className="text-muted-foreground text-xs mb-6 max-w-xs">
                AI-ul va genera conținut bazat exclusiv pe informațiile verificate de pe site-ul tău.
              </p>
              <button onClick={handleComplete} disabled={loading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium transition disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Mergi la Dashboard <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
