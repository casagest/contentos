import { describe, it, expect } from "vitest";
import { classifyIntent, buildIntentClassificationPrompt } from "./intent-classifier";

describe("intent-classifier", () => {
  describe("classifyIntent", () => {
    it("returns vague_idea for empty input", () => {
      const result = classifyIntent("");
      expect(result.intent).toBe("vague_idea");
      expect(result.confidence).toBe(1);
      expect(result.reason).toBe("empty_input");
      expect(result.clarificationNeeded).toBeTruthy();
      expect(result.detectedTopics).toEqual([]);
      expect(result.detectedPlatformHints).toEqual([]);
    });

    it("returns vague_idea for whitespace-only input", () => {
      const result = classifyIntent("   ");
      expect(result.intent).toBe("vague_idea");
    });

    // Command detection
    it("detects command: fa-l mai scurt", () => {
      const result = classifyIntent("fa-l mai scurt si mai clar");
      expect(result.intent).toBe("command");
      expect(result.confidence).toBe(0.85);
      expect(result.reason).toBe("command_keywords_detected");
    });

    it("detects command: rescrie textul", () => {
      const result = classifyIntent("rescrie textul mai profesional");
      expect(result.intent).toBe("command");
    });

    it("detects command: adauga hashtag-uri", () => {
      const result = classifyIntent("adauga hashtag-uri relevante");
      expect(result.intent).toBe("command");
    });

    it("detects command: make it shorter (English)", () => {
      const result = classifyIntent("make it shorter and more casual");
      expect(result.intent).toBe("command");
    });

    it("detects command: improve/optimize", () => {
      const result = classifyIntent("imbunatateste textul asta");
      expect(result.intent).toBe("command");
    });

    // Question detection
    it("detects direct question with ?", () => {
      const result = classifyIntent("cum sa cresc engagement-ul pe pagina mea?");
      expect(result.intent).toBe("question");
      expect(result.confidence).toBeGreaterThanOrEqual(0.78);
      expect(result.suggestedFollowUp).toBeTruthy();
    });

    it("detects direct question with ? (high confidence)", () => {
      const result = classifyIntent("de ce scade reach-ul organic?");
      expect(result.intent).toBe("question");
      expect(result.confidence).toBe(0.92);
      expect(result.reason).toBe("direct_question_with_mark");
    });

    it("detects question without ? (lower confidence)", () => {
      const result = classifyIntent("cum sa fac mai multe vanzari online");
      expect(result.intent).toBe("question");
      expect(result.confidence).toBe(0.78);
      expect(result.reason).toBe("question_starter_detected");
    });

    it("detects English question starters", () => {
      const result = classifyIntent("how do I grow my audience?");
      expect(result.intent).toBe("question");
    });

    it("detects multiple question marks as question", () => {
      const result = classifyIntent("de ce?? cum se poate??");
      expect(result.intent).toBe("question");
      expect(result.confidence).toBe(0.7);
      expect(result.reason).toBe("multiple_question_marks");
    });

    // Question with content keywords → content_idea
    it("question + content keywords → content_idea", () => {
      const result = classifyIntent("ce postare sa fac pe instagram despre dental?");
      expect(result.intent).toBe("content_idea");
      expect(result.reason).toBe("question_mark_with_content_keywords");
    });

    // Vague ideas
    it("very short, no topic → vague_idea", () => {
      const result = classifyIntent("ok bine");
      expect(result.intent).toBe("vague_idea");
      expect(result.confidence).toBe(0.75);
      expect(result.reason).toBe("too_short_no_topic");
    });

    it("short with topic → content_idea (topic detected)", () => {
      const result = classifyIntent("dental");
      expect(result.intent).toBe("content_idea");
      expect(result.detectedTopics).toContain("dental");
    });

    it("medium input, no clear signals → vague_idea (low confidence)", () => {
      const result = classifyIntent("weekend bun la munte cu prietenii");
      expect(result.intent).toBe("vague_idea");
      expect(result.reason).toBe("low_content_confidence");
      expect(result.clarificationNeeded).toBeTruthy();
    });

    // Content ideas
    it("detects content idea with keywords", () => {
      const result = classifyIntent(
        "Scrie o postare pentru clinica dentara pe facebook despre albire cu LED"
      );
      expect(result.intent).toBe("content_idea");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("detects content idea with URL", () => {
      const result = classifyIntent("https://example.com articol interesant despre dental pe care vreau sa il distribui");
      expect(result.intent).toBe("content_idea");
    });

    it("detects content idea with hashtags", () => {
      const result = classifyIntent("#dental #albire postare noua despre servicii stomatologice");
      expect(result.intent).toBe("content_idea");
    });

    it("detects content idea with numbers", () => {
      const result = classifyIntent("5 sfaturi pentru clinica dentara despre implanturi la pret de 2000 euro");
      expect(result.intent).toBe("content_idea");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("verb-starting input boosts content confidence", () => {
      const result = classifyIntent("Creeaza o campanie de promovare pentru servicii de albire dentara");
      expect(result.intent).toBe("content_idea");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("single ? in long text → content_idea (rhetorical)", () => {
      const result = classifyIntent(
        "Am lansat un serviciu nou de albire dentara si vreau sa fac o postare care sa atraga pacienti noi care cauta tratamente moderne?"
      );
      expect(result.intent).toBe("content_idea");
    });

    it("confidence caps at 0.98", () => {
      const result = classifyIntent(
        "Scrie o postare de promovare pentru clinica dentara pe instagram cu hashtag-uri si text despre albire cu 5 beneficii https://clinica.ro #dental #albire"
      );
      expect(result.confidence).toBeLessThanOrEqual(0.98);
    });

    // Platform hints detection
    it("detects platform hints", () => {
      const result = classifyIntent("postare pe instagram despre dental");
      expect(result.detectedPlatformHints).toContain("instagram");
    });

    it("detects multiple platform hints", () => {
      const result = classifyIntent("continut pentru facebook si tiktok");
      expect(result.detectedPlatformHints).toContain("facebook");
      expect(result.detectedPlatformHints).toContain("tiktok");
    });

    it("detects fb/ig shorthand", () => {
      const result = classifyIntent("postare pe fb si insta despre dental");
      expect(result.detectedPlatformHints).toContain("fb");
      expect(result.detectedPlatformHints).toContain("insta");
    });

    // Topic detection
    it("detects dental topics", () => {
      const result = classifyIntent("vreau o postare despre implant dentar si ortodontie");
      expect(result.detectedTopics).toContain("implant");
      expect(result.detectedTopics).toContain("ortodontie");
    });

    it("detects restaurant/hotel topics", () => {
      const result = classifyIntent("promovare restaurant cu meniu nou si hotel de 5 stele");
      expect(result.detectedTopics).toContain("restaurant");
      expect(result.detectedTopics).toContain("hotel");
    });

    it("detects ecommerce topics", () => {
      const result = classifyIntent("magazin online cu produs nou la promotie pentru ecommerce");
      expect(result.detectedTopics).toContain("magazin");
      expect(result.detectedTopics).toContain("produs");
    });
  });

  describe("buildIntentClassificationPrompt", () => {
    it("returns string containing user input", () => {
      const prompt = buildIntentClassificationPrompt("test input here");
      expect(prompt).toContain("test input here");
    });

    it("contains classification categories", () => {
      const prompt = buildIntentClassificationPrompt("x");
      expect(prompt).toContain("content_idea");
      expect(prompt).toContain("question");
      expect(prompt).toContain("vague_idea");
      expect(prompt).toContain("command");
    });

    it("contains JSON format instruction", () => {
      const prompt = buildIntentClassificationPrompt("x");
      expect(prompt).toContain("JSON");
      expect(prompt).toContain("intent");
      expect(prompt).toContain("confidence");
    });
  });
});
