# ContentOS

AI Content Intelligence Platform for Romanian Creators & Dental Clinics.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcasagest%2Fcontentos&project-name=contentos&root-directory=apps/web&build-command=cd%20../..%20%26%26%20pnpm%20build&install-command=cd%20../..%20%26%26%20pnpm%20install)

### Manual Vercel setup

1. Import the repository in [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** to `apps/web`
3. Override **Install Command**: `cd ../.. && pnpm install`
4. Override **Build Command**: `cd ../.. && pnpm build`
5. Add all environment variables listed below under **Settings > Environment Variables**
6. Deploy

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template and fill in your keys
cp .env.example .env.local

# 3. Start the dev server (http://localhost:3000)
pnpm dev
```

See [QUICKSTART.md](./QUICKSTART.md) for the full setup walkthrough.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for system architecture.

## Environment Variables

All variables must be set in the Vercel dashboard (or in `.env.local` for development).

| Variable | Required | Public | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | No | Supabase service-role key (server only) |
| `ANTHROPIC_API_KEY` | Yes | No | Anthropic Claude API key |
| `META_APP_ID` | Yes | No | Meta app ID (server) |
| `META_APP_SECRET` | Yes | No | Meta app secret |
| `NEXT_PUBLIC_META_APP_ID` | Yes | Yes | Meta app ID (client) |
| `TIKTOK_CLIENT_KEY` | No | No | TikTok client key |
| `TIKTOK_CLIENT_SECRET` | No | No | TikTok client secret |
| `GOOGLE_CLIENT_ID` | No | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | No | Google OAuth client secret |
| `YOUTUBE_API_KEY` | No | No | YouTube Data API key |
| `TWITTER_CLIENT_ID` | No | No | X/Twitter client ID |
| `TWITTER_CLIENT_SECRET` | No | No | X/Twitter client secret |
| `TWITTER_BEARER_TOKEN` | No | No | X/Twitter bearer token |
| `STRIPE_SECRET_KEY` | Yes | No | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | No | Stripe webhook signing secret |
| `OPENAI_API_KEY` | No | No | OpenAI key (embeddings) |
| `MONITORING_API_KEY` | No | No | Secret for `/api/health?deep=1` readiness checks |
| `NEXT_PUBLIC_APP_URL` | Yes | Yes | Canonical app URL |
| `NEXT_PUBLIC_APP_NAME` | No | Yes | Display name (default: ContentOS) |

> Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets there.

## Stack

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **AI Engine:** Anthropic Claude API
- **Social APIs:** Meta Graph API, TikTok, YouTube, X/Twitter
- **Payments:** Stripe
- **Hosting:** Vercel
- **Monorepo:** pnpm workspaces + Turborepo

## Project Structure

```
contentos/
├── apps/
│   ├── web/               # Next.js SaaS application
│   └── dental-content/    # Dental vertical module
├── packages/
│   ├── content-engine/    # AI engine & platform adapters
│   ├── database/          # DB schemas & types
│   ├── shared/            # Shared utilities & constants
│   └── ui/                # Shared React components
└── supabase/
    └── migrations/        # Database migrations
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript compiler check |
| `pnpm monitor:synthetic` | Run synthetic uptime + latency checks |

## Monitoring

- Health endpoint: `GET /api/health`
- Deep readiness endpoint: `GET /api/health?deep=1` (requires `MONITORING_API_KEY`)
- Synthetic monitor workflow: `.github/workflows/synthetic-monitoring.yml`
- Full thresholds + alert policy + runbook: `docs/monitoring-playbook.md`
