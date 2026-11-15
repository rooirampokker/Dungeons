import { CELL, TILE, corridor } from '../lib/layout.js';
import { fbm, hash, hex, mix, noise, shade } from '../lib/raster.js';

/**
 * The look shared by every Manor tile, drawn like a house plan: thin dark walls on the tile edges (each tile draws
 * its half, so two tiles side by side make one wall), and a floor for every kind of room: oak boards in the taproom,
 * flagstones in the kitchen, marble in the great hall, carpet in the library, parquet in the ballroom, and stone
 * with a long runner in the hallways.
 *
 * Floor patterns repeat every tile, or a fraction of one, so a room's pieces join without seams. Lighting never comes
 * from one side, so tiles still look right when the game mirrors them.
 */

/** Each tile's half of a wall, in pixels. Walls between two tiles are twice this. */
export const THIN = 4;

export const P = {
    wall: hex('#2a221e'),
    wallLight: hex('#4a3d34'),
    skirting: hex('#3a2a1f'),
    oak: hex('#8c5b32'),
    oakLight: hex('#a87442'),
    oakDark: hex('#5c3a1f'),
    boards: hex('#b28451'),
    boardsDark: hex('#7c5531'),
    flags: [hex('#9a9282'), hex('#a39a88'), hex('#8d8677'), hex('#a8a08c'), hex('#948b7b')],
    mortar: hex('#4d463d'),
    stone: hex('#cbc1ad'),
    stoneDark: hex('#ada290'),
    marbleLight: hex('#ddd6c8'),
    marbleDark: hex('#4a4548'),
    vein: hex('#9c968c'),
    carpet: hex('#2c4a3a'),
    carpetLight: hex('#3b5e4a'),
    crimson: hex('#7a2224'),
    crimsonLight: hex('#9a3430'),
    gold: hex('#c9a04a'),
    goldDark: hex('#8a6a2c'),
    parquet: hex('#b98549'),
    parquetDark: hex('#94643a'),
    tile: hex('#d9dcd6'),
    tileBlue: hex('#5b7f9c'),
    grass: hex('#4c6b33'),
    grassLight: hex('#6c8c44'),
    soil: hex('#5b4632'),
    cobble: hex('#857d70'),
    wood: hex('#6b4426'),
    woodLight: hex('#93633a'),
    woodDark: hex('#3b2414'),
    walnut: hex('#4a2c1a'),
    linen: hex('#e8e0cc'),
    linenShade: hex('#c4b9a0'),
    red: hex('#8e2a26'),
    blue: hex('#34507a'),
    green: hex('#3d6b45'),
    plum: hex('#5a2f4f'),
    iron: hex('#2b2b2d'),
    ironLight: hex('#5c5c60'),
    brass: hex('#c09a45'),
    copper: hex('#b06a3a'),
    pewter: hex('#9a9c9e'),
    flame: hex('#ffe29a'),
    ember: hex('#ff7a2a'),
    glow: hex('#ffb35c'),
    soot: hex('#161210'),
    ivory: hex('#efe8d6'),
    ebony: hex('#1c1918'),
    leaf: hex('#3f6b34'),
    leafLight: hex('#6e9a4c'),
    terracotta: hex('#a5583a'),
    water: hex('#3f6f86'),
    waterLight: hex('#8fc0d0'),
    books: ['#7a2c2a', '#2f4f3c', '#38406a', '#80683a', '#5c3a28', '#55304a', '#8f7d58', '#2c4256', '#6c4f2c'].map(hex),
    flowers: ['#d0473f', '#e8c34a', '#f0eee4', '#a65fb0', '#e7849a'].map(hex),
};

/**
 * Paints walls and floor, plus any unwalkable ground (a courtyard), and returns the fields decorations use.
 *
 * @param {import('../lib/raster.js').Canvas} cv
 * @param {object} spec
 * @param {import('../lib/raster.js').Shape} spec.floor  Walkable surface, carried on past the edge where open.
 * @param {string} [spec.floorStyle]                     A key of FLOORS. Default 'hall'.
 * @param {string[]} [spec.perimeter]                    Sides with a wall that a fitted carpet or border follows.
 * @param {boolean|string[]} [spec.runner]              A carpet runner from the middle of the tile out through its
 *                                                       exits (true), or through the given sides.
 * @param {import('../lib/raster.js').Shape} [spec.ground]  Open ground with no floor: lawn or paving.
 * @param {string} [spec.groundStyle]                    'lawn' or 'paving'.
 * @param {number} seed
 */
export function paintStructure(cv, spec, seed) {
    const floor = cv.mask(spec.floor);
    const toFloor = cv.distance(floor);
    const toEdge = cv.distance(floor.map((value) => 1 - value));
    const ground = spec.ground ? cv.mask(spec.ground) : null;
    const toGroundEdge = ground ? cv.distance(ground.map((value) => 1 - value)) : null;
    const runner = spec.runner ? cv.mask(corridor(...(spec.runner === true ? spec.exits : spec.runner))) : null;
    const toRunnerEdge = runner ? cv.distance(runner.map((value) => 1 - value)) : null;
    const paintFloor = FLOORS[spec.floorStyle ?? 'hall'];

    cv.each(null, (x, y, index) => {
        let colour;
        if (toFloor[index] === 0) {
            colour = runner?.[index] ? runnerCarpet(x, y, toRunnerEdge[index]) : paintFloor(x, y, seed, spec);
            const edge = toEdge[index];
            colour = shade(colour, 1 - 0.3 * Math.exp(-edge / 2.2) - 0.12 * Math.exp(-edge / 10));
            if (edge < 1.4) colour = mix(colour, P.skirting, 0.75);
        } else if (ground?.[index]) {
            colour = spec.groundStyle === 'paving' ? paving(x, y, seed) : lawn(x, y, seed);
            colour = shade(colour, 1 - 0.35 * Math.exp(-toGroundEdge[index] / 3));
        } else {
            colour = wallFill(x, y, seed, toFloor[index]);
        }
        cv.r[index] = colour[0];
        cv.g[index] = colour[1];
        cv.b[index] = colour[2];
        cv.a[index] = 1;
    });

    return { floor, toFloor, toEdge };
}

/** The walls: near-black timber and plaster, a touch lighter along their middle. */
function wallFill(x, y, seed, d) {
    const colour = mix(P.wall, P.wallLight, 0.15 + 0.2 * Math.min(1, Math.max(0, (d - 1.2) / 3)));
    return shade(colour, 0.9 + noise(seed + 11, x * 0.5, y * 0.5) * 0.18);
}

// ---------------------------------------------------------------- floors

/**
 * Boards running east-west in rows `width` pixels deep. Each row's joints are in the same places on every tile, so
 * boards carry on into the next tile and a whole room's floor looks laid in one piece.
 */
function boardFloor(x, y, seed, { width, joints, light, dark, pattern }) {
    const row = Math.floor(y / width);
    const within = y - row * width;
    const offset = hash(pattern, row, 1) * TILE;
    // Joint positions in this row, measured from `offset`, repeating every tile.
    const along = (((x - offset) % TILE) + TILE) % TILE;
    const step = TILE / joints;
    const board = Math.floor(along / step);
    const fromJoint = Math.min(along - board * step, (board + 1) * step - along);
    const tone = hash(pattern, row, board + 7);

    let colour = mix(dark, light, 0.35 + tone * 0.5);
    // Grain: streaks along the board, mostly a function of y so it carries across tile edges.
    const grain = fbm(pattern + 3, x * 0.015 + board * 13, y * 0.55 + row * 7, 3);
    colour = shade(colour, 0.86 + grain * 0.28);
    colour = shade(colour, 0.95 + noise(seed + 21, x * 0.9, y * 0.9) * 0.08);
    const knot = noise(pattern + 5 + board, x * 0.12, y * 0.4);
    if (knot > 0.86) colour = shade(colour, 0.8);

    if (Math.min(within, width - within) < 0.6) return shade(dark, 0.45);
    if (fromJoint < 0.5) return shade(dark, 0.55);
    if (within < 1.4) colour = shade(colour, 1.08);
    // Wear and polish, a little different on every tile.
    const wear = fbm(seed + 23, x * 0.03, y * 0.03, 3);
    return shade(colour, 0.94 + wear * 0.1);
}

/** Irregular flagstones, one row per walk cell; joints fall on the tile edges so floors join up. */
function flagstones(x, y, seed) {
    const row = Math.max(0, Math.min(5, Math.floor(y / CELL)));
    let start = 0;
    let k = 0;
    let end = 0;
    for (;;) {
        end = Math.min(TILE, start + CELL * (hash(seed + 31, row, k) < 0.5 ? 1 : 1.5));
        if (x < end || end >= TILE) break;
        start = end;
        k++;
    }
    const id = row * 16 + k;
    let colour = P.flags[Math.floor(hash(seed + 33, id, 1) * P.flags.length)];
    colour = shade(colour, 0.84 + hash(seed + 35, id, 2) * 0.16);
    colour = shade(colour, 0.88 + fbm(seed + 37, x * 0.1, y * 0.1, 3) * 0.22 + (noise(seed + 39, x, y) - 0.5) * 0.06);
    const joint = Math.min(x - start, end - x, y - row * CELL, (row + 1) * CELL - y);
    if (joint < 0.6) return mix(P.mortar, colour, joint / 0.6 * 0.4);
    if (joint < 1.8) colour = shade(colour, 0.9);
    return colour;
}

/** Polished limestone squares, three to a tile, for hallways and the entrance. */
function hallStone(x, y, seed) {
    const size = TILE / 3;
    const sx = Math.floor(x / size);
    const sy = Math.floor(y / size);
    const jx = x - sx * size;
    const jy = y - sy * size;
    let colour = mix(P.stoneDark, P.stone, 0.45 + hash(seed + 41, sx, sy) * 0.5);
    colour = shade(colour, 0.92 + fbm(seed + 43, x * 0.05, y * 0.05, 3) * 0.14);
    const vein = Math.abs(fbm(seed + 45 + sx * 3 + sy, x * 0.06, y * 0.06, 4) - 0.5);
    if (vein < 0.018) colour = shade(colour, 0.9);
    const joint = Math.min(jx, size - jx, jy, size - jy);
    if (joint < 0.5) return shade(P.stoneDark, 0.6);
    if (joint < 1.3) colour = shade(colour, 1.05);
    return colour;
}

/** Black and white marble squares, with a dark border and a gilt line along the room's walls. */
function marble(x, y, seed, spec) {
    const border = toPerimeter(x, y, spec);
    if (border < 10) return shade(P.marbleDark, 1.05 + noise(seed + 51, x * 0.4, y * 0.4) * 0.15);
    if (border < 11.4) return P.goldDark;
    const size = 35;
    const sx = Math.floor(x / size);
    const sy = Math.floor(y / size);
    const dark = ((sx + sy) & 1) === 1;
    let colour = dark ? P.marbleDark : P.marbleLight;
    const vein = Math.abs(fbm(seed + 53 + sx * 5 + sy * 3, x * 0.05, y * 0.05, 4) - 0.5);
    if (vein < 0.02) colour = mix(colour, dark ? P.ironLight : P.vein, 0.6);
    colour = shade(colour, 0.93 + fbm(seed + 55, x * 0.04, y * 0.04, 3) * 0.1);
    const jx = ((x % size) + size) % size;
    const jy = ((y % size) + size) % size;
    if (Math.min(jx, size - jx, jy, size - jy) < 0.45) colour = mix(colour, P.vein, 0.6);
    return colour;
}

/** A fitted green carpet with a small lattice, and a crimson and gold border along the walls. */
function carpet(x, y, seed, spec) {
    const border = toPerimeter(x, y, spec);
    const fluff = 0.94 + noise(seed + 61, x * 1.3, y * 1.3) * 0.1;
    if (border < 2.5) return shade(P.crimson, 0.8 * fluff);
    if (border < 4) return shade(P.gold, 0.9 * fluff);
    if (border < 12) {
        const motif = Math.abs(((border + (spec.perimeter?.includes('n') || spec.perimeter?.includes('s') ? x : y)) % 8) - 4);
        return shade(motif < 1.2 ? P.goldDark : P.crimson, fluff);
    }
    if (border < 13.5) return shade(P.gold, 0.9 * fluff);
    const period = TILE / 8;
    const u = ((x + y) % period + period) % period;
    const v = ((x - y) % period + period) % period;
    let colour = Math.min(u, v) < 1.1 ? P.carpetLight : P.carpet;
    const dot = Math.hypot((((x % period) + period) % period) - period / 2, (((y % period) + period) % period) - period / 2);
    if (dot < 1.6) colour = mix(colour, P.goldDark, 0.7);
    colour = shade(colour, fluff * (0.92 + fbm(seed + 63, x * 0.04, y * 0.04, 3) * 0.12));
    return colour;
}

/** Basket-weave parquet: squares of four strips, turning each way in turn. Repeats every half tile. */
function parquet(x, y, seed) {
    const size = TILE / 4;
    const sx = Math.floor(x / size);
    const sy = Math.floor(y / size);
    const across = ((sx + sy) & 1) === 0;
    const local = across ? y - sy * size : x - sx * size;
    const strip = Math.floor(local / (size / 4));
    const withinStrip = local - strip * (size / 4);
    const tone = hash(97, (sx & 1) * 8 + (sy & 1) * 4 + strip, across ? 1 : 2);
    let colour = mix(P.parquetDark, P.parquet, 0.35 + tone * 0.6);
    const along = across ? x : y;
    const acrossCoord = across ? y : x;
    colour = shade(colour, 0.88 + fbm(101, along * 0.02, acrossCoord * 0.6, 3) * 0.24);
    colour = shade(colour, 0.96 + fbm(seed + 71, x * 0.03, y * 0.03, 3) * 0.08);
    const jx = x - sx * size;
    const jy = y - sy * size;
    if (Math.min(jx, size - jx, jy, size - jy) < 0.6) return shade(P.parquetDark, 0.5);
    if (Math.min(withinStrip, size / 4 - withinStrip) < 0.35) colour = shade(colour, 0.7);
    // A soft shine, as if just waxed.
    const shine = noise(seed + 73, x * 0.03, y * 0.03);
    if (shine > 0.62) colour = mix(colour, P.ivory, (shine - 0.62) * 0.35);
    return colour;
}

/** Small glazed tiles, white with a blue band along the walls, for the bathroom. */
function glazed(x, y, seed, spec) {
    const size = TILE / 12;
    const sx = Math.floor(x / size);
    const sy = Math.floor(y / size);
    const border = toPerimeter(x, y, spec);
    let colour = border < size * 1.05 ? P.tileBlue : P.tile;
    colour = shade(colour, 0.94 + hash(seed + 81, sx, sy) * 0.08);
    const jx = x - sx * size;
    const jy = y - sy * size;
    if (Math.min(jx, size - jx, jy, size - jy) < 0.45) return shade(P.tile, 0.7);
    return colour;
}

/** How far a point is from the nearest wall the floor's border follows. */
function toPerimeter(x, y, spec) {
    let d = Infinity;
    for (const side of spec.perimeter ?? []) {
        if (side === 'n') d = Math.min(d, y - THIN);
        if (side === 's') d = Math.min(d, TILE - THIN - y);
        if (side === 'w') d = Math.min(d, x - THIN);
        if (side === 'e') d = Math.min(d, TILE - THIN - x);
    }
    return d;
}

export const FLOORS = {
    hall: hallStone,
    oak: (x, y, seed) => boardFloor(x, y, seed, { width: CELL, joints: 2, light: P.oakLight, dark: P.oakDark, pattern: 211 }),
    boards: (x, y, seed) => boardFloor(x, y, seed, { width: TILE / 10, joints: 3, light: P.boards, dark: P.boardsDark, pattern: 223 }),
    flagstone: flagstones,
    marble,
    carpet,
    parquet,
    glazed,
};

// ---------------------------------------------------------------- runner and grounds

/** A crimson runner with a gold line inset along each edge. */
function runnerCarpet(x, y, edge) {
    const fluff = 0.94 + noise(131, x * 1.2, y * 1.2) * 0.1;
    if (edge < 2) return shade(P.crimson, 0.7 * fluff);
    if (edge < 3.4) return shade(P.gold, 0.95 * fluff);
    const diamond = Math.abs(((x + y) % 14 + 14) % 14 - 7) + Math.abs(((x - y) % 14 + 14) % 14 - 7);
    const colour = diamond < 2.2 ? P.goldDark : edge < 6 ? P.crimson : P.crimsonLight;
    return shade(colour, fluff);
}

function lawn(x, y, seed) {
    const patch = fbm(seed + 141, x * 0.06, y * 0.06, 4);
    let colour = mix(P.grass, P.grassLight, patch);
    colour = shade(colour, 0.85 + noise(seed + 143, x * 1.4, y * 1.4) * 0.25);
    return colour;
}

function paving(x, y, seed) {
    const size = TILE / 10;
    const row = Math.floor(y / size);
    const shift = (row & 1) * size / 2;
    const col = Math.floor((x + shift) / size);
    const jx = x + shift - col * size;
    const jy = y - row * size;
    let colour = shade(P.cobble, 0.82 + hash(seed + 151, col, row) * 0.3);
    colour = shade(colour, 0.92 + fbm(seed + 153, x * 0.1, y * 0.1, 3) * 0.14);
    const moss = fbm(seed + 155, x * 0.08, y * 0.08, 3);
    if (Math.min(jx, size - jx, jy, size - jy) < 1) colour = moss > 0.55 ? P.grass : shade(P.mortar, 0.8);
    return colour;
}

/** Dust and wear on a floor; `amount` 0-1. */
export function wear(p, amount) {
    const { cv, floor, seed } = p;
    cv.paint(floor, P.soot, (x, y) => Math.max(0, fbm(seed + 161, x * 0.06, y * 0.06, 3) - 0.5) * amount);
}
