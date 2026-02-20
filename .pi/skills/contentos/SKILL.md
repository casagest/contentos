---
description: "ContentOS: AI content intelligence platform for Romanian creators & dental clinics — architecture, commands, PR workflow, testing, and deployment"
---

# ContentOS — Pi Skill

## What Is This Project
ContentOS is a dual-deployment AI content intelligence platform:
1. ContentOS SaaS — standalone multi-platform content tool for Romanian creators/businesses (contentos.ro)
2. ContentOS Dental Module — vertical integration for dental clinic social media (MEDICALCOR integration)

## Architecture
Turborepo monorepo: packages/shared → packages/database → packages/content-engine → packages/ui → apps/web
Supabase (PostgreSQL + Auth + pgvector) · Next.js 15 App Router · Claude API · Stripe · Vercel

## Stack
pnpm 9+, TypeScript 5.7 strict, Turborepo, Next.js 15 + React 19, Tailwind CSS,
Supabase (PostgreSQL + pgvector), Anthropic Claude API, Stripe, Vercel, Vitest, Playwright, Husky.

## Key Features
- Multi-platform social management (Facebook, Instagram, TikTok, YouTube)
- AI Content Coach (Claude API + Romanian prompts)
- Algorithm Scoring Engine (per-platform)
- Brain Dump → multi-platform content
- Inspiration saving + repurpose
- Content embeddings (pgvector) for similarity search
- Dental vertical: CMSR compliance, multi-language (RO/EN/DE)

## Code Rules
1. Zod validation at all boundaries
2. unknown over any — always
3. Server Components by default, "use client" only when needed
4. AI features are non-fatal — core UI survives API failures
5. No console.log in production
6. Environment variables validated at startup

## Key Commands
pnpm dev — Start dev. pnpm build — Build. pnpm lint — ESLint. pnpm type-check — TypeScript.
pnpm test — Vitest. pnpm test:coverage — Coverage. pnpm e2e — Playwright.
pnpm gate:platinum — Full merge gate. pnpm pre-merge — Alias for gate.
pnpm monitor:synthetic — Uptime checks.

## Custom Commands
/plan /gate /pr /status /audit /fix /deploy /e2e

## Ralph Templates (in .pi/ralph-templates/)
add-feature.md, add-test-coverage.md, deep-audit.md, fix-audit-finding.md,
new-platform-integration.md, ui-redesign.md

## Model Routing
Opus 4.6: architecture/audits. Codex 5.3: implementation. Sonnet 4: quick edits. o3: reasoning. Gemini: large files.
