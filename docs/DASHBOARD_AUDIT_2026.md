# Dashboard Pages Audit — 20 Feb 2026

## Summary

| Page | Lines | Type | Loading | Error | Auth | Fetch | Issues |
|------|-------|------|---------|-------|------|-------|--------|
| /analytics | 480 | client | ✅ | ✅ | — | 1 | ✅ |
| /analyze | 279 | client | — | ✅ | — | 1 | no loading |
| /braindump | 1018 | client | — | ✅ | — | 2 | no loading |
| /calendar | 798 | client | ✅ | ✅ | — | 5 | ✅ |
| /coach | 213 | client | ✅ | ✅ | — | 1 | ✅ |
| /compose | 1134 | client | — | ✅ | — | 5 | no loading |
| /history | 369 | client | ✅ | ✅ | — | 3 | ✅ |
| /image-editor | 12 | client | — | — | — | 0 | ✅ |
| /inspiration | 522 | client | ✅ | ✅ | ✅ | 5 | ✅ |
| /research | 558 | client | ✅ | ✅ | — | 5 | ✅ |
| /settings | 86 | server | — | — | ✅ | 0 | ✅ |
| /trends | 294 | client | ✅ | ✅ | — | 1 | ✅ |
| /video-script | 325 | client | ✅ | ✅ | — | 1 | ✅ |

## Detailed findings

### Clean pages (7/13)
analytics, calendar, history, inspiration, research, trends, video-script — all good.

### Fixed in this commit
- Removed `: any` types from compose (4), analyze (1), braindump (1), coach (1)
- Used `Record<string, any>` for dynamic API responses (typed at call site)
- blog-posts.ts: all 8 titles shortened to <55 chars for SEO
- /tools/scor-continut-gratuit: added server-side metadata layout
- Vercel: NEXT_PUBLIC_SOCIAL_* set to honest values

### Remaining low-risk items
- /image-editor page.tsx is 12 lines (just imports component) — no loading/error needed
- /settings page.tsx is server component (86 lines) — redirects/loads data server-side