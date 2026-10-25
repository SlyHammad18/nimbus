# Task 08 — Settings schema and preferences UI

**Status:** pending
**Depends on:** 07

## Objective

Implement the full gsettings schema (DESIGN.md §9) and the libadwaita
preferences UI: General / Modules / Appearance / Sources / Overlay / About,
including the token template engine ("{icon} {total}%" per module) with live
preview, per-module visibility/order, refresh interval, units, separators.

## Steps

1. `schemas/com.github.<user>.nimbus.gschema.xml` per §9.
2. `prefs.js` with Adw preference groups; drag-reorder module list; per-module
   surface toggles (panel/popup/overlay).
3. Template engine in `util/format.js`: token parsing, digit formatting,
   live preview row inside prefs.
4. Threshold editor per metric (warn/crit) with color pickers using the
   state tokens.
5. Import/export settings JSON (§4.3 S10).
6. Store hot-reload: changes apply without disabling the extension.

## Definition of done

Every §4.3 requirement is changeable from the UI and takes effect live;
template preview renders exactly what the panel shows.

## Human test

- Open Settings > Extensions > sy stats > Preferences: the six groups from
  §9 are there.
- Hide the `gpu` module, click Apply/Close: panel updates instantly without
  a shell restart.
- Type a custom CPU template like `{icon} cpu {total} %` and see the panel
  row change to match the live preview.
- Change interval to 2000ms; values still update (slower); switch back to
  1000ms.
- Export settings, delete them, import the file: everything returns.

## Report

*(fill after execution — template in AGENTS.md §3)*
