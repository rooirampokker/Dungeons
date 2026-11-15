import { CELL, WALL } from '../lib/layout.js';
import { fbm, hash, hex, mix, noise, shade } from '../lib/raster.js';

/**
 * The look shared by every Gormenghast tile: the palette, the castle's dark masonry, the walls around each
 * floor, and the floors themselves.
 *
 * Lighting never comes from one side, so tiles still look right when the game mirrors them.
 */

export { BEYOND, CELL, MARGIN, TILE, WALL } from '../lib/layout.js';

export const P = {
    rock: hex('#1d201b'),
    rockLight: hex('#33372e'),
    lichen: hex('#6c7556'),
    wall: hex('#857d69'),
    wallDark: hex('#4f4a3f'),
    flags: [hex('#7a7262'), hex('#857c68'), hex('#6c675a'), hex('#8a7f66'), hex('#6e7166'), hex('#7d705c')],
    mortar: hex('#2a2721'),
    hallLight: hex('#756d5d'),
    hallDark: hex('#45453f'),
    hallBorder: hex('#34332e'),
    inlay: hex('#a8873f'),
    moss: hex('#3d5230'),
    mossLight: hex('#5f7742'),
    water: hex('#1f3133'),
    waterDeep: hex('#111c1e'),
    waterLight: hex('#7c9898'),
    wood: hex('#5a3e2b'),
    woodDark: hex('#2f2118'),
    woodLight: hex('#7a5a3c'),
    crimson: hex('#6f1d1b'),
    crimsonLight: hex('#94302a'),
    gold: hex('#b8944a'),
    cream: hex('#e4d9c0'),
    parchment: hex('#d8c9a3'),
    flame: hex('#ffe08a'),
    ember: hex('#ff7a26'),
    glow: hex('#ffad55'),
    iron: hex('#262624'),
    stone: hex('#918a79'),
    marble: hex('#d3cdbd'),
    dust: hex('#8c8473'),
    soot: hex('#141210'),
    white: hex('#efebe2'),
    books: ['#6b2d2b', '#2f4a3a', '#3c3f5e', '#7a6a3a', '#5a3b2a', '#4d2c40', '#8a7b5c', '#2d3c4f', '#6e5130'].map(hex),
    paint: ['#a3352a', '#b98a31', '#2f706a', '#36538f', '#527d34', '#6c4178', '#b4552c'].map(hex),
};

/**
 * Paints rock, walls and floor for a tile and returns the distance fields that decorations use.
 *
 * @param {import('../lib/raster.js').Canvas} cv
 * @param {object} spec
 * @param {import('../lib/raster.js').Shape} spec.floor   Walkable surface, continuing past the edge where open.
 * @param {'flag'|'hall'} [spec.style]
 * @param {number[]} [spec.hallRect]                      For 'hall' floors: the room's own rectangle.
 * @param {string[]} [spec.perimeter]                     For 'hall' floors: sides with the room's outer wall.
 * @param {number} seed
 */
export function paintStructure(cv, spec, seed) {
    const floor = cv.mask(spec.floor);
    const toFloor = cv.distance(floor);
    const toEdge = cv.distance(floor.map((value) => 1 - value));
    const slabs = flagstoneRows(seed);

    cv.each(null, (x, y, index) => {
        const d = toFloor[index];
        let colour;
        if (d === 0) {
            const inHall = spec.style === 'hall' && inside(spec.hallRect, x, y);
            colour = inHall ? hallFloor(x, y, seed, spec) : flagstone(x, y, seed, slabs);
            const edge = toEdge[index];
            colour = shade(colour, 1 - 0.45 * Math.exp(-edge / 3) - 0.18 * Math.exp(-edge / 11));
        } else if (d <= WALL) {
            colour = wallTop(cv, x, y, d, index, toFloor, seed);
        } else {
            colour = masonry(x, y, seed);
        }
        cv.r[index] = colour[0];
        cv.g[index] = colour[1];
        cv.b[index] = colour[2];
        cv.a[index] = 1;
    });

    return { floor, toFloor, toEdge };
}

/** The castle's bulk: big dark ashlar blocks with lichen. Joints line up with the tile edges. */
export function masonry(x, y, seed) {
    const rowHeight = CELL;
    const blockWidth = 2 * CELL;
    const row = Math.floor(y / rowHeight);
    const offset = (row & 1) * CELL;
    const column = Math.floor((x + offset) / blockWidth);
    const jx = (((x + offset) % blockWidth) + blockWidth) % blockWidth;
    const jy = ((y % rowHeight) + rowHeight) % rowHeight;
    const joint = Math.min(jx, blockWidth - jx, jy, rowHeight - jy);

    const tone = hash(seed + 7, column, row);
    const cloud = fbm(seed, x * 0.07, y * 0.07, 4);
    const grain = noise(seed + 3, x * 0.8, y * 0.8);
    let colour = mix(P.rock, P.rockLight, clamp01(0.15 + tone * 0.3 + (cloud - 0.5) * 0.9 + (grain - 0.5) * 0.3));
    if (joint < 0.8) colour = shade(colour, 0.6 + joint * 0.3);
    if (noise(seed + 5, x * 0.35, y * 0.35) > 0.8) colour = shade(colour, 0.8); // pitting

    const lichen = fbm(seed + 11, x * 0.2, y * 0.2, 3);
    if (lichen > 0.64) colour = mix(colour, P.lichen, Math.min(0.32, (lichen - 0.64) * 2.5));
    return colour;
}

/** The top of the wall around a floor, `d` pixels out from the floor's edge. */
function wallTop(cv, x, y, d, index, toFloor, seed) {
    const t = d / WALL;
    const cloud = fbm(seed + 21, x * 0.16, y * 0.16, 3);
    let colour = mix(P.wallDark, P.wall, clamp01(0.3 + cloud * 0.9 + (noise(seed + 23, x, y) - 0.5) * 0.25));

    // Block joints run across the wall: horizontal lines on walls running north-south, and vice versa.
    const gx = toFloor[index + 1] - toFloor[index - 1];
    const gy = toFloor[index + cv.cols] - toFloor[index - cv.cols];
    const along = Math.abs(gx) > Math.abs(gy) ? y : x;
    const joint = ((along % 10) + 10) % 10;
    if (Math.min(joint, 10 - joint) < 0.55) colour = shade(colour, 0.62);

    if (t < 0.2) colour = shade(colour, 0.25 + t * 2.4);          // the drop down to the floor
    else if (t > 0.86) colour = shade(colour, 0.5);                 // where the wall meets the masonry
    else colour = shade(colour, 1 + 0.14 * Math.sin(Math.PI * (t - 0.2) / 0.66));
    return colour;
}

/**
 * Flagstones: one row per walk cell, each row split into slabs of one or one and a half cells. Joints always fall
 * on the tile edges, so corridors carry on cleanly into the next tile.
 */
function flagstoneRows(seed) {
    const rows = [];
    for (let row = 0; row < 6; row++) {
        const joints = [0];
        let halves = 0;
        let k = 0;
        while (halves < 12) {
            halves = Math.min(12, halves + (hash(seed + 51, row, k++) < 0.55 ? 2 : 3));
            joints.push((halves * CELL) / 2);
        }
        rows.push(joints);
    }
    return rows;
}

function flagstone(x, y, seed, slabs) {
    const row = Math.max(0, Math.min(5, Math.floor(y / CELL)));
    const joints = slabs[row];
    let k = 0;
    while (k < joints.length - 2 && x >= joints[k + 1]) k++;
    const id = row * 16 + k;

    let colour = P.flags[Math.floor(hash(seed + 37, id, 1) * P.flags.length)];
    colour = shade(colour, 0.7 + hash(seed + 31, id, 2) * 0.2);
    // Large, soft patches of grime across slabs, then each slab's own surface texture.
    colour = shade(colour, 0.78 + fbm(seed + 47, x * 0.035, y * 0.035, 3) * 0.4);
    colour = shade(colour, 0.9 + fbm(seed + 41, x * 0.12, y * 0.12, 3) * 0.2 + (noise(seed + 43, x * 0.9, y * 0.9) - 0.5) * 0.1);
    const stain = fbm(seed + 49, x * 0.06 + 40, y * 0.06, 4);
    if (stain > 0.6) colour = mix(colour, shade(P.mortar, 1.2), Math.min(0.45, (stain - 0.6) * 2.2));

    const joint = Math.min(x - joints[k], joints[k + 1] - x, y - row * CELL, (row + 1) * CELL - y);
    if (joint < 0.55) colour = mix(P.mortar, colour, joint / 0.55 * 0.45);
    else if (joint < 1.8) colour = shade(colour, 0.86 + 0.14 * (joint - 0.55) / 1.25);

    // Worn, chipped edges and hairline cracks.
    if (joint < 3 && noise(seed + 45, x * 0.6, y * 0.6) > 0.78) colour = shade(colour, 0.72);
    const crack = Math.abs(fbm(seed + 53 + id, x * 0.09, y * 0.09, 4) - 0.5);
    if (hash(seed + 55, id, 3) < 0.4 && crack < 0.012) colour = shade(colour, 0.55);
    return colour;
}

/**
 * Great-hall floor: a chequer of pale and dark stone, with a dark border and a brass inlay along the outer walls.
 * The pattern repeats every 70 pixels, so neighbouring hall pieces line up.
 */
function hallFloor(x, y, seed, spec) {
    const [x0, y0, x1, y1] = spec.hallRect;
    const sides = spec.perimeter ?? [];
    const toPerimeter = Math.min(
        sides.includes('n') ? y - y0 : Infinity,
        sides.includes('s') ? y1 - y : Infinity,
        sides.includes('w') ? x - x0 : Infinity,
        sides.includes('e') ? x1 - x : Infinity,
    );

    if (toPerimeter < 12) {
        const along = sides.includes('n') || sides.includes('s') ? x : y;
        const across = toPerimeter;
        const slab = Math.floor(along / 17.5);
        let colour = shade(P.hallBorder, 0.85 + hash(seed + 61, slab, 0) * 0.3);
        colour = shade(colour, 0.9 + fbm(seed + 63, x * 0.15, y * 0.15, 3) * 0.2);
        const joint = Math.min(((along % 17.5) + 17.5) % 17.5, 17.5 - ((along % 17.5) + 17.5) % 17.5);
        if (joint < 0.6 && across > 0.6) colour = shade(colour, 0.6);
        return colour;
    }
    if (toPerimeter < 13.6) return shade(P.inlay, 0.85 + noise(seed + 65, x * 0.5, y * 0.5) * 0.3);

    const sx = Math.floor(x / 35);
    const sy = Math.floor(y / 35);
    const dark = ((sx + sy) & 1) === 1;
    let colour = dark ? P.hallDark : P.hallLight;
    colour = shade(colour, 0.84 + hash(seed + 67, sx, sy) * 0.24);
    colour = shade(colour, 0.78 + fbm(seed + 73, x * 0.03, y * 0.03, 3) * 0.4);
    const stain = fbm(seed + 77, x * 0.05 + 20, y * 0.05, 4);
    if (stain > 0.58) colour = mix(colour, shade(P.mortar, 1.3), Math.min(0.4, (stain - 0.58) * 2));
    colour = shade(colour, 0.9 + fbm(seed + 69, x * 0.1, y * 0.1, 3) * 0.2 + (noise(seed + 71, x, y) - 0.5) * 0.06);
    if (!dark && noise(seed + 75, x * 0.45, y * 0.45) > 0.82) colour = shade(colour, 0.85); // worn hollows
    const jx = ((x % 35) + 35) % 35;
    const jy = ((y % 35) + 35) % 35;
    const joint = Math.min(jx, 35 - jx, jy, 35 - jy);
    if (joint < 0.6) colour = mix(P.mortar, colour, 0.3);
    else if (joint < 1.6) colour = shade(colour, 0.88);
    return colour;
}

/** Moss creeping out from the walls; `amount` 0-1. */
export function moss(p, amount) {
    const { cv, toEdge, floor, seed } = p;
    cv.paint(floor, (x, y, index) => {
        const near = Math.exp(-toEdge[index] / 7);
        const patch = fbm(seed + 81, x * 0.13, y * 0.13, 4);
        return patch * near > 0.62 - amount * 0.35 ? mix(P.moss, P.mossLight, noise(seed + 83, x * 0.9, y * 0.9)) : null;
    }, (x, y, index) => 0.35 + 0.4 * Math.exp(-toEdge[index] / 4));
}

/** Dust and grime gathered on a floor; `amount` 0-1. */
export function grime(p, amount) {
    const { cv, floor, seed } = p;
    cv.paint(floor, P.dust, (x, y) => Math.max(0, fbm(seed + 85, x * 0.07, y * 0.07, 3) - 0.45) * amount * 1.2);
}

function inside(box, x, y) {
    return box && x >= box[0] && x < box[2] && y >= box[1] && y < box[3];
}

function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}
