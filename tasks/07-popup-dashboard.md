# Task 07 — Popup dashboard

**Status:** pending
**Depends on:** 05, 06

## Objective

Build the full popup dashboard from DESIGN.md §6.4: summary header with big
mono numeral, grouped sections divided by hairlines, per-core grid, sparkline
history per group, `n/a` degradation, entry motion per the §6.4 motion
budget, Pulse Spine left edge, and the footer action row.

## Steps

1. `popup.js`: container + section layout (no cards, hairline groups,
   widths 420/640 per preset).
2. Sections wired to the coordinator with `Float32Array` histories.
3. Per-core grid (4 per row), dual sparkline for net, storage r/w bars.
4. Pulse Spine (§6.2): 3px left strip tinted by hottest subsystem; alpha
   pulse only on crit; respects `gtk-enable-animations`.
5. Entry animation 160ms cubic-bezier(0.2,0,0,1) scale+fade from anchor;
   Esc/click-out closes.
6. Footer: `settings`, `overlay` (stubbed until task 11), `about`.

## Definition of done

Popup matches §6.4 layout + motion table; opens/closes cleanly; keyboard:
Super+0 toggles, arrow keys traverse modules, Esc closes.

## Human test

- Click the strip: the popup opens with a quick subtle scale/fade (no bounce,
  no long animation), aligned to where you clicked.
- Check visually against the mock in DESIGN.md 6.4: groups separated by thin
  hairlines, big monospace numerals, accent-colored sparklines, per-core
  grid updating live.
- Press `yes > /dev/null` on/off: CPU group numeral and sparkline respond
  within a second; sparkline scrolls.
- Press Esc: popup closes instantly. Press Super+0: it reopens.
- Screenshot and compare against DESIGN.md 6.4; the left spine is visible
  and cyan unless something is hot.

## Report

*(fill after execution — template in AGENTS.md §3)*
