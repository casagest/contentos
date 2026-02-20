Task: Fix audit finding — {FINDING_DESCRIPTION}
PR class: {PR_CLASS}

Phase 1 — Locate (1-2): Read DEEP_AUDIT_REPORT.md or AUDIT_REPORT.md, find all affected files, list file:line, estimate blast radius.
Phase 2 — Test First (3-5): Write failing test proving finding exists. Confirm FAILS.
Phase 3 — Fix (6-10): Read each file before editing. Fix ONE file at a time. Run type-check between each.
Phase 4 — Verify (11-13): Run failing test (now PASSES), run test, run gate:platinum.
Phase 5 — Commit (14-15): Branch fix/{slug}, commit, report changes/risks/tests. Call ralph_done.
