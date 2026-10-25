# Task 03 — Metrics engine: core sources

**Status:** done
**Depends on:** 01

## Objective

Implement the `MetricsCoordinator` plus the non-GPU sources (CPU per-core and
total, RAM/swap, temperatures via hwmon, disk space + read/write deltas from
`/proc/diskstats`, network speeds from `/proc/net/dev`) and the shared
`MetricsFrame`/ring-buffer model, per DESIGN.md §4.1 and §7.2.

## Steps

1. `sources/coordinator.js`: single tick, subscriptions, prev-frame delta math.
2. Sources: `gtop.js` (cpu per-core, mem/swap/loadavg), `hwmon.js`
   (temps + fan, name from `*_label`), `diskstats.js` (r/w bytes/sec deltas),
   `netdev.js` (rx/tx bytes/sec, interface picking), `procfs.js` (freq).
3. `util/history.js`: preallocated `Float32Array` ring buffer + unit tests.
4. `util/format.js`: byte/percent/temp formatter + unit settings stubs.
5. Unit tests for: delta math across rolling ticks, ring buffer wrap,
   formatter outputs, hwmon label parsing (fixtures under
   `test/fixtures/sysfs/`).
6. Every source degrades to `null` on unreadable data (never throws, never
   fabricates zero), per DESIGN.md N10.

## Definition of done

`ninja -C build test` runs the GJS test suite green; coordinator emits a
populated `MetricsFrame` every tick in a standalone runner.

## Human test

- Run `gjs -m scripts/frame-dump.js` (small helper added in this task) for ~5
  seconds in a terminal.
- You see a readable one-line JSON-ish frame per second showing plausible
  values: CPU % cores change when you run something, RAM matches
  `free -h`, disk read/written spikes when you copy a file, net RX/TX moves
  when you ping.

### Report

- **Date:** 2026-10-25
- **Status:** done
- **What was done:**
  - `sources/coordinator.js`: single `MetricsCoordinator` tick per surface, `Promise.allSettled` over sources, listener fanout, in-flight guard; composes the §7.2 MetricsFrame shape (cpu, mem, swap, thermals, fans, gpus [], disks, net, sys, battery null).
  - Sources: `gtop.js` (per-core + total CPU with reused structs, memory, swap, loadavg), `hwmon.js` (temps + fans with board labels, once-per-session discovery), `diskstats.js` (r/w deltas 512B sectors, monitored-device filter, mounts -> fsusage space + base-device join), `netdev.js` (rx/tx deltas, default-route iface via /proc/net/route), `procfs.js` (per-core freq, uptime).
  - `util/history.js` (Float32Array ring buffer, view reuse), `util/format.js` (binary/decimal sizes, B/s vs b/s, percent, temp, null-safe), `util/async_file.js` (Gio async reads returning null on error).
  - Unit tests: `extension/test/` (ring wrap + wrap order, formatter outputs, cpu rate math + clamps, diskstats/netdev/mount/device-name parsers, hwmon descriptor labels, async null-on-missing, coordinator shape check) + fixtures under `extension/test/fixtures/`; wired as meson test `nimbus-units` running `gjs -m` with `NIMBUS_TEST_ROOT`.
  - `scripts/frame-dump.js`: live MetricsFrame printer for manual verification.
- **Deviations from plan:**
  - Fixture strings live in `extension/test/fixtures/proc/*` and `.../sysfs/*` and are asserted via new flat-config eslint rules. Inline fixture constants (hwmon file lists) complement the file fixtures where real sysfs dir listing would be brittle.
  - hwmon discovery uses `GLib.Dir` instead of Gio enumerators: `Gio.FileEnumerator.next_files()` is uncallable from GJS in this environment (method not bound through this path); discovery runs once per session, per-tick sensor reads remain async.
  - libgtop `xcpu_*` arrays are over-allocated (224 entries on an 8-core machine); we trim to real `sysinfo.ncpu`. First per-core tick returns null (prev counters not yet established) rather than boot-cumulative garbage.
  - `formatRate`: byte speeds keep `iB` units (`2 KiB/s`); bit speeds force decimal units (`16 Gb/s`).
  - eslint needed `camelcase` exemption for GObject constructor properties and empty catch bindings; `n.m` at task 02.
- **Self-test results:**
  - `meson test -C build` -> pass: 2/2 suites (gschema 1/1, nimbus-units 21/21)
  - `npx eslint .` -> clean
  - Live `gjs -m scripts/frame-dump.js` (5s): plausible values confirmed; cpu total 2.5-3%, 8 live cores + 8 per-core freq, mem 11%, swap null (no swap on this machine, graceful), thermals 7 chips with proper labels, disk 68% with r/w rates on sda, net moving values on wlp61s0, loadavg + uptime correct.
- **Manual steps left for user:**
  - Run `yes > /dev/null`, Ctrl-C it, then `gjs -m scripts/frame-dump.js` and watch CPU total jump and drop after Ctrl-C.
  - `cat /proc/meminfo` vs the `mem` field to sanity-check RAM; `ping -i 0.2 <gateway>` to spike net.
- **Known issues / follow-ups:**
  - Battery (M19) and top-process (M22) are null: moved to task 04/07 (battery via UPower) per task split.
  - Disk device fusion is by normalized device name; btrfs multiple devices will show as separate rows (task 13 fault tests will cover).
  - Frame-dump output spam (full per-frame JSON) makes headless harness output verbose; trim in task 05 when charts consume HistoryBuffer directly.

