# CLAUDE.md — ContentOS (Tier S)

> AI Content Intelligence Platform · Romanian creators & dental clinics
> Multi-platform social media · AI scoring · content generation · pgvector embeddings
> Monorepo Turborepo · Next.js 15 · Supabase · TypeScript strict

---

## Golden Rules (NON-NEGOTIABLE)

1. `main` is READ-ONLY — PR only
2. **Merge-blocking gate:** `pnpm gate:platinum` (authoritative)
3. Scope is sacred — change ONLY what the task lists
4. No placeholders, no TODOs, no "should work"
5. AI features are NON-FATAL — core UI must survive Claude API failure
6. Auth first — no unauthenticated paths for protected data
7. Deterministic + idempotent changes only
8. One PR = one intent. If intent splits, split PRs.

---

## AI Interaction Protocol (How you work here)

### Plan-First Contract

- **PLAN first** (mandatory). Do not write code until plan is approved.
- PLAN must include: **PR class**, exact **file list**, **risk notes**, **verification commands**, **rollback note**.

### Atomicity Rules

- **Max 5 files per ATOMIC PR.**
- If >5 files are required, split into chained PRs:
  - PR-A: types/schemas/database
  - PR-B: lib/engine logic
  - PR-C: components/pages/tests
- Each PR must be **mergeable independently**.

### Read-Before-Edit

- Never modify code you haven't opened and read in full context.
- Do not "pattern match" and guess.

### Bug Fix = Test-First

- Add failing test → implement fix → verify green.
- No fix without proof.

### Post-Implementation Report (mandatory)

After changes:

- What changed (1–3 bullets)
- What could break (1–3 bullets)
- Tests added/updated (list)
- Verification run (paste summary)

---

## Stack (Repo Truth)

pnpm 9+ (NEVER npm/yarn) · TypeScript 5.7 strict · Turbo · Next.js 15 + React 19 (:3000) · Supabase (PostgreSQL + Auth + pgvector) · Anthropic Claude API · Stripe · Vercel · Vitest · ESLint · Playwright · Tailwind CSS · Husky + lint-staged

---

## Project Structure

```
apps/web/                  Next.js SaaS application (contentos.ro)
  src/app/(auth)/          Login, register, OAuth
  src/app/(dashboard)/     Main dashboard (coach, compose, analyze, etc.)
  src/app/(onboarding)/    Onboarding flow
  src/app/api/             API routes
  src/components/          App components + ui/
  src/hooks/               React hooks
  src/lib/                 Utilities (ai/, auth/, dashboard/, supabase/)
  src/__tests__/           Vitest unit tests

apps/dental-content/       Dental vertical module (MEDICALCOR integration)

packages/content-engine/   ★ SHARED AI engine & platform adapters
packages/database/         DB schemas, types, queries
packages/shared/           Shared types & utilities
packages/ui/               Shared React components

supabase/migrations/       Database migrations (source of truth)
```

---

## Layer Rule

```
packages/shared → packages/database → packages/content-engine → packages/ui → apps/
```

Lower NEVER imports higher.

---

## Code Conventions (Do it this way)

- Zod validation at all API boundaries (route handlers, external APIs)
- `unknown` over `any` — always
- No `console.log` in production code — use structured error handling
- Server Components by default, `"use client"` only when needed
- All API routes: proper error responses with status codes
- Environment variables validated at startup
- Social API tokens encrypted at rest (Supabase handles this)

---

## Do-Not-Touch Zones (BLOCKING)

- `dist/`, `.next/`, `coverage/` — never commit generated artifacts
- lockfiles (`pnpm-lock.yaml`) — do not modify unless dependency-related task
- "Drive-by" edits — forbidden (no cleanup unrelated to task)
- `.env`, `.env.local` — never commit secrets

---

## Database Migrations (Hard rules)

- Author ONLY in `supabase/migrations/` — format: `YYYYMMDDHHMMSS_desc.sql`
- Never modify existing migration files
- Always `IF EXISTS` / `IF NOT EXISTS` for idempotency
- Never `DROP TABLE/COLUMN` without explicit approval + backup plan
- Never `NOT NULL` on existing column without default/backfill
- Large tables: `CREATE INDEX CONCURRENTLY`
- Test with `supabase db reset` before merge

---

## PR Classes (Pick ONE, keep scope pure)

- **DB-only:** `supabase/migrations/**`
- **Types-only:** `packages/shared/**`, `packages/database/**`
- **Engine-only:** `packages/content-engine/**`
- **UI-only:** `packages/ui/**`
- **App-only:** `apps/web/**`
- **Dental-only:** `apps/dental-content/**`
- **Tests-only:** `**/__tests__/**`, `**/*.test.*`
- **Docs-only:** `docs/**`, `*.md`

Mixing classes requires explicit PLAN approval.

---

## Compliance (GDPR + CMSR)

| Trigger                      | Action                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| PII/user data touched        | encrypt + RLS + audit                                                 |
| Social account tokens        | encrypted storage, secure refresh, revocation support                 |
| AI content generation        | user owns output, no training on user data without consent            |
| Dental content (CMSR 2025)   | compliance checker required, patient consent for case photos          |
| User deletion request        | cascade delete user data, revoke OAuth tokens, anonymize analytics    |

---

## Workflow (Canonical)

PLAN → IMPLEMENT (small diff) → VERIFY (gate) → SIMPLIFY → COMMIT + PR

### Gates

- **Fast sanity:** `pnpm lint && pnpm type-check`
- **Full gate:** `pnpm gate:platinum` (lint + type-check + test:coverage + build + e2e)
- **Pre-merge:** `pnpm pre-merge` (alias for gate:platinum) ✅

---

## Verification (ALWAYS before PR)

Run from repo root:

1. `pnpm type-check` → 0 errors
2. `pnpm lint` → 0 warnings
3. `pnpm test` → all pass
4. `pnpm build` → succeeds
5. **Merge gate:** `pnpm gate:platinum` → PASS

If any step fails: fix root cause and re-run from step 1. No skipping.

---

## Agent Output Contract (MANDATORY)

### PLAN output must include

- PR class
- File list (exact paths)
- Risks / blast radius
- Verification commands
- Rollback note (if runtime behavior changes)

### IMPLEMENT output must include

- Summary (max 5 bullets)
- Tests added/updated (list)
- `git diff --stat` output
- Gate result summary (PASS/FAIL + first error)

---

## Failure Playbook (No shortcuts)

If gate fails:

1. Stop scope creep. Fix only the cause.
2. Re-run `pnpm gate:platinum`.
3. If flaky (e2e): isolate, reproduce, document. Never "ignore".

---

## Quick Commands

```bash
pnpm dev                      # Start development server
pnpm build                    # Production build
pnpm lint                     # ESLint
pnpm type-check               # TypeScript compiler check
pnpm test                     # Vitest unit tests
pnpm test:coverage            # Tests with coverage
pnpm e2e                      # Playwright E2E tests
pnpm e2e:prod                 # E2E against production
pnpm gate:platinum            # Full merge-blocking gate
pnpm pre-merge                # Alias for gate:platinum
pnpm monitor:synthetic        # Synthetic uptime checks
```

---

## Deep References (Read on demand)

| Topic                          | Path                                        |
| ------------------------------ | ------------------------------------------- |
| Architecture blueprint         | `ARCHITECTURE.md`                           |
| Quickstart guide               | `QUICKSTART.md`                             |
| Audit report                   | `AUDIT_REPORT.md`                           |
| Deploy checklist               | `DEPLOY_CHECKLIST.md`                       |
| Monitoring playbook            | `docs/monitoring-playbook.md`               |
| Migrations guide               | `supabase/MIGRATIONS.md`                    |
| E2E manual checklist           | `.claude/E2E-MANUAL-CHECKLIST.md`           |
| PO SEO backlog                 | `.claude/BACKLOG-PO-SEO.md`                 |
| Testing guide                  | `docs/GHID_TESTARE_IMPRPUNA.md`            |
| Placeholder audit              | `docs/AUDIT_PLACEHOLDERE.md`                |
| Live verification              | `docs/VERIFICARE_LIVE.md`                   |
| Interface design plan          | `docs/plans/2026-02-18-contentos-interface-unica-design.md` |

---

## Learned Rules (Compounding)

| Date       | Rule                                                              | Context            |
| ---------- | ----------------------------------------------------------------- | ------------------ |
| 2026-02-18 | Always plan before implementing                                   | Initial setup      |
| 2026-02-18 | Max 5 files per ATOMIC PR; split into chained PRs                 | Velocity + control |
| 2026-02-18 | Write failing test first for bug fixes                            | Reliability        |
| 2026-02-18 | Migration files must use IF NOT EXISTS                            | Idempotency        |
| 2026-02-18 | AI features must be non-fatal — core UI survives API failures     | Resilience         |
| 2026-02-18 | Server Components by default, "use client" only when needed       | Next.js 15 best    |
