# Task 01 — Project scaffold and tooling

**Status:** done
**Depends on:** none

## Objective

Create the repo skeleton from DESIGN.md §8 so every later task has a place to
land: meson build for the extension, an ESM extension stub, gschema skeleton,
eslint config (gjs), and a CI workflow that lints, builds, and tests.

## Steps

1. Initialize meson project (`meson.build` at root, one per subproject).
2. Create `extension/` with the minimal ESM entry:
   `src/extension.js` exporting `init`, `enable`, `disable` as no-ops.
3. `metadata.json` with shell-version 45+.
4. Empty gschema that compiles (`glib-compile-schemas` clean).
5. ESLint config using the gjs/gnome recommended rules; barebones `.eslintignore`.
6. GitHub Actions workflow: build + lint + compile schemas on push.
7. `README.md` stub (one paragraph + build instructions).

## Definition of done

Fresh `meson setup build && ninja -C build` succeeds end to end, lints clean,
CI runs green on an empty extension.

## Human test

- Run `ninja -C build` in a terminal; it finishes with no errors and produces
  the extension zip in `build/extension/`.
- Run `eslint extension/src/extension.js`; it prints nothing (clean).
- Open `build/extension/systats.zip` (or equivalent) and confirm it exists and
  is non-empty.

### Report

- **Date:** 2026-10-25
- **Status:** done
- **What was done:**
  - Meson project at root + `extension/` subproject: builds the gschema dry-run test and a custom target producing `builddir/extension/systats.zip` (EGO layout: `metadata.json`, `src/extension.js`, `schemas/...`).
  - Minimal ESM entry `extension/src/extension.js` (clean `init`/`enable`/`disable`), `metadata.json` for GNOME 45-49 with uuid `systats@SlyHammad18.github.com`.
  - Empty-but-strict gschema `com.github.SlyHammad18.systats` wired into `meson test`.
  - ESLint flat config (`eslint.config.mjs`) encoding the GNOME review hard rules + legacy-API bans; npm `lint` script; CI workflow `.github/workflows/ci.yml` (pipx meson/ninja, node 24, lint, build, test, zip validation); `.gitignore`; README stub.
- **Deviations from plan:**
  - `eslint-plugin-gjs` 1.0.4 is incompatible with ESLint 9+ (`eslint/lib/ast-utils` no longer exported). Dropped the plugin and reproduced its mechanically-checkable gjs bans via core rules (`no-restricted-imports`/`no-restricted-globals` for `imports`, `Lang`, `Mainloop`) + review rules. Noted for later tasks: reevaluate if the plugin updates.
  - The environment had npm configured with `omit=dev`, which silently skipped devDependencies; worked around with `npm install --include=dev` (documented here so CI/local runs repeat it if the env var persists).
- **Self-test results:**
  - `meson setup builddir` -> pass
  - `meson compile -C builddir` -> pass (zip generated)
  - `meson test -C builddir` -> pass (1/1 gschema-compiles)
  - `npx eslint .` -> clean, no output
  - `gjs -m extension/src/extension.js` -> imports clean (no-op entry)
  - `unzip -l builddir/extension/systats.zip` -> exactly metadata.json, schemas xml, src/extension.js (meson.build excluded from the zip)
- **Manual steps left for user:**
  - Push to GitHub (or run CI) to see the workflow go green: the Actions run itself cannot be verified from this environment. Local equivalents of every CI step already pass.
  - `unzip builddir/extension/systats.zip` locally to eyeball the contents (contents verified programmatically above).
- **Known issues / follow-ups:**
  - `build_always_stale: true` on the zip target means every ninja run re-zips (cheap; avoids staleness bugs until we add declared inputs).
  - GitHub Actions uses pipx for meson/ninja; if the runner image changes, revisit.

