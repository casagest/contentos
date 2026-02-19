# ContentOS — Vercel Deploy Checklist

## ⚠️ CRITICAL: Vercel Environment Variables

Without these, the app is a non-functional demo. Set ALL of them in Vercel → Settings → Environment Variables.

### 🔴 Must Have (app won't work without these)

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Already set ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Already set ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API | Already set ✅ |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL | **Set to `https://contentos-project.vercel.app`** ❌ Currently localhost! |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Secures all cron jobs |

### 🟡 AI Provider (at least ONE required)

| Variable | Where to get it |
|----------|----------------|
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) — RECOMMENDED (best cost/quality) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| `GOOGLE_AI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |

### 🟡 Facebook/Instagram (social features)

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `FACEBOOK_APP_ID` | [developers.facebook.com](https://developers.facebook.com) → Your App → Settings → Basic | Same as META_APP_ID |
| `FACEBOOK_APP_SECRET` | Same location | Same as META_APP_SECRET |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Same value as FACEBOOK_APP_ID | Client-side access |
| `META_APP_ID` | Same as FACEBOOK_APP_ID | Legacy compat |
| `META_APP_SECRET` | Same as FACEBOOK_APP_SECRET | Legacy compat |
| `FACEBOOK_PUBLISH_SCOPES_ENABLED` | Set to `true` | Enables publishing to FB/IG |

### Facebook App Setup
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create/select your app (type: Business)
3. Add product: **Facebook Login for Business**
4. Settings → Basic: Note App ID + App Secret
5. Facebook Login → Settings:
   - Valid OAuth Redirect URIs: `https://contentos-project.vercel.app/api/auth/facebook/callback`
   - Client OAuth Login: YES
   - Web OAuth Login: YES
6. App Review: Request these permissions:
   - `pages_show_list` ✅
   - `pages_read_engagement` ✅
   - `pages_read_user_content` ✅
   - `read_insights` ✅
   - `instagram_basic` ✅
   - `instagram_manage_insights` ✅
   - `pages_manage_posts` ⚠️ (needed for publishing)
   - `instagram_content_publish` ⚠️ (needed for publishing)

### 🟡 Stripe (billing/subscriptions)

| Variable | Where to get it |
|----------|----------------|
| `STRIPE_SECRET_KEY` | [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → Endpoint → Signing secret |
| `STRIPE_PRICE_STARTER` | Stripe → Products → Starter plan → Price ID (`price_xxx`) |
| `STRIPE_PRICE_PRO` | Stripe → Products → Pro plan → Price ID |
| `STRIPE_PRICE_AGENCY` | Stripe → Products → Agency plan → Price ID |
| `STRIPE_PRICE_DENTAL` | Stripe → Products → Dental plan → Price ID |

### Stripe Setup
1. Create account at [stripe.com](https://stripe.com)
2. Products → Create 4 products:
   - **Starter** — €19/month recurring
   - **Pro** — €49/month recurring
   - **Agency** — €99/month recurring
   - **Dental** — €79/month recurring
3. Webhooks → Add endpoint:
   - URL: `https://contentos-project.vercel.app/api/billing/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 🟢 Optional

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) | Research scraping (better quality) |

## 🔐 Supabase Auth (login + email verificare)

Dacă login nu funcționează și emailurile de verificare nu se trimit:
- **Site URL** și **Redirect URLs** în Supabase Auth
- **Custom SMTP** – SMTP-ul implicit trimite doar la adrese autorizate (echipă)

→ Vezi **[docs/SUPABASE_AUTH_FIX.md](docs/SUPABASE_AUTH_FIX.md)** pentru pași detaliați.

## ⚙️ Vercel Functions (API AI)

Dacă primești eroarea: **"The pattern 'api/ai/**' defined in functions doesn't match any Serverless Functions"**:

1. **Șterge configurația greșită** din Vercel Dashboard: Settings → Functions → elimină orice regulă cu `api/ai/**` sau `api/*`.
2. **Pattern-ul corect** e deja în `vercel.json`: `apps/web/src/app/api/ai/**/route.ts` (pentru Next.js App Router, trebuie căile către fișiere, nu URL-urile API).
3. ✅ Pattern confirmat pentru Root Directory = `apps/web`: `src/app/api/ai/**/route.ts`.
4. Rutele AI au acum `maxDuration: 60s` și `memory: 1024MB` (Pro plan).

## 🚀 After Setting Env Vars

1. Redeploy on Vercel (Settings → Deployments → Redeploy)
2. Test Facebook OAuth: Settings → Conectează Facebook
3. Test AI: Brain Dump → Write anything → Should get AI response
4. Test Stripe: Settings → Upgradeaza → Should open Stripe Checkout
