# SyStats (project repo: nimbus)

Customizable system statistics for the GNOME panel: CPU (per-core), GPU and
VRAM, memory, storage space and I/O, network speeds, temperatures, and a
clock, all in the top bar, with an animated popup dashboard and an optional
always-on-top overlay. Full design doc: [DESIGN.md](./DESIGN.md).

## Status

Early scaffold (design complete, tasks being built one at a time — see
`tasks/`).

## Build

```sh
meson setup builddir
meson compile -C builddir     # also produces builddir/extension/systats.zip
meson test -C builddir
```

## Lint

```sh
npm install
npm run lint
```

Requires: meson, ninja, glib-compile-schemas, gjs (GNOME 45+), node 20+.
