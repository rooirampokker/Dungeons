import { rect, union } from './raster.js';

/**
 * Geometry shared by the code-drawn tilesets: tile and walk-cell sizes, corridor and room outlines, the spots
 * where overlays can go, and the pieces great halls are built from. A tileset supplies its own look on top.
 *
 * Corridors always leave a tile through the middle two walk cells of a side, so tiles from the same set join up.
 */

export const TILE = 140;
export const SUB_GRID = 6;
export const CELL = TILE / SUB_GRID;
/** Thickness of the wall around every floor, in pixels. */
export const WALL = 7;
/** How far past the tile edge masks reach, so corridors that leave the tile stay open at the edge. */
export const MARGIN = 24;
/** Far enough past the tile edge to count as "continues into the next tile". */
export const BEYOND = 400;

const C = CELL;
const B = BEYOND;

/** A corridor's way out through each side, from the middle of the tile to beyond its edge. */
export const arm = {
    n: rect(2 * C, -B, 4 * C, 3 * C),
    s: rect(2 * C, 3 * C, 4 * C, B),
    e: rect(3 * C, 2 * C, B, 4 * C),
    w: rect(-B, 2 * C, 3 * C, 4 * C),
};
export const hub = rect(2 * C, 2 * C, 4 * C, 4 * C);

/** A plain corridor joining the given sides. */
export const corridor = (...exits) => union(hub, ...exits.map((side) => arm[side]));

/** A square room, `inset` cells in from each side, with corridors out through the given sides. */
export const chamber = (exits, inset = 1) => union(rect(inset * C, inset * C, (6 - inset) * C, (6 - inset) * C), ...exits.map((side) => arm[side]));

/** Middle of the wall on the west side of a north-south corridor (and the north side of an east-west one). */
export const corridorWall = 2 * C - WALL / 2;

// ---------------------------------------------------------------- overlay spots

/** Open floor, centred on (x, y). */
export function floorSpot(x, y, width, height, options = {}) {
    return { kind: 'floor', rect: [x - width / 2, y - height / 2, width, height], chance: 0.4, ...options };
}

/**
 * A stretch of wall from `from` to `to`. `side` is the floor's side the wall is on and `edge` where the floor stops,
 * so the spot covers the top of the wall and a strip of floor in front of it.
 */
export function wallSpot(side, edge, from, to, options = {}) {
    const depth = WALL + 8;
    const rects = {
        n: [from, edge - WALL, to - from, depth],
        s: [from, edge - 8, to - from, depth],
        w: [edge - WALL, from, depth, to - from],
        e: [edge - 8, from, depth, to - from],
    };
    return { kind: side === 'n' || side === 's' ? 'wall-h' : 'wall-v', facing: side, rect: rects[side], chance: 0.35, ...options };
}

/** The floor's corner at (x, y); `corner` says which corner of the room it is. */
export function cornerSpot(corner, x, y, size = 20, options = {}) {
    const left = corner.includes('e') ? x - size : x;
    const top = corner.includes('s') ? y - size : y;
    return { kind: 'corner', facing: corner, rect: [left, top, size, size], chance: 0.35, ...options };
}

/** Solid ground, on tiles with no floor. */
export function rockSpot(x, y, width, height) {
    return { kind: 'rock', rect: [x - width / 2, y - height / 2, width, height], chance: 0.45 };
}

/** The usual spots in a room off a corridor: a big patch of floor, the corners, and the walls without a door. */
export function chamberSpots(exit) {
    const walls = ['n', 's', 'w', 'e'].filter((side) => side !== exit);
    const edges = { n: C, s: 5 * C, w: C, e: 5 * C };
    return [
        floorSpot(3 * C, 2.85 * C, 64, 48, { chance: 0.5 }),
        cornerSpot('nw', C, C, 20, { canBlock: true }),
        cornerSpot('ne', 5 * C, C, 20, { canBlock: true }),
        cornerSpot('sw', C, 5 * C, 20, { canBlock: true }),
        cornerSpot('se', 5 * C, 5 * C, 20, { canBlock: true }),
        ...walls.map((side) => wallSpot(side, edges[side], 2 * C, 4 * C)),
    ];
}

// ---------------------------------------------------------------- great halls

const PERIMETER = { nw: ['n', 'w'], n: ['n'], ne: ['n', 'e'], w: ['w'], c: [], e: ['e'], sw: ['s', 'w'], s: ['s'], se: ['s', 'e'] };
const SIDES = ['n', 'e', 's', 'w'];
const EDGE = { n: C, s: 5 * C, w: C, e: 5 * C };

/**
 * A piece of a great hall, for the generator to assemble rooms of any size from: a corner, an edge (with or
 * without a door) or a centre. The hall's outer wall runs one cell in from the tile edge; inside the hall the
 * floor carries on into the neighbouring pieces.
 *
 * @param {string} prefix  Tile ids are `${prefix}-${slot}`, then '-door' and `suffix` where given.
 * @param {string} slot    nw, n, ne, w, c, e, sw, s or se.
 * @param {object} [options]
 * @param {boolean} [options.door]        A doorway through the outer wall.
 * @param {string} [options.suffix]
 * @param {string[]} [options.tags]
 * @param {number} [options.weight]
 * @param {boolean} [options.wallSpots]   Offer the plain wall for overlays. Turn off when it's furnished.
 * @param {boolean} [options.openCentre]  Centre pieces: offer the middle of the floor for overlays.
 * @param {(p: object) => void} [options.decorate]
 */
export function roomPiece(prefix, slot, { door = false, suffix = '', tags = [], weight, wallSpots = true, openCentre = true, decorate } = {}) {
    const perimeter = PERIMETER[slot];
    const hallRect = [
        perimeter.includes('w') ? C : -B,
        perimeter.includes('n') ? C : -B,
        perimeter.includes('e') ? 5 * C : B,
        perimeter.includes('s') ? 5 * C : B,
    ];
    const doorSide = door ? perimeter[0] : null;
    return {
        id: `${prefix}-${slot}${door ? '-door' : ''}${suffix}`,
        role: 'room',
        roomSlot: slot,
        exits: SIDES.filter((side) => !perimeter.includes(side) || side === doorSide),
        tags,
        weight,
        style: 'hall',
        hallRect,
        perimeter,
        floor: union(rect(...hallRect), doorSide ? arm[doorSide] : null),
        decorate,
        spots: roomPieceSpots(slot, { door, wallSpots, openCentre }),
    };
}

/**
 * Between the columns on plain walls, in the corner, and on the floor away from doors. Centre pieces have a large
 * patch of floor in the middle unless they're furnished there.
 */
function roomPieceSpots(slot, { door, wallSpots, openCentre }) {
    if (slot === 'c') {
        return [
            ...(openCentre ? [floorSpot(3 * C, 3 * C, 64, 48, { chance: 0.45 })] : []),
            ...[[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]].map(([x, y]) => floorSpot(x * C, y * C, 24, 24, { canBlock: true, chance: 0.25 })),
        ];
    }
    const spots = [];
    if (slot.length === 2) spots.push(cornerSpot(slot, slot.includes('e') ? 5 * C : C, slot.includes('s') ? 5 * C : C, 20, { canBlock: true }));
    if (!door && wallSpots && slot.length === 1) spots.push(wallSpot(slot, EDGE[slot], 1.7 * C, 4.3 * C, { chance: 0.5 }));
    // Floor further into the hall, clear of the columns and any doorway.
    const inward = { n: [3, 3.5], s: [3, 2.5], w: [3.5, 3], e: [2.5, 3], nw: [3.5, 3.5], ne: [2.5, 3.5], sw: [3.5, 2.5], se: [2.5, 2.5] }[slot];
    if (door) {
        const across = slot === 'n' || slot === 's';
        for (const offset of [-1.5, 1.5]) {
            const [x, y] = across ? [3 + offset, inward[1]] : [inward[0], 3 + offset];
            spots.push(floorSpot(x * C, y * C, 24, 24, { canBlock: true, chance: 0.3 }));
        }
    } else {
        spots.push(floorSpot(inward[0] * C, inward[1] * C, 26, 26, { canBlock: true, chance: 0.3 }));
    }
    return spots;
}
