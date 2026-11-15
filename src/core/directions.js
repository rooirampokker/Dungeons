/**
 * Compass directions, their grid steps and bit flags, and how they change when a tile is mirrored.
 *
 * @typedef {'n'|'e'|'s'|'w'} Cardinal
 * @typedef {Cardinal|'ne'|'se'|'sw'|'nw'} Direction
 *
 * A tile can be drawn mirrored horizontally, vertically or both. Mirroring both ways equals a 180° rotation.
 * @typedef {{flipH: boolean, flipV: boolean}} Orientation
 */

/** @type {Cardinal[]} */
export const CARDINALS = ['n', 'e', 's', 'w'];

/** @type {Direction[]} */
export const DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

/** One bit per direction. Tile exits use the four cardinal bits; walk cells use all eight. */
export const BIT = Object.freeze({ n: 1, ne: 2, e: 4, se: 8, s: 16, sw: 32, w: 64, nw: 128 });

/** All four cardinal exit bits together. */
export const ALL_EXITS = BIT.n | BIT.e | BIT.s | BIT.w;

/** Grid step for each direction; y grows southwards. */
export const STEP = Object.freeze({
    n: { dx: 0, dy: -1 },
    ne: { dx: 1, dy: -1 },
    e: { dx: 1, dy: 0 },
    se: { dx: 1, dy: 1 },
    s: { dx: 0, dy: 1 },
    sw: { dx: -1, dy: 1 },
    w: { dx: -1, dy: 0 },
    nw: { dx: -1, dy: -1 },
});

export const OPPOSITE = Object.freeze({ n: 's', ne: 'sw', e: 'w', se: 'nw', s: 'n', sw: 'ne', w: 'e', nw: 'se' });

const MIRROR_H = Object.freeze({ n: 'n', ne: 'nw', e: 'w', se: 'sw', s: 's', sw: 'se', w: 'e', nw: 'ne' });
const MIRROR_V = Object.freeze({ n: 's', ne: 'se', e: 'e', se: 'ne', s: 'n', sw: 'nw', w: 'w', nw: 'sw' });

/** @type {Orientation} */
export const IDENTITY = Object.freeze({ flipH: false, flipV: false });

/** @type {Orientation[]} */
export const ORIENTATIONS = [
    IDENTITY,
    Object.freeze({ flipH: true, flipV: false }),
    Object.freeze({ flipH: false, flipV: true }),
    Object.freeze({ flipH: true, flipV: true }),
];

/**
 * @param {Direction} direction
 * @param {Orientation} orientation
 * @returns {Direction}
 */
export function orientDirection(direction, orientation) {
    let result = direction;
    if (orientation.flipH) result = MIRROR_H[result];
    if (orientation.flipV) result = MIRROR_V[result];
    return result;
}

/**
 * @param {Iterable<Direction>} directions
 * @returns {number}
 */
export function toMask(directions) {
    let mask = 0;
    for (const direction of directions) mask |= BIT[direction];
    return mask;
}

/**
 * @param {number} mask
 * @returns {Direction[]}
 */
export function fromMask(mask) {
    return DIRECTIONS.filter((direction) => mask & BIT[direction]);
}

// Lookup tables so a whole 8-bit direction mask can be mirrored in one step: ORIENTED_MASK[orientationIndex][mask].
const ORIENTED_MASK = ORIENTATIONS.map((orientation) => {
    const table = new Uint8Array(256);
    for (let mask = 0; mask < 256; mask++) {
        table[mask] = toMask(fromMask(mask).map((direction) => orientDirection(direction, orientation)));
    }
    return table;
});

/**
 * @param {number} mask
 * @param {Orientation} orientation
 * @returns {number}
 */
export function orientMask(mask, orientation) {
    return ORIENTED_MASK[(orientation.flipH ? 1 : 0) + (orientation.flipV ? 2 : 0)][mask];
}
