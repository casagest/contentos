"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
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
  Phone,
  Mail,
  MapPin,
  Clock,
  Star,
  Users,
  BadgeCheck,
  Tag,
  MessageCircle,
  Sparkles,
  FileSearch,
  ExternalLink,
} from "lucide-react";
import {
  updateOnboardingStep,
  completeOnboarding,
  saveResearchedProfile,
} from "./actions";

// ─── Industries ─────────────────────────────────────────────────────────

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

// ─── Platforms ─────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "bg-blue-600", url: "/api/auth/facebook", Icon: Facebook },
  { id: "instagram", label: "Instagram", color: "bg-pink-600", url: "/api/auth/facebook", Icon: Instagram },
  { id: "tiktok", label: "TikTok", color: "bg-gray-700", url: "/api/auth/tiktok", Icon: Music2 },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-700", url: "/api/auth/linkedin", Icon: Linkedin },
];

// ─── Steps ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Industrie" },
  { label: "Website" },
  { label: "Descoperiri" },
  { label: "Profil" },
  { label: "Conectare" },
  { label: "Gata!" },
];

// ─── Types ─────────────────────────────────────────────────────────────

interface DiscoveryItem {
  text: string;
  source: string;
}

interface Discoveries {
  name: string;
  description: string;
  services: DiscoveryItem[];
  team: DiscoveryItem[];
  contact: {
    phone: string[];
    email: string[];
    address: string;
    city: string;
    schedule: string;
  };
  prices: DiscoveryItem[];
  usps: DiscoveryItem[];
  testimonials: DiscoveryItem[];
  targetAudience: string;
  tones: string[];
  preferredPhrases: string[];
  socialLinks: { platform: string; url: string }[];
  compliance: string[];
  pagesScraped: { url: string; type: string; contentLength: number }[];
}

interface BusinessReputation {
  reviews: string[];
  sentiment: string;
  mentions: string[];
  competitors: string[];
  awards: string[];
}

interface IndustryIntel {
  industry: string;
  trends: string[];
  contentStrategies: string[];
  audienceInsights: string[];
  topContentTypes: string[];
  statistics: string[];
  regulations: string[];
  seasonalPatterns: string[];
  localInsights: string[];
  sources: string[];
}

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
}

// ═══════════════════════════════════════════════════════════════════════

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 0 — Industry
  const [selectedIndustry, setSelectedIndustry] = useState("");

  // Step 1 — Website
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState(0);

  // Step 2 — Discoveries + Deep Research
  const [discoveries, setDiscoveries] = useState<Discoveries | null>(null);
  const [reputation, setReputation] = useState<BusinessReputation | null>(null);
  const [industryIntel, setIndustryIntel] = useState<IndustryIntel | null>(null);
  const [pagesScrapedCount, setPagesScrapedCount] = useState(0);
  const [hasPerplexity, setHasPerplexity] = useState(false);

  // Step 3 — Profile
  const [profile, setProfile] = useState<ResearchedProfile>({});

  // Step 4 — Platforms
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

  // ── Step 1: Research ──
  async function handleResearch() {
    if (!websiteUrl.trim()) return;
    setResearching(true);
    setError(null);
    setResearchProgress(0);

    const progressInterval = setInterval(() => {
      setResearchProgress((p) => {
        if (p >= 90) { clearInterval(progressInterval); return 90; }
        return p + Math.random() * 8 + 2;
      });
    }, 400);

    try {
      const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
      const res = await fetch("/api/ai/research-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website: url, industry: selectedIndustry }),
      });

      clearInterval(progressInterval);
      setResearchProgress(100);

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Eroare de rețea" }));
        throw new Error(data.error || `Eroare ${res.status}`);
      }

      const result = await res.json();
      setDiscoveries(result.discoveries);
      setReputation(result.reputation || null);
      setIndustryIntel(result.industryIntel || null);
      setPagesScrapedCount(result.intel?.pagesScraped || 0);
      setHasPerplexity(result.intel?.hasPerplexity || false);

      // Pre-build profile from API
      if (result.profile) {
        setProfile({
          ...result.profile,
          industry: selectedIndustry || result.profile.industry,
          website: url,
        });
      }

      setTimeout(() => goToStep(2), 600);
    } catch (err) {
      clearInterval(progressInterval);
      setResearchProgress(0);
      setError(err instanceof Error ? err.message : "Cercetarea a eșuat.");
    } finally {
      setResearching(false);
    }
  }

  // ── Step 3: Save Profile ──
  async function handleProfileSave() {
    setLoading(true);
    await saveResearchedProfile(profile as Record<string, unknown>);
    await goToStep(4);
    setLoading(false);
  }

  // ── Step 5: Complete ──
  async function handleComplete() {
    setLoading(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  function updateField(field: keyof ResearchedProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  // ── Count total discoveries ──
  const totalDiscoveries = discoveries
    ? discoveries.services.length + discoveries.team.length +
      discoveries.prices.length + discoveries.usps.length +
      discoveries.testimonials.length + discoveries.contact.phone.length +
      discoveries.contact.email.length + discoveries.socialLinks.length +
      (discoveries.contact.address ? 1 : 0) + (discoveries.contact.schedule ? 1 : 0)
    : 0;

  // ── Animations ──
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -24 : 24, opacity: 0 }),
  };
  const inputClass = "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-muted-foreground/60 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all";

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Stepper */}
      <div className="flex items-start justify-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const isDone = i < step;
          const isCurrent = i === step;
          return (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                  isDone ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : isCurrent ? "bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.35)]"
                    : "bg-white/[0.06] text-muted-foreground border border-white/[0.08]"
                }`}>
                  {isCurrent && <span className="absolute inset-0 rounded-full bg-orange-500/30 animate-ping" aria-hidden />}
                  <span className="relative z-10">{isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}</span>
                </div>
                <span className={`mt-1 text-[9px] font-medium hidden sm:block ${isCurrent ? "text-orange-400" : "text-muted-foreground"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-4 sm:w-7 h-0.5 mx-0.5 ${isDone ? "bg-green-500/50" : "bg-white/[0.08]"}`} style={{ marginTop: "12px" }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl min-h-[380px] overflow-hidden">
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
                        selectedIndustry === ind.id ? "ring-2 ring-orange-500 bg-orange-500/10 border-orange-500/30"
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

          {/* ═══ Step 1: Website URL + Research ═══ */}
          {step === 1 && (
            <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Care e website-ul afacerii?</h2>
                <p className="text-sm text-muted-foreground">
                  Vom cerceta totul automat — servicii, prețuri, echipă, contact, recenzii — și îți arătăm ce am descoperit.
                </p>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleResearch(); }}
                  placeholder="ex: medicalcor.ro" disabled={researching} className={`${inputClass} pl-10`} />
              </div>

              {researching && (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className="h-full rounded-full transition-[width] duration-300"
                      style={{
                        width: `${researchProgress}%`,
                        backgroundImage: "linear-gradient(90deg, rgb(249,115,22), rgb(236,72,153), rgb(168,85,247), rgb(249,115,22))",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 2s linear infinite",
                      }} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {researchProgress < 20 && "Se accesează website-ul..."}
                    {researchProgress >= 20 && researchProgress < 40 && "Se scanează homepage-ul..."}
                    {researchProgress >= 40 && researchProgress < 60 && "Se cercetează paginile interne..."}
                    {researchProgress >= 60 && researchProgress < 80 && "Se extrag servicii, echipă, prețuri..."}
                    {researchProgress >= 80 && "Se analizează datele cu AI..."}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleResearch} disabled={!websiteUrl.trim() || researching}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50">
                  {researching ? <><Loader2 className="w-4 h-4 animate-spin" /> Se cercetează...</>
                    : <><FileSearch className="w-4 h-4" /> Cercetează automat</>}
                </button>
                <button onClick={() => goToStep(3)} className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition">
                  Completez manual
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 2: Research Report — "Ce am descoperit" ═══ */}
          {step === 2 && discoveries && (
            <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">Ce am descoperit despre afacerea ta</h2>
                <p className="text-sm text-muted-foreground">
                  Am scanat {pagesScrapedCount} pagini{hasPerplexity ? " + cercetare online aprofundată" : ""} și am extras {totalDiscoveries}+ informații reale.
                </p>
              </div>

              {/* Discoveries grid */}
              <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">

                {/* Business name + description */}
                {discoveries.name && (
                  <DiscoveryCard icon={Building2} title="Afacerea" color="orange">
                    <p className="text-sm text-white font-medium">{discoveries.name}</p>
                    {discoveries.description && <p className="text-xs text-muted-foreground mt-1">{discoveries.description}</p>}
                  </DiscoveryCard>
                )}

                {/* Services */}
                {discoveries.services.length > 0 && (
                  <DiscoveryCard icon={Tag} title={`${discoveries.services.length} Servicii descoperite`} color="blue">
                    <div className="flex flex-wrap gap-1.5">
                      {discoveries.services.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                          {s.text}
                        </span>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Team */}
                {discoveries.team.length > 0 && (
                  <DiscoveryCard icon={Users} title={`${discoveries.team.length} Membri echipă`} color="purple">
                    <div className="space-y-1">
                      {discoveries.team.map((t, i) => (
                        <div key={i} className="text-xs text-purple-300 flex items-center gap-1.5">
                          <BadgeCheck className="w-3 h-3 shrink-0" />
                          {t.text}
                        </div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Contact */}
                {(discoveries.contact.phone.length > 0 || discoveries.contact.email.length > 0 || discoveries.contact.address) && (
                  <DiscoveryCard icon={Phone} title="Contact" color="green">
                    <div className="space-y-1.5">
                      {discoveries.contact.phone.map((p, i) => (
                        <div key={`p${i}`} className="text-xs text-green-300 flex items-center gap-1.5"><Phone className="w-3 h-3" />{p}</div>
                      ))}
                      {discoveries.contact.email.map((e, i) => (
                        <div key={`e${i}`} className="text-xs text-green-300 flex items-center gap-1.5"><Mail className="w-3 h-3" />{e}</div>
                      ))}
                      {discoveries.contact.address && (
                        <div className="text-xs text-green-300 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{discoveries.contact.address}</div>
                      )}
                      {discoveries.contact.schedule && (
                        <div className="text-xs text-green-300 flex items-center gap-1.5"><Clock className="w-3 h-3" />{discoveries.contact.schedule}</div>
                      )}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Prices */}
                {discoveries.prices.length > 0 && (
                  <DiscoveryCard icon={Tag} title={`${discoveries.prices.length} Prețuri găsite`} color="yellow">
                    <div className="space-y-1">
                      {discoveries.prices.map((p, i) => (
                        <div key={i} className="text-xs text-yellow-300">• {p.text}</div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* USPs */}
                {discoveries.usps.length > 0 && (
                  <DiscoveryCard icon={Star} title="Ce te face diferit" color="orange">
                    <div className="space-y-1">
                      {discoveries.usps.map((u, i) => (
                        <div key={i} className="text-xs text-orange-300 flex items-start gap-1.5">
                          <Star className="w-3 h-3 mt-0.5 shrink-0" />
                          {u.text}
                        </div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Testimonials */}
                {discoveries.testimonials.length > 0 && (
                  <DiscoveryCard icon={MessageCircle} title={`${discoveries.testimonials.length} Recenzii reale`} color="pink">
                    <div className="space-y-2">
                      {discoveries.testimonials.map((t, i) => (
                        <div key={i} className="text-xs text-pink-300 italic">&ldquo;{t.text}&rdquo;</div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Social links */}
                {discoveries.socialLinks.length > 0 && (
                  <DiscoveryCard icon={ExternalLink} title="Rețele sociale" color="cyan">
                    <div className="flex flex-wrap gap-2">
                      {discoveries.socialLinks.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 hover:bg-cyan-500/20 transition">
                          {s.platform} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* ─── DEEP RESEARCH (Perplexity) ─── */}

                {/* Reputation — Reviews */}
                {reputation && reputation.reviews.length > 0 && (
                  <DiscoveryCard icon={Star} title={`Recenzii online (${reputation.reviews.length})`} color="yellow">
                    <div className="space-y-1.5">
                      {reputation.sentiment && <p className="text-xs text-yellow-300 font-medium mb-1">Sentiment: {reputation.sentiment}</p>}
                      {reputation.reviews.slice(0, 4).map((r, i) => (
                        <div key={i} className="text-xs text-yellow-200/80">• {r}</div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Reputation — Competitors */}
                {reputation && reputation.competitors.length > 0 && (
                  <DiscoveryCard icon={Users} title="Competitori identificați" color="orange">
                    <div className="flex flex-wrap gap-1.5">
                      {reputation.competitors.slice(0, 5).map((c, i) => (
                        <span key={i} className="inline-flex px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">{c}</span>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* Reputation — Awards */}
                {reputation && reputation.awards.length > 0 && (
                  <DiscoveryCard icon={BadgeCheck} title="Premii & certificări" color="green">
                    <div className="space-y-1">
                      {reputation.awards.map((a, i) => (
                        <div key={i} className="text-xs text-green-300 flex items-center gap-1.5">
                          <BadgeCheck className="w-3 h-3 shrink-0" />{a}
                        </div>
                      ))}
                    </div>
                  </DiscoveryCard>
                )}

                {/* ─── INDUSTRY INTELLIGENCE ─── */}
                {industryIntel && (
                  <>
                    {/* Industry header */}
                    <div className="flex items-center gap-2 pt-2 pb-1">
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inteligență de piață</span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>

                    {/* Trends */}
                    {industryIntel.trends.length > 0 && (
                      <DiscoveryCard icon={Sparkles} title="Trenduri industrie 2025-2026" color="purple">
                        <div className="space-y-1">
                          {industryIntel.trends.slice(0, 5).map((t, i) => (
                            <div key={i} className="text-xs text-purple-300">📈 {t}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Content strategies */}
                    {industryIntel.contentStrategies.length > 0 && (
                      <DiscoveryCard icon={FileSearch} title="Strategii de conținut recomandate" color="blue">
                        <div className="space-y-1">
                          {industryIntel.contentStrategies.slice(0, 5).map((s, i) => (
                            <div key={i} className="text-xs text-blue-300">📝 {s}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Audience insights */}
                    {industryIntel.audienceInsights.length > 0 && (
                      <DiscoveryCard icon={Users} title="Audiența ta tipică" color="cyan">
                        <div className="space-y-1">
                          {industryIntel.audienceInsights.slice(0, 4).map((a, i) => (
                            <div key={i} className="text-xs text-cyan-300">👥 {a}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Statistics */}
                    {industryIntel.statistics.length > 0 && (
                      <DiscoveryCard icon={Tag} title="Statistici cheie" color="green">
                        <div className="space-y-1">
                          {industryIntel.statistics.slice(0, 5).map((s, i) => (
                            <div key={i} className="text-xs text-green-300">📊 {s}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Seasonal patterns */}
                    {industryIntel.seasonalPatterns.length > 0 && (
                      <DiscoveryCard icon={Clock} title="Pattern-uri sezoniere" color="orange">
                        <div className="space-y-1">
                          {industryIntel.seasonalPatterns.slice(0, 4).map((s, i) => (
                            <div key={i} className="text-xs text-orange-300">📅 {s}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Romanian market */}
                    {industryIntel.localInsights.length > 0 && (
                      <DiscoveryCard icon={MapPin} title="Specificul pieței din România" color="pink">
                        <div className="space-y-1">
                          {industryIntel.localInsights.slice(0, 4).map((l, i) => (
                            <div key={i} className="text-xs text-pink-300">🇷🇴 {l}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Regulations */}
                    {industryIntel.regulations.length > 0 && (
                      <DiscoveryCard icon={AlertCircle} title="Reglementări relevante" color="yellow">
                        <div className="space-y-1">
                          {industryIntel.regulations.slice(0, 4).map((r, i) => (
                            <div key={i} className="text-xs text-yellow-300">⚖️ {r}</div>
                          ))}
                        </div>
                      </DiscoveryCard>
                    )}

                    {/* Sources */}
                    {industryIntel.sources.length > 0 && (
                      <div className="text-[10px] text-muted-foreground/50 pt-1">
                        Surse: {industryIntel.sources.slice(0, 5).map((s, i) => (
                          <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="underline hover:text-muted-foreground mr-2">{new URL(s).hostname}</a>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Pages scraped */}
                {discoveries.pagesScraped.length > 0 && (
                  <div className="text-[10px] text-muted-foreground/60 pt-1">
                    Pagini scanate: {discoveries.pagesScraped.map((p) => p.type).join(", ")}
                    {hasPerplexity && " + deep research Perplexity"}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => goToStep(3)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition">
                  <Pencil className="w-4 h-4" /> Confirmă și personalizează
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 3: Editable Profile ═══ */}
          {step === 3 && (
            <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-bold text-white mb-1">
                  {discoveries ? "Ajustează profilul" : "Completează profilul"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {discoveries ? "Am pre-completat din cercetare. Corectează ce e nevoie." : "Spune-ne despre afacerea ta."}
                </p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Numele afacerii</label>
                  <input type="text" value={profile.name || ""} onChange={(e) => updateField("name", e.target.value)}
                    placeholder="ex: Clinica MedicalCor" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Descriere</label>
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
                    placeholder="Ce te face diferit?" rows={2} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Expresii preferate (telefon, brand, produse)</label>
                  <input type="text" value={profile.preferredPhrases || ""} onChange={(e) => updateField("preferredPhrases", e.target.value)}
                    placeholder="ex: One Step ALL-ON-X®, 0729 122 422" className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3">
                {discoveries && (
                  <button onClick={() => goToStep(2)} className="flex items-center gap-1.5 px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition">
                    <ArrowLeft className="w-3.5 h-3.5" /> Descoperiri
                  </button>
                )}
                <button onClick={handleProfileSave} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium transition disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmă <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ Step 4: Connect Platforms ═══ */}
          {step === 4 && (
            <motion.div key="s4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-5">
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
                        <span className="flex items-center gap-1 text-xs text-green-400 shrink-0"><Check className="w-4 h-4" />OK</span>
                      ) : (
                        <a href={p.url} className="shrink-0 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition">Conectează</a>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={() => goToStep(5)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.08] text-white text-sm font-medium transition">
                Continuă <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* ═══ Step 5: Done ═══ */}
          {step === 5 && (
            <motion.div key="s5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="flex flex-col items-center text-center py-4">
              <h2 className="text-2xl font-bold text-white mb-3">Ești pregătit! 🎉</h2>
              {discoveries && totalDiscoveries > 0 && (
                <p className="text-sm text-green-400 mb-1">
                  Am descoperit {totalDiscoveries} informații reale despre afacerea ta.
                </p>
              )}
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                AI-ul va genera conținut bazat exclusiv pe datele reale — zero invenții.
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

// ═══════════════════════════════════════════════════════════════════════════
// Discovery Card Component
// ═══════════════════════════════════════════════════════════════════════════

const colorMap = {
  orange: { bg: "bg-orange-500/[0.06]", border: "border-orange-500/20", icon: "text-orange-400", title: "text-orange-400" },
  blue: { bg: "bg-blue-500/[0.06]", border: "border-blue-500/20", icon: "text-blue-400", title: "text-blue-400" },
  purple: { bg: "bg-purple-500/[0.06]", border: "border-purple-500/20", icon: "text-purple-400", title: "text-purple-400" },
  green: { bg: "bg-green-500/[0.06]", border: "border-green-500/20", icon: "text-green-400", title: "text-green-400" },
  yellow: { bg: "bg-yellow-500/[0.06]", border: "border-yellow-500/20", icon: "text-yellow-400", title: "text-yellow-400" },
  pink: { bg: "bg-pink-500/[0.06]", border: "border-pink-500/20", icon: "text-pink-400", title: "text-pink-400" },
  cyan: { bg: "bg-cyan-500/[0.06]", border: "border-cyan-500/20", icon: "text-cyan-400", title: "text-cyan-400" },
} as const;

function DiscoveryCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: keyof typeof colorMap;
  children: React.ReactNode;
}) {
  const c = colorMap[color];
  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${c.icon}`} />
        <span className={`text-xs font-semibold ${c.title}`}>{title}</span>
      </div>
      {children}
    </div>
  );
}
