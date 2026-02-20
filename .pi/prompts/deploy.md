Pre-deploy checklist. Execute in order:
1) pnpm gate:platinum — all must pass
2) Check env variables match DEPLOY_CHECKLIST.md
3) Verify Vercel preview deployment works
4) Run pnpm e2e:prod against staging/preview URL
5) Report: Gate status, E2E results, env check, ready to deploy (YES/NO).
Do NOT deploy directly. Output the checklist for manual confirmation.
