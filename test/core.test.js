import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIT, DIRECTIONS, OPPOSITE, ORIENTATIONS, fromMask, orientDirection, orientMask, toMask } from '../src/core/directions.js';
import { createRng } from '../src/core/rng.js';

const H = { flipH: true, flipV: false };
const V = { flipH: false, flipV: true };
const HV = { flipH: true, flipV: true };

describe('directions', () => {
    it('mirrors horizontally', () => {
        assert.deepEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((d) => orientDirection(d, H)),
            ['n', 'nw', 'w', 'sw', 's', 'se', 'e', 'ne']);
    });

    it('mirrors vertically, including diagonals', () => {
        // The old flipVert swapped ne and sw, which is a rotation, not a mirror.
        assert.deepEqual(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((d) => orientDirection(d, V)),
            ['s', 'se', 'e', 'ne', 'n', 'nw', 'w', 'sw']);
    });

    it('treats mirroring both ways as a half turn', () => {
        for (const direction of DIRECTIONS) assert.equal(orientDirection(direction, HV), OPPOSITE[direction]);
    });

    it('mirrors whole masks the same way as single directions', () => {
        for (const orientation of ORIENTATIONS) {
            for (let mask = 0; mask < 256; mask++) {
                const expected = toMask(fromMask(mask).map((d) => orientDirection(d, orientation)));
                assert.equal(orientMask(mask, orientation), expected);
            }
        }
    });

    it('converts between direction lists and masks', () => {
        assert.equal(toMask(['n', 'e']), BIT.n | BIT.e);
        assert.deepEqual(fromMask(BIT.s | BIT.nw), ['s', 'nw']);
    });
});

describe('rng', () => {
    it('repeats the same sequence for the same seed', () => {
        const a = createRng('seed');
        const b = createRng('seed');
        for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
    });

    it('gives different sequences for different seeds', () => {
        const a = createRng('one');
        const b = createRng('two');
        assert.notDeepEqual([a.next(), a.next(), a.next()], [b.next(), b.next(), b.next()]);
    });

    it('keeps int() within its inclusive bounds and reaches both ends', () => {
        const rng = createRng(1);
        const seen = new Set();
        for (let i = 0; i < 1000; i++) {
            const value = rng.int(3, 6);
            assert.ok(value >= 3 && value <= 6);
            seen.add(value);
        }
        assert.deepEqual([...seen].sort(), [3, 4, 5, 6]);
    });

    it('picks from a list, or undefined from an empty one', () => {
        const rng = createRng(2);
        assert.ok(['a', 'b'].includes(rng.pick(['a', 'b'])));
        assert.equal(rng.pick([]), undefined);
    });
});
