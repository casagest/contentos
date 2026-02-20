Ship current work. 1) Run gate (type-check+lint+test+build).
2) If PASS: git add -A, show status, git commit -m "type(scope): desc", git push origin HEAD, gh pr create --base main --fill.
3) If FAIL: stop immediately, show error, do not commit.
4) Post-PR report: PR URL, files changed, tests added, what could break.
