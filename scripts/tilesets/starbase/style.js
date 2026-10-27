import { CELL, WALL } from '../lib/layout.js';
import { fbm, hash, hex, mix, noise, shade } from '../lib/raster.js';

/**
 * The look shared by every Starbase tile: dark hull machinery outside the walls, bulkheads with lit trim, bolted
 * deck plates, and the polished floor of the hangars.
 *
 * Lighting never comes from one side, so tiles still look right when the game mirrors them.
 */

export const P = {
    hull: hex('#16191e'),
    hullLight: hex('#2b3038'),
    bulkhead: hex('#7c838c'),
    bulkheadLight: hex('#c3c9d0'),
    bulkheadDark: hex('#2a2e34'),
    deck: hex('#4b5058'),
    deckDark: hex('#383c43'),
    seam: hex('#1d2025'),
    hangar: hex('#1a1e24'),
    hangarLine: hex('#2d333b'),
    hazard: hex('#d6a21f'),
    trim: hex('#bfe0ff'),
    glow: hex('#7fc4ff'),
    red: hex('#ff3b30'),
    redGlow: hex('#ff6a4d'),
    amber: hex('#ffb02e'),
    green: hex('#5dff8a'),
    holo: hex('#86d8ff'),
    white: hex('#eef2f6'),
    metal: hex('#8d949c'),
    metalDark: hex('#4a5058'),
    gunmetal: hex('#30353c'),
    olive: hex('#5a5f4a'),
    rust: hex('#7a4a2c'),
    cloth: hex('#5c4632'),
    clothLight: hex('#8a6f4f'),
    coolant: hex('#2c4f5a'),
    soot: hex('#0c0d0f'),
    space: hex('#05060a'),
};

/**
 * Paints hull, bulkheads and floor for a tile and returns the distance fields that decorations use.
 * @param {import('../lib/raster.js').Canvas} cv
 * @param {object} spec           See gormenghast/style.js: floor, style ('deck' or 'hall'), hallRect, perimeter.
 * @param {number} seed
 */
export function paintStructure(cv, spec, seed) {
    const floor = cv.mask(spec.floor);
    const toFloor = cv.distance(floor);
    const toEdge = cv.distance(floor.map((value) => 1 - value));

    cv.each(null, (x, y, index) => {
        const d = toFloor[index];
        let colour;
        if (d === 0) {
            const edge = toEdge[index];
            const inHall = spec.style === 'hall' && inside(spec.hallRect, x, y);
            colour = inHall ? hangarFloor(x, y, seed, spec) : deckPlate(x, y, seed);
            colour = shade(colour, 1 - 0.4 * Math.exp(-edge / 2.5));
            // A strip light runs along the foot of every wall, its light spilling onto the floor.
            if (edge > 2.2 && edge < 3.3) colour = mix(colour, P.trim, 0.75);
            else if (edge >= 3.3 && edge < 9) colour = mix(colour, P.glow, 0.16 * (1 - (edge - 3.3) / 5.7));
        } else if (d <= WALL) {
            colour = bulkhead(cv, x, y, d, index, toFloor, seed);
        } else {
            colour = hullPlating(x, y, seed);
        }
        cv.r[index] = colour[0];
        cv.g[index] = colour[1];
        cv.b[index] = colour[2];
        cv.a[index] = 1;
    });

    return { floor, toFloor, toEdge };
}

/** Machinery and plating on the far side of the walls: panels, vents, pipes and the odd warning light. */
export function hullPlating(x, y, seed) {
    const size = CELL / 2;
    const bx = Math.floor(x / size);
    const by = Math.floor(y / size);
    const fx = x - bx * size;
    const fy = y - by * size;
    const kind = hash(seed + 401, bx, by);
    let colour = mix(P.hull, P.hullLight, 0.15 + hash(seed + 403, bx, by) * 0.35 + (fbm(seed + 405, x * 0.05, y * 0.05, 3) - 0.5) * 0.4);

    const seam = Math.min(fx, size - fx, fy, size - fy);
    if (seam < 0.6) return shade(colour, 0.45);
    if (kind < 0.18) {
        // vent slits
        if (fx > 2 && fx < size - 2 && fy > 2 && fy < size - 2 && Math.floor(fy / 1.6) % 2 === 0) colour = shade(colour, 0.5);
    } else if (kind < 0.3) {
        // a pipe run
        const across = hash(seed + 407, bx, by) < 0.5 ? fx : fy;
        const pipe = Math.abs(across - size / 2);
        if (pipe < 2.2) colour = shade(P.metalDark, 0.8 + (1 - pipe / 2.2) * 0.5);
    } else if (kind < 0.34) {
        // a warning light
        const light = Math.hypot(fx - size / 2, fy - size / 2);
        if (light < 1.1) colour = hash(seed + 409, bx, by) < 0.5 ? P.red : P.white;
        else if (light < 3.5) colour = mix(colour, P.redGlow, 0.25 * (1 - light / 3.5));
    } else if (kind < 0.6) {
        // an inset panel
        if (seam > 2 && seam < 2.6) colour = shade(colour, 0.65);
        else if (seam >= 2.6) colour = shade(colour, 1.1);
    }
    return shade(colour, 0.92 + noise(seed + 411, x * 0.9, y * 0.9) * 0.12);
}

/** The top of a bulkhead, `d` pixels out from the floor's edge. */
function bulkhead(cv, x, y, d, index, toFloor, seed) {
    const t = d / WALL;
    const gx = toFloor[index + 1] - toFloor[index - 1];
    const gy = toFloor[index + cv.cols] - toFloor[index - cv.cols];
    const along = Math.abs(gx) > Math.abs(gy) ? y : x;
    const segment = Math.floor(along / 10);
    const joint = ((along % 10) + 10) % 10;

    let colour = mix(P.bulkhead, P.bulkheadLight, 0.2 + hash(seed + 421, segment, 0) * 0.15);
    colour = shade(colour, 0.92 + noise(seed + 423, x * 0.6, y * 0.6) * 0.1);
    if (Math.min(joint, 10 - joint) < 0.45) colour = shade(colour, 0.55);

    if (t < 0.15) return shade(P.bulkheadDark, 0.6);
    if (t < 0.32) return mix(colour, P.bulkheadLight, 0.6);
    if (t > 0.86) return P.bulkheadDark;
    // Now and then, a small indicator light set into the wall top.
    if (hash(seed + 425, segment, 1) < 0.12 && Math.abs(t - 0.6) < 0.12 && Math.abs(joint - 5) < 1.4) {
        return hash(seed + 427, segment, 2) < 0.5 ? P.glow : P.amber;
    }
    return colour;
}

/** Deck plates, one walk cell square, with bolts at the corners. Seams fall on the tile edges, so corridors join up. */
function deckPlate(x, y, seed) {
    const px = Math.floor(x / CELL);
    const py = Math.floor(y / CELL);
    const fx = x - px * CELL;
    const fy = y - py * CELL;
    const tone = hash(seed + 431, px, py);
    let colour = mix(P.deckDark, P.deck, 0.55 + tone * 0.45);
    colour = shade(colour, 0.9 + fbm(seed + 433, x * 0.06, y * 0.06, 3) * 0.18 + (noise(seed + 435, x * 1.2, y * 1.2) - 0.5) * 0.05);

    const seam = Math.min(fx, CELL - fx, fy, CELL - fy);
    if (seam < 0.6) return P.seam;
    if (seam < 1.5) colour = shade(colour, 1.14);
    else if (seam < 2.2) colour = shade(colour, 0.9);

    // Every few plates is an inset grating.
    if (tone < 0.12 && seam > 3) {
        const hole = Math.min(((fx - 3) % 2.6 + 2.6) % 2.6, ((fy - 3) % 2.6 + 2.6) % 2.6);
        colour = hole < 1.1 ? mix(P.soot, P.amber, 0.12) : shade(P.metalDark, 0.85);
    }
    for (const [bx, by] of [[3.2, 3.2], [CELL - 3.2, 3.2], [3.2, CELL - 3.2], [CELL - 3.2, CELL - 3.2]]) {
        const bolt = Math.hypot(fx - bx, fy - by);
        if (bolt < 0.9) colour = shade(P.metal, 0.9);
        else if (bolt < 1.3) colour = shade(colour, 0.6);
    }
    const oil = fbm(seed + 437, x * 0.05 + 30, y * 0.05, 4);
    if (oil > 0.63) colour = mix(colour, P.soot, Math.min(0.4, (oil - 0.63) * 2.5));
    return colour;
}

/**
 * The hangar floor: polished dark panels, hazard stripes and a red guide line along the outer walls. The pattern
 * repeats every 35 pixels so hangar pieces line up.
 */
function hangarFloor(x, y, seed, spec) {
    const [x0, y0, x1, y1] = spec.hallRect;
    const sides = spec.perimeter ?? [];
    const toPerimeter = Math.min(
        sides.includes('n') ? y - y0 : Infinity,
        sides.includes('s') ? y1 - y : Infinity,
        sides.includes('w') ? x - x0 : Infinity,
        sides.includes('e') ? x1 - x : Infinity,
    );
    if (toPerimeter < 4) return shade(P.hangar, 0.8);
    if (toPerimeter < 10) return Math.floor((x + y) / 4) % 2 ? P.hazard : P.soot;
    if (toPerimeter < 12.5) return shade(P.hangar, 0.9);
    if (toPerimeter < 13.8) return P.red;

    let colour = shade(P.hangar, 0.85 + fbm(seed + 441, x * 0.025, y * 0.025, 3) * 0.45);
    const jx = ((x % 35) + 35) % 35;
    const jy = ((y % 35) + 35) % 35;
    if (Math.min(jx, 35 - jx, jy, 35 - jy) < 0.6) colour = P.hangarLine;
    // A soft sheen, as if the floor were polished.
    const sheen = noise(seed + 443, x * 0.04, y * 0.04);
    if (sheen > 0.6) colour = mix(colour, P.hangarLine, (sheen - 0.6) * 1.2);
    return colour;
}

/** Soot and scorch marks, e.g. from blaster fire; `amount` 0-1. */
export function scorch(p, amount) {
    const { cv, floor, seed } = p;
    cv.paint(floor, P.soot, (x, y) => Math.max(0, fbm(seed + 451, x * 0.06, y * 0.06, 4) - 0.5) * amount * 2.4);
}

/** Oil and grime on the deck; `amount` 0-1. */
export function grime(p, amount) {
    const { cv, floor, seed } = p;
    cv.paint(floor, P.soot, (x, y) => Math.max(0, fbm(seed + 453, x * 0.07, y * 0.07, 3) - 0.48) * amount);
}

function inside(box, x, y) {
    return box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
}
