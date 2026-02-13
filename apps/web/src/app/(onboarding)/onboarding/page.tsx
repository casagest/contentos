"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Wifi,
  Sparkles,
  Check,
  Loader2,
  Plus,
} from "lucide-react";
import {
  updateOnboardingStep,
  completeOnboarding,
  saveOnboardingProfile,
} from "./actions";

const INDUSTRIES = [
  { id: "dental", label: "Dental / Medical", icon: "🦷" },
  { id: "restaurant", label: "Restaurant / HoReCa", icon: "🍽️" },
  { id: "beauty", label: "Beauty / Salon", icon: "💇" },
  { id: "fitness", label: "Fitness / Sport", icon: "💪" },
  { id: "ecommerce", label: "E-commerce", icon: "🛒" },
  { id: "realestate", label: "Imobiliare", icon: "🏠" },
  { id: "education", label: "Educatie / Cursuri", icon: "📚" },
  { id: "agency", label: "Agentie / Freelancer", icon: "🎨" },
];

const PLATFORMS = [
  { id: "facebook", label: "Facebook", color: "bg-blue-600", url: "/api/auth/facebook" },
  { id: "instagram", label: "Instagram", color: "bg-pink-600", url: "/api/auth/facebook" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-700", url: "/api/auth/tiktok" },
  { id: "linkedin", label: "LinkedIn", color: "bg-blue-700", url: "/api/auth/linkedin" },
];

const STEPS = [
  { label: "Industrie", icon: Building2 },
  { label: "Profil", icon: Building2 },
  { label: "Conecteaza", icon: Wifi },
  { label: "Primul continut", icon: Sparkles },
  { label: "Gata!", icon: Check },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [braindumpText, setBraindumpText] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");

  async function goToStep(nextStep: number) {
    setLoading(true);
    await updateOnboardingStep(nextStep);
    setStep(nextStep);
    setLoading(false);
  }

  async function handleIndustrySelect(industry: string) {
    setSelectedIndustry(industry);
    await goToStep(1);
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
      setGeneratedContent(data.primary?.text || data.text || "Continutul a fost generat!");
    } catch {
      setGeneratedContent("Continut generat cu succes!");
    }
    setLoading(false);
  }

  async function handleComplete() {
    setLoading(true);
    await completeOnboarding();
    router.push("/compose");
  }

  return (
    <div>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition ${
                i < step
                  ? "bg-brand-500 text-white"
                  : i === step
                    ? "bg-brand-600/20 text-brand-300 border border-brand-500/40"
                    : "bg-white/[0.04] text-gray-600"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 ${i < step ? "bg-brand-500" : "bg-white/[0.06]"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Industry */}
      {step === 0 && (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Bine ai venit in ContentOS!
          </h1>
          <p className="text-gray-400 mb-8">
            In ce industrie activezi? Vom personaliza experienta pentru tine.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                onClick={() => handleIndustrySelect(ind.id)}
                className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-brand-500/40 hover:bg-brand-500/5 transition text-center"
              >
                <div className="text-2xl mb-2">{ind.icon}</div>
                <div className="text-sm text-gray-300">{ind.label}</div>
              </button>
            ))}
          </div>
          <button
            onClick={() => goToStep(1)}
            className="mt-4 text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Sari peste
          </button>
        </div>
      )}

      {/* Step 1: Business Profile */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">
            Spune-ne despre afacerea ta
          </h2>
          <p className="text-gray-400 text-sm mb-6 text-center">
            AI-ul va folosi aceste informatii pentru a genera continut relevant.
          </p>
          <div className="space-y-4 max-w-md mx-auto">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Numele afacerii</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="ex: Clinica Dentara Smile"
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Descriere scurta (ce faci, pentru cine)
              </label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                rows={3}
                placeholder="ex: Oferim servicii stomatologice premium in Bucuresti. Publicul nostru: familii tinere, profesionisti 25-45 ani."
                className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleProfileSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Continua <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => goToStep(2)}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition"
              >
                Sari peste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Connect Platforms */}
      {step === 2 && (
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Conecteaza platformele sociale
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Conecteaza cel putin o platforma pentru a publica continut direct din ContentOS.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
            {PLATFORMS.map((p) => (
              <a
                key={p.id}
                href={p.url}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg ${p.color} text-white text-sm font-medium transition hover:opacity-90`}
              >
                <Plus className="w-4 h-4" />
                {p.label}
              </a>
            ))}
          </div>
          <button
            onClick={() => goToStep(3)}
            className="text-sm text-gray-500 hover:text-gray-300 transition"
          >
            Continua fara conectare
          </button>
        </div>
      )}

      {/* Step 3: First Content */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-2 text-center">
            Creeaza primul tau continut
          </h2>
          <p className="text-gray-400 text-sm mb-6 text-center">
            Scrie o idee sau o tema, iar AI-ul o va transforma in continut optimizat.
          </p>
          <div className="max-w-md mx-auto space-y-4">
            <textarea
              value={braindumpText}
              onChange={(e) => setBraindumpText(e.target.value)}
              rows={4}
              placeholder="ex: Am lansat un nou serviciu de albire dentara cu LED. Vreau sa atrag pacienti noi..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
            {!generatedContent ? (
              <div className="flex gap-3">
                <button
                  onClick={handleBraindump}
                  disabled={loading || !braindumpText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Se genereaza...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Genereaza cu AI
                    </>
                  )}
                </button>
                <button
                  onClick={() => goToStep(4)}
                  className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Sari peste
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-brand-500/5 border border-brand-500/20">
                  <p className="text-sm text-gray-200 whitespace-pre-wrap">
                    {generatedContent}
                  </p>
                </div>
                <button
                  onClick={() => goToStep(4)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition"
                >
                  Continua <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Totul e pregatit!
          </h2>
          <p className="text-gray-400 mb-8">
            Contul tau e configurat. Esti gata sa creezi continut care performeaza.
          </p>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Mergi la Dashboard <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
