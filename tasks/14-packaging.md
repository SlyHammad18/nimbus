# Task 14 — Packaging, docs, localization, EGO submission

**Status:** pending
**Depends on:** 13

## Objective

Get the project releasable: `PKGBUILD` + debian packaging for the overlay and
helper, EGO zip bundle for the extension, docs set complete (README +
`docs/modules.md`, `docs/sources.md`, `docs/extending.md`, screenshots), POT
templating for i18n, and the extensions.gnome.org upload checklist.

## Steps

1. `packaging/`: PKGBUILD and debian rules; verify locally they build.
2. `docs/modules.md` auto-generated from the registry (token reference).
3. `docs/sources.md`: every metric's source, fallback chain, common reasons
   for n/a (the U9 diagnostics, mirrored in-text).
4. `docs/extending.md`: writing a custom module, security constraints.
5. gettext scaffolding; strings extracted from modules + prefs.
6. Screenshots refreshed from task 13 goldens; README updated with real
   images.
7. EGO checklist: metadata domain, no review-forbidden APIs, screenshot,
   final zip build.

## Definition of done

Packages build from a clean clone; docs are complete; extension zip builds
ready for EGO upload.

## Human test

- `ninja -C build package` (or equivalent) produces: an installable AUR/deb
  package and the EGO-ready extension zip.
- Open `README.md`: build instructions, real screenshots present and
  matching the last UI state.
- Install the built package on a spare machine or VM: extension + overlay
  both work end to end (the final full-flow check: install, enable, hover,
  popup, overlay toggle).

## Report

*(fill after execution — template in AGENTS.md §3)*
