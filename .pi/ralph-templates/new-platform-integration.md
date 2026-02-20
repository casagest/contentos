Task: Add {PLATFORM} social platform integration
PR class: Chained (Types > API routes > UI > Tests)

Phase 1 — Research (1-2): Read ARCHITECTURE.md platform matrix. Check API docs, rate limits, OAuth flow.
Phase 2 — Types (3-4): Zod schemas for API request/response in packages/shared. TypeScript interfaces.
Phase 3 — OAuth Flow (5-7): Implement OAuth connect/disconnect in apps/web/src/app/api/. Token storage in Supabase.
Phase 4 — Data Ingestion (8-11): Post fetching, metric extraction, embedding generation. Queue-based for rate limits.
Phase 5 — Scoring Engine (12-14): Platform-specific algorithm scoring in packages/content-engine.
Phase 6 — UI (15-17): Connect account UI, platform-specific dashboard views, content composer for platform.
Phase 7 — Tests (18-20): Unit tests for scoring, E2E for OAuth flow, mock API responses.
Phase 8 — Verify (21-22): Run gate:platinum, commit, ralph_done.
