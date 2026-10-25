# Nimbus — System Statistics for GNOME Shell

**Version:** 0.1 (Design Document)
**Status:** Draft
**Target platform:** GNOME Shell 45+ (ESM extensions, GJS)

---

## 1. Problem Statement

Linux desktop users lack a unified, glanceable, and beautiful way to observe their machine's real-time health. GNOME's default panel shows only time and status icons. Existing solutions (e.g. legacy `system-monitor` extensions) are fragmented: CPU/RAM monitoring lives in one extension, disk I/O in another, network speeds in a third, and GPU/VRAM/temp sensors are often missing entirely. Getting a full picture means installing, configuring, and visually reconciling several incompatible panel widgets, each with its own polling loop, styling, and settings schema.

Furthermore:

- **Peripheral-core usage** (per-thread CPU load) is rarely surfaced; most tools stop at "total CPU %".
- **GPU monitoring on GNU+Linux** is inconsistent — NVIDIA requires NVML/nvidia-smi parsing, AMD/Intel rely on differing sysfs/hwmon layouts — so almost no panel tool does it well.
- **Always-on-top workload overlays** (the kind power users love while gaming/compiling/rendering) usually require a separate app running as an X11 overlay, which breaks under Wayland.

**Nimbus** solves this with a single GNOME Shell extension that:

1. Renders a compact, fully customizable stats strip in the GNOME panel (clock %, temps, memory, network up/down, etc. — matching the reference aesthetic).
2. Expands into a rich animated dashboard popup on hover/click — per-core graphs, GPU stats, storage I/O, network history.
3. Offers an optional **borderless "always on top" overlay window** (separate GTK4/libadwaita companion app, developed in the same repo) so stats stay visible over fullscreen apps/games.
4. Exposes every visual and metric choice through a deep, schema-backed settings system — custom text templates, visible/hidden modules, colors, units, refresh rates, thresholds.

**Success is:** one install, one settings page, and any user can get their exact ideal legend line — from ` venerable ` minimalism to my dense ` measurable ` style shown in the mock.

---

## 2. Goals and Non-Goals

### 2.1 Goals

| # | Goal |
|---|------|
| G1 | Native GNOME panel indicators with compact monochrome-by-default styling (no `system-monitor`-clone chrome). |
| G2 | Popup dashboard with animated SVG charts — all per-resource data, per-CPU-core sparklines, GPU, RAM/VRAM, storage read/write, network RX/TX history. |
| G3 | A standalone **overlay companion app** (GTK4 + libadwaita, optional install) that stays composited above fullscreen Wayland/X11 windows. |
| G4 | Full data parity between panel, popup, and overlay — a single shared metrics engine drives all three surfaces. |
| G5 | "Everything customizable" — from refresh interval to text templates (`[icon] CPU 5%`) to per-metric thresholds and colors. |
| G6 | Ship to extensions.gnome.org (EGO) with passing but strict `extensionTool`/ESLint review. |
| G7 | Zero-hallucination data: what cannot be read on this kernel/driver shows gracefully as "n/a" with a diagnostic hint in settings. |

### 2.2 Non-Goals (v1)

- No remote/frontend network metrics (SNMP, SSH, multi-host dashboards) — out of scope until v2.
- No scripting/automation, no alert triggers, no "kill process" UI — display-only in v1.
- No macOS/Windows priority ports.
- No global process manager table — symlink to `gnome-system-monitor` for drill-down.
- Notheming for KDE/other DEs (we'll remain GNOME Shell native first).

---

## 3. Users and Use Cases

### 3.1 Primary Personas

- **Power User (Hammad):** keeps the legend visible constantly, wants max density: 5% CPU, temps, vK, 52°C, network speeds all at a glance; wants hotkeys to flip between modes.
- **The Casual Checker:** far less frequent — wants RAM + battery from time to time; values defaults, zero config.
- **The Gamer / Renderer:** fullscreen load; wants the overlay to monitor CPU/GPU usage frame-accurately without leaving the window.
- **Sysadmin / Developer:** per-core load, I/O throughput, and network interface throughput for quick bottleneck diagnosis at a glance.

### 3.2 Canonical Use Cases

1. **UC1 — Glance:** "What are CPU, RAM, disk, net, temps doing right now?" → panel strip (0 config).
2. **UC2 — Deep look:** "Why is my machine hot?" → hover popup → per-core CPU chart + fan/temp row; click module → full-history modal chart.
3. **UC3 — Persistent monitor:** "While gaming, keep GPU+CPU+temps floating top-right" → overlay window toggle from popup or settings.
4. **UC4 — Theme it:** "Monochrome like the dark 'Adwaita' bar in my mock" → Settings > Appearance > style presets (Monochrome, Vibrant, Rainbow, Terminal).
5. **UC5 - Diagnose a missing metric:** "GPU shows –" → Settings > Sources > GPU > shows `nvml` detection log + suggested fix (`sudo apt install nvtop`/`nvidia-smi` missing, no `hwmon` path found, …).

---

## 4. Requirements

### 4.1 Functional Requirements — Metrics

| ID | Metric | Source | Notes |
|----|--------|--------|-------|
| M1 | CPU total % | `GTop.glibtop_cpu` | delta-based, auto-adjusted per core count. |
| M2 | **Per-core CPU %** | `GTop.glibtop_cpu` (`xcpu_total`) | N sparklines. |
| M3 | CPU frequency | `/proc/cpuinfo` or `cpufreq` sysfs | avg + min/max shown on hover. |
| M4 | CPU temp °C | `/sys/class/hwmon` (or `Sensors`) | per-package; name shown in hover. |
| M5 | CPU load average | `GTop` (`loadavg`) | optional module. |
| M6 | RAM used % / used / avail | `GTop.glibtop_mem` | bar + numeric modules. |
| M7 | Swap | `GTop.glibtop_swap` | optional module. |
| M8 | **GPU usage %** | NVML (nvidia) or `igpu/drm` sysfs, fallback `nvidia-smi -q` polling | per-GPU supported. |
| M9 | **VRAM used/total** | NVML / AMD `mem_info_vram_used` sysfs | renamed "VRAM" vs "RAM" distinctness. |
| M10 | GPU temp | NVML / `hwmon` | per-GPU. |
| M11 | GPU fan | NVML / `hwmon` | optional. |
| M12 | **Storage: % used, used/free/total** | `GTop.glibtop_fsusage` (per mountpoint) | tooltip shows mounts. |
| M13 | **Storage r/w speed** | `/proc/diskstats` deltas | aggregated or per-disk, selectable. |
| M14 | **Network up/down speed** | `/proc/net/dev` or `GTop` | auto-select active interface (default route). |
| M15 | Network total sent/recvd this session | aggregation from M14 | shows in hover detail. |
| M16 | Internet connectivity / hotspot ping | ICMP-like ping via `Gio` network monitor | "hotspot" module showing gateway latency (e.g., 5K → 2K ms jitter) and IPv4/IPv6. |
| M17 | Clock — format configurable | `GLib.DateTime` | e.g., `%H:%M`, `%a %d %b %H:%M`, seconds opt. |
| M18 | **Clock speed (CPU/GPU)** | M3 + M8 provider | shown in dedicated "clock" module when enabled. |
| M19 | Battery (if laptop) | UPower via Gio | optional module: % + drain/charge rate. |
| M20 | Fan speed (RPM) | `lm-sensors` (`Sensors`), `hwmon` | optional module. |
| M21 | Uptime | `GLib` `/proc/uptime` | hover detail only. |
| M22 | Process count, top process | `/proc` scan | hover / popup only; top process per resource. |

### 4.2 Functional Requirements — UI

| ID | Requirement |
|----|-------------|
| U1 | **Panel strip:** horizontally sequential modules; each module = {icon/symbol, value, optional-unit, optional-sparkline}. Clickable and hoverable. |
| U2 | **Hover expand:** after `hover_delay_ms` (default 350ms), module-specific mini dashboard slides down under the hovered module. |
| U3 | **Popup dashboard:** full dashboard accessible via click on any module or dedicated toggle; sections rendered vertically: CPU (total + per-core grid), GPU, Memory (RAM/VRAM/Swap), Storage (mount + I/O speed sparklines), Network (RX/TX graph + ping), Thermals (temps), Battery, Footer. |
| U4 | **Animations:** (a) sparkline EMA-smoothed re-render 60fps-ish via St drawing; (b) popup open = scale+fade from module anchor; (c) bars fill with cubic easing; (d) **pulse on threshold breach** (red pulse at `sensor > warn_pct`). |
| U5 | **Always-on-top overlay:** external LDB+ (GTK4) borderless click-through-optional window (separate repo-binary, launches via `Gio.Subprocess` with flag passed, or `GLib.spawn`), honors user-set opacity/pos/size; extension toggles it from panel/popup/settings; KDE-style window sharpness maintained through Wayland layer-shell (yrıca `gtk4-layer-shell`). |
| U6 | Drag-to-reorder modules via settings UI (drag list) and drag within the panel (shell St reorder). |
| U7 | Module visibility toggles per-surface (panel / popup / overlay independently). |
| U8 | Tooltips on hover-pause showing raw values + last update time + source probe (`/proc`, NVML…). |
| U9 | **Fallback UI:** when a source isn't available ("n/a"), module shows greyed and tooltip explains why and offers commands (copy to clipboard). |
| U10 | Keyboard: `Super+0` (bindable) toggles dashboard; arrow keys navigate modules; Esc closes; overlay toggle inside popup via button. |
| U11 | Click-through mode for overlay (W3) — right-click panel toggle, mouse no longer interacts with overlay. |
| U12 | Context menu (right-click) on panel strip: copy current line, open settings, open `gnome-system-monitor`, toggle overlay, reload extension (dev). |
| U13 | **Clock module** behaves like a GNOME clock module with supersam digital readout; optional calendar face (analog SVG). |
| U14 | New-user onboarding: first-run lightweight tour (one-time, dismissible, 4 slides) showing modules, hover behavior, settings, overlay toggle. |
| U15 | Integrity: module loader is declarative — modules are JSON spec + JS render fn; docs (`docs/modules.md`) auto-checkable against spec. |

### 4.3 Functional Requirements — Customization / Settings

| ID | Requirement |
|----|-------------|
| S1 | Schema-backed `gsettings` (`com.github.<user>.nimbus`). Settings UI = libadwaita `PreferencesDialog` (after 45, or `Adw.PreferencesWindow`). |
| S2 | **Text formatter:** per-module template with tokens, e.g. `"{icon}{cpu:2}"` or `"🔊 {vram_used:1} / {vram_total:1} ({vram_used_pct})"`. Live preview in settings. |
| S3 | Global refresh interval slider (default 1000ms; popup-local hover refresh down to 500ms). Per-module override supported. |
| S4 | Per-metric thresholds: e.g. CPU warn 60/crit 85 → 3-state color states (`.normal` / `.warn` / `.crit`) with user-settable colors, and optional text/alpha changes instead of pure color (monochrome-safe). |
| S5 | Unit system: KiB/MiB/GiB vs KB/MB/GB vs auto; speeds in `B/s` vs `b/s`; temperature °C / °F. |
| S6 | Style presets (SVG sticker catalog) + custom icon packs (`~/.local/share/nimbus/icons/`). |
| S7 | Colors: per-metric line colors for sparklines; background style (none/soft/pill) for panel modules; popup background opacity + blur (where allowed). |
| S8 | Layout: number of digits, padding, separators between modules (`│`, `·`, custom unicode, or none); better spacing for RTL locales. |
| S9 | Positioning: panel slot (left/center/right, sub-index); overlay window position/size/opacity/click-through; popup width. |
| S10 | Import/export full settings as JSON file; shareable "style packs" (modules + colors only). |
| S11 | Per-interface mapping for network speed (e.g. always `enp2s0`, or auto). |
| S12 | Storage per-mount list with toggles — include only user's real mounts, label aliasing. |
| S13 | Network auto-detect hotspot w/ SSID (via NetworkManager DBus) — "hotspot" module renamed to SSID; ping/latency if gateway reachable. |
| S14 | Reset per-module defaults; "factory reset" whole extension. |
| S15 | Hidden-but-available metrics: sensor indexing for common cases (e.g. `temp1..tempN` mapping picker, since sysfs indices vary by motherboard). |

### 4.4 Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| N1 | Panel idle CPU: **≤ 0.5%** for all sensors (idle desktop 1s default). Popup open: ≤ 2%. |
| N2 | Memory: extension snapshot ≤ 25 MiB steady-state. Overlay app ≤ 80 MiB. |
| N3 | No GC spikes: preallocated buffers, `GTop` reuse structs, no per-tick array allocs on hot path (well under Part 4.7 notes). |
| N4 | Detects monitor layout changes; no leaks after Monitor freeze/ext enable-toggle ×100. |
| N5 | Icon-style: monochrome by default, respecting GNOME wish for no color-in-icon misuse; works on dark and light panel. |
| N6 | i18n-ready: all strings via `Gettext`, POT templated; templates tokens locale-safe. |
| N7 | Works under Wayland (required) and X11 (best-effort, overlay uses different positioned-window mode). |
| N8 | No polling blocking Main loop: all file reads via async `Gio.File.load_contents_async` or dedicated worker `GLib.SimpleAsyncResult`; NVML calls proxied via small C `nimbus-nvml` helper only if NVML outside GIO usable, else JSON `nvidia-smi` reader. |
| N9 | Full review-cleanliness: no eval, no documentObject shell-out in extension code, strict ESM, commented entry per gjs.guide. |
| N10 | Data-source failures degrade independently (fault-test: CPU fails but network still legal). |

---

## 5. Technical Research & Trade-offs

### 5.1 Why a GNOME Shell extension (GJS) rather than a panel always-on-top GTK app?

- GNOME panel is Shell-owned; only Shell extensions can insert indicators there. Competing solutions (Tint2, Waybar) replace the panel — not feasible on vanilla GNOME and rejected.
- Since **GNOME 45**, extensions are ESM modules (`import`/`export`) — modern JS, native `GObject`/`St` widgets, no `Lang.bind` legacy.

### 5.2 Data-source stack

| Need | Primary | Fallback | Why |
|------|---------|----------|-----|
| CPU/RAM/Swap/Load/Disk fs | `GTop` (`gtop` GI library) | `/proc` scanner | GTop is the canonical GI binding, fast C reads. |
| Read/write rates | `/proc/diskstats` deltas | `GTop fsusage` (has "total" not deltas) | `/proc/diskstats` is delta-ready. |
| Network | `/proc/net/dev` + `NetworkManager` client | `GTop netload` | easiest per-Iface and auto-select default route via NM `ActiveConnection`. |
| Temps/Fans | `/sys/class/hwmon` scanner | `GTop`'s `Sensors` if GI present | hwmon is universal; name labels from `*_label`. |
| NVIDIA GPU | **NVML via a 60-line C helper daemon** (`nimbus-nvml`) writing a small mmap'd/IPC JSON at `XDG_RUNTIME_HOME` | `nvidia-smi --query-gpu=... --format=csv,noheader` (subprocess 1s) | NVML via GJS directly is unreliable (C lib not GI); C helper is cleanest and cheapest; falls back to subprocess when not compiled. |
| AMD/Intel GPU | sysfs `drm` driver-specific nodes (`gpu_busy_percent`, `mem_info_vram_*` for AMD; `i915` engine stats, `fdinfo` for Intel) | none (show n/a) | documented strategy — see §7. |
| NM hotspot/SSID | `org.freedesktop.NetworkManager` DBus (`GnomeNMClient`/GJS `<Teams>` `NM.Gnome` available) | gateway ping | robust SSID + strength network icons. |
| Battery | `org.freedesktop.UPower` DBus | `/sys/class/power_supply` | rich metadata (W rate). |
| Procs | `/proc/<pid>/stat` scanner | `GTop proclist` | direct read simpler. |

Worst-case design principle: every source class implements the same tiny interface `Source.read(): SnapshotChunk` so the coordinator fills a `MetricsFrame` regardless of which backend supplied.

### 5.3 Always-on-top overlay — the Wayland problem

Wayland forbids clients from self-positioning or reliably staying above fullscreen windows. Options:

| Option | Verdict |
|--------|---------|
| GTK app + `gtk4-layer-shell` | **Chosen.** Layer-shell is the Wayland-legal equivalent of "always on top" and works on Mutter. Overlay top layer, anchor top-right, drawer across width. |
| GNOME Shell extension drawing its own always-on-top window | Impossible — extensions live *inside* the Shell which *is* the compositor; they can't spawn layer-shell windows of themselves above fullscreen apps (Mutter `OVerlayKey` fullscreen methods block). |
| X11 `_NET_WM_STATE_ABOVE` | Legacy fallback only; keep flag `--backend=x11`. |
| kde-style external compositor override-window | Not applicable under GNOME. |

GTK4 + libadwaita + (optional) `gtk4-layer-shell` lets us ship a sexy rounded, translucent, click-through-capable overlay identical to the reference mock. On X11 we use `gtk4-window-set-keep-above` instead.

**Overlay process model:** a small independent GTK app (`nimbus-overlay`) shares no GJS; it subscribes to metrics via the same coordinator pattern duplicated in a shared pure-JS/C-free core (`packages/core` — see §8), or simply re-reads the same /proc/sysfs/NVML-IPC sources. Simpler and more robust than IPC to the extension, and gives us a working overlay even if the extension is disabled.

### 5.4 Rendering choices in the popup

- **`St.DrawingArea`** — GNOME Shell's canvas. Chosen for all graphs/sparklines; repaint via `cairo` API through `Clutter.CairoContext`. Cheapest option available and GPU-blitted by the Shell compositor itself.
- Avoid `St.Label` pixel-anim spam; text updates are cheap enough via plain string swap only when changed (diffing).
- Graph history buffers: ring buffers (typed arrays) per metric, `Math.min(samples, capacity)`; no `Array.splice` in hot path.

---

## 6. UX spec

> This section was reworked after a design-review pass against two frontend
> design skills (`design-taste-frontend`, `frontend-design`). Design read:
> **dense hardware telemetry surface for a Linux power user, dark-first,
> cockpit aesthetic**. Dials used: `DESIGN_VARIANCE 4`, `MOTION_INTENSITY 5`,
> `VISUAL_DENSITY 9`. At this density the rules that matter are: numerals in
> monospace with tabular figures, hairline dividers instead of cards, one
> locked accent, one radius system, motion only where it communicates state,
> and a single signature element.

### 6.1 Token system (shared by panel, popup, overlay, settings)

One source of truth (`data/tokens.css` for the shell, `tokens.rasi`-style const
table for the Rust overlay). Dark is the default theme and the whole surface
stays dark (theme lock); light theme is the same tokens swapped from system
`fg_color`/`bg_color`, never a section-level flip.

| Token | Dark value | Role |
|-------|------------|------|
| `surface` | `#16181d` | popup/overlay background (off-black, never `#000`) |
| `surface-raised` | `#1d2026` | hover previews, tooltips |
| `hairline` | `rgba(230,232,236,0.08)` | all dividers, 1px |
| `text` | `#e6e8ec` | labels (system UI face) |
| `text-muted` | `#9aa1ad` | units, icons, inactive |
| `numeral` | `#f2f4f7` | all numbers, mono face |
| `accent` | `#5ac8ea` (steel cyan) | single locked accent: sparkline strokes, live states, focus rings |
| `state-warn` | `#f0b429` | threshold warn (semantic, not decorative) |
| `state-crit` | `#ef5f5f` | threshold crit |
| `state-ok` | inherits numeral | no green tint at rest; "ok" is the neutral state |

Rules locked by the review pass:

- **One accent.** Steel cyan is used only for "live data" signals (sparkline
  stroke, active graph tab, focus). Threshold colors are semantic state, not a
  second accent, and never glow.
- **Radius lock:** popup and overlay corners 12px, inner widgets 8px, panel
  modules inherit the GNOME panel's own pill. Nothing else rounds.
- **Typography:** system UI face (Adwaita Sans/Cantarell) for labels; every
  numeral is monospace (`Adwaita Mono` / `DejaVu Sans Mono`) with tabular
  figures so values don't jitter on update. Big display numbers are the same
  mono face, scaled, not a second font. No serif anywhere.
- **No card boxes in the popup.** Sections are groups separated by `hairline`
  rules; data sits directly on the surface. Sparingly: at most one hairline
  between groups.
- **No decorative status dots.** The only colored state indicator is the
  signature element below, which carries real thermal state.

### 6.2 Signature element: the Pulse Spine

A 3px vertical strip fused to the popup's left edge, tinted by the **hottest
monitored subsystem** (fluid: temp state at rest, warn at threshold, crit
beyond). It is the one visual flourish in the product, and every other
decision around it is quiet. On `state-crit` it pulses alpha at 1.2s; the same
class is reused for the numeric value tint so hierarchy is driven by one
token, not scattered effects. Under `prefers-reduced-motion` (GTK maps this to
`gtk-enable-animations=false`) the pulse is replaced by a static tint.

### 6.3 Panel strip (redesigned from the mock)

```
   5%     0%     52°C      1K ⬆  2K ⬇
  cpu    gpu     temp      net
```

- **No module backgrounds.** Each module is pure text+glyph sitting directly on
  the panel; modules are separated by a hairline glyph (`│` at 24% opacity,
  10px side padding) chosen once for the whole strip, never mixed.
- Numerals bold mono, units in `text-muted`, icons in `text-muted`. Value gets
  threshold tint; the icon never changes color.
- Line height matched to the GNOME panel itself, so the strip looks native,
  not appended.
- Sample default set: `cpu 5% │ gpu 0% │ temp 52°C │ net 1K↑ 2K↓`. Final strip
  is user-assembled from the module registry.

### 6.4 Popup dashboard (on click or hover-expand)

Structure: big summary header, then grouped sections divided by hairlines.
Widths: 420px compact and 640px wide preset (the old 840px is dropped; 640 is
wide enough for the per-core grid without wasted whitespace).

```
┌──────────────────────────────────────────────┐
│▎  CPU  5%        2.4 GHz   [spark · 60s]     │
│▎  0 ████   1 ██    2 ███   3 █████           │
│  per-core bars in a grid, 4 per row          │
│──────────────────────────────────────────────│
│  GPU  0%   nvidia rtx 4070                   │
│       VRAM  1.2 / 12.0 GiB    TEMP 52°C      │
│       CLOCK 195 MHz           FAN 34%        │
│──────────────────────────────────────────────│
│  RAM  ███████████░░░░  72%                    │
│       9.2 of 12.8 GiB         swap 3%        │
│──────────────────────────────────────────────│
│  DISK  home 61%   read ▇▃▁▅  write ▁▃▁▁      │
│        0.2 MB/s ↓   1.1 MB/s ↑               │
│──────────────────────────────────────────────│
│  NET  wlp3s0  ·  "Home"  ▂▄▅  12 ms          │
│       2.1 Mb/s ↓   120 Kb/s ↑   [dual spark] │
│──────────────────────────────────────────────│
│  BATTERY  88%   draining 8 W                 │
│                                              │
│  settings    overlay    about                │
└──────────────────────────────────────────────┘
```

Layout rules copied from the review pass:

- Section label (CPU/GPU/RAM/…) sits in `text-muted`, small caps, and is the
  only "eyebrow-like" element; there is no second level of labels anywhere.
- Each group shows: **one big numeral** (mono, 22px), secondary numerals at
  13px in `text-muted`, and its sparkline in `accent` at 24px height. Values
  never exceed 3 states of hierarchy.
- Per-core bars: plain ticks on the surface, no per-core card boxes, 4 per
  row, labels only every 4th bar on the wide preset.
- Missing source (`n/a`) renders the label in `text-muted` with no fake zeros;
  the tooltip explains the detection reason (see U9).
- The Sparkline legend is inline (`spark · 60s`) instead of a separate legend
  row; the popup has no version bars, no synthetic footer meta.

Motion budget (all values under `MOTION_INTENSITY 5`):

| Event | Spec | Justification |
|-------|------|---------------|
| popup opens | 160ms `cubic-bezier(0.2, 0, 0, 1)`, scale 0.96 → 1 from module anchor, fade to full | state transition |
| sparkline update | interpolate between samples at popup tick (500ms) | data continuity |
| threshold breach | numeral + spine tint swap, spine pulse only on crit | state, semantic |
| per-core bars | value-driven width change, 200ms | feedback |
| hover on a module in popup | related group's sparkline brightens (accent 0.65 → 1.0) | hierarchy |

Everything else stays still. No infinite ambient animation on idle desktop.
Under reduced motion, entry and pulse are dropped; interpolation becomes a
direct swap.

### 6.5 Overlay window

- Frameless, translucent `Adw.Window` using the same tokens; background is
  `surface` at a user-set opacity over `gtk4-layer-shell` top layer, anchored
  top-right. Corner radius 12px, matching the radius lock.
- Renders the same module strip from 6.3 by default, expandable into the 6.4
  dashboard pinned to the overlay. Drag handle appears only while Alt is held;
  click-through is the default posture.
- The spine is a 2px top edge here, so it reads while panels are stacked.
- Auto-fade to 45% opacity after 5s idle (`fade_ms: 0` disables); any temp
  state above warn re-raises to full opacity.
- Toggle: popup footer button, panel context menu, or `Ctrl+Shift+O` global
  shortcut (registered via `global.display.grab_accelerator`).

### 6.6 Pre-flight check (per the frontend skill)

- Theme lock: whole surface dark by default, no mid-surface flips.
- Color lock: one accent, semantic states separate, no AI-purple, no neon glow.
- Radius lock: 12/8/panel-pill, documented, applied everywhere.
- Zero em-dashes in any visible label or mock.
- Numerals monospace tabular, one mono face only.
- No cards, no per-row fake borders, no decorative dots, no scroll cues, no
  version stamps in the popup footer.
- Motion is motivated (table above) and collapses under reduced motion.

---

## 7. Architecture

### 7.1 Component map

```
┌────────────────────────────────────────────────────────────────┐
│ GNOME Shell extension (GJS, ESM)                               │
│                                                                │
│  PanelIndicator (Main.panel)                                   │
│       │ aggregates ModuleStrip items                           │
│       ▼                                                        │
│  ModuleStrip ─── modules/cpu.ts, gpu.ts, ram.ts, vram.ts …     │
│       │ subscribes to                                          │
│       ▼                                                        │
│  MetricsCoordinator (per-surface tick, 1 s default)             │
│       │                                                        │
│  ├── CpuSource                                                 │
│  ├── MemSource / SwapSource                                    │
│  ├── GpuSource (NVML helper │ nvidia-smi │ drm sysfs)          │
│  ├── StorageSource (fsusage + diskstats deltas)                │
│  ├── NetSource (/proc/net/dev + NM DBus)                       │
│  ├── ThermSource (hwmon scan)                                  │
│  ├── BatterySource (UPower DBus)                               │
│  └── ProcSource (top process, uptime)                          │
│                                                                │
│  PopupDashboard (St.BoxLayout, DrawingArea graphs)             │
│  HoverPreview  (per-module mini dash)                          │
│  SettingsUI    (prefs.js -> Adw.PreferencesWindow)             │
│  OverlayLauncher (Gio.Subprocess -> nimbus-overlay bin)       │
└────────────────────────────────────────────────────────────────┘
                                ▲
                                │ reads same sources natively
┌───────────────────────────────┴────────────────────────────────┐
│ companion: nimbus-overlay (GTK4 + libadwaita + gtk4-layer-    │
│ shell) — Rust binary; native perf, small, no GJS in process    │
│  - its own MetricsCoordinator (shared C headers not required — │
│    reimplement cheap /proc/sysfs parsing natively)             │
│  - module strip (GTK widgets) + dashboards                     │
│  - reads NVML via official nvml Rust crate                     │
└────────────────────────────────────────────────────────────────┘
                                ▲
                                │ JSON at 1 Hz flat-file sink
┌───────────────────────────────┴────────────────────────────────┐
│ helper: nimbus-nvml-daemon (tiny C, optional)                 │
│  - NVML passes to small shared-mem ring → flat JSON line       │
│  - used by both GJS extension & Rust overlay without libnvidia │
│    dependencies in-process                                     │
└────────────────────────────────────────────────────────────────┘
```

> Design note: duplicating the metric coordinator (once in GJS, once in Rust) is deliberate — it keeps the overlay functional when the Shell extension is off, avoids IPC serialization in the hot path, and each surface uses the tooling/binding that suits it. The two stay visually synced because styling tokens live in one JSON schema replicated into both), drift is caught by a CI style-diff test.

### 7.2 Metrics frame (single shared shape)

```ts
interface MetricsFrame {
  t: monotonicMs;
  cpu: { total: number; cores: number[]; freqMhz: {min,cur,max}; temp: number|null };
  mem: { usedPct: number; used: bigint; total: bigint; swapPct: number|null };
  gpus: Array<{ idx: number; name: string; busy: number|null;
                vramUsed: bigint; vramTotal: bigint; temp: number|null;
                fanRpm: number|null }>;
  disks: Array<{ dev: string; mount: string; usedPct: number;
                 used: bigint; free: bigint; total: bigint;
                 readBps: number; writeBps: number }>;
  net: { iface: string; rxBps: number; txBps: number;
         pingMs: number|null; ssid: string|null; strength: number|null };
  battery: { pct: number|null; state: string; rateW: number|null };
  sys: { uptimeS: number; load1: number; load5: number; load15: number;
         topProc: { name: string; cpuPct: number; memPct: number } };
}
```

Every history ring is `Float32Array(capacity)` with head index; capacity default 300 (5 min @ 1 s).

### 7.3 Module registry (extensibility)

A module = `spec + render`:

```ts
export const cpuModule: ModuleSpec = {
  id: 'cpu',
  defaultTemplate: '{icon} {total}%',
  tokens: {
    icon:   m => glyphs.cpu(m),
    total:  (m, d) => m.cpu.total.toFixed(d),
    cores:  m => m.cpu.cores.map(c => c.toFixed(0)).join('·'),
  },
  sparkline: frame => frame.cpu.total,
  render: (container, frame, settings) => { /* St widgets */ },
};
```

Extensions hook the registry — users and future contributors can add a `~/.config/nimbus/modules/*.js` (loaded only with an explicit opt-in setting, off by default for security review compliance).

### 7.4 Data flow & tick model

- One `GLib.timeout_add_seconds` per **surface** (panel / popup-open / overlay), not per module. Modules are pure subscribers.
- Offline deltas computed by storing previous `SnapshotChunk` on the source object (first tick yields 0 rates).
- Hover-expansion activates popup-local 500ms fast tick; collapse returns to 1s idle tick.
- Pause-tick suspension: when screen locked or user idle > session setting (default: keep running — monitoring is cheap).

---

## 8. Project Structure

```
Nimbus/
├── DESIGN.md                      # this document
├── README.md                      # install + screenshots
├── LICENSE                        # GPL-3.0 (GNOME ecosystem norm for extensions)
├── meson.build                    # top-level build orchestrator
│
├── extension/                     # GNOME Shell extension (GJS, ESM)
│   ├── meson.build
│   ├── metadata.json.in
│   ├── org.gnome.Shell.Extensions.Nimbus.xml.in  # gettext domain
│   ├── src/
│   │   ├── extension.js           # ESM entry (init/fill/enable/disable)
│   │   ├── prefs.js               # Adw settings window
│   │   ├── indicator.js           # namespace + panel strip container
│   │   ├── popup.js               # dashboard widget
│   │   ├── hoverPreview.js
│   │   ├── overlayLauncher.js     # subprocess control of companion app
│   │   ├── modules/
│   │   │   ├── registry.js
│   │   │   ├── cpu.js  gpu.js  ram.js  vram.js  swap.js
│   │   │   ├── storage.js  net.js  temp.js  fan.js
│   │   │   ├── battery.js  clock.js  ping.js  uptime.js  procs.js
│   │   ├── sources/
│   │   │   ├── coordinator.js     # tick + fanout, per-surface
│   │   │   ├── gtop.js  hwmon.js  diskstats.js  netdev.js
│   │   │   ├── nmClient.js  upower.js  procfs.js
│   │   │   ├── gpu/
│   │   │   │   ├── index.js       # autodetect: nvml → nvidia-smi → drm
│   │   │   │   ├── nvml.js        # helper IPC reader
│   │   │   │   ├── smi.js         # subprocess parser
│   │   │   │   └── drm.js         # AMD gpu_busy / Intel fdinfo
│   │   ├── ui/
│   │   │   ├── widgets.js         # module pill, sparkline St.DrawingArea
│   │   │   ├── charts.js          # cairo spark/bar/ring helpers
│   │   │   ├── style.js           # token→css class mapping
│   │   └── util/
│   │       ├── format.js          # units, template tokens
│   │       ├── history.js         # ring buffer
│   │       └── async.js           # safe async file reads
│   ├── schemas/
│   │   └── com.github.<user>.nimbus.gschema.xml
│   └── data/
│       └── stylesheet.css         # extension scoped css
│
├── overlay/                       # companion always-on-top app (Rust + GTK4)
│   ├── meson.build                # (also cargo workspace at overlay/Cargo.toml)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── main.rs                # window, layer-shell init, CLI flags
│   │   ├── coordinator.rs         # mirrors extension coordinator
│   │   ├── sources/{cpu.rs, mem.rs, disk.rs, net.rs, hwmon.rs, gpu_nvml.rs, …}
│   │   ├── ui/{app.rs, module_strip.rs, charts.rs, theme.rs}
│   │   └── config.rs               # reads gsettings via `gsettings get` OR cli flags
│   └── res/nimbus-overlay.desktop / metainfo.xml
│
├── helper/                        # optional C NVML ring-writer (60–120 LoC)
│   ├── meson.build
│   └── nimbus-nvml.c
│
├── packaging/
│   ├── PKGBUILD                   # Arch packaging
│   ├── debian/                    # deb packaging
│   └── flatpak/ (only for overlay, extension cannot be flatpak'd)
│
├── docs/
│   ├── modules.md                 # module spec + token reference
│   ├── sources.md                 # how each metric is detected, troubleshooting
│   ├── extending.md               # writing custom modules
│   └── screenshots/
│
└── .github/workflows/
    ├── ci.yml                     # lint (eslint + clippy), build (meson), test
    └── package.yml                # builds zip for EGO on tag
```

### 8.1 Key files, first implementation order

1. `extension/src/extension.js` — indicator shell, enable/disable hygiene.
2. `sources/coordinator.js` + `gtop.js`, `hwmon.js`, `diskstats.js`, `netdev.js` — core metrics.
3. `modules/registry.js` + `cpu.js`, `ram.js`, `net.js`, `temp.js`, `clock.js` — panel strip like mock.
4. `ui/widgets.js` + `charts.js` — sparkline/bar widgets + theming.
5. `popup.js` + `hoverPreview.js` — dashboard + hover expand.
6. `schemas/gschema.xml` + `prefs.js` — full settings surface.
7. `gpu/` — NVML helper → smi fallback → drm sysfs; VRAM/temp/fan.
8. `overlay/` Rust app (last — largest surface; useful only when extension is done).
9. `helper/nimbus-nvml.c` — microdaemon.
10. CI, packaging, `docs/`, EGO submission.

---

## 9. Settings schema (v1 top-level)

```
/:
  refresh-interval-ms      u32   default 1000
  hover-delay-ms           u32   default 350
  panel-position           enum  left|center|right
  panel-index              i32   default 0
  separators               string default " · "
  theme-preset             enum  monochrome|vibrant|rainbow|terminal
  custom-css-path          string""
  units:                   child
    size                   enum  binary|decimal|auto
    speed                  enum  bytes|bits
    temp                   enum  celsius|fahrenheit
  modules:                 a{sv} — per-module { enabled, template, order,
                                   min-width, tooltip, indicator-surface,
                                   popup-surface, overlay-surface, thresholds, colors }
  sources:                 child
    cpu:                   { per-core-enabled, temperature-sensor-path auto }
    gpu:                   { provider auto, index 0 }
    network:               { iface "auto", hotspot-ping true, gateway-ip "" }
    storage:               a{sv} per-mount { label, enabled }
  popup:                   { width 420, animation true, fast-tick 500 }
  overlay:                 { enabled false, corner "top-right", margin-px 8,
                             opacity 0.85, click-through-true,
                             fade-after-s 5, font-size 100 }
  behavior:                { show-tooltips true, first-run-tour true }
```

Settings UI maps this into: **General / Modules / Appearance / Sources / Overlay / About** as libadwaita preference groups, with drag-reorder module list and live preview strip.

---

## 10. Testing & quality

| Layer | Approach |
|-------|----------|
| Unit (GJS) | `mv` tiny `node:test`-based tests (we run with GJS's built-in `gjs -m`). Ring buffer math, delta math, formatter tokens, template parser. `meson test` hooks. |
| Unit (Rust overlay) | `cargo test`, sources mocked behind a `Source` trait. |
| Integration | A `sources/fake.js` replaying recorded `MetricsFrame`s (fixtures captured on real machines) through popup & panel — regression diff of rendering tokens and threshold classes. |
| Perf | CI records `top -b -n5` of a reusable headless-run profile; asserts coordinator ≤ budgets N1–N2. |
| Visual | Screenshot golden tests via `gnome-extensions enable` + `import Screenshot` devtools inside a nested `Mutter --wayland` session (see gjs.guide debugging). |
| Manual matrix | Wayland+X11, NVIDIA-only/AMD-only/no-GPU, laptop (battery) / desktop (no battery), many-core 32+, locale RTL. |
| Review gate | `eslint-config-gjs` (gjs.guide), no eval, ESM only; EGO review checklist pass. |

---

## 11. Risks / open questions

1. **NVML via helper daemon vs subprocess**: helper is best (N9) but needs compiling; users without dev tooling get the slower `nvidia-smi` path automatically. Risk: review of C binary in EGO — mitigated since helper is in package (or AUR) not EGO zip; EGO gets JS-only fallback.
2. **Mutter changes**: panel API (`Main.panel.addToStatusArea`) stable since 3.x; hover-expand popups need care to avoid getting closed by Shell's pick logic (`Main.layoutManager.addTopChrome` + custom focus grab strategy). Known-solvable; tested per GNOME release.
3. **Multi-GPU**: v1 supports N GPUs report; UI shows first with a dropdown in popup. Settings index so power users can pin.
4. **Intel iGPU metrics** — `fdinfo` parsing is fragile across kernel versions; mark experimental, show n/a silently when absent.
5. **Wayland global shortcut policy**: GNOME 45+ requires `GlobalShortcuts` portal for apps; extension uses Shell's own `grab_accelerator` (works for panel toggles) — overlay global shortcut requested via XDG portal on Wayland, direct grab on X11.
6. **gsettings ↔ Rust config sync**: overlay reads gsettings via `gio` Rust bindings (`gio::Settings`) — zero subprocess, native schema consumption.

---

## 12. Milestones

| M | Scope | Exit criteria |
|---|-------|---------------|
| **M1 — Skeleton** | ESM scaffold, indicator with 3 hard-coded modules (clock, cpu%, mem%), coordinator + 4 sources, CI lint/build. | Strip renders like mock; enable/disable clean. |
| **M2 — Full metric set** | All sources; per-core; hwmon temps; diskstats; NM; battery. | MetricsFrame complete; popup dashboard v1 static. |
| **M3 — Dashboard + animations** | Popup, hover preview, ring-history charts, thresholds pulse. | UX spec §6.2 matched; perf budget met. |
| **M4 — Settings + theming** | Full gschema, prefs UI, templates engine, presets, import/export. | All §4.3 IDs testable in UI. |
| **M5 — GPU** | NVML helper, smi fallback, drm/AMD, VRAM module. | All major-vendor boxes show live GPU data. |
| **M6 — Overlay app** | GTK4+layer-shell Rust companion, CLI, opacity, click-through, launcher wiring. | Comparator equivalence vs panel (visual + data). |
| **M7 — Polish + release** | Docs, i18n, packaging, screenshots, EGO submission. | Published on EGO; package in Arch/AUR. |

---

## 13. License & community

- GPL-3.0-or-later for extension + helper; MIT for the Rust overlay so it can be reused in some other project's widgets if desired.
- EGO listing + GitHub Discussions; `docs/extending.md` as custom-module API reference.
- Localization via GNOME Damned Lies convention (pot/ domain `org.gnome.Shell.Extensions.Nimbus`).
