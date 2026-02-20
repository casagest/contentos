Task: Add feature — {FEATURE_NAME}
PR class: {PR_CLASS}

Phase 1 — Design (1-2): Read ARCHITECTURE.md. Identify affected files. Define data flow. List dependencies.
Phase 2 — Types & Schema (3-5): Add Zod schemas, TypeScript types, DB migration if needed. Run type-check.
Phase 3 — Backend (6-10): Implement API routes, lib functions, Supabase queries. Validate with Zod at boundaries.
Phase 4 — Frontend (11-15): Build components (Server Components first, "use client" only when needed). Wire to API. Handle loading/error states. AI features non-fatal.
Phase 5 — Tests (16-18): Unit tests (Vitest) for logic. E2E test (Playwright) for happy path. Run test.
Phase 6 — Verify (19-20): Run gate:platinum, commit, report changes/risks/tests. Call ralph_done.
