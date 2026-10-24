# Task 05 — Chart widgets and styling tokens

**Status:** pending
**Depends on:** 04

## Objective

Build the reusable drawing layer every dashboard uses later:
`ui/widgets.js` (module pill, sparkline `St.DrawingArea`, bar widget) and
`ui/charts.js` (cairo helpers), consuming `data/stylesheet.css` generated
from the DESIGN.md §6.1 token table.

## Steps

1. Tokens → CSS classes (`surface`, `hairline`, `accent`, `state-warn`,
   `state-crit`, `text-muted`, mono numerals).
2. `Sparkline` widget: history ring → cairo polyline, accent stroke,
   options for fill/hairline baseline.
3. `Bar` widget: single-value bar with track; threshold classes.
4. `Numeral` label helper enforcing the mono/tabular style everywhere.
5. Unit tests: history→points mapping; class semantics.

## Definition of done

Widgets render correctly inside a scratch indicator, use only §6.1 tokens,
and repaint without per-tick allocations.

## Human test

- Temporarily add a debug module (`scripts/enable-debug-widget`: a gsettings
  flag from this task) showing a 120px sparkline of CPU history and a RAM bar
  in the panel.
- Watch the sparkline: it scrolls smoothly, line is accent-colored, no
  flicker/jitter on updates.
- Screenshot it against the dark panel: numerals are monospace and aligned;
  nothing jitters horizontally as values change.

## Report

*(fill after execution — template in AGENTS.md §3)*
