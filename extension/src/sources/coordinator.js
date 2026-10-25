// MetricsCoordinator: single per-surface tick composing the shared
// MetricsFrame (DESIGN.md 7.2). Sources register with sample() methods and
// keep their own prev-state. A source failing or returning null leaves its
// frame region null (n/a) without disturbing other sources (N10).

import GLib from 'gi://GLib';

import {CpuSource, MemorySource, SwapSource, LoadAvgSource} from './gtop.js';
import {CpuFrequencySource, UptimeSource} from './procfs.js';
import {HardwareMonitorSource} from './hwmon.js';
import {DiskIoSource, StorageSpaceSource, normalizeDeviceName} from './diskstats.js';
import {NetSpeedSource} from './netdev.js';

export class MetricsCoordinator {
    constructor({intervalMs = 1000} = {}) {
        this.intervalMs = intervalMs;
        this.sources = [
            new CpuSource(),
            new CpuFrequencySource(),
            new MemorySource(),
            new SwapSource(),
            new LoadAvgSource(),
            new HardwareMonitorSource(),
            new DiskIoSource(),
            new StorageSpaceSource(),
            new NetSpeedSource(),
            new UptimeSource(),
        ];
        this._timeoutId = 0;
        this._inFlight = false;
        this.__listeners = new Set();
    }

    addListener(callback) {
        this.__listeners.add(callback);
    }

    removeListener(callback) {
        this.__listeners.delete(callback);
    }

    start() {
        if (this._timeoutId)
            return;
        this._timeoutId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.intervalMs,
            () => {
                this.tick();
                return GLib.SOURCE_CONTINUE;
            },
        );
        this.tick();
    }

    stop() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
    }

    async tick() {
        if (this._inFlight)
            return;
        this._inFlight = true;

        try {
            const settled = await Promise.allSettled(
                this.sources.map(source => source.sample(Date.now())),
            );
            const frame = this._composeFrame(settled);
            for (const listener of this.__listeners) {
                try {
                    listener(frame);
                } catch (e) {
                    console.error(`listener failed: ${e.message}`);
                }
            }
        } catch (e) {
            console.error(`coordinator tick failed: ${e.message}`);
        } finally {
            this._inFlight = false;
        }
    }

    _composeFrame(settled) {
        const [cpu, freq, mem, swap, load, therm, diskIo, diskSpace, net, uptime] =
            settled.map(r => (r.status === 'fulfilled' ? r.value : null));

        const disks = this._mergeDisks(diskIo, diskSpace);

        return {
            t: Date.now(),
            cpu: {
                total: cpu?.total ?? null,
                cores: cpu?.cores ?? null,
                coresMhz: freq?.coresMhz ?? null,
                freq: freq ? {min: freq.min, max: freq.max} : null,
            },
            mem: mem ?? null,
            swap: swap ?? null,
            thermals: therm?.temperatures ?? null,
            fans: therm?.fans ?? null,
            gpus: [],
            disks,
            net: net ?? {iface: null, rxBps: null, txBps: null},
            sys: {
                uptimeS: uptime ?? null,
                load: load ?? null,
            },
            battery: null,
            topProc: null,
        };
    }

    _mergeDisks(diskIo, diskSpace) {
        const byDevice = new Map();

        if (diskIo) {
            for (const [device, io] of diskIo) {
                byDevice.set(device, {device, io, space: null, mounts: []});
            }
        }
        if (diskSpace) {
            for (const space of diskSpace) {
                const base = normalizeDeviceName(space.device);
                if (base === null)
                    continue;
                const entry = byDevice.get(base)
                    ?? {device: base, io: null, space: null, mounts: []};
                entry.space = space;
                entry.mounts.push(space.mountPath);
                byDevice.set(base, entry);
            }
        }

        return [...byDevice.values()].map(entry => ({
            device: entry.device,
            mounts: entry.mounts,
            readBps: entry.io?.readBps ?? null,
            writeBps: entry.io?.writeBps ?? null,
            usedPct: entry.space?.usedPct ?? null,
            used: entry.space?.used ?? null,
            free: entry.space?.free ?? null,
            total: entry.space?.total ?? null,
        }));
    }
}
