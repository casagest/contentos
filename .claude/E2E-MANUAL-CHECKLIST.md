# Checklist test manual E2E — ContentOS

**Flux**: Login → Coach (1 întrebare) → Composer (1 platformă) → Analyze

## Precondiții

- [ ] `pnpm dev` rulează (http://localhost:3000)
- [ ] `.env.local` conține: `NEXT_PUBLIC_SUPABASE_*`, `ANTHROPIC_API_KEY`
- [ ] Cont Supabase creat (sau folosești seed/seed test)

---

## 1. Login

| Step | Acțiune | Expected | Notă |
|------|---------|----------|------|
| 1.1 | Navighează la `/login` | Formular login/register | — |
| 1.2 | Email + parolă validă → Login | Redirect la dashboard | |
| 1.3 | Email nou → Register | Redirect după confirmare | **Edge case**: email verification required? |
| 1.4 | Parolă greșită | Mesaj eroare, rămâne pe /login | |
| 1.5 | Logout | Redirect la / sau /login | |

---

## 2. AI Coach (1 întrebare)

| Step | Acțiune | Expected | Notă |
|------|---------|----------|------|
| 2.1 | Navighează la `/coach` | UI cu sugestii + input | |
| 2.2 | Click pe sugestie (ex: "Ce tip de conținut funcționează...") | Întrebare trimisă | |
| 2.3 | Verifică răspuns AI | Text + eventuale action items | **Edge case**: timeout dacă ANTHROPIC_API_KEY lipsește |
| 2.4 | Input gol → Submit | Nu trimite / buton disabled | |
| 2.5 | Întrebare custom în input | Răspuns relevant | **Edge case**: postări goale în DB → Coach răspunde fără context |

---

## 3. Composer (1 platformă)

| Step | Acțiune | Expected | Notă |
|------|---------|----------|------|
| 3.1 | Navighează la `/compose` | Textarea + platforme țintă | |
| 3.2 | Scrie text (ex: "Promovare ofertă Black Friday") | Conținut valid | |
| 3.3 | Selectează doar Facebook | 1 platformă țintă | |
| 3.4 | Generează | Loading → versiuni generate | **Edge case**: 429 dacă rate limit Anthropic |
| 3.5 | Verifică output | Text + hashtags + scor (dacă există) | |
| 3.6 | Copiază conținut | Clipboard populated | |
| 3.7 | Input gol → Generează | Buton disabled | |
| 3.8 | Nicio platformă selectată | Buton disabled / eroare | |

---

## 4. Analyze

| Step | Acțiune | Expected | Notă |
|------|---------|----------|------|
| 4.1 | Navighează la `/analyze` | Textarea + selector platformă | |
| 4.2 | Lipește conținut (ex: din Composer) | Text valid | |
| 4.3 | Selectează Facebook | Platformă validă | |
| 4.4 | Analizează | Scor (S–F) + metrici + improvements | |
| 4.5 | Input gol | Buton disabled | |
| 4.6 | Conținut foarte scurt (1 cuvânt) | Scor low / metrics explicite | **Edge case**: input minim |

---

## Edge cases de documentat

| ID | Scenario | Comportament așteptat |
|----|----------|------------------------|
| EC1 | ANTHROPIC_API_KEY lipsește | Mesaj 500 / "Cheie API lipsește" |
| EC2 | Rate limit Anthropic (429) | Mesaj "Prea multe cereri" |
| EC3 | User nelogat accesează /coach, /compose, /analyze | Redirect la login? Sau 401? |
| EC4 | Organization fără posturi → Coach | Răspunde fără context (OK) |
| EC5 | Supabase indisponibil | Timeout / eroare grațioasă |

---

## Semnături

- [ ] Data: __________
- [ ] Tester: __________
- [ ] Environment: local / staging
