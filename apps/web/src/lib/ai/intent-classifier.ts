/**
 * Intent Classifier for Brain Dump + Compose
 *
 * Detects whether user input is:
 * - content_idea: raw material for social media content
 * - question: user asking a question (expects an answer, not a post)
 * - vague_idea: too ambiguous, needs clarification
 * - command: direct instruction ("make it shorter", "add hashtags")
 */

export type IntentType = "content_idea" | "question" | "vague_idea" | "command";

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  reason: string;
  clarificationNeeded?: string;
  detectedTopics: string[];
  detectedPlatformHints: string[];
  suggestedFollowUp?: string;
}

interface IntentSignals {
  questionMarks: number;
  isDirectQuestion: boolean;
  hasContentKeywords: boolean;
  hasCommandKeywords: boolean;
  wordCount: number;
  hasSpecificTopic: boolean;
  hasPlatformMention: boolean;
  isVeryShort: boolean;
  isVeryLong: boolean;
  hasUrl: boolean;
  hasHashtags: boolean;
  startsWithVerb: boolean;
  hasNumbers: boolean;
}

const QUESTION_STARTERS_RO = [
  "ce ", "cum ", "de ce ", "cand ", "unde ", "cine ", "cat ",
  "care ", "cat de ", "cum sa ", "ce sa ", "e bine sa ",
  "pot sa ", "se poate ", "exista ", "ai ", "stii ", "poti ",
  "imi poti ", "imi spui ", "ma ajuti ", "ce inseamna ",
  "ce parere ", "cum functioneaza ", "ce crezi ",
  "e normal ", "e ok ", "merita ", "functioneaza ",
];

const QUESTION_STARTERS_EN = [
  "what ", "how ", "why ", "when ", "where ", "who ", "which ",
  "can ", "could ", "should ", "would ", "is ", "are ", "do ", "does ",
  "will ", "have ", "has ", "tell me ", "explain ",
];

const CONTENT_KEYWORDS_RO = [
  "postare", "post", "continut", "content", "scrie", "creeaza",
  "genereaza", "text", "caption", "descriere", "titlu",
  "hook", "cta", "hashtag", "reel", "story", "carousel",
  "video", "script", "thumbnail", "idee de continut",
  "campanie", "promovare", "lansare", "oferta",
];

const COMMAND_KEYWORDS_RO = [
  "fa-l ", "fa ", "schimba ", "modifica ", "adauga ", "sterge ",
  "rescrie ", "mai scurt", "mai lung", "mai formal", "mai casual",
  "mai amuzant", "reformuleaza", "imbunatateste", "optimizeaza",
  "traduce", "simplifica", "pune ", "scoate ", "include ",
];

const COMMAND_KEYWORDS_EN = [
  "make it ", "change ", "modify ", "add ", "remove ", "rewrite ",
  "shorter", "longer", "more formal", "more casual", "funnier",
  "rephrase", "improve", "optimize", "translate", "simplify",
];

const PLATFORM_MENTIONS = [
  "facebook", "fb", "instagram", "insta", "ig", "tiktok", "tik tok",
  "youtube", "yt", "twitter", "x.com", "linkedin", "reels", "stories",
];

const TOPIC_KEYWORDS_RO = [
  "dental", "stomatolog", "implant", "ortodontie", "albire",
  "restaurant", "hotel", "salon", "fitness", "gym",
  "imobiliar", "proprietate", "apartament", "casa",
  "coaching", "consultant", "freelancer", "agentie",
  "ecommerce", "magazin", "produs", "serviciu",
  "clinica", "medicina", "sanatate", "nutritie",
  "educatie", "curs", "training", "workshop",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractSignals(rawInput: string): IntentSignals {
  const text = normalize(rawInput);
  const words = text.split(/\s+/).filter(Boolean);

  const questionMarks = (text.match(/\?/g) || []).length;

  const isDirectQuestion =
    QUESTION_STARTERS_RO.some((q) => text.startsWith(q)) ||
    QUESTION_STARTERS_EN.some((q) => text.startsWith(q));

  const hasContentKeywords = CONTENT_KEYWORDS_RO.some((k) => text.includes(k));

  const hasCommandKeywords =
    COMMAND_KEYWORDS_RO.some((k) => text.startsWith(k) || text.includes(k)) ||
    COMMAND_KEYWORDS_EN.some((k) => text.startsWith(k) || text.includes(k));

  const hasSpecificTopic = TOPIC_KEYWORDS_RO.some((k) => text.includes(k));

  const hasPlatformMention = PLATFORM_MENTIONS.some((p) => text.includes(p));

  const hasUrl = /https?:\/\/|www\./i.test(rawInput);
  const hasHashtags = /#[\p{L}\p{N}]{2,}/u.test(rawInput);

  const roVerbs = /^(scrie|creeaza|genereaza|fa|pune|posteaza|publica|lanseaza|promoveaza|vinde)/;
  const enVerbs = /^(write|create|generate|make|post|publish|launch|promote|sell)/;
  const startsWithVerb = roVerbs.test(text) || enVerbs.test(text);

  const hasNumbers = /\b\d+/.test(text);

  return {
    questionMarks,
    isDirectQuestion,
    hasContentKeywords,
    hasCommandKeywords,
    wordCount: words.length,
    hasSpecificTopic,
    hasPlatformMention,
    isVeryShort: words.length < 4,
    isVeryLong: words.length > 80,
    hasUrl,
    hasHashtags,
    startsWithVerb,
    hasNumbers,
  };
}

function detectTopics(text: string): string[] {
  const normalized = normalize(text);
  return TOPIC_KEYWORDS_RO.filter((k) => normalized.includes(k));
}

function detectPlatformHints(text: string): string[] {
  const normalized = normalize(text);
  return PLATFORM_MENTIONS.filter((p) => normalized.includes(p));
}

export function classifyIntent(rawInput: string): IntentClassification {
  const text = rawInput.trim();
  if (!text) {
    return {
      intent: "vague_idea",
      confidence: 1,
      reason: "empty_input",
      clarificationNeeded: "Despre ce vrei sa creezi continut? Spune-mi ideea ta.",
      detectedTopics: [],
      detectedPlatformHints: [],
    };
  }

  const signals = extractSignals(text);
  const topics = detectTopics(text);
  const platformHints = detectPlatformHints(text);

  // --- COMMAND detection (highest priority) ---
  if (signals.hasCommandKeywords && !signals.isDirectQuestion) {
    return {
      intent: "command",
      confidence: 0.85,
      reason: "command_keywords_detected",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
    };
  }

  // --- QUESTION detection ---
  // Pure question: starts with question word + has "?" + no content keywords
  if (signals.isDirectQuestion && signals.questionMarks > 0 && !signals.hasContentKeywords) {
    return {
      intent: "question",
      confidence: 0.92,
      reason: "direct_question_with_mark",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
      suggestedFollowUp: "Raspund la intrebare, apoi intreb daca vrea continut pe tema asta.",
    };
  }

  // Starts with question word, no content keywords = likely question
  if (signals.isDirectQuestion && !signals.hasContentKeywords && !signals.startsWithVerb) {
    return {
      intent: "question",
      confidence: 0.78,
      reason: "question_starter_detected",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
      suggestedFollowUp: "Raspund la intrebare, apoi intreb daca vrea continut pe tema asta.",
    };
  }

  // Has "?" but also content keywords = content idea with a rhetorical hook
  if (signals.questionMarks > 0 && signals.hasContentKeywords) {
    return {
      intent: "content_idea",
      confidence: 0.8,
      reason: "question_mark_with_content_keywords",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
    };
  }

  // Standalone "?" with more than 2 question marks = probably a question
  if (signals.questionMarks >= 2 && signals.wordCount < 20) {
    return {
      intent: "question",
      confidence: 0.7,
      reason: "multiple_question_marks",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
      suggestedFollowUp: "Raspund la intrebare, apoi intreb daca vrea continut pe tema asta.",
    };
  }

  // --- VAGUE detection ---
  if (signals.isVeryShort && !signals.hasSpecificTopic && !signals.hasUrl && !signals.hasHashtags) {
    return {
      intent: "vague_idea",
      confidence: 0.75,
      reason: "too_short_no_topic",
      clarificationNeeded: topics.length
        ? undefined
        : "Ideea e interesanta, dar am nevoie de mai mult context. Pentru cine e? Ce vrei sa obtii?",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
      suggestedFollowUp: "Intreaba: care e publicul tinta? ce obiectiv ai?",
    };
  }

  // --- CONTENT IDEA (default for rich input) ---
  let confidence = 0.6;

  if (signals.hasContentKeywords) confidence += 0.15;
  if (signals.hasSpecificTopic) confidence += 0.1;
  if (signals.hasPlatformMention) confidence += 0.05;
  if (signals.hasUrl) confidence += 0.05;
  if (signals.hasHashtags) confidence += 0.05;
  if (signals.startsWithVerb) confidence += 0.1;
  if (signals.wordCount >= 8 && signals.wordCount <= 80) confidence += 0.05;
  if (signals.hasNumbers) confidence += 0.03;

  // Single "?" in longer text = probably rhetorical, still content
  if (signals.questionMarks === 1 && signals.wordCount > 15) {
    confidence += 0.05;
  }

  confidence = Math.min(0.98, confidence);

  // If confidence is low and no clear signal, it's vague
  if (confidence < 0.65 && !signals.hasSpecificTopic && !signals.hasContentKeywords) {
    return {
      intent: "vague_idea",
      confidence: 0.6,
      reason: "low_content_confidence",
      clarificationNeeded:
        "Am prins ideea generala. Ca sa creez ceva extraordinar, spune-mi: pentru ce platforma? ce obiectiv ai? cine e audienta?",
      detectedTopics: topics,
      detectedPlatformHints: platformHints,
      suggestedFollowUp: "Intreaba: platforma, obiectiv, audienta",
    };
  }

  return {
    intent: "content_idea",
    confidence,
    reason: "content_signals_detected",
    detectedTopics: topics,
    detectedPlatformHints: platformHints,
  };
}

/**
 * For AI-assisted classification when heuristic confidence is low.
 * Returns a system prompt fragment that instructs the AI to classify intent.
 */
export function buildIntentClassificationPrompt(userInput: string): string {
  return `Analizeaza inputul utilizatorului si clasifica-l STRICT in una din categoriile:
- "content_idea": utilizatorul vrea sa creeze continut pentru social media
- "question": utilizatorul pune o intrebare si asteapta un raspuns (nu o postare)
- "vague_idea": inputul e prea vag, ai nevoie de clarificari
- "command": utilizatorul da o instructiune directa (rescrie, modifica, etc.)

Input: "${userInput}"

Raspunde DOAR cu un JSON valid:
{
  "intent": "content_idea" | "question" | "vague_idea" | "command",
  "confidence": 0.0-1.0,
  "reason": "explicatie scurta",
  "clarificationQuestion": "intrebarea de clarificare daca e vague_idea, altfel null"
}`;
}
