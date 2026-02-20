# AGENTS.md — ContentOS (Pi Agent Configuration)

> This file extends CLAUDE.md for Pi coding agent. Read CLAUDE.md first, then this file.

## Pi-Specific Rules

### 1. Read Before Work
On every new session: Read CLAUDE.md, ARCHITECTURE.md, .pi/skills/contentos/SKILL.md. Then proceed.

### 2. Custom Commands
/plan — MANDATORY before implementation. /gate — Run platinum gate. /pr — Gate + commit + PR.
/status — Dashboard. /audit — Deep architecture audit. /fix — Fix audit finding.
/deploy — Deploy checklist. /e2e — Run E2E tests.

### 3. Ralph Templates
For recurring tasks, use templates in .pi/ralph-templates/. Start with /ralph start {name} --max-iterations {N}.

### 4. Model Routing
Opus 4.6: architecture, planning, audits. Codex 5.3: heavy implementation. Sonnet 4: quick edits.
o3: complex logic. Gemini 2.5 Pro: large file analysis. Switch with Ctrl+P.

### 5. Context Management
Monitor footer. At 60%: summarize. At 75%: /new. Never past 80%.

### 6. Autonomy in Ralph Loops
DO NOT ask questions. DO read files. DO execute checklist. DO run verification. DO call ralph_done.

### 7. Post-Implementation Report
After EVERY change: Changed (1-3 bullets), Could break (1-3 bullets), Tests (list), Gate (PASS/FAIL).

## Forbidden
Push to main. console.log in production. any type. Drive-by edits. Commit .env files. Commit dist/.next/.

## Required
Plan before implementing. Test before fixing. Gate before committing. One PR = one intent. Max 5 files per atomic PR.
