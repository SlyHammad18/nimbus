// Preallocated history ring buffer (DESIGN.md section 7.2 / N3).
//
// Stores numeric samples in a Float32Array with a circular head. Per the
// product rules there are no per-tick allocations: push() writes in place,
// toArray() writes into the caller's buffer or a lazily created one that is
// then reused.

export class HistoryBuffer {
    constructor(capacity) {
        this.capacity = capacity;
        this._data = new Float32Array(capacity);
        this._length = 0;
        this._head = 0; // index of the next write
    }

    /** Write one sample. Non-finite values become 0 (never NaN). */
    push(value) {
        const v = Number.isFinite(value) ? value : 0;
        this._data[this._head] = v;
        this._head = (this._head + 1) % this.capacity;
        if (this._length < this.capacity)
            this._length++;
    }

    /** Number of samples currently stored. */
    get length() {
        return this._length;
    }

    /** Whether at least one sample has been pushed. */
    get isEmpty() {
        return this._length === 0;
    }

    /** The most recent sample, or null when empty. */
    latest() {
        if (this._length === 0)
            return null;
        const idx = (this._head + this.capacity - 1) % this.capacity;
        return this._data[idx];
    }

    /** Sample at i (0 = oldest), or null when out of range. */
    at(i) {
        if (i < 0 || i >= this._length)
            return null;
        const start = (this._head + this.capacity - this._length) % this.capacity;
        return this._data[(start + i) % this.capacity];
    }

    /** Oldest-to-newest view. Reuses an internal checkout array; do not hold
     * the result across pushes. */
    toArray() {
        if (!this._view || this._view.length !== this._length)
            this._view = new Float32Array(this._length);
        for (let i = 0; i < this._length; i++)
            this._view[i] = this.at(i);
        return this._view;
    }

    /** true when the buffer has wrapped at least once (full history). */
    get isFull() {
        return this._length === this.capacity;
    }
}
