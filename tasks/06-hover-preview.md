# Task 06 — Hover preview (per-module mini dashboard)

**Status:** pending
**Depends on:** 05

## Objective

Implement the hover behavior: after `hover-delay-ms` (default 350), a small
preview popover appears under the hovered module showing module-specific
detail (per-core ticks for cpu, temp list for temp, iface + totals for net),
closing on leave. Per DESIGN.md U2/U8.

## Steps

1. `hoverPreview.js`: singleton popover tied to the strip; enter/exit state
   machine with delay + grace period (no flicker while moving between
   modules in the same strip).
2. Per-module preview config in the module spec (`preview(frame, history)`).
3. Tooltip variant: raw values + last-update age + source probe string (§4.2
   U8), using `surface-raised`.
4. Focus/close behavior safe with the Shell (no stolen grabs; closes on
   popup open elsewhere).

## Definition of done

Hover on each module shows correct live detail; moving between modules does
not flicker; nothing lingers after the pointer leaves.

## Human test

- Hover `cpu ›` wait half a second: a small popover shows per-core bars with
  values that track `/proc/stat` live.
- Move the mouse from `cpu` to `temp` along the strip: the preview swaps
  content without flicker or left-behind popovers.
- Leave the strip entirely: the preview disappears within ~200ms.
- Hover with the popup open (later task popup): ensure only one surface is
  open at a time.

## Report

*(fill after execution — template in AGENTS.md §3)*
