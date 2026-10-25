// Metric formatters (DESIGN.md section 4.3 S5).
//
// All user-visible numbers flow through here so the unit system is defined
// in exactly one place (binary sizes by default, decimal speeds, locale-free
// decimal point for tabular alignment preferences).

const SIZE_UNITS_BINARY = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
const SIZE_UNITS_DECIMAL = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

function trimNumber(value, decimals) {
    const fixed = value.toFixed(decimals);
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

/**
 * Format a byte count. Returns null when the value is not finite.
 * Example: formatBytes(12e9) = '11.2 GiB', formatBytes(0) = '0 B'.
 */
export function formatBytes(bytes, {binary = true, decimals = 1} = {}) {
    if (!Number.isFinite(bytes))
        return null;

    const step = binary ? 1024 : 1000;
    const units = binary ? SIZE_UNITS_BINARY : SIZE_UNITS_DECIMAL;

    let magnitude = Math.abs(bytes);
    let unitIndex = 0;
    while (magnitude >= step && unitIndex < units.length - 1) {
        magnitude /= step;
        unitIndex++;
    }
    magnitude = unitIndex === 0 ? bytes : (bytes < 0 ? -magnitude : magnitude);

    return `${trimNumber(magnitude, unitIndex === 0 ? 0 : decimals)} ${units[unitIndex]}`;
}

/**
 * Format a speed from bytes-per-second (converts to bits when requested).
 * Example: formatRate(2048) = '2048 B/s', formatRate(2e9, {bits: true}) = '2 Gb/s'.
 */
export function formatRate(bytesPerSec, {binary = true, bits = false} = {}) {
    if (!Number.isFinite(bytesPerSec))
        return null;
    const scaled = bits ? bytesPerSec * 8 : bytesPerSec;
    const text = formatBytes(scaled, {binary: bits ? false : binary, decimals: 1});
    if (!text)
        return null;
    return bits ? `${text.replace(/B$/, 'b')}/s` : `${text}/s`;
}

/** Format a percentage from 0..100. Returns null for non-finite input. */
export function formatPercent(value, {decimals = 0} = {}) {
    if (!Number.isFinite(value))
        return null;
    return `${trimNumber(value, decimals)}%`;
}

/** Format a temperature in celsius or fahrenheit. */
export function formatTemperature(celsius, {unit = 'celsius'} = {}) {
    if (!Number.isFinite(celsius))
        return null;
    if (unit === 'fahrenheit')
        return `${Math.round(celsius * 9 / 5 + 32)}°F`;
    return `${Math.round(celsius)}°C`;
}
