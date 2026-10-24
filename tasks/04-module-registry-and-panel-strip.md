# Task 04 — Module registry and live panel strip

**Status:** pending
**Depends on:** 03

## Objective

Replace the task-02 placeholder with the real module system: registry,
declarative module spec + render fn, and the first working panel modules
(cpu, ram, temp, net, clock) styled exactly per DESIGN.md §6.3.

## Steps

1. `modules/registry.js` with `spec + tokens + render` contract (§7.3).
2. Modules: `cpu.js`, `ram.js`, `temp.js`, `net.js`, `clock.js`.
3. Panel strip container: hairline glyph separators, mono bold numerals,
   muted units/icons, threshold tint on value only.
4. Wire coordinator tick → strip; text diffing so labels update only on
   value change.
5. Unit test: token rendering for each module against a fixture frame.

## Definition of done

Strip shows live CPU %, RAM %, temperature, net up/down, clock; follows the
§6.3 style rules; all metrics go n/a gracefully if a source is missing.

## Human test

- Enable the extension. You see exactly:
  `5% │ 72% │ 52°C │ 1K↑ 2K↓ │ 14:32` (values live, matching your machine).
- Start `yes > /dev/null` in a terminal; CPU % climbs within a second, stops
  when you Ctrl-C.
- `ping -i 0.2 <gateway>` in another terminal makes the net numbers jump.
- The clock ticks every second; separators look identical between modules
  (single glyph style).

## Report

*(fill after execution — template in AGENTS.md §3)*
