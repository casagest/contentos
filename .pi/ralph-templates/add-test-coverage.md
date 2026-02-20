Task: Add test coverage for {MODULE_NAME}
PR class: Tests-only

Phase 1 — Inventory (1-2): Read all source files in module, list public functions, hooks, components, API routes.
Phase 2 — Unit Tests (3-8): Create Vitest test files. Test happy path, error cases, edge cases, Zod validation.
Phase 3 — Component Tests (9-12): Test React components: render, user interaction, loading states, error states.
Phase 4 — E2E Tests (13-15): Playwright tests for critical user flows. Test auth, navigation, form submissions.
Phase 5 — Verify (16-18): Run test:coverage, check coverage %, branch test/{module}-coverage, commit, ralph_done.
