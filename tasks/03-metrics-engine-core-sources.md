# Task 03 — Metrics engine: core sources

**Status:** pending
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

## Report

*(fill after execution — template in AGENTS.md §3)*
