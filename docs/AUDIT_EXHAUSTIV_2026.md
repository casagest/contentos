# Audit Exhaustiv contentos.ro — 20 Februarie 2026

**Crawl**: Firecrawl CLI · 16 pagini · 71KB date brute
**Sursa**: `docs/contentos-crawl-audit.json`

---

## Sumar

| Categorie | Nr |
|-----------|----|
| Pagini scanate | 16 |
| ❌ Critice | 4 |
| ⚠️ Avertismente | 10 |
| ℹ️ Info | 5 |

---

## Probleme critice (❌)

### 1. `sitemap.xml` — lipsă title + description
- Firecrawl a crawlat XML-ul direct → nu e o problemă reală (e XML, nu HTML)
- **Acțiune**: Exclud din viitoare crawl-uri

### 2. `robots.txt` — lipsă title + content subțire
- Normal pentru robots.txt → nu e o problemă reală
- **Acțiune**: Exclud din viitoare crawl-uri

---

## Avertismente (⚠️)

### Titluri prea lungi (>70 chars) — 8 articole blog

| Pagină | Lungime |
|--------|---------|
| /blog/copywriting-social-media-limba-romana | 85 chars |
| /blog/algoritm-tiktok-romania-2026 | 73 chars |
| /blog/reels-vs-tiktok-romania-2026 | 76 chars |
| /blog/linkedin-romania-ghid-complet-2026 | 80 chars |
| /blog/content-marketing-clinici-dentare-romania | 88 chars |
| /blog/cele-mai-bune-ore-postare-facebook-romania | 73 chars |
| /blog/cum-sa-postezi-pe-instagram-romania-2026 | 75 chars |
| /blog/calendar-editorial-social-media-romania-2026 | 87 chars |

**Recomandare**: Scurtează la max 60-65 chars. Elimină " | Blog ContentOS" din titluri.

### Conținut subțire

| Pagină | Chars |
|--------|-------|
| /tools/scor-continut-gratuit | 322 chars |
| /robots.txt | 487 chars (normal) |

**Recomandare**: Pagina `/tools/scor-continut-gratuit` necesită conținut — probabil client-side render care nu e vizibil la crawl.

---

## Info (ℹ️)

### Social proof cu valori default
- Homepage afișează "2,400+", "4.9", "1M+" — acum configurabile via env vars
- **Fix aplicat**: `NEXT_PUBLIC_SOCIAL_*` env vars (commit `baacb258`)

### Pagini fără CTA
- `/terms`, `/privacy`, `/gdpr` — normal, sunt pagini legale
- `/tools/scor-continut-gratuit` — ar trebui să aibă CTA (probabil render client-side)

---

## Pagini sănătoase ✅

| Pagină | Title | Content |
|--------|-------|---------|
| `/` (homepage) | 55 chars ✅ | 6,877 chars ✅ |
| `/blog` (index) | OK | 2,991 chars ✅ |
| 8× articole blog | Titluri lungi dar informative | 2,400-3,500 chars fiecare ✅ |
| `/terms` | 32 chars ✅ | 843 chars ✅ |
| `/privacy` | 43 chars ✅ | 995 chars ✅ |
| `/gdpr` | 36 chars ✅ | 713 chars ✅ |

---

## Pagini dashboard (nu crawlate — necesită auth)

Aceste pagini NU apar în crawl (sunt protejate de autentificare):
- `/dashboard`, `/braindump`, `/compose`, `/coach`, `/settings`
- `/analytics`, `/calendar`, `/history`, `/research`, `/trends`
- `/onboarding`

**Acțiune**: Audit separat cu browser autentificat (Playwright).

---

## Acțiuni recomandate

1. **SEO**: Scurtează titlurile blog la <65 chars
2. **Tools page**: Verifică de ce `/tools/scor-continut-gratuit` are conținut subțire (CSR?)
3. **Social proof**: Setează `NEXT_PUBLIC_SOCIAL_*` pe Vercel cu valori reale
4. **Crawl excluderi**: Adaugă `robots.txt` și `sitemap.xml` la exclude patterns
5. **Dashboard audit**: Rulează audit separat cu sesiune autentificată
