Task: Deep architecture audit of ContentOS
PR class: Docs-only

Phase 1 — Structure (1-5): Verify monorepo structure, package boundaries, import paths, Turbo config, tsconfig references.
Phase 2 — Code Quality (6-10): Read key files in apps/web/src. Check: any types, console.log, proper error handling, Zod at boundaries, Server vs Client components.
Phase 3 — Security (11-14): Check auth guards on all routes, RLS policies, API key exposure, env validation, CSRF protection, rate limiting.
Phase 4 — Test Coverage (15-18): Inventory test files vs source files. Check unit/e2e ratio. Identify untested critical paths.
Phase 5 — Performance (19-21): Check bundle size, image optimization, caching headers, Supabase query efficiency, N+1 queries.
Phase 6 — Report (22-25): Write docs/DEEP_AUDIT_REPORT.md — summary, scorecard (0-10), top 5 findings, top 5 improvements, risk matrix. Call ralph_done.
