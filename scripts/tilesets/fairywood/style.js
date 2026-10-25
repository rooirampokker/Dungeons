import { TILE, WALL } from '../lib/layout.js';
import { circle, fbm, hash, hex, mix, noise, shade } from '../lib/raster.js';

/**
 * The look shared by every Fairy Wood tile: treetops crowding in on every side, a ragged edge of ferns and
 * undergrowth, winding paths of trodden earth, and the meadow grass of the clearings.
 *
 * Lighting never comes from one side, so tiles still look right when the game mirrors them.
 */

export const P = {
    canopyDeep: hex('#0c1f14'),
    canopy: hex('#1b3a22'),
    canopyLight: hex('#3a6a34'),
    leafLight: hex('#6f9e45'),
    fern: hex('#2c5a2a'),
    fernLight: hex('#5f9440'),
    moss: hex('#5b8a3a'),
    dirt: hex('#7a6040'),
    dirtLight: hex('#a07f55'),
    dirtDark: hex('#4f3d29'),
    grass: hex('#527f34'),
    grassLight: hex('#7ea447'),
    meadow: hex('#4a7531'),
    clover: hex('#457a35'),
    blossom: hex('#eaa9cb'),
    lilac: hex('#b79ad9'),
    buttercup: hex('#f4e26a'),
    daisy: hex('#f8f6ec'),
    bluebell: hex('#8fb7f2'),
    poppy: hex('#e0533c'),
    water: hex('#3b7d96'),
    waterDeep: hex('#1f4a5e'),
    waterLight: hex('#aee4f0'),
    stone: hex('#9a988a'),
    stoneDark: hex('#5f5e55'),
    wood: hex('#6b4a2e'),
    woodLight: hex('#93703f'),
    bark: hex('#45311f'),
    toadstool: hex('#c8412f'),
    glow: hex('#fff1a8'),
    fairy: hex('#c9f2ff'),
    firefly: hex('#e9ff9c'),
    violet: hex('#8e6ad0'),
    cloak: hex('#3e6b3a'),
    cloakLight: hex('#5c8c4a'),
    soot: hex('#14100c'),
    white: hex('#fbfaf4'),
};

/** Colours for treetops: mostly greens, now and then a tree in blossom. */
const CROWNS = [P.canopy, P.canopyLight, hex('#2e5a33'), hex('#456f2f'), hex('#2a4f3a')];
const BLOSSOMS = [P.blossom, P.lilac];

/**
 * Paints canopy, undergrowth and ground for a tile and returns the distance fields that decorations use.
 * @param {import('../lib/raster.js').Canvas} cv
 * @param {object} spec           floor, style ('path' or 'hall'), hallRect, perimeter, blossom (0-1).
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
            colour = inHall ? meadowGrass(x, y, seed, spec) : forestPath(x, y, edge, seed);
            colour = shade(colour, 1 - 0.38 * Math.exp(-edge / 3.5));
        } else {
            // The undergrowth's edge is ragged, so the path seems to wind through it.
            const reach = WALL * (0.55 + 1.0 * fbm(seed + 601, x * 0.12, y * 0.12, 3));
            colour = d <= reach ? undergrowth(x, y, d / reach, seed) : canopy(x, y, seed);
        }
        cv.r[index] = colour[0];
        cv.g[index] = colour[1];
        cv.b[index] = colour[2];
        cv.a[index] = 1;
    });

    treetops(cv, toFloor, seed, spec.blossom ?? 0.12);
    return { floor, toFloor, toEdge };
}

/** Dense foliage, seen from above. */
export function canopy(x, y, seed) {
    const clumps = fbm(seed + 603, x * 0.07, y * 0.07, 4);
    const sprigs = noise(seed + 607, x * 0.32, y * 0.32);
    const leaves = noise(seed + 605, x * 0.9, y * 0.9);
    let colour = mix(P.canopyDeep, P.canopy, Math.min(1, clumps * 1.4));
    if (clumps > 0.52) colour = mix(colour, P.canopyLight, (clumps - 0.52) * 1.4);
    return shade(colour, 0.7 + sprigs * 0.35 + (leaves - 0.5) * 0.15);
}

/** Ferns and bushes along the path: lumpy, lit on top, in shadow underneath. */
function undergrowth(x, y, t, seed) {
    const bushes = fbm(seed + 609, x * 0.22, y * 0.22, 3);
    const fronds = noise(seed + 611, x * 0.7, y * 0.7);
    let colour = mix(P.fern, P.fernLight, Math.max(0, Math.min(1, bushes * 1.5 - 0.25 - t * 0.3)));
    colour = shade(colour, 0.75 + fronds * 0.35);
    if (t > 0.8) colour = mix(colour, P.canopyDeep, (t - 0.8) * 3);
    // A few flowers poke out of the undergrowth.
    const flower = hash(seed + 613, Math.floor(x * 0.8), Math.floor(y * 0.8));
    if (flower > 0.985) return [P.daisy, P.buttercup, P.blossom, P.bluebell][Math.floor(flower * 1000) % 4];
    return colour;
}

/** A trodden earth path, grassy towards its edges, with leaf litter and pebbles. */
function forestPath(x, y, edge, seed) {
    const wobble = (fbm(seed + 621, x * 0.08, y * 0.08, 3) - 0.5) * 8;
    const grassiness = Math.max(0, Math.min(1, (9 - edge - wobble) / 6));
    let earth = mix(P.dirtDark, P.dirtLight, 0.35 + fbm(seed + 623, x * 0.1, y * 0.1, 4) * 0.65);
    earth = shade(earth, 0.92 + (noise(seed + 625, x * 1.1, y * 1.1) - 0.5) * 0.2);
    let grass = mix(P.grass, P.grassLight, noise(seed + 627, x * 0.7, y * 0.7));
    grass = shade(grass, 0.85 + noise(seed + 629, x * 2.2, y * 2.2) * 0.3);
    let colour = mix(earth, grass, grassiness);

    const pebble = noise(seed + 631, x * 0.6, y * 0.6);
    if (grassiness < 0.4 && pebble > 0.86) colour = mix(P.stone, P.stoneDark, (pebble - 0.86) * 5);
    const leaf = hash(seed + 633, Math.floor(x * 0.7), Math.floor(y * 0.7));
    if (leaf > 0.975) colour = mix(colour, [P.woodLight, P.buttercup, P.poppy][Math.floor(leaf * 1000) % 3], 0.5);
    return colour;
}

/**
 * The meadow grass of a clearing, scattered with flowers, with a thick fringe of them along its outer edge.
 */
function meadowGrass(x, y, seed, spec) {
    const [x0, y0, x1, y1] = spec.hallRect;
    const sides = spec.perimeter ?? [];
    const toPerimeter = Math.min(
        sides.includes('n') ? y - y0 : Infinity,
        sides.includes('s') ? y1 - y : Infinity,
        sides.includes('w') ? x - x0 : Infinity,
        sides.includes('e') ? x1 - x : Infinity,
    );
    let colour = mix(P.meadow, P.grassLight, fbm(seed + 641, x * 0.04, y * 0.04, 3) * 0.6);
    const clover = fbm(seed + 643, x * 0.12 + 50, y * 0.12, 3);
    if (clover > 0.58) colour = mix(colour, P.clover, Math.min(0.8, (clover - 0.58) * 2.5));
    colour = shade(colour, 0.7 + fbm(seed + 649, x * 0.09, y * 0.09, 3) * 0.3 + (noise(seed + 645, x * 1.6, y * 1.6) - 0.5) * 0.28);
    // Tufts of grass.
    if (noise(seed + 644, x * 0.9, y * 2.4) > 0.8) colour = shade(colour, 1.15);
    // Longer grass grows along the edge of the clearing.
    if (toPerimeter < 9) colour = mix(colour, P.fern, (9 - toPerimeter) / 18);

    const density = toPerimeter < 14 ? 0.06 : 0.012;
    const flower = hash(seed + 647, Math.floor(x * 0.7), Math.floor(y * 0.7));
    if (flower > 1 - density) return [P.daisy, P.buttercup, P.blossom, P.bluebell, P.poppy][Math.floor(flower * 10000) % 5];
    return colour;
}

/**
 * Round treetops crowding the canopy, kept away from the path so its edge stays clear. Their positions are
 * jittered on a grid inside the tile, so each tile's trees are its own.
 */
function treetops(cv, toFloor, seed, blossomShare) {
    const step = 26;
    const crowns = [];
    for (let gy = 0; gy < Math.ceil(TILE / step); gy++) {
        for (let gx = 0; gx < Math.ceil(TILE / step); gx++) {
            const r = 12 + hash(seed + 651, gx, gy) * 9;
            const x = (gx + 0.5) * step + (hash(seed + 653, gx, gy) - 0.5) * 12;
            const y = (gy + 0.5) * step + (hash(seed + 655, gx, gy) - 0.5) * 12;
            if (x - r < 0 || y - r < 0 || x + r > TILE || y + r > TILE) continue;
            // Crowns may overhang the undergrowth a little, but never the path itself.
            if (nearestFloor(cv, toFloor, x, y) < r * 0.75 + 2) continue;
            const blossom = hash(seed + 657, gx, gy) < blossomShare;
            const colours = blossom ? BLOSSOMS : CROWNS;
            crowns.push({ x, y, r, colour: colours[Math.floor(hash(seed + 659, gx, gy) * colours.length)], seed: seed + gx * 7 + gy * 13 });
        }
    }
    // Smaller crowns are drawn last, so they nestle among the big ones.
    crowns.sort((a, b) => b.r - a.r);
    for (const crown of crowns) treetop(cv, crown.x, crown.y, crown.r, crown.colour, crown.seed);
}

/** One tree's crown: a soft shadow, then leafy clumps with a ragged edge, lighter towards the middle. */
export function treetop(cv, x, y, r, colour, seed) {
    cv.shadowCircle(x, y, r * 0.9, 6, 0.55);
    cv.paint(circle(x, y, r), (px, py) => {
        const d = Math.hypot(px - x, py - y) / r;
        const angle = Math.atan2(py - y, px - x);
        const edge = 0.86 + 0.14 * noise(seed + 1, Math.cos(angle) * 2.5 + 10, Math.sin(angle) * 2.5 + 10);
        if (d > edge) return null;
        const clusters = noise(seed, px * 0.32, py * 0.32);
        const leaves = noise(seed + 2, px * 1.1, py * 1.1);
        return shade(colour, 1.25 - 0.6 * (d / edge) ** 2 + (clusters - 0.5) * 0.45 + (leaves - 0.5) * 0.12);
    });
}

function nearestFloor(cv, toFloor, x, y) {
    const i = Math.floor((x + cv.margin) * cv.scale);
    const j = Math.floor((y + cv.margin) * cv.scale);
    return toFloor[j * cv.cols + i];
}

/** Moss and soft green creeping over the ground; `amount` 0-1. */
export function mossy(p, amount) {
    const { cv, floor, toEdge, seed } = p;
    cv.paint(floor, P.moss, (x, y, index) => Math.max(0, fbm(seed + 661, x * 0.1, y * 0.1, 3) - 0.55 + Math.exp(-toEdge[index] / 6) * 0.2) * amount * 2);
}

/** Fallen leaves drifted across the ground; `amount` 0-1. */
export function leafLitter(p, amount) {
    const { cv, floor, seed } = p;
    cv.paint(floor, (x, y) => (hash(seed + 663, Math.floor(x * 1.2), Math.floor(y * 1.2)) > 1 - 0.04 * amount
        ? [P.woodLight, P.buttercup, P.poppy, P.dirtLight][Math.floor(hash(seed + 665, Math.floor(x), Math.floor(y)) * 4)]
        : null));
}

function inside(box, x, y) {
    return box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
}
