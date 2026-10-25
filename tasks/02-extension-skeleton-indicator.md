# Task 02 — Extension skeleton: live panel indicator

**Status:** done
**Depends on:** 01

## Objective

Make en extension that can be enabled and shows a static placeholder module
("nimbus") in the GNOME panel, then cleans up fully on disable. This proves
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
- Enable it via `gnome-extensions enable nimbus@<user>` or Extensions app.
- See the word "nimbus" (or its placeholder glyph) appear in the top panel.
- Disable it and confirm it disappears. Toggle twice more; nothing duplicates
  and nothing vanishes.

### Report

- **Date:** 2026-10-25
- **Status:** done
- **What was done:**
  - `src/indicator.js`: `NimbusIndicator` as a `PanelMenu.Button` subclass holding the mono placeholder label.
  - `src/extension.js`: GNOME 45+ `Extension` class export; enable adds the indicator via `Main.panel.addToStatusArea('nimbus', ..., 0, 'right')`, disable destroys it and nulls the ref.
  - `data/stylesheet.css`: placeholder label styled per DESIGN.md §6.3 (mono tabular-numerals face, no module background).
  - `scripts/toggle-test.sh`: 3 enable/disable cycles with state assertions and a journal scan; exits 2 with install guidance when no session/extension is present.
- **Deviations from plan:**
  - `PanelMenu.Button` instead of a raw `St.Bin`: canonical partner of `addToStatusArea`, gives clean menu behavior. Functionally a superset of the planned St.Bin.
  - Load/unload of the stylesheet added (step 3 implied styling; plumbing needs it; generalization into tokens is task 05).
  - Project renamed to Nimbus per user request during this task: uuid `nimbus@SlyHammad18.github.com`, schema id `com.github.SlyHammad18.nimbus`, zip `nimbus.zip`, docs updated.
- **Self-test results:**
  - `meson compile -C build` -> pass
  - `meson test -C build` -> pass (1/1 gschema-compiles)
  - `npx eslint .` -> clean (after enabling `camelcase: {properties: 'never'}` for GObject constructor props)
  - `unzip -l build/extension/nimbus.zip` -> stylesheet + metadata + gschema + extension.js + indicator.js present
  - `gjs -m extension/src/indicator.js` style import not possible outside a shell session (needs `resource:///` shell modules); syntax validated by lint and build instead
  - `bash scripts/toggle-test.sh` -> exits 2 with install hint (no live GNOME session in this environment)
- **Manual steps left for user:**
  - Install: `unzip -o build/extension/nimbus.zip -d ~/.local/share/gnome-shell/extensions/nimbus@SlyHammad18.github.com`
  - Restart shell (X11: Alt+F2 `r`; Wayland: log out/in), enable, verify the `nimbus` placeholder appears in the panel; disable and confirm it disappears; run `bash scripts/toggle-test.sh` for the 3-cycle journal check.
- **Known issues / follow-ups:**
  - Clicking the placeholder opens an empty popup menu (expected for a skeleton; tasks 06/07 replace it with real content)

