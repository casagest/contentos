# ContentOS Supabase Migrations

## Migration Order

| # | File | Description |
|---|------|-------------|
| 001 | `001_initial_schema.sql` | Creates `contentos` schema and required extensions (`vector`, `pg_trgm`, `uuid-ossp`). |
| 002 | `002_full_schema.sql` | Full schema bootstrap: core tables + enhancement tables, indexes, triggers, and helper SQL functions. |
| 003 | `003_rls_policies.sql` | Granular RLS policy setup and policy replacement for all protected tables. |
| 004 | `004_bootstrap_guards.sql` | Adds `contentos.bootstrap_ok()` health-check function. |

## Why This Layout

- Keeps stable migration filenames (`001`, `002`, `003`) to avoid migration history drift.
- Ensures a fresh database can bootstrap from scratch without missing FK dependencies.
- Adds a lightweight guard migration (`004`) for post-bootstrap verification.

## Bootstrap Check

```sql
SELECT contentos.bootstrap_ok();
```

Returns `true` when all core bootstrap tables exist.
