# 🔥 CONTENTOS — PROMPTUL NUCLEAR v0.dev

> Copiază acest prompt integral în v0.dev (https://v0.dev/chat).
> Generează pe rând fiecare secțiune marcată cu `[GEN-01]`, `[GEN-02]`, etc.
> După fiecare generare, copiază codul în fișierul indicat.

---

## CONTEXT COMPLET AL APLICAȚIEI

**ContentOS** este o platformă SaaS de content intelligence cu AI, în limba română, pentru creatori de conținut, agenții de marketing și antreprenori. Dashboard dark theme, landing page cu secțiuni alternante dark/warm/olive.

### Tech Stack (NU modifica, NU adăuga dependențe)
```
Next.js 15 (App Router) · React 19 · TypeScript strict
Tailwind CSS 3.4 · tailwindcss-animate
Radix UI (dialog, dropdown-menu, label, separator, slot, tabs, tooltip)
Framer Motion 12 · Recharts 3.7 · cmdk 1.1
Lucide React icons · class-variance-authority · clsx · tailwind-merge
Supabase (auth + database) · Stripe (billing)
Font: DM Sans (via next/font/google, var: --font-dm-sans)
```

### Design System — Tokens (din globals.css)
```css
/* Semantic surface hierarchy (dark dashboard) */
--background: 230 20% 5%;        /* body bg */
--foreground: 0 0% 98%;          /* body text */
--card: 230 20% 7%;              /* card bg */
--primary: 25 95% 53%;           /* ORANGE — brand accent */
--muted: 230 15% 15%;            /* muted bg */
--muted-foreground: 230 10% 55%; /* muted text */
--border: 230 15% 15%;           /* borders */
--ring: 25 95% 53%;              /* focus ring = orange */
--radius: 0.75rem;

/* Surface stack */
--surface-ground: 227 33% 11%;   /* #0F1728 — deepest bg */
--surface-sunken: 240 33% 4%;    /* #0A0A0F — auth bg */
--surface-raised: 228 29% 12%;   /* #141C2E — cards */
--surface-overlay: 230 28% 15%;  /* #1a2340 — modals */
--surface-tooltip: 237 36% 14%;  /* #1a1a2e — tooltips */

/* Landing warm palette */
--landing-warm: 38 23% 83%;      /* #E0DACE — cream/beige */
--landing-warm-card: 38 20% 78%; /* #d6d0c2 — card on cream */
--landing-olive: 63 5% 54%;      /* #939482 — olive sections */
--landing-dark: 227 33% 11%;     /* = surface-ground */
--landing-darkest: 225 33% 7%;   /* #0a0f1a — footer */

/* Chart colors */
--chart-1: 25 95% 53%;   /* orange */
--chart-2: 262 83% 58%;  /* purple */
--chart-3: 160 84% 39%;  /* green */
--chart-4: 43 96% 56%;   /* yellow */
--chart-5: 339 90% 51%;  /* pink */

/* Typography scale */
--text-display: 3.5rem;     /* hero headings */
--text-heading-1: 2.25rem;  /* section headings */
--text-heading-2: 1.5rem;   /* page titles */
--text-heading-3: 1.125rem; /* card titles */
--text-body: 0.875rem;      /* body text (14px) */
--text-caption: 0.75rem;    /* labels (12px) */
--text-micro: 0.625rem;     /* badges (10px) */
```

### Tailwind Utilities mappate
```
bg-surface-ground, bg-surface-sunken, bg-surface-raised, bg-surface-overlay
bg-landing-warm, bg-landing-warm-card, bg-landing-olive, bg-landing-dark, bg-landing-darkest
text-display, text-heading-1, text-heading-2, text-heading-3, text-body, text-caption, text-micro
brand-50 → brand-950 (palette indigo: 500=#6366F1)
```

### Design Language — OBLIGATORIU
```
GLASSMORPHISM: bg-white/[0.03] backdrop-blur-xl border-white/[0.08]
HOVER: hover:-translate-y-[1px] hover:shadow-lg transition-all
FOCUS: focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50
BUTTONS: bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25
INPUTS: bg-white/[0.04] border-white/[0.08] rounded-xl pl-10 (icon prefix)
CARDS: rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur-sm
SECTION HEADERS: mx-auto mb-4 flex h-11 w-11 rounded-xl bg-orange-500/10 border border-orange-500/20
ANIMATIONS: animate-[pulse_8s_ease-in-out_infinite], spring transitions, staggered reveals
GRID BG: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px) 60px grid, opacity-[0.03]
GRADIENTS: bg-gradient-to-br from-brand-950/50 via-transparent to-orange-950/30
FLOATING ORBS: absolute, rounded-full, blur-[100-120px], bg-orange-500/6 or bg-brand-500/8
SHINE EFFECT: absolute inset-0 -translate-x-full group-hover:translate-x-full duration-700 via-white/10
```

### Limba: ROMÂNĂ (ro)
Toate label-urile, placeholder-urile, mesajele = în română. Fără "Submit", fără "Loading" — "Trimite", "Se încarcă..."

---

## STRUCTURA COMPLETĂ A APLICAȚIEI

### Sidebar Navigation (collapsible, Radix SidebarProvider)
```
CREEAZĂ:
  Brain Dump (/braindump) — Brain icon — Transformă idei brute în conținut per platformă
  Compune (/compose) — PenTool — Creator avansat cu Creative Engine, faze: input→explore→generate

AI TOOLS:
  AI Coach (/coach) — MessageSquare — Chat cu AI care analizează tot istoricul
  Scorer (/analyze) — Target — Scor 0-100 per platformă cu sugestii de îmbunătățire
  Cercetare (/research) — Search — Cercetează conturi social media ale competitorilor
  Inspirație (/inspiration) — Lightbulb — Descoperă conținut viral cu adaptor per industrie

MEDIA:
  Script Video (/video-script) — Video — Generator script cu timeline și indicații regie
  Editor Imagine (/image-editor) — Image — Generare prompt DALL-E optimizat

MONITORIZARE:
  Analiză (/analytics) — BarChart3 — Grafice (Recharts), trends, hook performance
  Calendar (/calendar) — Calendar — Calendar drag, view luna/saptamana, draft modal
  Istoric (/history) — History — Lista postărilor cu filtrare și search

CONT:
  Setări (/settings) — Settings — Profil, business, billing, securitate, conturi conectate
```

### Landing Page Sections (alternating dark/warm/olive)
```
1. Hero (dark bg) — "Creează Conținut Care Convertește" + social proof badges
2. Features Grid (warm bg) — 8 features cu icons Lucide
3. How It Works (dark bg) — 3 steps numbered
4. Benefit 1 (warm bg) — Brain Dump demo mockup
5. Benefit 2 (olive bg) — AI Coach demo mockup
6. Testimonials (dark bg) — 3 glass cards cu ratings
7. Comparison Table (warm bg) — ContentOS vs Manual vs Other tools
8. Pricing (olive bg) — Free/Pro/Agency, annual toggle -20%
9. FAQ (olive bg) — Accordion cu 6 întrebări
10. Final CTA (dark bg) — "Încearcă gratuit acum"
11. Footer (darkest bg) — Links, copyright
```

### Auth Pages
```
Auth Layout: gradient mesh bg, 3 animated orbs, grid overlay, vignette
Login: glass card, Mail+Lock icons, shine button, "sau" divider
Register: Sparkles header, 3 trust badges, features checklist
Reset Password, Update Password
Onboarding: 5-step wizard (industrie→profil→conectare→primul conținut→gata)
```

---

## GENERĂRI v0 — PER SECȚIUNE

---

### [GEN-01] LANDING PAGE HERO — Supra-Premium
**Fișier**: `apps/web/src/app/home-page-client.tsx` (replace hero section)
**IMPORTANT**: "use client" component, NO server components

```
Generează un hero section pentru o platformă SaaS AI de content în limba română.

Cerințe vizuale EXACTE:
- Dark bg cu gradient mesh: minimum 3 floating orbs animate (orange/brand/pink, blur-[120px], animate-pulse 8-12s staggered)
- Grid pattern overlay (60px, opacity-[0.03])
- Headline: "Creează Conținut Care Convertește" — text-5xl sm:text-6xl md:text-7xl font-extrabold, gradient text (white → white/70)
- Subtitle: "Platforma AI care transformă orice idee în conținut optimizat per platformă. Brain dump → postări virale în 2 minute." — text-lg text-gray-400
- 2 CTA buttons: 
  1. Primary: "Începe Gratuit →" — orange gradient button cu shine sweep effect
  2. Secondary: "Vezi cum funcționează" — border border-white/10 hover ghost
- Social proof bar sub butoane: "✦ 2,400+ creatori activi · ✦ 1M+ postări generate · ✦ 4.9★ rating"
- Floating UI mockup/card (dreapta pe desktop, sub pe mobile) arătând un mini-dashboard preview: un card glass cu "Brain Dump" title, 3 linii de text blur placeholder, un scor badge "92" verde, platforme icons row (4 cercuri colorate mici: blue, pink, gray, red = fb/ig/tiktok/yt)
- Animații: framer-motion, header text fade-up staggered, mockup card float-in de pe dreapta, social proof fade-in cu delay
- Mobile responsive: stack vertical, mockup card devine full-width

TOKENS: folosește EXACT variabilele CSS de mai sus. bg-surface-ground, text-white, text-gray-400, from-orange-500 to-orange-600, shadow-orange-500/25, border-white/[0.08], bg-white/[0.03], backdrop-blur-xl

NU folosi: framer-motion import direct (e deja importat în fișier ca "motion" și "AnimatePresence"), nu adăuga dependențe noi, nu folosi Image din next/image fără src real, nu folosi emoji-uri (doar SVG/Lucide).
```

---

### [GEN-02] LANDING FEATURES — Bento Grid
**Fișier**: `apps/web/src/app/home-page-client.tsx` (replace features section)

```
Generează un features grid section cu layout BENTO GRID (nu grid uniform) pentru 8 features.

Date features (copiază exact):
1. AI Content Coach (BarChart3 icon) — "Coach-ul tău personal. Analizează istoricul tău complet și îți spune exact ce să postezi, când și pe ce platformă."
2. Algorithm Scorer (Target) — "Scor 0-100 pentru fiecare postare. Știi exact cum va performa pe fiecare platformă înainte de a posta."
3. Content Composer (PenTool) — "Creative Engine cu 3 faze: idee → unghiuri creative → conținut generat cu hook-uri virale."
4. Brain Dump (Brain) — "Scrii o idee vagă, primești postări complete pentru 4 platforme cu hashtag-uri, CTA și tone of voice adaptate."
5. Account Research (Search) — "Cercetează orice cont de social media. Află ce funcționează la competitori și adaptează."
6. Inspirație Virală (Lightbulb) — "Descoperă conținut viral din industria ta. Adaptează-l instant la brand-ul tău."
7. Calendar Conținut (CalendarDays) — "Planifică, organizează și vizualizează tot conținutul. Drag & drop, view lună/săptămână."
8. Script Video (Film) — "Generator complet: script cu timeline, indicații regie, text overlay, muzică."

Layout BENTO:
- bg-landing-warm (cream/beige background)
- Grid: first 2 items = large cards (col-span-2 sau full width), remaining 6 = smaller 3-col grid
- Fiecare card: bg-landing-warm-card rounded-2xl p-6-8, hover:shadow-xl hover:-translate-y-1 transition
- Icon într-un container rounded-xl cu bg-gradient, dimensiune 40x40
- Heading section: "Totul pentru Conținut de Impact" + "8 instrumente AI într-o singură platformă"
- Cards mari au un mini-mockup/illustration area (folosește div-uri stilizate, NU imagini externe)
- Dark text (text-black, text-gray-700)

NU folosi imagini externe, NU folosi emoji-uri, doar Lucide icons.
```

---

### [GEN-03] BRAINDUMP PAGE — Redesign Complet
**Fișier**: `apps/web/src/app/(dashboard)/braindump/page.tsx`
**IMPORTANT**: Aceasta este pagina principală a produsului. Trebuie să fie PERFECTĂ.

```
Redesign complet al paginii Brain Dump — cea mai importantă pagină din ContentOS.

Flow-ul paginii:
1. INPUT AREA (top): textarea mare unde userul scrie ideea brută
   - Placeholder: "Scrie ideea ta aici... orice gând, orice temă. AI-ul va transforma în conținut."
   - Sub textarea: row de selectori:
     a) Platform selector: 4 butoane toggle (Facebook/Instagram/TikTok/YouTube) cu iconuri colorate
     b) Objective selector: 4 butoane (Engagement/Reach/Leads/Saves)
     c) Submit button: "Generează Conținut" cu Sparkles icon
   - Voice input button (mic icon) în colțul textarea-ului
   - Media upload button (Image icon)
   - Character counter

2. CLARIFICATION STEP (conditional): Dacă AI-ul are întrebări, arată carduri de clarificare
   - Fiecare întrebare = card glass cu opțiuni clickable
   - Skeleton loading state cât se procesează

3. OUTPUT AREA (bottom): Grid de carduri per platformă
   - Fiecare platformă = card mare cu:
     a) Header: icon platformă + nume + badge scor (ex: "87" în verde/galben/roșu)
     b) Body: conținut generat (text formatat)
     c) Hashtags: row de badge-uri mici
     d) Tips: 2-3 sfaturi cu Lightbulb icon
     e) Footer: Copy button, Character count, platform-specific metrics
   - Cards animează cu framer-motion staggered (0, 100ms, 200ms, 300ms delay)

Design:
- Dark dashboard bg (bg-background)
- Input area: bg-surface-raised rounded-2xl border border-white/[0.06] p-6
- Textarea: bg-white/[0.04] border-white/[0.08] rounded-xl, full width, min-h-[120px]
- Platform cards: bg-card border border-border rounded-xl p-5
- Score badge: w-10 h-10 rounded-lg font-bold, bg-green-500/10 text-green-400 (>70), bg-yellow-500/10 text-yellow-400 (50-70), bg-red-500/10 text-red-400 (<50)
- Buttons: platform toggles cu selected state = colored bg, unselected = bg-muted
- Animații: framer-motion motion.div pe fiecare card output, textarea auto-resize

State management: useState + useCallback hooks. API call: POST /api/braindump cu body { text, platforms, objective, orgId, industry }

Componente existente de folosit:
- useUser() hook pentru orgId și industry (import din @/components/providers/user-provider)
- pushNotification() pentru notificări (import din @/components/notification-center)
- MediaUpload component (import din ../compose/media-upload)
- VoiceInput component (import din ../components/voice-input)
```

---

### [GEN-04] COMPOSE PAGE — 3-Phase Creative Engine
**Fișier**: `apps/web/src/app/(dashboard)/compose/page.tsx`

```
Redesign al paginii Compose — Creative Engine cu 3 faze vizuale distincte.

Flow cu 3 faze (stepper vizual în header):
FAZA 1 — INPUT: 
  - Textarea + platform/objective selectors (ca braindump dar cu tone of voice dropdown: Professional/Casual/Inspirational/Humorous/Urgent)
  - "Intent analysis" badge care apare live (ex: "💡 Idee de conținut detectată")

FAZA 2 — EXPLORE:
  - Grid de "Creative Angles" — carduri clickable cu:
    - Angle name (ex: "Hook Contrariu", "Storytelling Personal", "Data-Driven")
    - Description, predicted score badge, framework name
    - Hover effect: border-orange-500/30
    - Selected state: ring-2 ring-orange-500
  - "Regenerează unghiuri" button

FAZA 3 — GENERATE:
  - Content output area cu tabs per platformă
  - Content checker sidebar (scor, sugestii, improvements)
  - Copy/Save/Edit actions
  - Draft save cu optimistic UI (success instant, error revert)

Stepper vizual:
- 3 cercuri conectate cu linie, current = orange fill, completed = green check, future = gray
- Labels sub fiecare: "Ideea ta" / "Unghiuri creative" / "Conținut final"
- Responsive: labels hidden pe mobile

Design: same dark dashboard tokens. Phase transitions cu framer-motion AnimatePresence.
```

---

### [GEN-05] ANALYTICS DASHBOARD
**Fișier**: `apps/web/src/app/(dashboard)/analytics/page.tsx`

```
Redesign complet al paginii Analytics cu Recharts.

Layout:
1. TOP: 4 stat cards row (Total Posts, Total Engagement, Avg Engagement, Total Impressions)
   - Fiecare: icon, label, value (formatat cu K/M), trend arrow verde/roșu cu %
   - Hover: -translate-y-[1px], shadow-lg
   - bg-surface-raised border border-white/[0.06] rounded-xl p-4

2. MAIN CHART: AreaChart (engagement over time)
   - 3 layers: Likes (blue), Comments (green), Shares (purple)
   - Gradient fills, smooth curves
   - Custom tooltip glass morphism
   - Time range selector: 7d / 30d / 90d buttons

3. 2-COL GRID:
   Left: BarChart platforme comparison
   Right: Best posting hours heatmap (7x24 grid, color intensity)

4. 2-COL GRID:
   Left: Content type performance (horizontal bars)
   Right: Hook performance table cu progress bars

Recharts config: 
- Gradients: <defs><linearGradient> cu stop-opacity
- Tooltip: bg-surface-overlay border-white/[0.08] rounded-xl backdrop-blur
- Grid: stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3"
- Animations: animationBegin staggered (0, 200, 400), duration 1200ms

Data fetched from: GET /api/analytics?range=30 → response: TrendsData interface
Use useEffect + useState + useCallback pattern.
```

---

### [GEN-06] CALENDAR PAGE
**Fișier**: `apps/web/src/app/(dashboard)/calendar/page.tsx`

```
Redesign calendar cu month view + week view toggle.

Layout:
1. HEADER: Month/Year navigation (< Ianuarie 2026 >) + view toggle (Lună/Săptămână) + "Adaugă draft" button
2. WEEKDAY HEADERS: L, M, M, J, V, S, D (Romanian abbreviations)
3. CALENDAR GRID:
   - Month view: 7-col grid, fiecare zi = cell cu hover effect
   - Day cells: date number (bold dacă azi), dots/badges pentru drafts
   - Drafts pe zi: colored dots per platformă (blue=fb, pink=ig, gray=tiktok, red=yt)
   - Click pe zi → modal de adăugare draft
4. DRAFT MODAL (Radix Dialog):
   - Glass morphism card
   - Fields: titlu, platformă selector, text, data, ora
   - ARIA: role="dialog", aria-modal="true", aria-labelledby
   - Focus trap

Responsive:
- Desktop: 7-col grid cu cells ~100px height
- Tablet: 7-col grid comprimat
- Mobile: 1-col list view per zi (nu grid)

Animații: framer-motion pe modal (scale 0.95 → 1, opacity), days stagger pe schimb lună.
Drafts fetched from: GET /api/calendar?month=2026-01 → response: CalendarDraft[]
```

---

### [GEN-07] AI COACH CHAT
**Fișier**: `apps/web/src/app/(dashboard)/coach/page.tsx`

```
Redesign chat page — full-height chat interface.

Layout:
1. CHAT AREA (flex-1, scroll):
   - Empty state: centered, icon Sparkles, "Salut! Sunt AI Coach-ul tău..." text, 3 suggested prompts clickable
   - Messages: alternating bubbles
     - User: bg-orange-500/10 rounded-2xl p-4, right-aligned
     - AI: bg-surface-raised rounded-2xl p-4, left-aligned, with typing indicator (3 dots animate)
   - AI messages can contain: bold text, bullet lists, score badges, action buttons

2. INPUT AREA (bottom, sticky):
   - Glass morphism bar: bg-white/[0.03] backdrop-blur-xl border-t border-white/[0.06]
   - Textarea (auto-resize, max 4 rows) + Send button (ArrowUp icon, orange circle)
   - Quick action buttons row: "Ce să postez azi?", "Analizează-mi profilul", "Tendințe industrie"

Existing components to use: ChatBubble, EmptyState, TypingIndicator (from @/components/ui/)
Full height layout: flex flex-col h-[calc(100vh-3.5rem)] (minus header height)
```

---

### [GEN-08] ONBOARDING WIZARD
**Fișier**: `apps/web/src/app/(onboarding)/onboarding/page.tsx`

```
Redesign onboarding wizard — 5 steps, full-screen, centered.

Background: gradient mesh (ca auth layout)

Steps:
1. INDUSTRIE: "Ce tip de business ai?" — grid de 8 industrii, fiecare = card cu icon + label, hover scale, selected = orange ring
2. PROFIL: "Spune-ne despre business" — form: nume business, descriere, tone of voice selector
3. CONECTARE: "Conectează platformele" — 4 platform cards cu "Conectează" button fiecare, connected state = green check
4. PRIMUL CONȚINUT: "Hai să creăm primul conținut!" — mini brain dump inline, generare instant
5. GATA: "Ești pregătit!" — confetti animation, summary card, "Mergi la Dashboard" CTA

Stepper: horizontal dots cu labels, connected cu linie animată (fill progresiv), current = orange pulse
Transitions: framer-motion slide left/right între steps
Progress: "Pasul 2 din 5" text

Cards industrie: bg-white/[0.03] border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-orange-500/30
Selected: ring-2 ring-orange-500 bg-orange-500/5

Server actions: updateOnboardingStep(), completeOnboarding(), saveOnboardingProfile()
```

---

### [GEN-09] SIDEBAR + SHELL
**Fișier**: `apps/web/src/components/app-sidebar.tsx` + `dashboard-shell-client.tsx`

```
Redesign sidebar navigation — modern, collapsible, with micro-interactions.

Sidebar:
- Header: logo "ContentOS" cu gradient icon, collapsible = doar icon
- Nav groups: CREEAZĂ, AI TOOLS, MEDIA, MONITORIZARE, CONT
- Each item: icon + label, hover bg-white/[0.04], active = bg-orange-500/10 text-orange-400 border-l-2 border-orange-500
- Badge "Nou" pe items noi (orange pulse dot)
- Footer: user avatar (initials in orange gradient circle) + name + email + logout button
- Collapse animation: smooth width transition 240px → 60px
- Mobile: sheet overlay

Shell header (sticky):
- Glass morphism: bg-background/80 backdrop-blur-xl
- Left: sidebar trigger + breadcrumb (group / page)
- Right: ⌘K search button + notification bell with unread count badge
- Search button: rounded-lg border-white/[0.06] bg-white/[0.03], kbd "⌘K"

Existing: uses Radix SidebarProvider, SidebarInset, SidebarTrigger, etc.
User data: useUser() hook from @/components/providers/user-provider
```

---

### [GEN-10] SETTINGS PAGE
**Fișier**: `apps/web/src/app/(dashboard)/settings/page.tsx` + sub-components

```
Redesign settings page cu tabs Radix.

Tabs: Profil | Business | Billing | Securitate | Conturi Conectate

PROFIL TAB:
- Avatar upload (circle, hover overlay cu camera icon)
- Inputs: Nume, Email (disabled), Bio
- Save button orange gradient

BUSINESS TAB:
- Inputs: Nume business, Industrie (dropdown), Descriere, Website, Tone of voice
- Save button

BILLING TAB:
- Current plan card (Free/Pro/Agency) cu badge
- Usage meters: posts used / limit, AI calls used / limit (progress bars)
- Upgrade button → Stripe checkout
- Billing history table

SECURITATE TAB:
- Change password form
- 2FA toggle (coming soon badge)
- Active sessions list

CONTURI CONECTATE TAB:
- 4 platform cards: Facebook, Instagram, TikTok, LinkedIn
- Each: platform icon + name + status (connected/disconnected) + connect/disconnect button

All sections: glass cards (bg-surface-raised border-white/[0.06] rounded-xl p-6)
Labels in Romanian.
```

---

## REGULI FINALE v0

1. **ZERO dependențe noi** — folosește DOAR ce e în package.json
2. **ZERO imagini externe** — totul e SVG, Lucide icons, sau div-uri stilizate  
3. **ZERO placeholder/lorem ipsum** — text real în română
4. **ZERO "use server"** în componente client — server actions sunt în fișiere separate
5. **TypeScript strict** — interfețe definite, no `any`
6. **Exportă default function** — named export pentru sub-components
7. **Mobile-first responsive** — sm: / md: / lg: breakpoints
8. **Animații Framer Motion** — import { motion, AnimatePresence } from "framer-motion"
9. **Culori DOAR din tokens** — NICIODATĂ hardcoded hex (#xxx)
10. **Consistență** — toate paginile dashboard au aceeași structură: header area + content area, same spacing (gap-6, p-6)

---

## ORDINEA RECOMANDATĂ DE GENERARE

```
1. [GEN-01] Hero landing          → cea mai vizibilă secțiune
2. [GEN-02] Features bento grid   → a doua secțiune landing
3. [GEN-09] Sidebar + Shell       → structura dashboard
4. [GEN-03] Braindump page        → pagina #1 a produsului  
5. [GEN-04] Compose page          → pagina #2
6. [GEN-07] AI Coach chat         → cea mai diferențiată pagină
7. [GEN-05] Analytics dashboard   → charts + data viz
8. [GEN-06] Calendar page         → interactivitate complexă
9. [GEN-08] Onboarding wizard     → primul contact utilizator
10. [GEN-10] Settings page        → completare
```

---

> **Această documentație conține 100% din contextul necesar pentru a genera orice componentă ContentOS la nivel v0.dev premium. Niciun detaliu nu lipsește. Copiază secțiunea relevantă + contextul de sus în v0.dev și generează.**
