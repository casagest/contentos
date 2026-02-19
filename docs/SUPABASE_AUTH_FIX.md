# Fix Auth & Login — Supabase Configurare

**Probleme:** Login nu funcționează, email-uri de verificare nu se trimit.

**Cauză principală:** Supabase folosește SMTP implicit care:
- trimite doar la adrese **autorizate** (membri ai echipei)
- are limită **2 emailuri/oră**
- nu e recomandat pentru producție

---

## 1. Site URL și Redirect URLs (obligatoriu)

În [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/url-configuration):

| Setare | Valoare |
|--------|---------|
| **Site URL** | `https://contentos-project.vercel.app` |
| **Redirect URLs** | Adaugă aceste URL-uri exacte: |
| | `https://contentos-project.vercel.app/api/auth/callback` |
| | `https://contentos-project.vercel.app/api/auth/confirm` |
| | `https://contentos-project.vercel.app/**` (wildcard pentru query params) |

**Important pentru reset parolă:** URL-ul `https://contentos-project.vercel.app/api/auth/callback` trebuie să fie în listă. Altfel, linkul din email nu va reuși redirecționarea și pagina va rămâne albă sau se va bloca.

Dacă lipsește, link-urile din email (confirmare, reset parolă) nu vor funcționa.

---

## 2. Custom SMTP (pentru emailuri)

În [Authentication → SMTP](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/smtp):

**Opțiuni rapide (cont gratuit):**
- [Resend](https://resend.com) – 100 emailuri/zi gratuit
- [Brevo (Sendinblue)](https://www.brevo.com) – 300/zi gratuit
- [SendGrid](https://sendgrid.com) – 100/zi gratuit

**Exemplu Resend:**
1. Creează cont pe resend.com
2. Verifică domeniul (sau folosește `onboarding@resend.dev` pentru test)
3. În Supabase SMTP:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) sau `587` (TLS)
   - User: `resend`
   - Pass: API key de la Resend
   - Sender email: `onboarding@resend.dev` (test) sau `noreply@domeniul-tau.ro`
   - Sender name: `ContentOS`

---

## 3. Dezactivare confirmare email (temporar)

Dacă vrei ca userii să se logheze **fără** a confirma emailul (doar pentru test):

[Authentication → Providers → Email](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/providers):
- **Confirm email** → OFF

⚠️ Nu recomandat pentru producție – oricine poate crea cont cu orice email.

---

## 4. Verificări rapide

1. **Provider Email activ:** Auth → Providers → Email = ON
2. **Utilizator confirmat manual:** Dacă ai useri creați, în Users dă click pe user → **Confirm email** (buton)
3. **Auth Logs:** Auth → Logs – verifică erorile la signup/login

---

## 5. Flux recomandat

1. Setează **Site URL** și **Redirect URLs** (pasul 1)
2. Configurează **Custom SMTP** (pasul 2) – obligatoriu pentru producție
3. Pentru userii existenți neconfirmați: confirmă manual în Dashboard sau trimite din nou link (Users → ... → Resend confirmation)

---

## Link-uri directe

- [URL Configuration](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/url-configuration)
- [SMTP Settings](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/smtp)
- [Email Provider](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/providers)
- [Users](https://supabase.com/dashboard/project/tzevdvuoodovzuwhjpql/auth/users)
