# ContentOS Exhaustive Audit Report
Date: 2026-02-15

## 1. BUILD HEALTH

- **TypeScript:** PASS (0 errors, `tsc --noEmit` clean)
- **Build:** PASS (Next.js build completes, all routes rendered)
- **Missing env vars:** `.env.local` only contains `VERCEL_OIDC_TOKEN`. All service keys (Supabase, AI, Stripe, Social Auth, Cron) are not set locally.

### Env vars referenced in code (63 total):

| Category | Variables |
|----------|-----------|
| AI Keys | ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_AI_API_KEY, OPENROUTER_API_KEY |
| AI Config | AI_PROVIDER, AI_MODEL, AI_API_KEY, AI_FORCE_TEMPLATE, AI_MODEL_RESEARCH* |
| AI Budget | AI_BUDGET_DAILY_USD (default $2), AI_BUDGET_MONTHLY_USD (default $45) |
| AI Thresholds | AI_GENERATE_PREMIUM_THRESHOLD, AI_BRAINDUMP_PREMIUM_THRESHOLD, AI_SCORE_PREMIUM_THRESHOLD, AI_COACH_ESCALATE_BELOW_ENGAGEMENT |
| OpenRouter | OPENROUTER_BASE_URL, OPENROUTER_MODEL, OPENROUTER_APP_NAME, OPENROUTER_SITE_URL, per-quality models |
| Braindump | BRAINDUMP_DEFAULT_QUALITY, BRAINDUMP_MODEL_ECONOMY/BALANCED/PREMIUM |
| Supabase | NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| Social Auth | META_APP_ID, META_APP_SECRET, LINKEDIN_CLIENT_ID/SECRET, TIKTOK_CLIENT_KEY/SECRET |
| Stripe | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* |
| Other | CRON_SECRET, FIRECRAWL_API_KEY, MONITORING_API_KEY |

**Impact:** Without API keys, all AI routes fall back to deterministic templates silently.

---

## 2. DATABASE

**Tables defined in migrations (contentos schema): 22**

| # | Table | Status |
|---|-------|--------|
| 1 | organizations | Exists |
| 2 | users | Exists |
| 3 | social_accounts | Exists |
| 4 | posts | Exists |
| 5 | drafts | Exists |
| 6 | brain_dumps | Exists (NOT referenced in code) |
| 7 | analytics_daily | Exists |
| 8 | coach_conversations | Exists (NOT referenced in code) |
| 9 | inspirations | Exists |
| 10 | templates | Exists (NOT referenced in code) |
| 11 | tracked_competitors | Exists |
| 12 | scrape_cache | Exists |
| 13 | research_analyses | Exists |
| 14 | ai_usage_events | Exists |
| 15 | ai_request_cache | Exists |
| 16 | decision_logs | Exists |
| 17 | outcome_events | Exists |
| 18 | creative_memory | Exists |
| 19 | pattern_candidates | Exists |
| 20 | consolidation_audit_log | Exists |
| 21 | knowledge_entities | Exists |
| 22 | knowledge_relationships | Exists |

### MISSING Tables (referenced in code, not in migrations):

| Table | Referenced by | Impact |
|-------|--------------|--------|
| episodic_memory | memory-consolidation/route.ts, pattern-detector.ts | Cognitive memory cron + pattern detection fails at runtime |
| working_memory | memory-consolidation/route.ts | Memory consolidation cron fails |
| semantic_patterns | memory-consolidation.ts | Memory consolidation fails |
| metacognitive_log | memory-consolidation/route.ts | Memory consolidation fails |

**Note:** These tables ARE defined in `012_cognitive_memory_v3.sql` at the repo root, but that file is NOT inside `supabase/migrations/`. Migration 013 ALTERs `episodic_memory` which doesn't exist yet. These tables likely don't exist in the deployed database.

The `media` reference in `compose/media-upload.tsx` is `supabase.storage.from("media")` (storage bucket, not a table) -- OK.

---

## 3. AI ROUTES STATUS

| Route | jsonrepair | prefill | maxTokens | biz profile fields | parse vulnerability |
|-------|-----------|---------|-----------|-------------------|-------------------|
| generate | NO | NO | platforms x 920 | name, description, industry, tones, targetAudience, usps* | Partial: regex + JSON.parse, fallback to deterministic |
| braindump | NO (custom brace repair) | NO | 2000-8192 dynamic | ALL fields (full BusinessProfile) | Better: custom parser with fenced block + brace repair |
| coach | NO | NO | 900 fixed | NONE | Partial: regex + JSON.parse, fallback to deterministic |
| score | NO | NO | 700 fixed | NONE | Partial: regex + JSON.parse, fallback to deterministic |
| research | NO | NO | ~900 | NONE | N/A: uses ContentAIService, not raw parsing |

*Generate has a TYPE MISMATCH: reads usps as Array.isArray() but type is string. USPs always undefined.

### Route details:

**Generate** (`/api/ai/generate/route.ts`):
- System prompt says "Return ONLY valid JSON" but NOT "no markdown, no code blocks"
- USP BUG: `Array.isArray(bp.usps)` on a string returns false. USPs silently dropped.
- Does NOT include avoidPhrases, preferredPhrases, or compliance in prompt
- Parse failure: falls back to deterministic, caches for 24 hours
- Intent classifier blocks vague_idea (>=0.65 confidence) and question (>=0.75)
- estimatedOutputTokens = platforms.length * 920

**Braindump** (`/api/ai/braindump/route.ts`):
- Models: economy=haiku, balanced/premium=sonnet (configurable via BRAINDUMP_MODEL_* env)
- Reads FULL BusinessProfile: name, industry, description, targetAudience, tones, usps, preferredPhrases, avoidPhrases, compliance (including CMSR_2025/ANAF)
- Custom parseModelJson(): fenced code block extraction + unbalanced brace repair
- Conversation mode with multi-turn intent detection
- maxTokens: 2000-8192 based on quality mode, platform count, input length

**Coach** (`/api/ai/coach/route.ts`):
- Expects JSON: { answer, recommendations, actionItems, metrics }
- Does NOT read business profile at all
- Does NOT receive conversation history (each question isolated)
- No jsonrepair. Regex + JSON.parse with deterministic fallback.
- Cache TTL: 12 hours

**Score** (`/api/ai/score/route.ts`):
- Expects JSON: { overallScore, grade, metrics[], summary, improvements[], alternativeVersions[] }
- Does NOT read business profile
- Escalates to premium model when deterministic score < 68 (AI_SCORE_PREMIUM_THRESHOLD)
- No jsonrepair. Regex + JSON.parse.

**Research** (`/api/ai/research/route.ts`):
- Uses LEGACY provider.ts (resolveAIProviderForTask + ContentAIService) instead of multi-model-router.ts routeAICall
- Does NOT read business profile
- Has both GET (history list) and POST (new analysis)
- Stores results in research_analyses table
- Tracks competitors in tracked_competitors table

---

## 4. MULTI-MODEL ROUTER

**File:** `apps/web/src/lib/ai/multi-model-router.ts`

### Providers configured:
| Provider | SDK | Available when |
|----------|-----|---------------|
| Anthropic | @anthropic-ai/sdk | ANTHROPIC_API_KEY set |
| OpenAI | openai | OPENAI_API_KEY set |
| Google | @google/generative-ai | GOOGLE_AI_API_KEY set |
| OpenRouter | Raw fetch | OPENROUTER_API_KEY set |

### Default task routing:
| Task | Primary Provider/Model | Fallback |
|------|----------------------|----------|
| generate | anthropic / claude-sonnet-4-5-20250929 | openrouter/auto |
| score | anthropic / claude-haiku-4-5-20251001 | openrouter/auto |
| coach | anthropic / claude-sonnet-4-5-20250929 | openrouter/auto |
| braindump | anthropic / claude-sonnet-4-5-20250929 | openrouter/auto |
| research | google / gemini-2.0-flash | anthropic/haiku |
| visual | openai / gpt-4o | anthropic/sonnet |
| insights | anthropic / claude-haiku-4-5-20251001 | google/gemini |

### Supports prefill: YES
The callAnthropic function passes all non-system messages including assistant role. However, NO route currently sends an assistant prefill message.

### Provider chain: Primary -> configured fallback -> any available (anthropic -> openrouter -> google -> openai)

### Risk: `llm-client.ts` is an orphaned parallel AI path
Uses raw fetch to OpenAI directly (not via multi-model-router). Used by:
- generate-cognitive/route.ts
- knowledge-graph.ts  
- pattern-detector.ts

These calls bypass governor/budget entirely. Costs not tracked.

---

## 5. BUSINESS PROFILE DATA FLOW

### Form saves all fields to organizations.settings.businessProfile:

| Field | Type | Saved | generate | braindump | coach | score |
|-------|------|-------|---------|-----------|-------|-------|
| name | string | YES | YES | YES | NO | NO |
| description | string | YES | YES | YES | NO | NO |
| industry | Industry | YES | YES | YES | NO | NO |
| tones | CommunicationTone[] | YES | YES | YES | NO | NO |
| targetAudience | string | YES | YES | YES | NO | NO |
| usps | string | YES | BROKEN* | YES | NO | NO |
| avoidPhrases | string | YES | NO | YES | NO | NO |
| preferredPhrases | string | YES | NO | YES | NO | NO |
| language | BusinessLanguage | YES | NO | NO | NO | NO |
| compliance | ComplianceRule[] | YES | NO | YES | NO | NO |

*Generate reads usps with Array.isArray() but type is string. Always evaluates to undefined.

---

## 6. UI WIRING

| Page | API called | Payload correct | Response handled | AI vs Template indicator |
|------|-----------|----------------|-----------------|------------------------|
| Composer /compose | /api/ai/generate | YES | YES | NO (meta.mode not displayed) |
| Braindump /braindump | /api/ai/braindump | YES | YES (platform cards) | NO (meta.mode not displayed) |
| Coach /coach | /api/ai/coach | PARTIAL (no history) | YES | NO |
| Scorer /analyze | /api/ai/score | PARTIAL (no contentType/lang) | YES | NO |

### Composer:
- Calls /api/ai/generate with: input, platforms, objective, tone, includeHashtags, includeEmoji, exploreOnly, selectedAngleId
- Three-phase flow: Input -> Explore (angles) -> Generate (content)
- Handles intent_redirect and clarification_needed modes
- Shows variant badge v{n} and score badge but NO "AI" vs "Template" label
- Save draft to /api/drafts

### Braindump:
- Calls /api/ai/braindump with: rawInput, platforms, language, qualityMode, objective, conversationHistory, conversationMode
- Platform-specific card components (FacebookCard, InstagramCard, TikTokCard, YouTubeCard)
- Conversation mode with clarification flow

### Coach:
- Calls /api/ai/coach with: { question } only
- Does NOT send conversation history despite chat UI
- Formats actionItems as bullet list in displayed response
- Each message is a fresh isolated request

### Scorer:
- Calls /api/ai/score with: { content, platform }
- Does NOT send contentType (defaults to "text") or language (defaults to "ro")
- YouTube scripts scored as text type

---

## 7. DETERMINISTIC FALLBACK ANALYSIS

**File:** `apps/web/src/lib/ai/deterministic.ts`

What it generates:
- **Generate:** Platform-specific posts using AIDA/PAS/BAB/Story/List frameworks. Keyword extraction, hooks, CTAs, hashtags, algorithm scores.
- **Braindump:** Platform-specific content with tips, hashtags, engagement estimates.
- **Coach:** Generic coaching advice with action items and post references.
- **Score:** 9-metric scoring (hook, readability, structure, CTA, length, hashtags, emotion, specificity, framework).

UI distinguishability: meta.mode="deterministic" is returned but NEVER displayed. Users cannot tell template from AI.

Note: Deterministic generator does NOT receive business profile data.

---

## 8. GOVERNOR AND BUDGET

**File:** `apps/web/src/lib/ai/governor.ts`

| Setting | Default | Env var |
|---------|---------|---------|
| Daily budget | $2.00 | AI_BUDGET_DAILY_USD |
| Monthly budget | $45.00 | AI_BUDGET_MONTHLY_USD |

Organizations can override via settings.aiBudget.dailyUsd / monthlyUsd.

When budget exceeded: Returns deterministic fallback with warning. Caches the fallback (24h generate/braindump, 12h coach, 24h score). Logs budgetFallback: true.

Cache behavior:
- All routes cache to ai_request_cache with SHA-256 intent hash
- Deterministic failure responses ARE cached for full TTL
- No UI mechanism to clear cache or force-refresh
- Budget resets naturally at UTC day/month boundaries, no manual reset

Premium ROI gate: Calculates expected quality uplift x value per score point. Requires ROI >= 3x (engagement) or >= 1.8x (leads). Can learn from historical outcomes via outcome_events/decision_logs.

---

## 9. INTENT CLASSIFIER

**File:** `apps/web/src/lib/ai/intent-classifier.ts`

Categories: content_idea, question, vague_idea, command

What triggers vague_idea (blocking generation):
- Input < 4 words AND no topic keyword AND no URL AND no hashtags -> confidence 0.75
- Low content confidence (< 0.65) AND no topic/content keywords -> confidence 0.60

Minimum to pass as content_idea:
- 4+ words, OR topic keyword present, OR URL/hashtag present, OR starts with content verb

Is this causing "short text doesn't generate"? YES, partially. Generic 2-3 word inputs like "marketing tips" are blocked as vague_idea. But inputs with topic keywords like "oferta implant" pass because "implant" matches dental topic.

Used by: generate route (blocks on vague_idea and question). Braindump has its own processBrainDumpInput with different handling (answers questions, asks clarifications).

---

## 10. PACKAGE DEPENDENCIES

| Package | Status |
|---------|--------|
| jsonrepair | NOT INSTALLED |
| cheerio | NOT INSTALLED |
| @anthropic-ai/sdk | ^0.39.0 |
| openai | ^6.21.0 |
| @google/generative-ai | ^0.24.1 |

Impact of missing jsonrepair: All JSON parsing relies on regex + JSON.parse. Braindump has custom brace repair. Generate/coach/score have no repair. Malformed JSON -> silent deterministic fallback.

---

## CRITICAL ISSUES (ordered by severity)

### CRITICAL

1. **Missing database tables for cognitive memory.** episodic_memory, working_memory, semantic_patterns, metacognitive_log -- SQL at repo root NOT in supabase/migrations/. Memory consolidation cron crashes at runtime.

2. **No env vars configured locally.** .env.local has only VERCEL_OIDC_TOKEN. App cannot function locally without manual setup. (Vercel deployment may have these set separately.)

3. **USP type mismatch in generate route.** Reads usps as Array.isArray() but type is string. USPs silently dropped from Composer creative brief. Braindump handles correctly.

### HIGH

4. **No jsonrepair dependency.** Naive regex + JSON.parse in generate/coach/score. Malformed AI JSON causes silent template fallback.

5. **Deterministic fallback cached 24h.** AI failure once = template served for full day. No user-facing refresh mechanism.

6. **Coach and Score ignore business profile.** No brand personalization in coaching or scoring.

7. **Coach UI doesn't send conversation history.** Each question isolated despite chat UI suggesting continuity.

8. **No AI vs Template indicator in any UI.** Users cannot distinguish AI from template output. meta.mode exists but never displayed.

9. **Research route uses legacy provider system.** Doesn't go through multi-model-router or benefit from unified fallback.

### MEDIUM

10. **llm-client.ts bypasses governor.** generate-cognitive, knowledge-graph, pattern-detector make untracked OpenAI calls outside budget system.

11. **No assistant prefill used.** Would improve JSON reliability for Anthropic models.

12. **Score UI missing contentType/language params.** Always defaults to text/ro. YouTube scripts scored as text.

13. **Generate omits avoidPhrases, preferredPhrases, compliance.** Only braindump includes these critical brand guidelines.

### LOW

14. **3 unused DB tables.** brain_dumps, coach_conversations, templates -- dead schema.

15. **System prompts don't prohibit markdown/code blocks explicitly.** Minor resilience gap.

16. **Token estimation uses length/4 heuristic.** Less accurate for Romanian.

---

## RECOMMENDED FIX ORDER

**PR 1: Fix critical data flow bugs**
- Fix USP type mismatch in generate route (string not array)
- Add avoidPhrases, preferredPhrases, compliance to generate prompt
- Add business profile reading to coach and score routes
- Est: 2-3h

**PR 2: Install jsonrepair + add assistant prefill**
- pnpm add jsonrepair
- Replace regex+JSON.parse with jsonrepair in all routes
- Add assistant prefill for Anthropic calls
- Add "no markdown/code blocks" to prompts
- Est: 3-4h

**PR 3: Add AI vs Template indicator to UI**
- Display meta.mode badge on all result cards
- Show warning when deterministic fallback active
- Add "Regenerate" button that bypasses cache
- Est: 2-3h

**PR 4: Fix coach conversation history**
- Send message history from UI to API
- Pass history as messages array to routeAICall
- Add business profile to coach system prompt
- Est: 2-3h

**PR 5: Deploy cognitive memory migrations**
- Move 012_cognitive_memory_v3.sql into supabase/migrations/
- Verify migration 013 applies cleanly after 012
- Test memory consolidation cron
- Est: 1-2h

**PR 6: Cache improvements**
- Short TTL for error fallbacks (5 min vs 24h)
- Add force-refresh to all UI pages
- Est: 2-3h

**PR 7: Unify research route with multi-model-router**
- Replace legacy provider.ts usage with routeAICall
- Ensure governor/budget covers research
- Est: 3-4h

**PR 8: Bring llm-client.ts under governor**
- Route cognitive paths through budget system
- Log usage events for these calls
- Est: 2-3h
