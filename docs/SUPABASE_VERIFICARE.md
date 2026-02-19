# Verificare Supabase — ContentOS

**Data:** 2026-02-19

## ✅ Ce e OK

| Componentă | Status | Detalii |
|-------------|--------|---------|
| **Supabase CLI** | ✅ | v2.67.1 (update disponibil: v2.75.0) |
| **Proiect linkat** | ✅ | CONTENTOS (`tzevdvuoodovzuwhjpql`) — West EU (Ireland) |
| **Health endpoint** | ✅ | `https://contentos-project.vercel.app/api/health/supabase` → OK |
| **URL Supabase pe Vercel** | ✅ | `tzevdvuoodovzuwhjpql.supabase.co` |
| **Migrații locale** | ✅ | 14 fișiere în `supabase/migrations/` |

## ⚠️ Probleme detectate

### 1. Supabase CLI – autentificare DB

```
failed SASL auth (FATAL: password authentication failed for user "cli_login_postgres")
Circuit breaker open: Too many authentication errors
```

**Cauză:** Pooler-ul Supavisor cache-uiește greșit credențialele; IP-ul poate fi blocat temporar.

**Soluții (alege una):**

1. **Parolă explicită** – ia parola DB din [Database Settings](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/settings/database):
   ```powershell
   $env:SUPABASE_DB_PASSWORD="parola-ta-db"; supabase migration list
   $env:SUPABASE_DB_PASSWORD="parola-ta-db"; supabase db pull
   ```

2. **Verifică IP-uri blocate** – [Database Settings](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/settings/database) → Network Restrictions → elimină IP-ul tău dacă apare blocat.

3. **Skip pooler** (necesită IPv6):
   ```bash
   npx supabase@beta link --skip-pooler
   npx supabase@beta db pull
   ```

### 2. "Invalid login credentials" la login

Health-ul Supabase răspunde OK → configurația pe Vercel este corectă.

**Cauze probabile:**
- Utilizatorul nu există în `auth.users` (înregistrare pe alt proiect Supabase sau pe localhost)
- Email sau parolă introduse greșit

**Verificări în Supabase Dashboard:**
1. [Supabase Dashboard](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql)
2. **Authentication → Users** → verifică dacă există utilizatorul
3. **Authentication → Providers** → Email confirmă că „Email” este activat

## Comenzi utile

```bash
# Re-login CLI
supabase login

# Lista migrații (local vs remote)
supabase migration list

# Sincronizare cu remote (după login)
supabase db pull
```

## Variabile obligatorii pe Vercel

- `NEXT_PUBLIC_SUPABASE_URL` = `https://tzevdvuoodovzuwhjpql.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon key din Dashboard)
- `SUPABASE_SERVICE_ROLE_KEY` = (service role din Dashboard)

## Note

- `supabase migration list` a returnat Local|Remote goale; poate fi din cauza auth. După `supabase login`, verifică din nou.
