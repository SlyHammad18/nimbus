# Task 10 — Thresholds, states, and Pulse Spine polish

**Status:** pending
**Depends on:** 07, 08

## Objective

Finish the state system end to end (user-set thresholds per metric, 3-state
coloring, pulse behavior limited to crit, spine integration everywhere) and
add the "monochrome | vibrant | rainbow | terminal" presets on top of the
token table (§4.3 S4/S6, §6.2).

## Steps

1. State resolution in coordinator (value → class) honoring per-metric
   threshold settings.
2. Preset definitions: each preset = token overrides; verify all presets
   respect the §6.1 rules (one accent, no neon glow under monochrome).
3. Spine: crit pulse only; `prefers-reduced-motion`/`gtk-enable-animations`
   respected by dropping pulse + entry animation.
4. Module tooltip colors stay semantic; no decorative dots anywhere.

## Definition of done

Setting CPU crit 90 and running `stress` tints only the value + spine on
breach; presets switch instantly; reduced motion is honored.

## Human test

- Set CPU crit threshold below current load (e.g. 0.01). The CPU numeral
  goes crit-red and the left spine in the popup turns red; restore 85 and
  they return silently to neutral.
- Switch to the `monochrome` preset: everything goes gray + white numerals
  except live sparklines still in the accent color.
- Enable `gtk-enable-animations=false` (reduced motion): the spine no longer
  pulses, popup opens instantly, sparklines update without interpolation.

## Report

*(fill after execution — template in AGENTS.md §3)*
