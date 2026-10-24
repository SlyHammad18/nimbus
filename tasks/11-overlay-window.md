# Task 11 — Overlay companion app (always on top)

**Status:** pending
**Depends on:** 07

## Objective

Ship the Rust GTK4 + libadwaita + `gtk4-layer-shell` companion app from
DESIGN.md §6.5 and §8 (`overlay/`): always-on-top strip identical to the
panel module language, corner anchor, user opacity, click-through default,
Alt-drag, auto fade (0 = off), auto re-raise on warn/crit. Wire the
extension's `OverlayLauncher` to start/stop it.

## Steps

1. Cargo workspace in `overlay/`; window on the Wayland top layer; X11
   fallback `keep-above` path behind a CLI flag.
2. Rust coordinator: native `/proc`, `/sys/class/hwmon`, `/proc/diskstats`,
   `/proc/net/dev` parsing mirroring §4.1 (no GPU yet, comes in task 12).
3. Strip UI: same token const table as the extension; numerals mono; spine
   as 2px top edge.
4. Click-through mode, Alt-drag with handle, fade after N seconds idle,
   re-raise on crit.
5. Global shortcut `ctrl+shift+o` via portal (Wayland) / direct grab (X11).
6. Extension `OverlayLauncher`: subprocess control, single instance,
   tidy stop.

## Definition of done

Overlay floats above a fullscreen window and a maximized app on both
Wayland and X11, showing live stats, fully dismissible from the popup.

## Human test

- Open the popup and click `overlay`: a small translucent stats strip
  appears top-right, above a maximized window and above a fullscreen app
  (video player, browser F11, or game).
- Click the desktop behind the overlay: your click passes through; the
  overlay does not eat mouse events.
- Hold Alt and drag it to another corner: it moves; corner anchoring
  respects the last placed spot.
- Wait 5 seconds: it fades to low opacity; touch the hotspot it re-raises.
- Toggle it off from the popup or with ctrl+shift+o: it closes completely
  (check no zombie process in `htop`).

## Report

*(fill after execution — template in AGENTS.md §3)*
