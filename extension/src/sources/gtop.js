// CPU / memory / swap / load sources backed by libgtop (DESIGN.md 4.1 M1-M7).
//
// libgtop structs (one allocation per source object) are reused across ticks
// by passing the same instance to glibtop_get_*. glibtop.xcpu_* arrays are
// copied into preallocated Float64Arrays before the next tick overwrites
// them. Per DESIGN.md N10 any unreadable value is null, never a fake zero.

import GTop from 'gi://GTop';

/** Delta rate helper shared with tests: null when no deltas are available. */
export function computeUtilization(curBusy, prevBusy, curTotal, prevTotal) {
    const dTotal = curTotal - prevTotal;
    const dBusy = curBusy - prevBusy;
    if (dTotal <= 0 || prevTotal === null || prevBusy === null)
        return null;
    const pct = 100 * (dBusy / dTotal);
    return pct < 0 ? null : Math.min(100, Math.max(0, pct));
}

/** Actual logical core count (libgtop xcpu arrays are over-allocated). */
function physicalCoreCount() {
    try {
        return GTop.glibtop_get_sysinfo()?.ncpu ?? 0;
    } catch {
        return 0;
    }
}

export class CpuSource {
    constructor() {
        this._cpu = new GTop.glibtop_cpu();
        this._coreCount = -1;
        this._prevTotal = null;
        this._prevIdle = null;
        this._corePrevValid = false;
        this._coreArrays = null;
    }

    _allocCoreArrays(coreCount) {
        this._coreCount = coreCount;
        this._coreArrays = {
            total: new Float64Array(coreCount),
            idle: new Float64Array(coreCount),
            prevTotal: new Float64Array(coreCount),
            prevIdle: new Float64Array(coreCount),
        };
    }

    sample() {
        try {
            GTop.glibtop_get_cpu(this._cpu);
        } catch {
            return null;
        }

        const xcpu = this._cpu.xcpu_total ?? [];
        const ncpu = physicalCoreCount();
        if (ncpu > 0 && this._coreCount !== ncpu)
            this._allocCoreArrays(ncpu);
        const usableCores = Math.min(ncpu > 0 ? ncpu : 1, xcpu.length);

        const curTotal = this._cpu.total;
        const curIdle = this._cpu.idle + this._cpu.iowait;
        const total = computeUtilization(
            curTotal - curIdle,
            this._prevTotal === null ? null : (this._prevTotal - this._prevIdle),
            curTotal,
            this._prevTotal,
        );
        this._prevTotal = curTotal;
        this._prevIdle = curIdle;

        const cores = new Array(usableCores).fill(null);
        if (usableCores > 0) {
            for (let i = 0; i < usableCores; i++) {
                this._coreArrays.total[i] = xcpu[i];
                this._coreArrays.idle[i] = this._cpu.xcpu_idle[i] + this._cpu.xcpu_iowait[i];
                cores[i] = this._corePrevValid
                    ? computeUtilization(
                        this._coreArrays.total[i] - this._coreArrays.idle[i],
                        this._coreArrays.prevTotal[i] - this._coreArrays.prevIdle[i],
                        this._coreArrays.total[i],
                        this._coreArrays.prevTotal[i],
                    )
                    : null;
            }
            this._coreArrays.prevTotal.set(this._coreArrays.total);
            this._coreArrays.prevIdle.set(this._coreArrays.idle);
            this._corePrevValid = true;
        }

        return {total, cores};
    }
}

export class MemorySource {
    constructor() {
        this._mem = new GTop.glibtop_mem();
    }

    sample() {
        try {
            GTop.glibtop_get_mem(this._mem);
        } catch {
            return null;
        }
        const {total, free: memFree, buffer, cached} = this._mem;
        if (!total)
            return null;
        const used = Math.max(0, total - memFree - buffer - cached);
        return {
            total,
            used,
            usedPct: 100 * (used / total),
        };
    }
}

export class SwapSource {
    constructor() {
        this._swap = new GTop.glibtop_swap();
    }

    sample() {
        try {
            GTop.glibtop_get_swap(this._swap);
        } catch {
            return null;
        }
        const {total, used} = this._swap;
        if (!total)
            return null;
        return {
            total: total,
            used: used,
            usedPct: 100 * (used / total),
        };
    }
}

export class LoadAvgSource {
    constructor() {
        this._loadavg = new GTop.glibtop_loadavg();
    }

    sample() {
        try {
            GTop.glibtop_get_loadavg(this._loadavg);
        } catch {
            return null;
        }
        return [...this._loadavg.loadavg];
    }
}
