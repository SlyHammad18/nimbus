# Task 12 — NVML helper daemon and GPU parity for overlay

**Status:** pending
**Depends on:** 09, 11

## Objective

Implement `helper/systats-nvml.c` (tiny NVML ring/JSON writer at 1 Hz on
`XDG_RUNTIME_DIR`), consumed by the extension GPU source (falling back to
nvidia-smi) and by the Rust overlay (via the official nvml crate natively or
reading the same JSON file as an optional provider). Parity: overlay shows
the same GPU/VRAM/temp/fan values as the popup.

## Steps

1. C helper: connect NVML, enumerate GPUs, write a small JSON line per GPU
   to `$XDG_RUNTIME_DIR/systats/nvml.json` each second; fail fast and exit
   with a readable message when NVML is missing.
2. `sources/gpu/nvml.js`: read the file with fs watch semantics; graceful
   handoff to smi if the helper dies.
3. Overlay `gpu_nvml.rs`: prefer native crate, fall back to the same JSON file.
4. Parity test in the task report comparing extension vs overlay values.

## Definition of done

Helper runs as a user daemon with no root; GPU numbers agree between popup
and overlay within ~1% delta; missing NVML degrades cleanly everywhere.

## Human test

- Run `systemctl --user start systats-nvml` (or the provided launcher script).
  `cat $XDG_RUNTIME_DIR/systats/nvml.json` shows fresh GPU JSON every second.
- Run a game or `glmark2`: the popup and overlay both show matching GPU
  usage/temp/VRAM (differences under ~1s of drift are acceptable).
- Stop the helper: the extension automatically switches to the `nvidia-smi`
  fallback path (prefs > Sources shows the provider flag) and the overlay
  keeps working.

## Report

*(fill after execution — template in AGENTS.md §3)*
