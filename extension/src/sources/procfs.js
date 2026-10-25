// /proc-based sources: CPU frequency, uptime. Pure parsing functions are
// exported for unit tests; file reads are async (util/async_file.js) and
// degrade to null on error.

import {readFileText} from '../util/async_file.js';

const CPUINFO_PATH = '/proc/cpuinfo';
const UPTIME_PATH = '/proc/uptime';

/** Parse "cpu MHz" entries of /proc/cpuinfo; returns an array in MHz or null. */
export function parseCpuFrequency(text) {
    if (text === null)
        return null;
    const freqs = [];
    const re = /(?:cpu MHz|clock)\s*:\s*([\d.]+)/g;
    let match;
    while ((match = re.exec(text)) !== null)
        freqs.push(parseFloat(match[1]));
    return freqs.length ? freqs : null;
}

/** Parse /proc/uptime; returns seconds as a float, or null. */
export function parseUptime(text) {
    if (text === null)
        return null;
    const first = text.split(/\s+/)[0];
    const value = parseFloat(first);
    return Number.isFinite(value) ? value : null;
}

export class CpuFrequencySource {
    async sample() {
        const freqs = parseCpuFrequency(await readFileText(CPUINFO_PATH));
        if (!freqs)
            return null;
        return {
            coresMhz: freqs,
            min: Math.min(...freqs),
            max: Math.max(...freqs),
        };
    }
}

export class UptimeSource {
    async sample() {
        return parseUptime(await readFileText(UPTIME_PATH));
    }
}
