/**
 * Brain Dump Coach — Conversational Intelligence Layer
 *
 * Makes Brain Dump intelligent:
 * 1. Detects intent (question vs content vs vague)
 * 2. Asks smart clarifying questions when input is vague
 * 3. Answers questions THEN offers to create content on the topic
 * 4. Enriches raw ideas with context before sending to generation
 */

import { classifyIntent, type IntentClassification } from "./intent-classifier";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    intent?: IntentClassification;
    isGeneration?: boolean;
    platforms?: string[];
  };
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  options?: string[];
  category: "audience" | "platform" | "objective" | "context" | "tone";
}

export interface BrainDumpCoachResult {
  action: "generate" | "clarify" | "answer" | "enriched_generate";
  messages: ConversationMessage[];
  clarifications?: ClarificationQuestion[];
  enrichedInput?: string;
  intent: IntentClassification;
}

let messageCounter = 0;
function nextMessageId(): string {
  messageCounter += 1;
  return `msg_${Date.now()}_${messageCounter}`;
}

function buildClarifications(intent: IntentClassification): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  if (!intent.detectedPlatformHints.length) {
    questions.push({
      id: "platform",
      question: "Pentru ce platforme vrei continut?",
      options: ["Facebook", "Instagram", "TikTok", "YouTube", "Toate"],
      category: "platform",
    });
  }

  if (!intent.detectedTopics.length) {
    questions.push({
      id: "context",
      question: "Poti sa-mi dai mai mult context? Despre ce e vorba exact?",
      category: "context",
    });
  }

  // Always useful to know the objective
  questions.push({
    id: "objective",
    question: "Ce vrei sa obtii cu acest continut?",
    options: ["Engagement (comentarii)", "Reach (vizibilitate)", "Leads (clienti noi)", "Saves (continut salvat)"],
    category: "objective",
  });

  return questions.slice(0, 3);
}

function buildAnswerFollowUp(input: string, intent: IntentClassification): string {
  const topic = intent.detectedTopics.length
    ? intent.detectedTopics[0]
    : "aceasta tema";

  return `Am raspuns la intrebarea ta. Vrei sa creez continut de social media pe tema "${topic}"?`;
}

function buildQuestionAnswerPrompt(userInput: string): string {
  return `Utilizatorul pune o intrebare. Raspunde DIRECT si UTIL in limba romana, ca un expert in social media marketing.

Intrebarea: "${userInput}"

Dupa ce raspunzi, intreaba daca vrea sa creeze continut pe aceasta tema.
Raspunde natural, concis, fara format JSON.`;
}

export function processBrainDumpInput(params: {
  input: string;
  conversationHistory: ConversationMessage[];
  platforms?: string[];
}): BrainDumpCoachResult {
  const { input, conversationHistory, platforms } = params;
  const intent = classifyIntent(input);

  const userMessage: ConversationMessage = {
    id: nextMessageId(),
    role: "user",
    content: input,
    metadata: { intent },
  };

  // --- QUESTION: Answer it, then offer to create content ---
  if (intent.intent === "question" && intent.confidence >= 0.7) {
    const followUp = buildAnswerFollowUp(input, intent);
    return {
      action: "answer",
      messages: [
        ...conversationHistory,
        userMessage,
      ],
      intent,
    };
  }

  // --- VAGUE IDEA: Ask clarifying questions ---
  if (intent.intent === "vague_idea") {
    const clarifications = buildClarifications(intent);
    const assistantMessage: ConversationMessage = {
      id: nextMessageId(),
      role: "assistant",
      content: intent.clarificationNeeded ||
        "Ideea e interesanta! Ca sa creez ceva extraordinar, am nevoie de cateva detalii:",
    };

    return {
      action: "clarify",
      messages: [
        ...conversationHistory,
        userMessage,
        assistantMessage,
      ],
      clarifications,
      intent,
    };
  }

  // --- COMMAND: Apply to previous context ---
  if (intent.intent === "command") {
    // Find the last generation in conversation
    const lastGeneration = [...conversationHistory]
      .reverse()
      .find((m) => m.metadata?.isGeneration);

    if (lastGeneration) {
      return {
        action: "enriched_generate",
        messages: [...conversationHistory, userMessage],
        enrichedInput: `Modifica continutul anterior conform instructiunii: "${input}"\n\nContinut original:\n${lastGeneration.content}`,
        intent,
      };
    }

    // No previous generation, treat as content idea
    return {
      action: "generate",
      messages: [...conversationHistory, userMessage],
      intent,
    };
  }

  // --- CONTENT IDEA: Generate directly ---
  // But first, check if we have enough context from conversation
  const contextFromHistory = extractConversationContext(conversationHistory);
  const enrichedInput = contextFromHistory
    ? `${input}\n\nContext din conversatie:\n${contextFromHistory}`
    : input;

  return {
    action: "generate",
    messages: [...conversationHistory, userMessage],
    enrichedInput: contextFromHistory ? enrichedInput : undefined,
    intent,
  };
}

function extractConversationContext(history: ConversationMessage[]): string | null {
  if (history.length < 2) return null;

  // Extract clarification answers from recent history
  const recentUserMessages = history
    .filter((m) => m.role === "user")
    .slice(-3);

  if (recentUserMessages.length < 2) return null;

  const context = recentUserMessages
    .map((m) => m.content)
    .join("\n");

  return context.length > 20 ? context : null;
}

/**
 * Builds a system prompt for answering questions in Brain Dump context.
 */
export function buildBrainDumpAnswerSystemPrompt(): string {
  return `Esti ContentOS AI — asistentul de social media marketing din Romania.

Utilizatorul a pus o intrebare in Brain Dump. Raspunde-i DIRECT si UTIL.
- Raspunde in limba romana
- Fii concis dar complet
- Daca intrebarea e despre social media / marketing, da sfaturi practice
- Daca intrebarea e generala, raspunde si apoi intreaba daca vrea continut pe tema asta
- La final, intreaba: "Vrei sa creez continut pe aceasta tema?"

NU genera o postare de social media. Raspunde la intrebare ca un consultant.`;
}

/**
 * Builds a system prompt for generating content with enriched context from conversation.
 */
export function buildEnrichedGenerationPrompt(conversationContext: string): string {
  return `Context din conversatia cu utilizatorul:
${conversationContext}

Foloseste acest context pentru a genera continut mai relevant si mai personalizat.
Ia in considerare raspunsurile utilizatorului la intrebarile de clarificare.`;
}
