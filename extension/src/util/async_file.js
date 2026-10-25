// Async file reading helpers.
//
// Polling sources must not block the main loop (DESIGN.md N8): every /proc
// and /sys read goes through these helpers, which return null (never throw)
// on anything unreadable so sources degrade gracefully.

import Gio from 'gi://Gio';

const UTF8_DECODER = new TextDecoder('utf-8');

function readFileAsync(file, cancellable) {
    return new Promise((resolve, reject) => {
        file.load_contents_async(cancellable, (source, result) => {
            try {
                const [, bytes] = source.load_contents_finish(result);
                resolve(bytes);
            } catch (err) {
                reject(err);
            }
        });
    });
}

/**
 * Read a small file as UTF-8 text. Returns null for any error (missing
 * file, permission, parse) so the caller can degrade to n/a.
 */
export async function readFileText(path, cancellable = null) {
    try {
        const bytes = await readFileAsync(
            Gio.File.new_for_path(path),
            cancellable,
        );
        return UTF8_DECODER.decode(bytes);
    } catch {
        return null;
    }
}
