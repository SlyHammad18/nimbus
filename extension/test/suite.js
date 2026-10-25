// Task 03 unit tests: history ring, formatters, and the pure source parsers.
// Fixture files are resolved via NIMBUS_TEST_ROOT (set by the meson test env)
// so the suite works from any build directory.

import GLib from 'gi://GLib';

import {assert, readFileFixture, test} from './test-harness.js';
import {HistoryBuffer} from '../src/util/history.js';
import {formatBytes, formatRate, formatPercent, formatTemperature} from '../src/util/format.js';
import {computeUtilization} from '../src/sources/gtop.js';
import {
    parseDiskStats,
    isMonitoredDevice,
    parseMounts,
    normalizeDeviceName,
} from '../src/sources/diskstats.js';
import {parseNetDev, parseDefaultRoute} from '../src/sources/netdev.js';
import {describeChipSensors} from '../src/sources/hwmon.js';
import {parseCpuFrequency, parseUptime} from '../src/sources/procfs.js';
import {readFileText} from '../src/util/async_file.js';

let ROOT;
export function setFixtureRoot(path) {
    ROOT = path;
}
setFixtureRoot(GLib.getenv('NIMBUS_TEST_ROOT') ?? '.');

const FIXTURE_DISKSTATS = readFileFixture(`${ROOT}/extension/test/fixtures/proc/diskstats.txt`);
const FIXTURE_NETDEV = readFileFixture(`${ROOT}/extension/test/fixtures/proc/net-dev.txt`);
const FIXTURE_ROUTE = readFileFixture(`${ROOT}/extension/test/fixtures/proc/net-route.txt`);
const FIXTURE_MOUNTS = readFileFixture(`${ROOT}/extension/test/fixtures/proc/self-mounts.txt`);
const FIXTURE_CPUINFO = readFileFixture(`${ROOT}/extension/test/fixtures/proc/cpuinfo.txt`);

// history.js ------------------------------------------------------------

test('history push keeps latest and wraps at capacity', () => {
    const buf = new HistoryBuffer(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    assert.equal(buf.length, 3);
    assert.equal(buf.latest(), 4);
    assert.equal(buf.at(0), 2);
    assert.equal(buf.at(1), 3);
    assert.equal(buf.at(2), 4);
});

test('history stores non-finite values as 0 (never NaN)', () => {
    const buf = new HistoryBuffer(2);
    buf.push(Number.NaN);
    assert.equal(buf.latest(), 0);
    buf.push(undefined);
    assert.equal(buf.latest(), 0);
});

test('history toArray matches pushed order', () => {
    const buf = new HistoryBuffer(4);
    for (const v of [7, 8, 9, 10, 11])
        buf.push(v);
    assert.deepEqual([...buf.toArray()], [8, 9, 10, 11]);
    assert.ok(buf.isFull);
});

// format.js -------------------------------------------------------------

test('formatBytes binary rounding', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1023), '1023 B');
    assert.equal(formatBytes(1024), '1 KiB');
    assert.equal(formatBytes(12_000_000_000), '11.2 GiB');
    assert.equal(formatBytes(1000, {binary: false}), '1 KB');
});

test('formatRate bytes and bits', () => {
    assert.equal(formatRate(2048), '2 KiB/s');
    assert.equal(formatRate(0), '0 B/s');
    assert.equal(formatRate(2e9, {bits: true, binary: false}), '16 Gb/s');
    assert.isNull(formatRate(Number.NaN));
});

test('formatPercent and formatTemperature', () => {
    assert.equal(formatPercent(72.4), '72%');
    assert.equal(formatPercent(72.45, {decimals: 1}), '72.5%');
    assert.equal(formatTemperature(52.4), '52°C');
    assert.equal(formatTemperature(100, {unit: 'fahrenheit'}), '212°F');
    assert.isNull(formatTemperature(Number.NaN));
});

// gtop computeUtilization ------------------------------------------------

test('cpu utilization needs a previous tick', () => {
    assert.isNull(computeUtilization(40, null, 100, null));
});

test('cpu utilization math over a tick', () => {
    // 100 -> 200 ticks total, busy 40 -> 80, so 40% busy.
    assert.close(computeUtilization(80, 40, 200, 100), 40, 0.01);
});

test('cpu utilization clamps to 0..100 and rejects negative deltas', () => {
    assert.isNull(computeUtilization(-10, 40, 200, 100));
    assert.close(computeUtilization(500, 40, 200, 100), 100, 0.01);
});

// diskstats.js parsers ---------------------------------------------------

test('parseDiskStats reads counters', () => {
    const devices = parseDiskStats(FIXTURE_DISKSTATS);
    const nvme = devices.find(d => d.device === 'nvme0n1');
    assert.equal(nvme.readSectors, 252146784);
    assert.equal(nvme.writeSectors, 512345);
    assert.equal(devices.find(d => d.device === 'sdb').writeSectors, 1024);
});

test('parseDiskStats returns null on missing text', () => {
    assert.isNull(parseDiskStats(null));
});

test('isMonitoredDevice filters partitions and pseudo devices', () => {
    assert.ok(isMonitoredDevice('nvme0n1'));
    assert.ok(isMonitoredDevice('sda'));
    assert.ok(isMonitoredDevice('sdb'));
    assert.ok(!isMonitoredDevice('nvme0n1p1'));
    assert.ok(!isMonitoredDevice('sda1'));
    assert.ok(!isMonitoredDevice('loop0'));
    assert.ok(!isMonitoredDevice('ram0'));
    assert.ok(!isMonitoredDevice('dm-0'));
    assert.ok(!isMonitoredDevice('zram0'));
});

test('normalizeDeviceName maps mount devices to disk devices', () => {
    assert.equal(normalizeDeviceName('/dev/nvme0n1p2'), 'nvme0n1');
    assert.equal(normalizeDeviceName('/dev/sda1'), 'sda');
    assert.equal(normalizeDeviceName('/dev/mmcblk0p1'), 'mmcblk0');
});

test('parseMounts keeps real filesystems and dedupes paths', () => {
    const mounts = parseMounts(FIXTURE_MOUNTS);
    const paths = mounts.map(m => m.mountPath);
    assert.deepEqual(paths, ['/', '/home', '/mnt/backup']);
});

// netdev.js parsers -------------------------------------------------------

test('parseNetDev extracts rx/tx bytes', () => {
    const counters = parseNetDev(FIXTURE_NETDEV);
    assert.equal(counters.get('wlp3s0').receiveBytes, 123456789);
    assert.equal(counters.get('wlp3s0').transmitBytes, 0);
    assert.equal(counters.get('lo').transmitBytes, 0);
});

test('parseDefaultRoute picks the default interface', () => {
    assert.equal(parseDefaultRoute(FIXTURE_ROUTE), 'wlp3s0');
    assert.isNull(parseDefaultRoute(null));
});

// hwmon.js pure helpers ----------------------------------------------------

test('describeChipSensors lists temp and fan descriptors with labels', () => {
    const sensors = describeChipSensors('coretemp', [
        'temp1_input', 'temp1_label', 'temp2_input', 'fan1_input', 'name',
    ]);
    const temp1 = sensors.find(s => s.input === 'temp1_input');
    const temp2 = sensors.find(s => s.input === 'temp2_input');
    const fan1 = sensors.find(s => s.input === 'fan1_input');
    assert.equal(temp1.kind, 'temperature');
    assert.equal(temp1.labelFile, 'temp1_label');
    assert.equal(temp1.fallbackLabel, 'coretemp 1');
    assert.equal(temp2.kind, 'temperature');
    assert.equal(temp2.fallbackLabel, 'coretemp 2');
    assert.equal(fan1.kind, 'fan');
    assert.equal(fan1.fallbackLabel, 'coretemp fan 1');
});

// procfs.js parsers ---------------------------------------------------------

test('parseCpuFrequency returns per-core MHz', () => {
    const freqs = parseCpuFrequency(FIXTURE_CPUINFO);
    assert.equal(freqs.length, 4);
    assert.equal(Math.min(...freqs), 2900);
    assert.close(Math.max(...freqs), 4100.5, 0.01);
});

test('parseUptime returns seconds', () => {
    assert.equal(parseUptime('1234.5 567.8'), 1234.5);
    assert.isNull(parseUptime(null));
    assert.isNull(parseUptime('not a number'));
});

test('readFileText null on unreadable path', async () => {
    const text = await readFileText('/proc/definitely-not-here');
    assert.isNull(text);
});

test('coordinator emits a shape-complete frame on the second tick', async () => {
    const {MetricsCoordinator} = await import('../src/sources/coordinator.js');
    const coordinator = new MetricsCoordinator();
    let frame = null;
    coordinator.addListener(f => {
        frame = f;
    });

    // Two ticks: sources return null rates on the first, numbers on the second.
    await coordinator.tick();
    await coordinator.tick();
    coordinator.stop();

    assert.ok(frame, 'listener received a frame');
    assert.ok(Number.isFinite(frame.t));
    assert.ok(frame.cpu, 'cpu region present');
    assert.ok(Array.isArray(frame.cpu.cores) && frame.cpu.cores.length > 0);
    assert.ok(frame.cpu.total === null
        || (frame.cpu.total >= 0 && frame.cpu.total <= 100));
    assert.ok(frame.mem === null || (frame.mem.usedPct >= 0 && frame.mem.usedPct <= 100));
    for (const disk of frame.disks) {
        assert.ok(Number.isFinite(disk.usedPct) || disk.usedPct === null);
        assert.ok(Number.isFinite(disk.readBps) || disk.readBps === null);
    }
    assert.isNull(frame.battery, 'not implemented yet (task 12/overlay? task 04+)');
});
