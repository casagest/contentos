// ============================================================================
// src/app/api/ai/generate-cognitive/route.ts
// AI Content Generation — Cognitive Memory Route Handler
//
// Responsibilities:
//   - Input validation (Zod)
//   - Authentication + authorization (defense-in-depth)
//   - Orchestration: context fetch → prompt build → LLM call
//   - Graceful degradation: if cognitive memory fails, generate without it
//   - Structured error responses
//
// NON-FATAL rule: cognitive memory failure does NOT block generation.
// The user gets content either way; memory just makes it better.
// ============================================================================

import { NextResponse } from "next/server";
import { getSessionUserWithOrg } from "@/lib/auth";

import { GenerateInputSchema, type GenerateOutput } from "@/lib/ai/types";
import {
  fetchCognitiveContext,
  assessContextQuality,
} from "@/lib/ai/cognitive-memory";
import {
  buildMemoryPromptFragment,
  estimateTokens,
} from "@/lib/ai/memory-sanitizer";
import { callLLM } from "@/lib/ai/llm-client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_SYSTEM_PROMPT = `You are an elite social media strategist specializing in dental and medical marketing.

RULES:
- Produce specific, actionable, high-signal content. No filler, no fluff.
- Follow brand voice constraints when provided in cognitive memory.
- Every piece of content must have a clear call-to-action.
- Respect platform-specific best practices (character limits, hashtag strategies, visual hooks).
- If cognitive memory provides engagement patterns, weight your strategy toward proven approaches.`;

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1) Parse & validate input
  const rawBody = await request.json().catch(() => null);
  const inputResult = GenerateInputSchema.safeParse(rawBody);

  if (!inputResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: inputResult.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const { organizationId: inputOrgId, platform, objective, shouldEscalate } =
    inputResult.data;

  // 2) Authenticate + authorize via project session helper
  const session = await getSessionUserWithOrg();
  if (session instanceof NextResponse) return session;

  const { supabase, organizationId } = session;

  // 3) Defense-in-depth: verify request org matches session org
  if (inputOrgId !== organizationId) {
    return NextResponse.json(
      { error: "Not authorized for this organization" },
      { status: 403 }
    );
  }

  // 4) Fetch cognitive context (NON-FATAL)
  const contextResult = await fetchCognitiveContext({
    supabase,
    organizationId,
    platform,
  });

  let memoryFragment = "";
  let temperature = 0.5; // conservative default
  let layersInjected = 0;
  let accuracyBayesian: number | null = null;
  let accuracySamples = 0;
  let isFallback = false;

  if (contextResult.ok) {
    const ctx = contextResult.value;
    const quality = assessContextQuality(ctx);

    memoryFragment = buildMemoryPromptFragment(ctx, organizationId);
    temperature = ctx.metacognitive.calculated_temperature ?? 0.5;
    layersInjected = quality.layerCoverage;
    accuracyBayesian = ctx.metacognitive.accuracy_bayesian ?? null;
    accuracySamples = ctx.metacognitive.accuracy_samples ?? 0;
  } else {
    // Log but don't fail — graceful degradation
    console.error("cognitive_context_failed", {
      code: contextResult.error.code,
      message: contextResult.error.message,
      organizationId,
    });
    isFallback = true;
  }

  // 5) Build messages
  const systemPrompt = memoryFragment
    ? `${BASE_SYSTEM_PROMPT}\n\n${memoryFragment}`
    : BASE_SYSTEM_PROMPT;

  const model = shouldEscalate ? "gpt-4o" : "gpt-4o-mini";

  // 6) Call LLM (with timeout, retry, circuit breaker + governor tracking)
  const llmResult = await callLLM({
    model,
    temperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: objective },
    ],
    maxTokens: 1000,
  }, {
    supabase,
    organizationId,
    userId: session.user.id,
    routeKey: "generate-cognitive",
  });

  if (!llmResult.ok) {
    const err = llmResult.error;
    const status =
      err.code === "LLM_TIMEOUT"
        ? 504
        : err.code === "LLM_ERROR" && "status" in err && err.status === 429
          ? 429
          : 502;

    return NextResponse.json(
      { error: "Content generation failed", code: err.code },
      { status }
    );
  }

  // 7) Build response
  const response: GenerateOutput = {
    content: llmResult.value.content,
    meta: {
      cognitiveMemory: {
        layersInjected,
        temperature,
        accuracyBayesian,
        accuracySamples,
        tokenEstimate: estimateTokens(memoryFragment),
        fallback: isFallback,
      },
    },
  };

  return NextResponse.json(response);
}
