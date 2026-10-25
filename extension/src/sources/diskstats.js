// Disk I/O (delta from /proc/diskstats) and disk space (libgtop fsusage over
// /proc/self/mounts) sources. Pure parsers are exported for unit tests; the
// source classes hold prev-state and degrade to nulls on first tick/unreadable.

import GTop from 'gi://GTop';
import {readFileText} from '../util/async_file.js';

const DISKSTATS_PATH = '/proc/diskstats';
const MOUNTS_PATH = '/proc/self/mounts';
const SECTOR_BYTES = 512;

const MONITORED_DEVICE_RE = /^(hd[a-z]|sd[a-z]|sg\d|vd[a-z]|xvd[a-z]|nvme\d+n\d+|mmcblk\d+)$/;
const IGNORED_DEVICE_RE = /^(loop\d+|ram\d+|sr\d+|fd\d+|zram\d+|dm-\d+|md\d+)$/;

const FILESYSTEMS = new Set([
    'ext2', 'ext3', 'ext4', 'btrfs', 'xfs', 'jfs', 'reiserfs',
    'zfs', 'f2fs', 'vfat', 'exfat', 'ntfs3', 'ntfs', 'fuseblk',
]);

/** Parse /proc/diskstats into per-device sector counters. */
export function parseDiskStats(text) {
    if (text === null)
        return null;
    const devices = [];
    for (const line of text.split('\n')) {
        const fields = line.trim().split(/\s+/);
        if (fields.length < 10 || !fields[2])
            continue;
        devices.push({
            device: fields[2],
            readSectors: Number(fields[5]),
            writeSectors: Number(fields[9]),
        });
    }
    return devices;
}

/** Devices we report I/O for (physical disks and partitions excluded). */
export function isMonitoredDevice(device) {
    if (IGNORED_DEVICE_RE.test(device))
        return false;
    return MONITORED_DEVICE_RE.test(device);
}

export function parseMounts(text) {
    if (text === null)
        return null;
    const mounts = [];
    const seen = new Set();
    for (const line of text.split('\n')) {
        const [device, mountPath, fstype] = line.trim().split(/\s+/);
        if (!device || !mountPath || !FILESYSTEMS.has(fstype))
            continue;
        if (seen.has(mountPath))
            continue;
        seen.add(mountPath);
        mounts.push({device, mountPath});
    }
    return mounts;
}

/** Reduce a mount's /dev path to its parent device (nvme0n1p2 -> nvme0n1). */
export function normalizeDeviceName(devPath) {
    if (!devPath)
        return null;
    const base = devPath.replace(/^\/dev\//, '');

    let match;
    if ((match = /^nvme(\d+)n(\d+)(p\d+)?$/.exec(base)))
        return `nvme${match[1]}n${match[2]}`;
    if ((match = /^mmcblk(\d+)(p\d+)?$/.exec(base)))
        return `mmcblk${match[1]}`;
    if ((match = /^([a-z]+)(?:\d+)?$/.exec(base)))
        return match[1];
    return base;
}

export class DiskIoSource {
    constructor() {
        this._prev = new Map(); // device -> {readBytes, writeBytes, timeMs}
    }

    async sample(nowMs) {
        const parsed = parseDiskStats(await readFileText(DISKSTATS_PATH));
        if (!parsed)
            return null;

        const cur = new Map();
        for (const entry of parsed) {
            if (!isMonitoredDevice(entry.device))
                continue;
            cur.set(entry.device, {
                readBytes: entry.readSectors * SECTOR_BYTES,
                writeBytes: entry.writeSectors * SECTOR_BYTES,
                timeMs: nowMs,
            });
        }

        const out = new Map();
        for (const [device, nextValues] of cur) {
            const prev = this._prev.get(device);
            if (prev) {
                const dtSec = (nextValues.timeMs - prev.timeMs) / 1000;
                if (dtSec > 0) {
                    out.set(device, {
                        readBps: Math.max(0, (nextValues.readBytes - prev.readBytes) / dtSec),
                        writeBps: Math.max(0, (nextValues.writeBytes - prev.writeBytes) / dtSec),
                    });
                }
            } else {
                out.set(device, {readBps: null, writeBps: null});
            }
        }
        this._prev = cur;

        return out;
    }
}

export class StorageSpaceSource {
    constructor() {
        this._fsusage = new GTop.glibtop_fsusage();
        this._mounts = null;
    }

    async sample() {
        if (!this._mounts) {
            this._mounts = parseMounts(await readFileText(MOUNTS_PATH))
                ?? [];
        }
        if (!this._mounts.length)
            return [];

        const spaces = [];
        for (const {device, mountPath} of this._mounts) {
            try {
                GTop.glibtop_get_fsusage(this._fsusage, mountPath);
            } catch {
                continue;
            }
            const {blocks, bfree, bavail, block_size: blockSize} = this._fsusage;
            if (!blocks)
                continue;
            const free = bavail * blockSize;
            const used = (blocks - bfree) * blockSize;
            spaces.push({
                device,
                mountPath,
                total: blocks * blockSize,
                used,
                free,
                usedPct: 100 * ((blocks - bfree) / blocks),
            });
        }
        return spaces;
    }
}
