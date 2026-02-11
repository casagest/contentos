# Backlog PO+SEO — Plan de execuție Engineering

**Data:** 11 februarie 2025  
**Context validat:** Open redirect (auth callbacks), fluxuri OAuth Facebook duplicate, bază SEO lipsă, linkuri footer legale (posibil rupte)

---

## 1. Backlog tabel (P0 / P1 / P2)

| Prio | Titlu | Impact | Scope | Criteria de acceptare | KPI |
|------|-------|--------|-------|------------------------|-----|
| **P0** | Remediere open redirect în auth callbacks | Securitate critică: phishing/phishing via redirect | `api/auth/callback/route.ts`, `api/auth/confirm/route.ts` | Param `next` acceptă doar path-uri interne (prefix `/`, fără `//`); whitelist explicită de path-uri permise sau validare strictă (ex. `startsWith('/')` și `!includes('//')`) | 0 vulnerabilități raportate la redirect |
| **P0** | Unificare flux OAuth Facebook | UX inconsistent, token/stare posibil incorectă | `api/auth/facebook/*`, `api/auth/callback/facebook/*`, `connected-accounts.tsx`, `dashboard/business/page.tsx` | Un singur flux: 1 initiation route, 1 callback route. `connectUrl` pentru Facebook trimite la initiation, nu la callback | 1 flux OAuth Facebook activ |
| **P0** | Creare pagini legale (Terms, Privacy) | Legal, GDPR, încredere utilizator | Pagini noi: `/terms`, `/privacy` | Pagini rute `/terms` și `/privacy` există și returnează conținut; footer-ul din `page.tsx` le leagă corect | 0 linkuri 404 în footer |
| **P1** | robots.txt și sitemap.xml | Indexare controlată, evitare zone neindexabile | `app/robots.ts` sau `public/robots.txt`, `app/sitemap.ts` | `robots.txt` există, permite user-agent, blochează zone sensibile (ex. `/api`, `/dashboard`, `/login`); sitemap listă URL-uri publice | Robots și sitemap răspund 200 |
| **P1** | Bază metadata SEO (canonical, noindex) | Control indexare, evitare duplicate | Layout principal, pagini publice vs dashboard | Canonical setat pe pagini publice; noindex pe `/dashboard/*`, `/login`, `/register`, `/settings` | Toate paginile au canonical sau noindex coerent |
| **P1** | Schema.org (Organization, WebSite) | Rich results, SEO semantica | `layout.tsx`, `page.tsx` (homepage) | JSON-LD Organization + WebSite pe homepage; BreadcrumbList unde e relevant | Schema validă în Google RSC |
| **P2** | Politică noindex/robots per pagină | Granularitate indexare | Pagini individuale | Fiecare pagină publică/închisă are regulă explicită | 0 pagini fără politică definită |
| **P2** | Audit linkuri footer (toate legale) | Consistență legală | Footer, orice linkuri către /legal, /gdpr etc. | Toate linkurile către pagini legale funcționează; nu există 404 | 100% linkuri valide |

---

## 2. Lista „must ship” (72 ore)

| # | Item | Motiv |
|---|------|-------|
| 1 | Remediere open redirect în `callback` și `confirm` | Securitate critică |
| 2 | Unificare flux OAuth Facebook (eliminare duplicat) | Stabilitate autentificare |
| 3 | Pagini `/terms` și `/privacy` (minim viabile) | Linkuri footer funcționale |
| 4 | `robots.txt` (blocare `/api`, `/dashboard`, `/login`) | Protecție indexare |
| 5 | Canonical + noindex pe dashboard/auth | Bază minimă SEO |

---

## 3. Risk register (30 zile)

| # | Risc | Probabilitate | Impact | Măsuri |
|---|------|---------------|--------|--------|
| 1 | Abuz open redirect după deploy (phishing) | Mediu | Ridicat | Remediere P0 prioritar; validare strictă `next` |
| 2 | Token/state incorect din flux OAuth duplicat | Mediu | Mediu | Unificare flux P0 |
| 3 | Indexare accidentală a dashboard/API | Mediu | Mediu | robots.txt + noindex P1 |
| 4 | Non-conformitate GDPR (lipsește Privacy Policy) | Ridicat | Ridicat | Pagini legale P0 |
| 5 | Linkuri legale 404 → pierdere încredere | Ridicat | Mediu | Pagini Terms + Privacy P0 |

---

## 4. Release readiness checklist

### Securitate

- [ ] Parametrul `next` în auth callbacks este validat (whitelist path intern)
- [ ] Un singur flux OAuth Facebook activ
- [ ] Nu există redirect-uri către domenii externe din auth
- [ ] Variabile de mediu sensibile (ex. `FACEBOOK_APP_SECRET`) nu sunt expuse la client

### SEO

- [ ] `robots.txt` există și blochează `/api`, `/dashboard`, `/login`, `/register`, `/settings`
- [ ] `sitemap.xml` există (sau `sitemap.ts`) cu URL-uri publice
- [ ] Paginile publice au URL canonical corect
- [ ] Paginile dashboard/auth au `noindex, nofollow`
- [ ] JSON-LD Organization/WebSite pe homepage (opțional dar recomandat)

### Legal / UX

- [ ] `/terms` și `/privacy` există și sunt accesibile
- [ ] Toate linkurile din footer sunt valide (fără 404)

---

**Fișiere relevante (referință):**

- Auth callbacks: `apps/web/src/app/api/auth/callback/route.ts`, `api/auth/confirm/route.ts`
- Facebook OAuth: `api/auth/facebook/route.ts`, `api/auth/facebook/callback/route.ts`, `api/auth/callback/facebook/route.ts`
- Footer + legale: `apps/web/src/app/page.tsx` (linii ~726, ~842, ~850)
- Layout SEO: `apps/web/src/app/layout.tsx`
