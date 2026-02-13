# Monitoring Playbook

Production monitoring baseline for `https://contentos-project.vercel.app`.

## 1) Endpoint Checklist

| Endpoint | Method | Expected Status | Warn Latency | Critical Latency | Purpose |
|---|---|---:|---:|---:|---|
| `/` | `GET` | `200` | 1200ms | 3000ms | Public app uptime |
| `/api/health` | `GET` | `200` | 450ms | 1200ms | Liveness |
| `/api/health?deep=1` | `GET` | `200` (with key) | 900ms | 2500ms | Readiness (DB) |
| `/api/ai/score` | `POST` | `401` (unauth smoke) | 900ms | 2500ms | Route alive + auth gate |
| `/api/ai/generate` | `POST` | `401` (unauth smoke) | 900ms | 2500ms | Route alive + auth gate |
| `/api/ai/coach` | `POST` | `401` (unauth smoke) | 900ms | 2500ms | Route alive + auth gate |
| `/api/ai/braindump` | `POST` | `401` (unauth smoke) | 1100ms | 3000ms | Route alive + auth gate |
| `/api/ai/research` | `GET` | `401` (unauth smoke) | 900ms | 2500ms | Route alive + auth gate |

Notes:
- AI endpoints are authenticated by design. Synthetic checks should expect `401` for unauthenticated probes.
- `deep=1` health check requires `MONITORING_API_KEY` via `x-monitoring-key` or `Authorization: Bearer ...`.

## 2) Alerting Policy

Severity levels:
- `P1` Critical: any status mismatch OR latency > critical threshold for 2 consecutive runs.
- `P2` Warning: latency > warning threshold for 3 consecutive runs.

Recommended routing:
- `P1`: PagerDuty/phone + Slack + email.
- `P2`: Slack + email.

Recommended timing:
- Check interval: every 10 minutes.
- Incident open rule:
  - P1 if 2 consecutive fails.
  - P2 if 3 consecutive warnings.
- Incident auto-resolve rule:
  - 2 consecutive healthy runs.

## 3) GitHub Synthetic Monitor (already added)

Workflow:
- `.github/workflows/synthetic-monitoring.yml`
- Runner script:
  - `scripts/synthetic-monitoring.mjs`

Configure repository settings:
- `Repository Variables`:
  - `MONITOR_BASE_URL` = `https://contentos-project.vercel.app`
  - `MONITOR_TIMEOUT_MS` = `12000` (optional)
- `Repository Secrets`:
  - `MONITORING_API_KEY` (used for `/api/health?deep=1`)
  - `MONITOR_ALERT_WEBHOOK` (optional webhook called on failure)

## 4) External Uptime Provider (recommended)

Use one of:
- Better Stack Uptime
- Checkly
- Pingdom

For each monitor:
1. Set check interval to 1 minute for `/` and `/api/health`.
2. Add assertion for expected HTTP status.
3. Add response-time threshold aligned with this playbook.
4. Configure escalation policy (P1/P2 rules above).

## 5) Operational Runbook

When an alert fires:
1. Check latest synthetic run logs in GitHub Actions.
2. Check `/api/health` and `/api/health?deep=1` manually.
3. If deep check fails:
   - verify Supabase status
   - verify DB connectivity and migrations
4. If only AI routes fail:
   - inspect `contentos.ai_usage_events` for spikes/error codes
   - verify provider keys and budget caps
5. If latency breaches only:
   - inspect recent deploys
   - inspect Vercel region/runtime cold starts
   - inspect DB query latency and cache hit rates

## 6) SQL Queries for Incident Triage

AI failures in last 60 minutes:

```sql
select route_key, provider, model, error_code, count(*) as failures
from contentos.ai_usage_events
where success = false
  and created_at >= now() - interval '60 minutes'
group by route_key, provider, model, error_code
order by failures desc;
```

Cache effectiveness in last 24h:

```sql
select route_key,
       count(*) as total,
       sum(case when cache_hit then 1 else 0 end) as cache_hits,
       round(100.0 * sum(case when cache_hit then 1 else 0 end) / nullif(count(*),0), 2) as cache_hit_pct
from contentos.ai_usage_events
where created_at >= now() - interval '24 hours'
group by route_key
order by cache_hit_pct desc;
```

AI cost by route in current month:

```sql
select route_key,
       round(sum(estimated_cost_usd)::numeric, 4) as cost_usd
from contentos.ai_usage_events
where created_at >= date_trunc('month', now())
group by route_key
order by cost_usd desc;
```

