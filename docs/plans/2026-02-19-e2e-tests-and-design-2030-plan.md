# ContentOS — Plan Secvențiat: E2E Coverage + Design 2030

**Data**: 2026-02-19
**Obiectiv**: Acoperire E2E completă a user journeys critice + UI/UX premium 2030
**Estimare**: 8 faze, ~15 PR-uri

---

## Status actual

| Metric | Valoare |
|--------|---------|
| E2E teste | 48 unice × 2 browsere = 96 |
| Pagini app | 24 pages + 63 API routes |
| Unit tests | 444 passed, 97% coverage |
| Design system | ✅ Tokens, typography, spacing, surfaces |
| Fonturi | ✅ Loaded (DM Sans + Bricolage Grotesque + JetBrains Mono) |
| font-display | Folosit în 10 locuri (braindump, command-center, landing, shell) |
| font-mono | Folosit în 17 locuri (scoruri, timestamps, KPI-uri, kbd) |
| font-bricolage | ❌ Nu e folosit direct nicăieri (doar via font-display alias) |
| Glassmorphism | ✅ Auth, cards, sidebar, modals |
| Framer Motion | ✅ Page transitions, stagger reveals, hover effects |

---

## FAZA 1 — E2E: Authenticated Dashboard Pages Load (PR-A)

**Scopul**: Verifică că TOATE paginile dashboard se încarcă corect după login (nu doar redirect).

**Fișier nou**: `apps/web/e2e/dashboard-pages.spec.ts`

Teste noi (~12 unice × 2 browsere = 24):
- [ ] `/dashboard/command-center` — heading + sistem OK visible
- [ ] `/dashboard/business` — heading visible
- [ ] `/braindump` — input area visible (textarea sau empty state)
- [ ] `/compose` — stepper/phase indicator visible
- [ ] `/coach` — chat area sau empty state visible
- [ ] `/analyze` — scorer input visible
- [ ] `/research` — search input visible
- [ ] `/inspiration` — content area visible
- [ ] `/analytics` — stat cards visible
- [ ] `/calendar` — calendar grid visible
- [ ] `/history` — list/table visible
- [ ] `/settings` — settings tabs/sections visible

**Dependență**: Folosește `auth.setup.ts` existent + storageState.
**Playwright config**: Adaugă `setup` project + `authenticated` project.

---

## FAZA 2 — E2E: Critical User Journeys (PR-B)

**Scopul**: Testează flow-urile principale end-to-end.

**Fișiere noi**:
- `apps/web/e2e/braindump-flow.spec.ts` (~4 teste)
  - [ ] Scrie idee → selectează platforme → submit → vezi rezultat cu scor
  - [ ] Rezultat include content per platformă selectată
  - [ ] Save draft funcționează (buton + feedback)
  - [ ] Empty input → eroare/validare

- `apps/web/e2e/compose-flow.spec.ts` (~3 teste)
  - [ ] Phase 1: Input → submit → trece la Phase 2
  - [ ] Phase 2: Selectare angle → trece la Phase 3
  - [ ] Phase 3: Content generat → copy funcționează

- `apps/web/e2e/coach-flow.spec.ts` (~3 teste)
  - [ ] Empty state: sugestii clickable vizibile
  - [ ] Trimite mesaj → primește răspuns (bubble AI apare)
  - [ ] Quick action button funcționează

**Notă**: Aceste teste necesită AI API. Folosim `test.slow()` + timeout 60s.
Alternativ: mock API responses cu Playwright route interception.

---

## FAZA 3 — E2E: Settings, Onboarding, Edge Cases (PR-C)

**Fișiere noi**:
- `apps/web/e2e/settings-flow.spec.ts` (~4 teste)
  - [ ] Tab navigation funcționează (Profil/Business/Billing/Securitate/Conturi)
  - [ ] Profil form: câmpuri vizibile, save funcționează
  - [ ] Billing section: plan curent afișat
  - [ ] Conturi conectate: platforme vizibile

- `apps/web/e2e/onboarding-flow.spec.ts` (~3 teste)
  - [ ] Step 1: Industry cards vizibile și clickable
  - [ ] Navigation: Next/Back funcționează între steps
  - [ ] Step 5: Completion CTA → redirect dashboard

- `apps/web/e2e/error-handling.spec.ts` (~3 teste)
  - [ ] 404 page: afișare corectă pe rută inexistentă
  - [ ] API error: pagina nu crashuiește (mock API failure)
  - [ ] Network offline indicator apare

**Total E2E nou după Faze 1-3**: ~32 teste unice × 2 browsere = 64 noi
**Total E2E final**: 48 + 32 = **80 unice × 2 = 160 teste**

---

## FAZA 4 — Design 2030: Typography & Grid Pattern (PR-D)

**Scopul**: Aplică Bricolage Grotesque pe TOATE headings + JetBrains Mono consistent + grid pattern background.

**Fișiere modificate** (~3):
- `apps/web/src/app/globals.css` — adaugă utility classes:
  ```css
  /* Headings default to Bricolage */
  h1, h2, h3 { font-family: var(--font-bricolage); }
  
  /* Grid pattern background for dashboard */
  .bg-grid-pattern {
    background-image: 
      linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  ```
- `apps/web/src/app/(dashboard)/layout.tsx` — adaugă `bg-grid-pattern` pe container principal
- `apps/web/tailwind.config.ts` — verifică/adaugă utilities dacă lipsesc

**Verificare vizuală**: Toate headings = Bricolage Grotesque geometric. Scoruri/date = JetBrains Mono. Grid subtil pe dashboard.

---

## FAZA 5 — Design 2030: Landing Page Bento Grid + Hero Polish (PR-E)

**Scopul**: Upgrade features section la bento grid + hero refinements.

**Fișier modificat**: `apps/web/src/app/home-page-client.tsx`

- [ ] Features: primele 2 carduri = large (col-span-2), cu mini-mockup area
- [ ] Features: restul 6 = grid 3 coloane  
- [ ] Hero: verificare floating orbs, stagger animations, social proof
- [ ] Consistency check: toate secțiunile folosesc font-display pe headings

**Max 1 fișier** — schimbări concentrate.

---

## FAZA 6 — Design 2030: Dashboard Pages Polish (PR-F, PR-G)

**PR-F** — Brain Dump + Compose + Coach (~3 fișiere):
- [ ] Braindump: idle state cu quick action cards, progress shimmer, result cards refined
- [ ] Compose: stepper vizual clar (3 cercuri, current=orange, done=green)
- [ ] Coach: chat bubbles refined, typing indicator, quick action buttons

**PR-G** — Analytics + Calendar + Settings (~3 fișiere):
- [ ] Analytics: stat cards hover, chart gradients, custom tooltip glass
- [ ] Calendar: day cells refined, today highlight, draft modal glass
- [ ] Settings: tabs Radix styling consistent, card sections

---

## FAZA 7 — Design 2030: Onboarding Wizard Premium (PR-H)

**Fișier**: `apps/web/src/app/(onboarding)/onboarding/page.tsx`

- [ ] Full-screen gradient mesh background (ca auth layout)
- [ ] Stepper cu dots conectate, progress animat
- [ ] Industry cards: Lucide icons (nu emoji), hover/selected orange ring
- [ ] Step transitions: framer-motion slide
- [ ] Step 5: confetti/celebration, summary, CTA

---

## FAZA 8 — Final Gate + Regression E2E (PR-I)

**Scopul**: Run complet, fix orice regresie, update VERIFICARE_FINALA.md

- [ ] `pnpm gate:platinum` — PASS
- [ ] E2E complet (~160 teste) — ALL PASS
- [ ] Visual smoke test manual pe 5 pagini cheie
- [ ] Update `VERIFICARE_FINALA.md` cu noul status
- [ ] Cleanup: remove CURSOR_PROMPTS.md și V0_NUCLEAR_PROMPT.md (integrate, nu mai sunt necesare)

---

## Ordinea PR-urilor

```
FAZA 1 (PR-A) ─ E2E dashboard pages load
     │
FAZA 2 (PR-B) ─ E2E critical user journeys  
     │
FAZA 3 (PR-C) ─ E2E settings + onboarding + errors
     │                                            
     ├── SAFETY NET COMPLET ──────────────────────┐
     │                                            │
FAZA 4 (PR-D) ─ Typography + Grid pattern        │ acum avem teste  
     │                                            │ care prind regresii
FAZA 5 (PR-E) ─ Landing bento + hero             │
     │                                            │
FAZA 6 (PR-F) ─ Braindump + Compose + Coach      │
FAZA 6 (PR-G) ─ Analytics + Calendar + Settings   │
     │                                            │
FAZA 7 (PR-H) ─ Onboarding wizard premium        │
     │                                            │
FAZA 8 (PR-I) ─ Final gate + regression          ┘
```

---

## Riscuri

| Risc | Mitigare |
|------|----------|
| Teste E2E cu AI API sunt lente/flaky | Mock API responses cu Playwright route intercept |
| Design changes pot rupe layout existent | Teste E2E rulate DUPĂ fiecare PR de design |
| Font-uri noi pot afecta spacing | Teste vizuale pe 3 pagini cheie (landing, braindump, command-center) |
| Scope creep pe "polish" | Max 3 fișiere per PR, strict pe checklist |

---

## Metrici de succes

| Metric | Înainte | După |
|--------|---------|------|
| E2E teste unice | 48 | ~80 |
| E2E total (×2 browsere) | 96 | ~160 |
| User journeys acoperite | 1 (login) | 6+ (braindump, compose, coach, settings, onboarding, errors) |
| font-display (Bricolage) usage | 10 locuri | Toate h1/h2/h3 global |
| Grid pattern dashboard | ❌ | ✅ |
| Bento grid features | ❌ | ✅ |
| Onboarding premium | ❌ | ✅ |
