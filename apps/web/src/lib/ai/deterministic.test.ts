import { describe, it, expect } from "vitest";
import {
  buildDeterministicScore,
  buildDeterministicGeneration,
  buildDeterministicBrainDump,
} from "./deterministic";

describe("deterministic", () => {
  describe("buildDeterministicScore", () => {
    it("returns valid score structure", () => {
      const result = buildDeterministicScore({
        content: "Stop scrolling. Aceasta clinica dentara ofera tratamente premium. Comenteaza daca vrei mai multe informatii! #dental #sanatate",
        platform: "facebook",
        contentType: "text",
      });
      expect(result.platform).toBe("facebook");
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(["S", "A", "B", "C", "D", "F"]).toContain(result.grade);
      expect(result.metrics.length).toBe(10);
      expect(result.summary).toBeTruthy();
      expect(result.improvements.length).toBeGreaterThan(0);
      expect(result.alternativeVersions!.length).toBeGreaterThan(0);
    });

    it("scores well-structured content higher", () => {
      const goodContent = `De ce 90% din pacienti aleg gresit?\n\nAm descoperit un rezultat surprinzator: 3 din 5 pacienti nu stiu diferenta.\n\nIata ce functioneaza rapid:\n- clarifica beneficiul principal\n- foloseste dovezi sociale\n- cere feedback direct\n\nComenteaza ce crezi! #dental #transform #rezultat`;
      const badContent = "ok";
      const good = buildDeterministicScore({ content: goodContent, platform: "facebook", contentType: "text" });
      const bad = buildDeterministicScore({ content: badContent, platform: "facebook", contentType: "text" });
      expect(good.overallScore).toBeGreaterThan(bad.overallScore);
    });

    it("detects CTA keywords", () => {
      const withCta = buildDeterministicScore({
        content: "Continut excelent. Comenteaza parerea ta! Salveaza pentru mai tarziu.",
        platform: "facebook",
        contentType: "text",
      });
      const ctaMetric = withCta.metrics.find((m) => m.name === "CTA clarity");
      expect(ctaMetric!.score).toBeGreaterThanOrEqual(85);
    });

    it("detects question/exclamation hooks", () => {
      const withHook = buildDeterministicScore({
        content: "De ce 80% din antreprenori fac aceasta greseala? Iata raspunsul.",
        platform: "facebook",
        contentType: "text",
      });
      const hookMetric = withHook.metrics.find((m) => m.name === "Hook strength");
      expect(hookMetric!.score).toBe(88);
    });

    it("scores emotional keywords higher", () => {
      const emotional = buildDeterministicScore({
        content: "Rezultat nou si transformare rapida pentru afacerea ta. Simplu si clar.",
        platform: "facebook",
        contentType: "text",
      });
      const emoMetric = emotional.metrics.find((m) => m.name === "Emotional pull");
      expect(emoMetric!.score).toBe(82);
    });

    it("scores numbers/specificity", () => {
      const specific = buildDeterministicScore({
        content: "In 2024 am tratat 150 de pacienti cu 3 tipuri de proceduri diferite la pretul de 500 euro.",
        platform: "facebook",
        contentType: "text",
      });
      const specMetric = specific.metrics.find((m) => m.name === "Specificity");
      expect(specMetric!.score).toBeGreaterThan(70);
    });

    it("handles all platform length ranges", () => {
      const platforms = ["facebook", "instagram", "tiktok", "youtube", "twitter", "linkedin"] as const;
      for (const platform of platforms) {
        const result = buildDeterministicScore({
          content: "Test content cu cateva cuvinte pentru fiecare platforma. Comenteaza! #test",
          platform,
          contentType: "text",
        });
        expect(result.platform).toBe(platform);
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
      }
    });

    it("detects PAS framework", () => {
      const pas = buildDeterministicScore({
        content: "Problema cu care se confrunta multi: stresul si frustrarea zilnica la birou.\n\nSolutia este simpla.",
        platform: "facebook",
        contentType: "text",
      });
      const fwMetric = pas.metrics.find((m) => m.name === "Creative framework");
      expect(fwMetric!.score).toBe(84);
    });

    it("detects BAB framework", () => {
      const bab = buildDeterministicScore({
        content: "Inainte aveam rezultate slabe. Dupa ce am aplicat strategia, totul s-a transformat complet.",
        platform: "facebook",
        contentType: "text",
      });
      const fwMetric = bab.metrics.find((m) => m.name === "Creative framework");
      expect(fwMetric!.score).toBe(84);
    });

    it("detects List framework", () => {
      const list = buildDeterministicScore({
        content: "Top 5 sfaturi pentru antreprenori in 2024. Lista completa mai jos.",
        platform: "facebook",
        contentType: "text",
      });
      const fwMetric = list.metrics.find((m) => m.name === "Creative framework");
      expect(fwMetric!.score).toBe(76);
    });

    it("detects Story framework", () => {
      const story = buildDeterministicScore({
        content: "Azi am invatat o lectie importanta. Poveste scurta despre experienta mea.",
        platform: "facebook",
        contentType: "text",
      });
      const fwMetric = story.metrics.find((m) => m.name === "Creative framework");
      expect(fwMetric!.score).toBe(76);
    });

    it("grades correctly at boundaries", () => {
      // Build content that should score high
      const highContent = `Cum sa triplezi engagement-ul pe Facebook?\n\nAm testat 5 strategii timp de 30 de zile si rezultatul a fost nou si transformator.\n\nIata 3 lucruri concrete:\n1. Hook puternic in primele 3 secunde\n2. CTA clar si specific\n3. Hashtag-uri relevante\n\nComenteaza ce strategie folosesti! Distribuie daca ti-a fost util!\n\n#marketing #socialmedia #engagement #facebook #strategie`;
      const result = buildDeterministicScore({ content: highContent, platform: "facebook", contentType: "text" });
      expect(["S", "A", "B"]).toContain(result.grade);
    });

    it("returns improvements for low-scoring metrics", () => {
      const result = buildDeterministicScore({
        content: "ok",
        platform: "facebook",
        contentType: "text",
      });
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it("returns default improvement when all metrics are high", () => {
      // Even well-scored content gets at least a default suggestion
      const result = buildDeterministicScore({
        content: `De ce 90% din oameni fac aceasta greseala?\n\nAm descoperit un rezultat nou si transformator. Rapid si simplu de aplicat.\n\nIata ce functioneaza:\n- Strategie 1 cu 150 de rezultate\n- Strategie 2 testata pe 300 clienti\n- Strategie 3 cu ROI de 500%\n\nComenteaza! Salveaza! Distribuie! Urmareste pentru mai mult!\n\n#strategie #rezultat #transform #marketing #business`,
        platform: "facebook",
        contentType: "text",
      });
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it("handles multiple paragraphs for structure score", () => {
      const multiParagraph = buildDeterministicScore({
        content: "Primul paragraf cu informatii.\n\nAl doilea paragraf cu detalii.",
        platform: "facebook",
        contentType: "text",
      });
      const structMetric = multiParagraph.metrics.find((m) => m.name === "Structure");
      expect(structMetric!.score).toBe(90);
    });

    it("scores single paragraph lower for structure", () => {
      const single = buildDeterministicScore({
        content: "Un singur paragraf cu totul in el.",
        platform: "facebook",
        contentType: "text",
      });
      const structMetric = single.metrics.find((m) => m.name === "Structure");
      expect(structMetric!.score).toBe(62);
    });

    it("handles hashtag scoring", () => {
      const withHashtags = buildDeterministicScore({
        content: "Test content #one #two #three #four #five",
        platform: "facebook",
        contentType: "text",
      });
      const hashMetric = withHashtags.metrics.find((m) => m.name === "Hashtag strategy");
      expect(hashMetric!.score).toBeGreaterThan(70);
    });

    it("instagram hashtag range is wider", () => {
      const hashtags = Array.from({ length: 12 }, (_, i) => `#tag${i}`).join(" ");
      const result = buildDeterministicScore({
        content: `Test ${hashtags}`,
        platform: "instagram",
        contentType: "carousel",
      });
      const hashMetric = result.metrics.find((m) => m.name === "Hashtag strategy");
      expect(hashMetric!.score).toBeGreaterThan(70);
    });
  });

  describe("buildDeterministicGeneration", () => {
    it("generates for facebook", () => {
      const result = buildDeterministicGeneration({
        input: "Clinica dentara a lansat un nou serviciu de albire premium pentru pacienti",
        targetPlatforms: ["facebook"],
      });
      expect(result.platformVersions.facebook).toBeDefined();
      expect(result.platformVersions.facebook!.text).toBeTruthy();
      expect(result.platformVersions.facebook!.contentType).toBe("text");
      expect(result.platformVersions.facebook!.hashtags.length).toBeGreaterThan(0);
      expect(result.platformVersions.facebook!.algorithmScore).toBeDefined();
      expect(result.platformVersions.facebook!.alternativeVersions.length).toBe(2);
    });

    it("generates for all 4 core platforms", () => {
      const result = buildDeterministicGeneration({
        input: "Strategii noi de marketing digital pentru antreprenori in 2024",
        targetPlatforms: ["facebook", "instagram", "tiktok", "youtube"],
      });
      expect(result.platformVersions.facebook).toBeDefined();
      expect(result.platformVersions.instagram).toBeDefined();
      expect(result.platformVersions.tiktok).toBeDefined();
      expect(result.platformVersions.youtube).toBeDefined();
      expect(result.platformVersions.instagram!.contentType).toBe("carousel");
      expect(result.platformVersions.tiktok!.contentType).toBe("reel");
      expect(result.platformVersions.youtube!.contentType).toBe("video");
    });

    it("skips non-core platforms", () => {
      const result = buildDeterministicGeneration({
        input: "Test content idea",
        targetPlatforms: ["linkedin", "twitter"],
      });
      expect(result.platformVersions.linkedin).toBeUndefined();
      expect(result.platformVersions.twitter).toBeUndefined();
    });

    it("respects includeHashtags=false", () => {
      const result = buildDeterministicGeneration({
        input: "Clinica dentara premium cu servicii noi pentru pacientii nostri",
        targetPlatforms: ["facebook"],
        includeHashtags: false,
      });
      expect(result.platformVersions.facebook!.hashtags).toEqual([]);
    });

    it("generates English content", () => {
      const result = buildDeterministicGeneration({
        input: "New marketing strategies for 2024 entrepreneurs and business growth",
        targetPlatforms: ["facebook"],
        language: "en",
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("Tell me your opinion");
    });

    it("English PAS hook for problema-related input", () => {
      const result = buildDeterministicGeneration({
        input: "Problema cu stresul la birou si frustrarea angajatilor din corporatii mari",
        targetPlatforms: ["facebook"],
        language: "en",
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("Most people struggle");
    });

    it("English BAB hook for transform-related input", () => {
      const result = buildDeterministicGeneration({
        input: "Inainte era greu dar dupa transformare rezultatul a fost extraordinar",
        targetPlatforms: ["facebook"],
        language: "en",
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("Before vs after");
    });

    it("English Story hook for poveste-related input", () => {
      const result = buildDeterministicGeneration({
        input: "Azi am invatat o lectie din experienta mea personala cu clientii",
        targetPlatforms: ["facebook"],
        language: "en",
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("Quick story");
    });

    it("Romanian Story hook for poveste-related input", () => {
      const result = buildDeterministicGeneration({
        input: "Azi am invatat o lectie din experienta mea cu echipa de marketing",
        targetPlatforms: ["facebook"],
        language: "ro",
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("Poveste scurta");
    });

    it("generates Romanian content by default", () => {
      const result = buildDeterministicGeneration({
        input: "Strategii noi de marketing pentru antreprenori in zona de business",
        targetPlatforms: ["facebook"],
      });
      const text = result.platformVersions.facebook!.text;
      expect(text).toContain("comentarii");
    });

    it("returns keyIdeas and suggestedTopics", () => {
      const result = buildDeterministicGeneration({
        input: "Clinica dentara premium ofera servicii de albire inovatoare pentru pacienti cu implanturi",
        targetPlatforms: ["facebook"],
      });
      expect(result.keyIdeas.length).toBeGreaterThan(0);
      expect(result.suggestedTopics.length).toBeGreaterThan(0);
    });

    it("instagram includes emoji by default", () => {
      const result = buildDeterministicGeneration({
        input: "Marketing digital cu strategii creative pentru audienta moderna de social media",
        targetPlatforms: ["instagram"],
        includeEmoji: true,
      });
      expect(result.platformVersions.instagram).toBeDefined();
    });

    it("youtube generates title and description", () => {
      const result = buildDeterministicGeneration({
        input: "Tutorial complet despre marketing pe youtube pentru incepatori absoluti",
        targetPlatforms: ["youtube"],
      });
      const text = result.platformVersions.youtube!.text;
      expect(text).toContain("Ce functioneaza acum");
      expect(text).toContain("Capitole");
    });

    it("tiktok generates hook and script", () => {
      const result = buildDeterministicGeneration({
        input: "Tutorial rapid de marketing pe TikTok cu sfaturi practice pentru crestere",
        targetPlatforms: ["tiktok"],
      });
      const text = result.platformVersions.tiktok!.text;
      expect(text).toContain("Cadru");
    });
  });

  describe("buildDeterministicBrainDump", () => {
    it("generates for single platform (facebook)", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Am lansat un nou serviciu de albire dentara cu LED pentru pacientii nostri",
        platforms: ["facebook"],
      });
      expect(result.platforms.facebook).toBeDefined();
      expect(result.platforms.facebook!.content).toBeTruthy();
      expect(result.platforms.facebook!.hashtags.length).toBeGreaterThan(0);
      expect(["Low", "Medium", "High", "Viral Potential"]).toContain(
        result.platforms.facebook!.estimatedEngagement
      );
      expect(result.platforms.facebook!.tips.length).toBe(2);
      expect(result.meta.mode).toBe("deterministic");
    });

    it("generates for all 4 platforms", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Marketing digital inovator pentru clinica dentara cu rezultate excelente",
        platforms: ["facebook", "instagram", "tiktok", "youtube"],
      });
      expect(result.platforms.facebook).toBeDefined();
      expect(result.platforms.instagram).toBeDefined();
      expect(result.platforms.tiktok).toBeDefined();
      expect(result.platforms.youtube).toBeDefined();
    });

    it("instagram result has correct structure", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Postare de inspiratie despre fitness si sanatate pentru comunitatea noastra",
        platforms: ["instagram"],
      });
      const ig = result.platforms.instagram!;
      expect(ig.caption).toBeTruthy();
      expect(ig.hashtags.length).toBeGreaterThan(0);
      expect(ig.altText).toBeTruthy();
      expect(ig.bestTimeToPost).toBe("19:00");
      expect(ig.tips.length).toBe(2);
    });

    it("tiktok result has correct structure", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Video rapid despre trucuri de productivitate pentru antreprenori moderni",
        platforms: ["tiktok"],
      });
      const tt = result.platforms.tiktok!;
      expect(tt.hook).toBeTruthy();
      expect(tt.script).toBeTruthy();
      expect(tt.hashtags.length).toBeGreaterThan(0);
      expect(tt.soundSuggestion).toBeTruthy();
      expect(tt.tips.length).toBe(2);
    });

    it("youtube result has correct structure", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Tutorial complet despre SEO pentru youtube cu sfaturi practice avansate",
        platforms: ["youtube"],
      });
      const yt = result.platforms.youtube!;
      expect(yt.title).toBeTruthy();
      expect(yt.title.length).toBeLessThanOrEqual(95);
      expect(yt.description).toContain("Capitole");
      expect(yt.tags.length).toBeGreaterThan(0);
      expect(yt.thumbnailIdea).toBeTruthy();
      expect(yt.tips.length).toBe(2);
    });

    it("supports English language", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "New dental whitening service with LED technology for our patients today",
        platforms: ["facebook"],
        language: "en",
      });
      expect(result.platforms.facebook!.content).toContain("Share your perspective");
    });

    it("includes warning in meta when provided", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Test content ideas here",
        platforms: ["facebook"],
        warning: "Budget exhausted",
      });
      expect(result.meta.warning).toBe("Budget exhausted");
    });

    it("meta has framework detection", () => {
      const result = buildDeterministicBrainDump({
        rawInput: "Problema cu care se confrunta multi oameni zilnic la locul de munca",
        platforms: ["facebook"],
      });
      expect(result.meta.framework).toBeTruthy();
    });
  });

  describe("buildDeterministicCoach", () => {
    // Import directly since it's also exported
    it("returns coaching response", async () => {
      const { buildDeterministicCoach } = await import("./deterministic");
      const result = buildDeterministicCoach({
        question: "Cum sa cresc engagement-ul?",
        platform: "facebook",
        recentPosts: [
          { id: "p1", contentType: "text", engagementRate: 2.5, platform: "facebook" } as any,
        ],
        topPosts: [
          { id: "p2", contentType: "text", engagementRate: 5.0, platform: "facebook" } as any,
        ],
      });
      expect(result.answer).toBeTruthy();
      expect(result.actionItems.length).toBe(4);
      expect(result.dataReferences.length).toBeGreaterThan(0);
    });

    it("handles empty posts", async () => {
      const { buildDeterministicCoach } = await import("./deterministic");
      const result = buildDeterministicCoach({
        question: "Ce sa postez?",
        recentPosts: [],
        topPosts: [],
      });
      expect(result.answer).toContain("toate platformele");
      expect(result.answer).toContain("Nu exista suficiente postari");
    });

    it("uses topPosts for data references when available", async () => {
      const { buildDeterministicCoach } = await import("./deterministic");
      const result = buildDeterministicCoach({
        question: "Cum performez?",
        recentPosts: [{ id: "r1", contentType: "text", engagementRate: 1.0, platform: "facebook" } as any],
        topPosts: [
          { id: "t1", contentType: "text", engagementRate: 8.0, platform: "facebook" } as any,
          { id: "t2", contentType: "reel", engagementRate: 6.0, platform: "facebook" } as any,
        ],
      });
      expect(result.dataReferences[0].postId).toBe("t1");
    });
  });
});
