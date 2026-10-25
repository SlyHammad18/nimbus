// Standalone runner: prints one MetricsFrame per tick so task 03 can be
// verified from a terminal (and later reused for manual checks).
// Run: gjs -m scripts/frame-dump.js   (Ctrl-C to stop)

import GLib from 'gi://GLib';

import {MetricsCoordinator} from '../extension/src/sources/coordinator.js';

const intervalMs = Number(GLib.getenv('NIMBUS_INTERVAL_MS') ?? 1000);
const coordinator = new MetricsCoordinator({intervalMs});

coordinator.addListener(frame => {
    console.log(JSON.stringify(frame, (key, value) =>
        value instanceof Map ? Object.fromEntries(value) : value));
});
console.log(`metrics engine running at ${intervalMs}ms; Ctrl-C to stop`);
coordinator.start();

// Keep the process alive.
const loop = new GLib.MainLoop(null, false);
loop.run();
