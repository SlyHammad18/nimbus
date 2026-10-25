// Temperature / fan source scanning /sys/class/hwmon (DESIGN.md 4.1 M4, M20).
//
// Discovery happens once per session; per-tick reads of the tiny *_input
// files are async. Labels prefer the board-provided `*_label`, then the chip
// name. Unreadable sensors are omitted, never faked to zero.

import GLib from 'gi://GLib';
import {readFileText} from '../util/async_file.js';

const HWMON_ROOT = '/sys/class/hwmon';
const MAX_CHIPS = 64;

/** Federation-free small dir listing; discovery runs once per session. */
function listDirectorySync(path) {
    try {
        const dir = GLib.Dir.open(path, 0);
        const names = [];
        while (true) {
            const name = dir.read_name();
            if (name === null)
                break;
            names.push(name);
        }
        return names;
    } catch {
        return [];
    }
}

/**
 * Pure helper for tests: given a chip identifier and the file names inside
 * its driver directory, return the temperature sensor descriptors to read.
 */
export function describeChipSensors(chipName, fileNames) {
    const temps = [];
    for (const fileName of fileNames) {
        const m = /^(temp|fan)(\d+)_input$/.exec(fileName);
        if (!m)
            continue;
        const kind = m[1];
        const index = m[2];
        const labelFile = `${kind}${index}_label`;
        temps.push({
            kind: kind === 'temp' ? 'temperature' : 'fan',
            input: fileName,
            labelFile,
            fallbackLabel: kind === 'temp'
                ? `${chipName || 'hwmon'} ${index}`
                : `${chipName || 'hwmon'} fan ${index}`,
        });
    }
    return temps;
}

async function toMillidegrees(millidegreeText) {
    const value = parseFloat(millidegreeText);
    return Number.isFinite(value) ? value / 1000 : null;
}

export class HardwareMonitorSource {
    constructor() {
        this._chips = null;
        this._discoveryFailed = false;
    }

    _discoverChips() {
        const chips = [];
        for (const entry of listDirectorySync(HWMON_ROOT)) {
            if (!/^hwmon\d+$/.test(entry))
                continue;
            const chipsDir = `${HWMON_ROOT}/${entry}`;
            const files = listDirectorySync(chipsDir);
            if (describeChipSensors('', files).length === 0)
                continue;
            chips.push({dirPath: chipsDir});
        }
        return chips.slice(0, MAX_CHIPS);
    }

    async sample() {
        if (this._chips === null && !this._discoveryFailed) {
            try {
                this._chips = this._discoverChips();
                for (const chip of this._chips) {
                    chip.name = (await readFileText(`${chip.dirPath}/name`))?.trim() ?? '';
                    chip.sensors = describeChipSensors(chip.name,
                        listDirectorySync(chip.dirPath));
                }
            } catch {
                this._discoveryFailed = true;
                this._chips = [];
            }
        }
        if (!this._chips?.length)
            return {temperatures: null, fans: null};

        const temperatures = [];
        const fans = [];
        for (const chip of this._chips) {
            for (const sensor of chip.sensors) {
                const raw = await readFileText(`${chip.dirPath}/${sensor.input}`);
                if (raw === null)
                    continue;
                let label = sensor.fallbackLabel;
                if (sensor.labelFile) {
                    const labelRaw = await readFileText(
                        `${chip.dirPath}/${sensor.labelFile}`,
                    );
                    if (labelRaw !== null)
                        label = labelRaw.trim();
                }
                if (sensor.kind === 'temperature') {
                    const valueC = await toMillidegrees(raw);
                    if (valueC !== null)
                        temperatures.push({label, valueC});
                } else {
                    const rpm = parseFloat(raw);
                    if (Number.isFinite(rpm))
                        fans.push({label, rpm});
                }
            }
        }

        return {
            temperatures: temperatures.length ? temperatures : null,
            fans: fans.length ? fans : null,
        };
    }
}
