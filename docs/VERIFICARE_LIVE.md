# Verificare aplicație live

Ghid pentru testare pagină cu pagină, placeholders, butoane, funcții — și cum AI-ul învață din date reale (ex. MedicalCor).

---

## 1. Testare automată rapidă

### Synthetic monitoring (HTTP checks)
```bash
pnpm monitor:synthetic
```
Verifică: home, login, register, terms, privacy, gdpr, dashboard, health, API auth gates.

### E2E pe producție (browser)
```bash
pnpm --filter @contentos/web e2e:prod
```
Rulează Playwright pe https://contentos-project.vercel.app — pagini publice, redirect la login, interacțiuni.

---

## 2. Checklist manual pagină cu pagină

| Pagină | Ce să verifici |
|--------|----------------|
| **/** (home) | Hero, secțiuni Cum funcționează, Features, Prețuri RON, FAQ, footer links |
| **/login** | Form email/parolă, buton Conectare, link Creează cont, Ai uitat parola |
| **/register** | Form, validare, link Conectare |
| **/reset-password** | Form email, trimitere |
| **/terms, /privacy, /gdpr** | Conținut, link înapoi |
| **/onboarding** | Stepper 5 pași, Industrie grid, Profil inputs, Conectare platforms, Primul conținut, Gata |
| **/dashboard** | Redirect la /dashboard/business |
| **/dashboard/business** | KPIs, grafice, acțiuni rapide, conectare platforme |
| **/braindump** | Input, platforme, Generează, rezultat |
| **/compose** | Stepper 3 faze, textarea, platforme, angle cards |
| **/coach** | Chat, sugestii, input |
| **/analyze** | Scorer, input conținut |
| **/research** | URL input, platformă, analiză |
| **/calendar** | Header lună, view Lună/Săptămână, cells, Adaugă Draft |
| **/settings** | Profil afacere, conturi conectate |
| **/analytics** | Stat cards, range, charts |

### Placeholders
- Login: `tu@exemplu.ro`, `••••••••`
- Profil: `ex: Clinica Dentară Smile`
- Brain dump: `ex: Am lansat un nou serviciu...`

### Butoane critice
- Conectare, Creează cont, Începe gratuit
- Generează (braindump), Continuă (compose)
- Conectează (platforme), Adaugă Draft (calendar)
- Mergi la Dashboard (onboarding)

---

## 3. AI: memorie și învățare din date reale

### Ce folosește AI-ul (nu doar template-uri)

| Sursă | Unde e folosită | Cum se populează |
|-------|-----------------|-------------------|
| **Profil afacere** | Braindump, Generate, Coach | Settings → Profil afacere (nume, descriere, industrie) |
| **Cognitive memory** (5 straturi) | Braindump, Generate | Episodic din generări + consolidare + pattern detector |
| **Creative memory** | Generate (variant bandit) | Facebook/Instagram posts sincronizate → logOutcomeForPost + refreshCreativeMemoryFromPost |
| **Episodic** | Context AI | Creat când generăm conținut (braindump/compose) |
| **Pattern detector** | Semantic patterns | Analizează episodic → strategii reusable |

### Pentru MedicalCor (să învețe din Facebook)

1. **Conectează Facebook** → Settings → Conturi conectate → Conectează
2. **Sincronizează postările** → Istoric → buton „Sincronizează” (apelează /api/ingestion/sync)
3. **Completează Profil afacere** → Settings → Profil afacere (nume: MedicalCor, industrie: dental, descriere)
4. **Folosește Brain Dump / Compose** → primele generări creează episodic
5. **Publică din app** → publish route apelează logOutcomeForPost + refreshCreativeMemoryFromPost
6. **Sync metrics** → cron metrics-sync actualizează engagement pe postări existente
7. **Memory consolidation** → cron rulează periodic și promovează episodic → semantic patterns

### De ce pare „doar template”

- **Dacă nu sunt API keys** (ANTHROPIC_API_KEY etc.) → fallback 100% deterministic (template)
- **Dacă episodic e gol** → cognitive context e gol → AI nu are „memorie“
- **Dacă Facebook nu e conectat/sincronizat** → creative memory e gol → variant bandit nu învață din postări reale
- **Prima utilizare** → cold start, trebuie câteva generări + postări pentru a popula memoria

### Limitări actuale

- **Episodic** = doar din generări (braindump/compose), nu din conținutul postărilor Facebook
- **Creative memory** = învață ce tipuri (hook, framework, CTA) performează, nu textul concret
- Pentru învățare din conținutul complet al postărilor MedicalCor ar trebui extins: episodic din sync sau un strat suplimentar

### Verificare memorie

- `/api/ai/memory-stats` (autentificat) → episodic, semantic, procedural counts

---

## 4. Comenzi utile

| Comandă | Scop |
|---------|------|
| `pnpm monitor:synthetic` | HTTP checks pe prod |
| `pnpm e2e:prod` | E2E Playwright pe prod |
| `pnpm build && pnpm e2e` | E2E local (pornește server) |

---

## 5. Resurse

- **Prod:** https://contentos-project.vercel.app
- **E2E specs:** `apps/web/e2e/`
- **Cognitive memory:** `apps/web/src/lib/ai/cognitive-memory.ts`
- **Outcome learning:** `apps/web/src/lib/ai/outcome-learning.ts`
