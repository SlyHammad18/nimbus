# Task 09 — GPU sources and VRAM module

**Status:** pending
**Depends on:** 07

## Objective

Implement the GPU backend chain per DESIGN.md §5.2: NVML helper IPC reader →
`nvidia-smi` subprocess fallback → drm sysfs (`gpu_busy_percent` for AMD,
fdinfo for Intel), expose `gpus[]` in the frame, and add the `gpu` and
`vram` modules to the panel + popup with proper provider detection and
`n/a` diagnostics.

## Steps

1. `sources/gpu/autodetect` chain + provider health logging.
2. `sources/gpu/nvml.js`: read JSON lines from the helper socket (task 12;
   if absent at runtime, skip cleanly).
3. `sources/gpu/smi.js`: parse `nvidia-smi --query-gpu=...` (1s default,
   async — never on main loop).
4. `sources/gpu/drm.js`: AMD `gpu_busy_percent`, `mem_info_vram_used/total`;
   Intel fdinfo experimental.
5. Modules `gpu.js` + `vram.js`; popup GPU section with name, VRAM, temp,
   clock, fan.
6. Coin-flip test: force each provider via gsettings override and confirm
   detection path is logged.

## Definition of done

On a machine with NVIDIA: live busy %, VRAM, temp, fan in popup. On AMD:
busy % + VRAM from sysfs. Without GPU: clean n/a with diagnostics in prefs.

## Human test

- (NVIDIA machine) Run a WebGL app (e.g. `glmark2` or a game): panel GPU
  module jumps to high %; VRAM increases; GPU temp rises in popup.
- (AMD machine) `vkcube` shows GPU % moving; VRAM counts up as you open
  heavy apps.
- (No GPU) The `gpu` module shows `n/a` in muted color, and Prefs > Sources
  shows why with nothing red or broken.

## Report

*(fill after execution — template in AGENTS.md §3)*
