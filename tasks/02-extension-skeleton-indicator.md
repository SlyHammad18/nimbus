# Task 02 — Extension skeleton: live panel indicator

**Status:** pending
**Depends on:** 01

## Objective

Make en extension that can be enabled and shows a static placeholder module
("systats") in the GNOME panel, then cleans up fully on disable. This proves
the indicator plumbing before any real metrics exist.

## Steps

1. `indicator.js`: create a `St.Bin` with button behavior, add to
   `Main.panel` right slot via `Main.panel.addToStatusArea`.
2. `extension.js` wire enable → add, disable → remove and null refs.
3. Placeholder label styled with the DESIGN.md §6 panel rules (mono label,
   muted icon, no background).
4. Toggle-hygiene test script (`scripts/toggle-test.sh`): enable/disable x3,
   greps journal for errors.

## Definition of done

Extension toggles on/off cleanly 3+ times with zero leaked actors (verified
via cleans-up script + journal).

## Human test

- Install the built extension (`gnome-extensions install --force` or
  `make install`), restart shell (X11: Alt+F2 `r`, Wayland: log out/in).
- Enable it via `gnome-extensions enable systats@<user>` or Extensions app.
- See the word "systats" (or its placeholder glyph) appear in the top panel.
- Disable it and confirm it disappears. Toggle twice more; nothing duplicates
  and nothing vanishes.

## Report

*(fill after execution — template in AGENTS.md §3)*
