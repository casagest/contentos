# 🎯 Cursor Composer Prompts — ContentOS

> Deschide proiectul în Cursor, apoi Ctrl+I (Composer).
> Copiază UN prompt pe rând. Așteaptă să termine. Verifică vizual. Apoi următorul.
> 
> IMPORTANT: Înainte de ORICE prompt, dă-i Composer-ului acest context o singură dată:

---

## CONTEXT INIȚIAL (lipește o singură dată la început)

```
Ești expert frontend React/Next.js/Tailwind. Lucrezi pe ContentOS, o platformă SaaS AI de content creation în limba română.

Stack: Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS 3.4, Framer Motion, Recharts, Radix UI, Lucide icons, Supabase.

Design system (din globals.css):
- Primary color: orange (--primary: 25 95% 53%)  
- Dark dashboard: bg-background (230 20% 5%), cards bg-card (230 20% 7%)
- Glass morphism: bg-white/[0.03] backdrop-blur-xl border-white/[0.08]
- Hover: hover:-translate-y-[1px] transition-all
- Buttons: bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25
- Inputs: bg-white/[0.04] border-white/[0.08] rounded-xl focus:ring-2 focus:ring-orange-500/20
- Font: DM Sans (--font-dm-sans)
- Landing page: alternating dark (bg-surface-ground) / warm cream (bg-landing-warm #E0DACE) / olive (bg-landing-olive) sections
- Toate textele în ROMÂNĂ

Reguli:
- ZERO imagini externe — doar Lucide icons și div-uri stilizate
- ZERO placeholder text — conținut real în română  
- ZERO dependențe noi — folosește doar ce e în package.json
- Păstrează TOATE imports existente și logica API/state
- Îmbunătățește DOAR vizualul și UX-ul
```

---

## PROMPT 1 — Landing Page Hero
**Fișier**: `apps/web/src/app/home-page-client.tsx`

```
Rescrie DOAR secțiunea hero (section-ul cu "Conținut Viral Cu Un Click") din home-page-client.tsx.

Vreau un hero WOW de nivel Stripe/Linear/Vercel:

1. Layout 2 coloane pe desktop (text stânga, mockup dreapta), stack pe mobile
2. Headline mare: "Creează Conținut Care Convertește" cu gradient text (from-white to-white/60)
3. Subtitle: "Platforma AI care transformă orice idee în conținut optimizat per platformă. Brain dump → postări virale în 2 minute."
4. 2 butoane: "Începe Gratuit →" (orange gradient cu hover shine effect) + "Vezi demo" (ghost border)
5. Social proof sub butoane: avatare circulare + "2,400+ creatori" + 5 stele "4.9/5" + "1M+ postări"
6. DREAPTA: un mockup card glass (border-white/[0.08] bg-white/[0.03] backdrop-blur-xl) care arată un mini Brain Dump preview:
   - Header cu logo mic + "Brain Dump" title
   - 3 linii de text blur (div-uri bg-white/[0.06] rounded-full h-2.5)
   - Score badge verde "92" 
   - 3 hashtag chips mici
   - 2 floating mini-cards animate în jurul card-ului principal ("✓ Optimizat AI", "⚡ 2 min/postare")
7. Background: 3 orbe animate (blur-[120px], animate-pulse staggered 8s/10s/12s), grid pattern overlay (60px, opacity 2%)
8. Animații Framer Motion: text fade-up staggered, mockup slide-in de pe dreapta

NU modifica nimic în afara secțiunii hero. Păstrează toate celelalte secțiuni identice.
```

---

## PROMPT 2 — Landing Features Bento Grid  
**Fișier**: `apps/web/src/app/home-page-client.tsx`

```
Rescrie DOAR secțiunea features (section-ul cu id="features") din home-page-client.tsx.

Transformă grid-ul uniform de 8 features într-un BENTO GRID asimetric:

1. Primele 2 features = carduri mari (col-span-2 pe desktop) cu un mini-mockup area în card
2. Următoarele 6 = grid 3 coloane, carduri mai mici
3. Background: bg-landing-warm (cream)
4. Fiecare card: bg-landing-warm-card rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300
5. Icon într-un container 44x44 rounded-xl cu bg gradient subtil (bg-orange-50 pe warm bg)
6. Heading: "Tot Ce Ai Nevoie Pentru Conținut de Impact"
7. Subtitle: "8 instrumente AI într-o singură platformă."

Cardurile mari (#1 AI Coach și #2 Algorithm Scorer) au:
- Layout orizontal (icon+text stânga, mini-preview dreapta)
- Mini preview: un div stilizat care simulează UI-ul (chat bubbles pentru Coach, score bar pentru Scorer)
- Aceste mini-previews sunt construite cu div-uri Tailwind, NU imagini

Păstrează datele din array-ul `features` existent. NU modifica alte secțiuni.
```

---

## PROMPT 3 — Auth Login Page
**Fișier**: `apps/web/src/app/(auth)/login/page.tsx` + `layout.tsx`

```
Rescrie login/page.tsx pentru a arăta premium, la nivel Clerk/Auth0:

1. Card glass: rounded-2xl bg-white/[0.03] backdrop-blur-xl border-white/[0.08] p-8 shadow-2xl
2. Header: "Bine ai revenit" + subtitle "Conectează-te pentru a continua"
3. Inputs cu icon prefix (Mail, Lock din Lucide) — icon absolute left-3.5, input pl-10
4. Input style: bg-white/[0.04] border-white/[0.08] rounded-xl py-3 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20
5. "Ai uitat parola?" link subtle dreapta
6. Submit button: gradient orange, full width, cu shine sweep effect pe hover (div absolute care se mișcă cu translate-x)
7. Divider "sau" cu linie subtilă
8. "Nu ai cont? Creează cont gratuit" link
9. Error alert cu dot roșu animat + text

Layout-ul auth (layout.tsx) trebuie să aibă:
- Background: gradient mesh cu 3 orbe animate (orange/pink/brand, blur-[120px], pulse staggered)
- Grid pattern overlay subtil
- Logo centrat sus cu "ContentOS" + subtitle "AI CONTENT PLATFORM" mic
- Footer mic cu Termeni · Confidențialitate

Păstrează form action={login} și toate funcționalitățile server.
```

---

## PROMPT 4 — Dashboard Sidebar
**Fișier**: `apps/web/src/components/app-sidebar.tsx`

```
Îmbunătățește vizual sidebar-ul fără a schimba structura/funcționalitatea:

1. Active state: item activ are bg-orange-500/10 text-orange-400 cu left border accent (border-l-2 border-orange-500)
2. Hover: bg-white/[0.04] transition-all smooth
3. Group labels: text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold
4. Logo area header: gradient icon 32x32 (from-orange-500 to-orange-600) + "ContentOS" bold + "Creator" label mic gri
5. User footer: avatar cu initiale în cerc gradient orange, hover pe logout subtil
6. Separator subțire între grupuri (border-white/[0.04])
7. "AI activ" badge mic verde (dot + text) în header area

Păstrează exact structura navGroups, SidebarProvider, useUser(), usePathname() — doar upgrade vizual.
```

---

## PROMPT 5 — Brain Dump Page  
**Fișier**: `apps/web/src/app/(dashboard)/braindump/page.tsx`

```
Verifică braindump/page.tsx și îmbunătățește vizualul:

1. IDLE state (când nu are mesaje): 
   - "Ce vrei să creezi?" — text gradient mare (from-white to-white/60), centered
   - 6 quick action cards într-un grid 2x3, fiecare cu icon Lucide + label + sublabel
   - Cards: bg-white/[0.015] border-white/[0.04] rounded-2xl p-4 hover:bg-white/[0.04] hover:-translate-y-0.5

2. GENERATING state:
   - Progress bar cu gradient shimmer animation (from-orange-500 via-pink-500 to-purple-500)
   - Procentaj afișat cu font mono

3. DONE state:
   - Success bar verde subtil
   - Result cards cu border-white/[0.06] bg-white/[0.03] backdrop-blur-sm
   - Score rings animate lângă fiecare platformă
   - Save Draft button cu orange gradient + shine sweep effect

4. Floating input bar (fixat jos):
   - Glass morphism: bg-white/[0.03] backdrop-blur-xl border-white/[0.07]
   - Platform toggles inline (Fb/Ig/Tk/Yt) cu culori specifice
   - Textarea auto-resize
   - Send button: orange gradient glow, rotund

Păstrează TOATĂ logica: sendMessage, saveDraft, API calls, state management. DOAR upgrade vizual.
```

---

## PROMPT 6 — Compose Page (Creative Engine)
**Fișier**: `apps/web/src/app/(dashboard)/compose/page.tsx`

```
Îmbunătățește vizualul paginii Compose fără a schimba logica:

1. Stepper vizual pentru cele 3 faze (input → explore → generate):
   - 3 cercuri conectate cu linie, current = orange fill pulse, completed = green check, future = gray
   - Labels: "Ideea ta" / "Unghiuri creative" / "Conținut final"
   - Responsive: labels hidden pe mobile, doar cercuri

2. Phase 1 (Input):
   - Textarea în card glass (bg-white/[0.03] backdrop-blur-sm)
   - Tone of voice selector ca butoane pill rounded-full
   - Platform toggles cu dot-uri colorate

3. Phase 2 (Explore - Creative Angles):
   - Grid de angle cards cu hover:border-orange-500/30
   - Selected card: ring-2 ring-orange-500 bg-orange-500/5
   - Predicted score badge pe fiecare card
   - "Regenerează" button subtle

4. Phase 3 (Generate):
   - Content output cu tabs per platformă (Radix Tabs)
   - Copy/Save/Edit buttons row

Transitions între faze: framer-motion AnimatePresence, fade + slide.
Păstrează TOATE: CreativeAngle interface, API calls, state, pushNotification.
```

---

## PROMPT 7 — AI Coach Chat
**Fișier**: `apps/web/src/app/(dashboard)/coach/page.tsx`

```
Rescrie coach/page.tsx ca un chat interface premium full-height:

1. Layout: flex flex-col h-[calc(100vh-3.5rem)] — full height minus header
2. Empty state centrat:
   - Icon Sparkles mare în cerc bg-orange-500/10
   - "Salut! Sunt AI Coach-ul tău de conținut."
   - 3 sugestii clickable: "Ce să postez azi?", "Analizează performanța mea", "Tendințe din industrie"
   - Cards sugestii: bg-white/[0.03] border-white/[0.06] rounded-xl hover:border-orange-500/30

3. Chat area (flex-1, overflow-y-auto):
   - User bubbles: bg-orange-500/10 border-orange-500/20 rounded-2xl rounded-br-md, right-aligned
   - AI bubbles: bg-white/[0.03] border-white/[0.06] rounded-2xl rounded-bl-md, left-aligned
   - AI tag: "ContentOS AI" cu Sparkles icon orange mic
   - Typing indicator: 3 dots animate bounce staggered

4. Input bar (sticky bottom):
   - Glass bar: bg-white/[0.03] backdrop-blur-xl border-t border-white/[0.06]
   - Textarea auto-resize + Send button (circle orange gradient cu ArrowUp icon)
   - Quick buttons row sub: "Ce să postez?", "Analizează", "Tendințe"

Folosește componentele existente: ChatBubble, EmptyState, TypingIndicator din @/components/ui/.
Păstrează API call: POST /api/ai/coach.
```

---

## PROMPT 8 — Analytics Dashboard
**Fișier**: `apps/web/src/app/(dashboard)/analytics/page.tsx`

```
Îmbunătățește vizualul analytics page:

1. Stat cards (top row, 4 cards):
   - bg-white/[0.03] border-white/[0.06] rounded-xl p-4 backdrop-blur-sm
   - Icon în cerc colorat mic, label, valoare mare bold, trend arrow (verde ↑ / roșu ↓) cu %
   - Hover: -translate-y-[1px] shadow-lg transition-all

2. Main chart area:
   - Card wrapper: bg-white/[0.03] border-white/[0.06] rounded-xl p-5
   - Time range selector: 3 butoane pill (7d/30d/90d), selected = bg-orange-500/15 text-orange-400
   - Recharts: gradient fills cu <defs><linearGradient>, smooth curves
   - Custom tooltip: bg-surface-overlay/95 backdrop-blur-lg border-white/[0.08] rounded-xl shadow-xl

3. Toate sub-charts în grid 2 coloane, same card style

4. Staggered animationBegin pe Recharts (0, 200, 400ms)

Păstrează TOATĂ logica fetch, TrendsData interface, formatNum, etc. DOAR vizual.
```

---

## PROMPT 9 — Calendar
**Fișier**: `apps/web/src/app/(dashboard)/calendar/page.tsx`

```
Îmbunătățește vizualul calendar page:

1. Header: month navigation (< Februarie 2026 >) cu butoane ghost, view toggle Lună/Săptămână pills, "Adaugă Draft" button orange
2. Day cells:
   - bg-white/[0.02] border-white/[0.04] rounded-lg hover:bg-white/[0.04]
   - Azi: ring-2 ring-orange-500/50 bg-orange-500/5
   - Dots per platformă (blue/pink/gray/red cercuri mici 6px)
3. Draft modal:
   - Glass morphism: bg-surface-overlay/95 backdrop-blur-xl border-white/[0.08] rounded-2xl
   - Framer motion: initial scale-95 opacity-0 → animate scale-100 opacity-1
4. Responsive: 7-col pe lg, list view pe mobile

Păstrează TOATĂ logica: drafts fetch, createDraft, modal state, drag&drop.
```

---

## PROMPT 10 — Onboarding Wizard
**Fișier**: `apps/web/src/app/(onboarding)/onboarding/page.tsx`

```
Rescrie onboarding-ul ca wizard premium full-screen:

1. Background: gradient mesh ca auth layout (orbe animate, grid subtle)
2. Centered card mare: bg-white/[0.03] backdrop-blur-xl border-white/[0.08] rounded-2xl p-8 max-w-lg
3. Stepper: 5 dots conectate cu linie, curent = orange pulse, done = green, future = gray
   - Labels sub: "Industrie" / "Profil" / "Conectare" / "Primul conținut" / "Gata!"
4. Step 1 (Industrie): grid 2x4 de cards cu icon + label, hover:border-orange-500/30, selected: ring-2 ring-orange-500
5. Step 2 (Profil): inputs cu icon prefix (ca login), labels clare
6. Step 3 (Conectare): 4 platform cards cu "Conectează" button, connected = green check
7. Step 4 (Primul conținut): mini textarea + "Generează" button
8. Step 5 (Gata): heading mare "Ești pregătit! 🎉", summary, "Mergi la Dashboard" CTA orange

Tranziții: framer-motion slide stânga/dreapta între steps.
Păstrează: server actions (updateOnboardingStep, completeOnboarding, saveOnboardingProfile).
Înlocuiește emoji-urile din INDUSTRIES cu Lucide icons (Building2, UtensilsCrossed, Scissors, Dumbbell, ShoppingCart, Home, GraduationCap, Palette).
```

---

## ORDINE RECOMANDATĂ

```
1. PROMPT 3 — Auth (mic, impact mare, prima impresie)
2. PROMPT 4 — Sidebar (prezent pe TOATE paginile)  
3. PROMPT 1 — Landing Hero (prima pagină vizitatorilor)
4. PROMPT 2 — Landing Features (a doua secțiune)
5. PROMPT 5 — Brain Dump (pagina principală)
6. PROMPT 7 — AI Coach (diferențiator)
7. PROMPT 6 — Compose (complex)
8. PROMPT 8 — Analytics (charts)
9. PROMPT 9 — Calendar (interactiv)
10. PROMPT 10 — Onboarding (flux nou utilizator)
```

---

## DUPĂ FIECARE PROMPT

După ce Cursor termină, verifică vizual în browser (localhost:3000).
Dacă arată bine → treci la următorul prompt.
Dacă nu → spune-i lui Cursor ce nu-ți place: "Card-ul e prea mic", "Fontul e prea subțire", etc.

Când ai terminat toate 10, revino la mine și eu fac:
- Type-check (tsc --noEmit)
- Lint (eslint --max-warnings 0)
- Test (vitest run)  
- Build (next build)
- Git commit + PR + merge → live pe Vercel
