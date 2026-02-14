"use client";

import { useState, useTransition } from "react";
import { Building2, Check, Loader2 } from "lucide-react";
import { saveBusinessProfile } from "./actions";
import type {
  BusinessProfile,
  Industry,
  CommunicationTone,
  BusinessLanguage,
  ComplianceRule,
} from "@contentos/database";

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: "dental", label: "Dental" },
  { value: "medical", label: "Medical" },
  { value: "restaurant", label: "Restaurant" },
  { value: "fitness", label: "Fitness" },
  { value: "beauty", label: "Beauty" },
  { value: "fashion", label: "Fashion" },
  { value: "real_estate", label: "Real Estate" },
  { value: "education", label: "Educație" },
  { value: "tech", label: "Tech" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "turism", label: "Turism" },
  { value: "altele", label: "Altele" },
];

const TONES: { value: CommunicationTone; label: string }[] = [
  { value: "profesional", label: "Profesional" },
  { value: "prietenos", label: "Prietenos" },
  { value: "amuzant", label: "Amuzant" },
  { value: "educativ", label: "Educativ" },
  { value: "inspirational", label: "Inspirațional" },
  { value: "provocator", label: "Provocator" },
];

const LANGUAGES: { value: BusinessLanguage; label: string }[] = [
  { value: "ro", label: "Română" },
  { value: "en", label: "Engleză" },
  { value: "de", label: "Germană" },
];

const COMPLIANCE_OPTIONS: { value: ComplianceRule; label: string; description: string }[] = [
  { value: "cmsr_2025", label: "CMSR 2025", description: "Reglementări medicale stomatologice" },
  { value: "anaf", label: "ANAF", description: "Conformitate fiscală" },
];

const emptyProfile: BusinessProfile = {
  name: "",
  description: "",
  industry: "altele",
  tones: [],
  targetAudience: "",
  usps: "",
  avoidPhrases: "",
  preferredPhrases: "",
  language: "ro",
  compliance: [],
};

export default function BusinessProfileForm({
  initialProfile,
}: {
  initialProfile: BusinessProfile | null;
}) {
  const [profile, setProfile] = useState<BusinessProfile>(
    initialProfile || emptyProfile
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    field: keyof BusinessProfile,
    value: string | string[]
  ) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setError(null);
  }

  function toggleTone(tone: CommunicationTone) {
    setProfile((prev) => ({
      ...prev,
      tones: prev.tones.includes(tone)
        ? prev.tones.filter((t) => t !== tone)
        : [...prev.tones, tone],
    }));
    setSaved(false);
    setError(null);
  }

  function toggleCompliance(rule: ComplianceRule) {
    setProfile((prev) => ({
      ...prev,
      compliance: prev.compliance.includes(rule)
        ? prev.compliance.filter((r) => r !== rule)
        : [...prev.compliance, rule],
    }));
    setSaved(false);
    setError(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveBusinessProfile(profile);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/40";
  const labelClass = "block text-xs text-gray-500 mb-1";

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-4 h-4 text-gray-400" />
        <h2 className="text-base font-semibold text-white">
          Profilul Afacerii
        </h2>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        Configurează profilul afacerii tale pentru ca AI-ul să genereze conținut
        personalizat automat.
      </p>

      <div className="space-y-4">
        {/* Business Name */}
        <div>
          <label className={labelClass}>Numele afacerii</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="ex: Clinica Dentară SmilePro"
            className={inputClass}
          />
        </div>

        {/* Business Description */}
        <div>
          <label className={labelClass}>
            Descrierea afacerii{" "}
            <span className="text-gray-600">
              ({profile.description.length}/2000)
            </span>
          </label>
          <textarea
            value={profile.description}
            onChange={(e) =>
              handleChange(
                "description",
                e.target.value.slice(0, 2000)
              )
            }
            placeholder="Ce face afacerea ta? Descrie serviciile, misiunea, tehnologiile, echipa, realizările. Cu cât mai detaliat, cu atât AI-ul generează conținut mai bun."
            rows={5}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Industry */}
        <div>
          <label className={labelClass}>Industria</label>
          <select
            value={profile.industry}
            onChange={(e) =>
              handleChange("industry", e.target.value)
            }
            className={inputClass + " appearance-none cursor-pointer"}
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind.value} value={ind.value} className="bg-[#1a1a2e]">
                {ind.label}
              </option>
            ))}
          </select>
        </div>

        {/* Communication Tone */}
        <div>
          <label className={labelClass}>Tonul comunicării</label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => {
              const selected = profile.tones.includes(tone.value);
              return (
                <button
                  key={tone.value}
                  type="button"
                  onClick={() => toggleTone(tone.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                    selected
                      ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                      : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:border-white/[0.12]"
                  }`}
                >
                  {selected && <Check className="w-3 h-3 inline mr-1" />}
                  {tone.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className={labelClass}>
            Publicul țintă{" "}
            <span className="text-gray-600">
              ({profile.targetAudience.length}/1500)
            </span>
          </label>
          <textarea
            value={profile.targetAudience}
            onChange={(e) =>
              handleChange("targetAudience", e.target.value.slice(0, 1500))
            }
            placeholder="Descrie clientul tău ideal: vârstă, probleme, motivații, trigger-uri emoționale și raționale. ex: Pacienți 40-70 ani cu edentație extinsă, purtători de proteze mobile nemulțumiți."
            rows={4}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* USPs */}
        <div>
          <label className={labelClass}>
            USP-uri / Diferențiatori{" "}
            <span className="text-gray-600">
              ({profile.usps.length}/2000)
            </span>
          </label>
          <textarea
            value={profile.usps}
            onChange={(e) => handleChange("usps", e.target.value.slice(0, 2000))}
            placeholder="Ce te face diferit de competiție? Listează fiecare USP detaliat. ex: One Step ALL-ON-X® — dinți finali în 5 zile, laborator propriu in-house, implanturi Straumann."
            rows={5}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Avoid Phrases */}
        <div>
          <label className={labelClass}>
            Cuvinte/expresii de evitat{" "}
            <span className="text-gray-600">
              ({profile.avoidPhrases.length}/1000)
            </span>
          </label>
          <textarea
            value={profile.avoidPhrases}
            onChange={(e) =>
              handleChange("avoidPhrases", e.target.value.slice(0, 1000))
            }
            placeholder="Cuvinte pe care AI-ul nu trebuie să le folosească. ex: ieftin, reducere, cel mai bun, tratament miracol, garantăm vindecarea"
            rows={3}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Preferred Phrases */}
        <div>
          <label className={labelClass}>
            Cuvinte/expresii preferate{" "}
            <span className="text-gray-600">
              ({profile.preferredPhrases.length}/1000)
            </span>
          </label>
          <textarea
            value={profile.preferredPhrases}
            onChange={(e) =>
              handleChange("preferredPhrases", e.target.value.slice(0, 1000))
            }
            placeholder="Expresii sau termeni pe care AI-ul să le includă. ex: One Step ALL-ON-X®, dinți ficși în 5 zile, Neodent® by Straumann, 0729 122 422"
            rows={3}
            className={inputClass + " resize-none"}
          />
        </div>

        {/* Language */}
        <div>
          <label className={labelClass}>Limba principală</label>
          <select
            value={profile.language}
            onChange={(e) =>
              handleChange("language", e.target.value)
            }
            className={inputClass + " appearance-none cursor-pointer"}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value} className="bg-[#1a1a2e]">
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Compliance */}
        <div>
          <label className={labelClass}>Conformitate specială</label>
          <div className="space-y-2">
            {COMPLIANCE_OPTIONS.map((option) => {
              const checked = profile.compliance.includes(option.value);
              return (
                <label
                  key={option.value}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCompliance(option.value)}
                    className="mt-0.5 rounded border-white/20 bg-white/[0.04] text-brand-600 focus:ring-brand-500/40"
                  />
                  <div>
                    <div className="text-sm text-white font-medium">
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {option.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition flex items-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Se salvează...
            </>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Salvat
            </>
          ) : (
            "Salvează profilul"
          )}
        </button>
      </div>
    </div>
  );
}
