// Network speed source from /proc/net/dev with default-route interface
// picking via /proc/net/route (DESIGN.md 4.1 M14-M16). Pure parsers are
// exported for tests; rate math degrades to null on the first tick and on
// unreadable files.

import {readFileText} from '../util/async_file.js';

const NETDEV_PATH = '/proc/net/dev';
const ROUTE_PATH = '/proc/net/route';

/** Parse /proc/net/dev into {iface: {receiveBytes, transmitBytes}}. */
export function parseNetDev(text) {
    if (text === null)
        return null;
    const map = new Map();
    for (const line of text.split('\n')) {
        const match = /^\s*([\w@.-]+):\s*(.*)$/.exec(line);
        if (!match)
            continue;
        const counters = match[2].split(/\s+/).map(Number);
        if (counters.length < 9)
            continue;
        map.set(match[1], {
            receiveBytes: counters[0],
            transmitBytes: counters[8],
        });
    }
    return map;
}

/** Parse /proc/net/route; returns interface name of the 00000000 route. */
export function parseDefaultRoute(text) {
    if (text === null)
        return null;
    for (const line of text.split('\n').slice(1)) {
        const fields = line.trim().split(/\s+/);
        if (fields[0] === 'Iface')
            continue;
        if (fields.length < 8)
            continue;
        if (fields[1] === '00000000')
            return fields[0];
    }
    return null;
}

export class NetSpeedSource {
    constructor() {
        this._prev = null; // {rxBytes, txBytes, timeMs, iface}
    }

    async sample(nowMs) {
        const counters = parseNetDev(await readFileText(NETDEV_PATH));
        const defaultIface = parseDefaultRoute(await readFileText(ROUTE_PATH));
        const iface = defaultIface ?? counters?.keys().next().value ?? null;
        if (!counters || !iface || !counters.has(iface))
            return {iface: null, rxBps: null, txBps: null};

        const next = {rxBytes: counters.get(iface).receiveBytes, txBytes: counters.get(iface).transmitBytes, timeMs: nowMs, iface};

        let rxBps = null;
        let txBps = null;
        if (this._prev && this._prev.iface === iface) {
            const dtSec = (next.timeMs - this._prev.timeMs) / 1000;
            if (dtSec > 0) {
                rxBps = Math.max(0, (next.rxBytes - this._prev.rxBytes) / dtSec);
                txBps = Math.max(0, (next.txBytes - this._prev.txBytes) / dtSec);
            }
        }
        this._prev = next;

        return {iface, rxBps, txBps};
    }
}
