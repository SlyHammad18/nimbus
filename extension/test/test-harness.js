// Shared test harness (used by extension/test/*.test.js).

import GLib from 'gi://GLib';

export const assert = {
    ok(value, message = 'expected truthy') {
        if (!value)
            throw new Error(`${message} (value: ${value})`);
    },
    isNull(value, message = 'expected null') {
        if (value !== null)
            throw new Error(`${message} (value: ${value})`);
    },
    equal(actual, expected, message = 'expected equal values') {
        if (actual !== expected)
            throw new Error(`${message} (actual: ${actual}, expected: ${expected})`);
    },
    deepEqual(actual, expected, message = 'expected deep equality') {
        const a = JSON.stringify(actual);
        const b = JSON.stringify(expected);
        if (a !== b)
            throw new Error(`${message} (actual: ${a}, expected: ${b})`);
    },
    close(actual, expected, epsilon = 0.2, message = 'expected close values') {
        if (Math.abs(actual - expected) > epsilon)
            throw new Error(`${message} (actual: ${actual}, expected: ${expected})`);
    },
};

export function readFileFixture(relativePath) {
    const [ok, bytes] = GLib.file_get_contents(relativePath);
    if (!ok)
        throw new Error(`missing fixture: ${relativePath}`);
    return new TextDecoder('utf-8').decode(bytes);
}

export function test(name, fn) {
    registry.push({name, fn});
}

export const registry = [];

export async function runAll() {
    let failures = 0;
    for (const {name, fn} of registry) {
        try {
            await fn();
            console.log(`PASS ${name}`);
        } catch (e) {
            failures++;
            console.log(`FAIL ${name}: ${e.message}`);
        }
    }
    console.log(`${registry.length - failures}/${registry.length} passed`);
    return failures;
}
