import { shape } from './raster.js';

/**
 * Turns a tile spec across its top-left to bottom-right diagonal, so one drawing serves two layouts: a north-south
 * passage becomes an east-west one, and a room with its door to the south gets its door to the east. The generator's
 * own mirroring then covers the other two sides.
 *
 * Only the geometry and the furnishings are turned. The floor and walls are painted afterwards in the tile's own
 * coordinates, so floorboards keep running the same way on every tile and still line up.
 */

const SIDE = { n: 'w', w: 'n', s: 'e', e: 's', nw: 'nw', se: 'se', ne: 'sw', sw: 'ne' };
const KIND = { 'wall-h': 'wall-v', 'wall-v': 'wall-h' };

/**
 * @param {object} spec  A tile spec, as given to buildTileset().
 * @param {string} id    The turned tile's id.
 * @returns {object}
 */
export function transposed(spec, id) {
    return {
        ...spec,
        id,
        exits: spec.exits.map((side) => SIDE[side]),
        floor: flip(spec.floor),
        ...(spec.ground && { ground: flip(spec.ground) }),
        ...(spec.perimeter && { perimeter: spec.perimeter.map((side) => SIDE[side]) }),
        ...(Array.isArray(spec.runner) && { runner: spec.runner.map((side) => SIDE[side]) }),
        ...(spec.spawn && { spawn: spec.spawn.split(',').reverse().join(',') }),
        ...(spec.spots && { spots: spec.spots.map(transposeSpot) }),
        ...(spec.decorate && { decorate: (p) => spec.decorate({ ...p, cv: new TransposedCanvas(p.cv), block: (area) => p.block(flip(area)) }) }),
    };
}

/** A shape mirrored across the diagonal. */
export function flip(area) {
    if (!area || area instanceof Uint8Array) return area;
    const [x0, y0, x1, y1] = area.box;
    return shape((x, y) => area(y, x), [y0, x0, y1, x1]);
}

function transposeSpot(spot) {
    const [x, y, width, height] = spot.rect;
    return {
        ...spot,
        kind: KIND[spot.kind] ?? spot.kind,
        rect: [y, x, height, width],
        ...(spot.facing && { facing: SIDE[spot.facing] }),
    };
}

/** Draws on a canvas as if it were turned across the diagonal: every coordinate going in and out is swapped. */
class TransposedCanvas {
    constructor(cv) {
        this.cv = cv;
    }

    each(area, visit) {
        this.cv.each(flip(area), (x, y, index) => visit(y, x, index));
    }

    paint(area, colour, alpha = 1) {
        this.cv.paint(
            flip(area),
            typeof colour === 'function' ? (x, y, index) => colour(y, x, index) : colour,
            typeof alpha === 'function' ? (x, y, index) => alpha(y, x, index) : alpha,
        );
    }

    glow(cx, cy, radius, colour, intensity) {
        this.cv.glow(cy, cx, radius, colour, intensity);
    }

    shadowCircle(cx, cy, r, spread, strength) {
        this.cv.shadowCircle(cy, cx, r, spread, strength);
    }

    shadowRect(x0, y0, x1, y1, spread, strength) {
        this.cv.shadowRect(y0, x0, y1, x1, spread, strength);
    }

    dim(index, amount) {
        this.cv.dim(index, amount);
    }

    over(index, colour, alpha) {
        this.cv.over(index, colour, alpha);
    }
}
