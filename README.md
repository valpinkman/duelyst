# PR #78 screenshot evidence

BEFORE = d2767ac (marionette-removal, codex on Lit), AFTER = 21d1545 (PR head). Stack on .env.dev (duelyst-ci).

- `a/` — run with a claimed rift run (repeat run; the one to read)
- `a-run1/` — first run with a rift run; its AFTER capture hit the known headless login stall (App.main() re-run), see PR comment
- `b/` — empty state (`--no-rift-run`)
