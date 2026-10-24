// SyStats / nimbus — GNOME Shell extension entry point.
//
// GNOME 45+ ESM extension skeleton. Task 01 ships this as a clean no-op so
// scaffold/CI is green; subsequent tasks (see tasks/) fill in the panel
// indicator, metrics coordinator, and dashboard.
//
// The empty enable/disable is deliberate: it proves the lifecycle plumbing
// toggle-hygiene safe before any real work is added.

export class SyStatsExtension {
    enable() {}

    disable() {}
}

export function init() {
    return new SyStatsExtension();
}
