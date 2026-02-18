# Audit: Ce e real vs placeholder

Document pentru verificarea că totul funcționează cu date reale, nu cu placeholders.

---

## ✅ Ce funcționează REAL (API + DB)

| Modul | API / sursă | Ce e real |
|-------|-------------|-----------|
| **Login / Register** | Supabase Auth | Autentificare reală, conturi în DB |
| **Dashboard** | Supabase + `/api/analytics/overview` | Profil afacere, KPIs, conturi conectate, postări recente |
| **Brain Dump** | `/api/ai/braindump` | Generare AI reală, salvare draft în DB |
| **Compose** | `/api/ai/generate` + `/api/drafts` | Generare AI, drafturi reale |
| **AI Coach** | `/api/ai/coach` | Chat real cu AI |
| **Scorer (Analyze)** | `/api/ai/score` | Scoring real al conținutului |
| **Research** | `/api/ai/research` + `/api/scrape/search` | Analiză competitor, căutare idei |
| **Inspiration** | `/api/inspirations` + `/api/scrape` | Salvare inspirații, scraping URL |
| **Video Script** | `/api/ai/video-script` | Generare script video |
| **Calendar** | `/api/drafts` + `/api/posts` | Drafturi și postări din DB |
| **History** | `/api/posts` + `/api/ingestion/sync` | Postări reale, sincronizare Facebook |
| **Analytics** | `/api/analytics/trends` | Date din posts, creative_memory, analytics_daily |
| **Settings** | Supabase + `/api/social-accounts` | Profil, conturi conectate |
| **Billing** | `/api/billing/*` + Stripe | Checkout, portal abonament |

---

## 🔧 Ce era placeholder și a fost corectat

| Locație | Înainte | După |
|---------|---------|------|
| **Brain Dump – likes/comments/shares** | "2.4K", "187", "342" (cifre false) | "—" (conținut nepublicat = fără engagement real) |

---

## 📋 Ce poate părea „placeholder” dar e corect

| Ce vezi | Explicație |
|---------|------------|
| **Empty state** (Calendar gol, History gol) | E normal când nu există drafturi/postări. Conectează Facebook și sincronizează. |
| **KPI-uri 0** | Când nu ai conectat conturi sau nu ai postări → date reale = 0. |
| **AI Content Suggestions** (Dashboard) | Sunt sugestii pe industrie, nu date măsurate. E comportament corect. |
| **Placeholder în inputuri** ("ex: Clinica Dentară...") | Sunt hint-uri UX, nu valori afișate. |
| **"—" la likes** (Brain Dump) | Conținut generat nu e publicat → engagement inexistent. Corect. |

---

## ⚠️ Condiții pentru ca totul să fie real

### 1. Variabile de mediu (Vercel / .env.local)

| Variabilă | Pentru ce |
|-----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + DB |
| `ANTHROPIC_API_KEY` sau `OPENAI_API_KEY` sau `OPENROUTER_API_KEY` | **Generare AI reală** — fără cheie → template determinist |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing |
| `FIRECRAWL_API_KEY` (opțional) | Research / Inspiration — scrape URL, search |
| `SERPER_API_KEY` (opțional) | Fallback pentru Search — 2500 gratuite la serper.dev |

> **Important:** Dacă primești doar template-uri (fără AI real), configurează cel puțin una din cheile de mai sus în Vercel → Settings → Environment Variables.

**Research & Inspiration (scraping):**
- **Search** („Caută idei”): Firecrawl sau **Serper** (serper.dev — 2500 gratuite). Dacă niciunul nu e configurat → eroare 501.
- **Scrape URL** (analiză competitor, salvare inspirație): Firecrawl → **Jina Reader** (gratuit) → fetch HTML. Funcționează fără Firecrawl pe multe site-uri.

### 2. Conectare platforme

- **Settings → Conturi conectate** → Conectează Facebook (și alte platforme)
- **History → Sincronizează** → Împrumută postări din Facebook în app

### 3. Profil afacere

- **Settings → Profil afacere** → completează (nume, industrie, descriere)  
- AI-ul folosește aceste date pentru personalizare.

### 4. CMSR 2025 (medical/dental)

- **Settings → Profil afacere** → bifează **„CMSR 2025”** în secțiunea Compliance  
- Atât AI-ul, cât și **template-urile** (fallback) aplică sanitizare CMSR când e bifat.

---

## 🔍 Verificare rapidă

```bash
# Synthetic monitoring (HTTP checks)
pnpm monitor:synthetic

# E2E pe producție
pnpm --filter @contentos/web e2e:prod
```

---

## Rezumat

- **Backendul e real**: toate modulele apelează API-uri reale și Supabase.
- **Placeholder-urile false** au fost eliminate (ex. likes în Brain Dump).
- **Datele goale** sunt reale: lipsesc conectări și postări.
- Pentru **AI cu memorie**, este nevoie de: profil complet, Facebook conectat, sincronizare și câteva generări.
