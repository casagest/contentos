import { describe, it, expect } from "vitest";
import { extractVoiceDNA, voiceDNAToPrompt } from "../voice-dna";

const CASUAL_POSTS = [
  "🔥 Ieri am filmat 3 reels pe balcon. Serios, lumina de la 6 dimineața e altceva! Rezultatul? Un reel cu 12K views. Încercați și voi — merită! #contentcreator #reels",
  "Deci am testat ceva nebunesc: am postat la 6 AM și engagement-ul a fost x3 față de seara. Pe bune! 😱 Nu mă așteptam. Voi la ce oră postați? #socialmedia #hack",
  "Sincer, nu mai fac design în Canva. Am descoperit un tool care face totul în 30 de secunde. Gen, ai o idee → BAM → postare gata 💪 Scrie-mi în DM dacă vrei link!",
  "Haha, am uitat să pun hashtag-uri la ultima postare și a mers mai bine decât de obicei 🤷‍♀️ Coincidență sau nu? #experiment",
  "🎯 3 lecții din ultima lună de content:\n1. Hook-ul e regele\n2. Consistența > perfecțiunea\n3. Salvează postarea asta dacă ești de acord 👇",
];

const FORMAL_POSTS = [
  "Stimați urmăritori, vă prezentăm noua colecție de primăvară. Fiecare piesă a fost concepută cu atenție la detalii și calitate premium. Vă invităm să descoperiți.",
  "Cu respect față de comunitatea noastră, anunțăm programul de loialitate. Beneficiile includ reduceri exclusive și acces anticipat la colecții noi.",
  "În ceea ce privește tendințele actuale în domeniul modei sustenabile, considerăm că educarea consumatorilor reprezintă o prioritate. Vă rugăm să consultați ghidul nostru.",
];

describe("extractVoiceDNA", () => {
  it("extracts casual voice correctly", () => {
    const dna = extractVoiceDNA(CASUAL_POSTS);
    expect(dna.formalityLevel).toBeLessThan(5);
    expect(dna.emojiFrequency).toBeGreaterThan(0.5);
    expect(dna.hashtagFrequency).toBeGreaterThan(0);
    expect(dna.sampleSize).toBe(5);
    expect(dna.verbalTics.length).toBeGreaterThan(0);
    // Should detect "deci", "sincer", "gen", "pe bune" etc.
    expect(dna.verbalTics.some((t) => ["deci", "sincer", "gen", "pe bune", "serios"].includes(t))).toBe(true);
  });

  it("extracts formal voice correctly", () => {
    const dna = extractVoiceDNA(FORMAL_POSTS);
    expect(dna.formalityLevel).toBeGreaterThan(5);
    expect(dna.emojiFrequency).toBe(0);
    expect(dna.vocabularyLevel).not.toBe("simple");
  });

  it("returns default for < 3 posts", () => {
    const dna = extractVoiceDNA(["Short post"]);
    expect(dna.sampleSize).toBe(0); // "Short post" is < 20 chars
    expect(dna.formalityLevel).toBe(4); // default
  });

  it("measures sentence length variance", () => {
    const dna = extractVoiceDNA(CASUAL_POSTS);
    expect(dna.sentenceLengthMean).toBeGreaterThan(3);
    expect(dna.sentenceLengthMean).toBeLessThan(30);
    expect(dna.sentenceLengthStdDev).toBeGreaterThan(0);
  });

  it("detects question frequency", () => {
    const dna = extractVoiceDNA(CASUAL_POSTS);
    expect(dna.questionFrequency).toBeGreaterThan(0);
  });

  it("detects preferred structure", () => {
    const dna = extractVoiceDNA(CASUAL_POSTS);
    expect(["hook-story-cta", "question-list-opinion", "statement-proof-ask", "mixed"]).toContain(dna.preferredStructure);
  });
});

describe("voiceDNAToPrompt", () => {
  it("generates a prompt fragment for casual voice", () => {
    const dna = extractVoiceDNA(CASUAL_POSTS);
    const prompt = voiceDNAToPrompt(dna);
    expect(prompt).toContain("VOICE DNA");
    expect(prompt).toContain("Sentence rhythm");
    expect(prompt).toContain("Emoji");
    expect(prompt).toContain("Verbal tics");
  });

  it("returns empty for insufficient sample", () => {
    const dna = extractVoiceDNA(["Short"]);
    const prompt = voiceDNAToPrompt(dna);
    expect(prompt).toBe("");
  });
});
