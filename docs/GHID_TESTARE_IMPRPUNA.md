# Ghid testare — de la zero, împreună

Pentru tester: proces pas cu pas — cont nou, login, onboarding, apoi fiecare modul.

---

## Pasul 0: Verificări dacă login nu merge

### Simptome și cauze posibile

| Ce vezi | Cauză probabilă | Ce faci |
|---------|-----------------|---------|
| „Email sau parolă incorectă” | Parolă greșită sau cont inexistent | Verifică parola. Dacă e cont nou, completează **Pasul 1** (înregistrare). |
| „Email not confirmed” sau similar | Supabase cere confirmare email | Deschide emailul, dă click pe link-ul de confirmare. |
| Pagina se reîncarcă fără mesaj | Sesiune / cookie | Încearcă alt browser sau fereastră incognito. |
| Eroare 500 / pagină albă | Eroare server | Verifică Vercel logs sau contactează dev. |

### Cont nou vs. cont existent

- **Cont nou:** urmează Pasul 1 (Înregistrare) → Pasul 2 (Confirmare email) → Pasul 3 (Login).
- **Cont existent:** mergi direct la Pasul 3 (Login). Dacă nu merge, vezi „Pasul 0” de mai sus.

---

## Pasul 1: Creează cont

1. Mergi la: **https://contentos-project.vercel.app/register**
2. Completează:
   - **Nume:** Numele tău sau „Tester ContentOS”
   - **Email:** o adresă la care ai acces (pentru link de confirmare)
   - **Parolă:** minimum 6 caractere
3. Dă click pe **„Creează cont gratuit”**
4. Ar trebui să vezi: **„Verifică-ți emailul”**
5. Deschide inbox-ul (și spam-ul) și caută emailul de la ContentOS/Supabase

---

## Pasul 2: Confirmă emailul

1. Găsește emailul cu link de confirmare
2. Dă click pe link
3. Ar trebui să fii redirecționat în aplicație (login sau dashboard)

> Dacă nu primești email în 2–3 minute, verifică spam și setările Supabase (confirmation email on/off).

---

## Pasul 3: Login

1. Mergi la: **https://contentos-project.vercel.app/login**
2. Introdu **email** și **parola** folosite la înregistrare
3. Dă click pe **„Conectare”**
4. Ar trebui să ajungi la **Onboarding** (dacă e prima dată) sau **Dashboard**

---

## Pasul 4: Onboarding (prima dată)

1. **Industrie:** alege o industrie (ex. Dental / Medical)
2. **Profil:** completează nume afacere și descriere
3. **Conectare:** poți să sari peste sau să conectezi Facebook/Instagram
4. **Primul conținut:** scrie o idee scurtă și apasă **„Generează”** (poți și să sari)
5. **Gata:** apasă **„Mergi la Dashboard”**

---

## Pasul 5: Module — ordinea de testare

### Modul 1: Dashboard / Business
- **Cale:** `/dashboard` sau `/dashboard/business`
- **Ce verifici:** KPIs, grafice, acțiuni rapide
- **Pași:** Completează profil (Settings) dacă nu ai făcut la onboarding

### Modul 2: Brain Dump
- **Cale:** `/braindump`
- **Ce verifici:** input text, selectare platforme, buton Generează
- **Test:** „3 sfaturi pentru îngrijirea dinților” → Generează

### Modul 3: Compose
- **Cale:** `/compose`
- **Ce verifici:** Stepper 3 faze, textarea, platforme, angle cards
- **Test:** scrie un input → Generează → verifică rezultat pe fiecare platformă

### Modul 4: AI Coach
- **Cale:** `/coach`
- **Ce verifici:** chat, sugestii rapide
- **Test:** întrebare „Cum pot crește engagement-ul pe Instagram?”

### Modul 5: Scorer (Analyze)
- **Cale:** `/analyze`
- **Ce verifici:** input conținut, scor per metrică
- **Test:** lipește un text de post și generează scorul

### Modul 6: Research
- **Cale:** `/research`
- **Ce verifici:** input URL competitor, platformă
- **Test:** URL de pagină Facebook sau Instagram

### Modul 7: Calendar
- **Cale:** `/calendar`
- **Ce verifici:** navigare lună, celule zile, Adaugă Draft
- **Test:** click pe o zi → deschide modal → salvează draft

### Modul 8: Istoric + Sincronizare
- **Cale:** `/history`
- **Ce verifici:** listă postări, buton **„Sincronizează”**
- **Test:** conectează Facebook (Settings) → apasă Sincronizează

### Modul 9: Settings
- **Cale:** `/settings`
- **Ce verifici:** Profil afacere, Conturi conectate, Abonament
- **Test:** actualizează nume/descriere, conectează o platformă

---

## Dacă login nu merge (checklist)

1. Ai creat cont la **/register**?
2. Ai confirmat emailul (click pe link)?
3. Parola e corectă? (min. 6 caractere)
4. Încerci pe **https://contentos-project.vercel.app** (nu localhost)?
5. Ai șters cookies / încercat alt browser?

---

## Raportare bug login

Scrie:
- Ce ai făcut (email/pagină folosită)
- Ce ai văzut (mesaj eroare, pagină albă, redirect)
- Browser și (dacă poți) screenshot
- Dacă ai deschis F12 → Console: mesajele de eroare
