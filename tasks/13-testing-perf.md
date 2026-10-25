# Task 13 — Testing, performance, and visual regression

**Status:** pending
**Depends on:** 08, 09, 10, 11, 12

## Objective

Run the full validation ladder from §10 and prove the non-functional budgets
(N1, N2, N3): idle CPU under 0.5% running the strip, coordinator memory
bound, no per-tick allocations, and the visual screenshot golden set checked
in a nested MUTTER Wayland session.

## Steps

1. Wire all tests into `meson test`: GJS `node:test` and `cargo test`.
2. Perf script: sample extension CPU with `/proc/<pid>/stat` over 60s idle;
   fail CI if above N1 budget.
3. Screenshot goldens: enable extension in nested mutter session, capture
   panel + popup + overlay, diff against `docs/screenshots/*.png`.
4. Leak test: enable/disable toggle x100 with journal grab (N4).
5. Source-failure fault tests: fake broken files mount-injected; verify
   graceful n/a (N10).

## Definition of done

Full `meson test` green in CI including perf guard and screenshot diff.

## Human test

- Look at `docs/screenshots/` after this task: you see the three goldens
  (panel strip, open popup, overlay corner) matching what you've seen live.
- `journalctl -f | grep -i nimbus` while toggling on/off 10-20 times shows
  no warnings or errors beyond the first enable.
- Run `meson test -C build`: summary reports all suites passing.

## Report

*(fill after execution — template in AGENTS.md §3)*
