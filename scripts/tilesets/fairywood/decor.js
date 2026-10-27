import { TILE } from '../lib/layout.js';
import { circle, ellipse, fbm, hash, mix, noise, polygon, rect, ring, roundRect, segment, shade, shape } from '../lib/raster.js';
import { P, treetop } from './style.js';

/**
 * Fairy Wood furnishings. Every function takes a painter `p` ({cv, rng, seed, block}) and coordinates in tile
 * pixels. Anything that should stop the hero calls p.block(shape); the walk map is worked out from those.
 *
 * Shadows are soft and spread evenly in every direction, and glows are even too, so mirrored tiles look right.
 */

// ---------------------------------------------------------------- mushrooms and magic

/** A toadstool cap seen from above, red with white spots unless told otherwise. */
export function mushroom(p, x, y, r, { cap = P.toadstool, spots = true, blocks = false } = {}) {
    const { cv, rng } = p;
    cv.shadowCircle(x, y, r, Math.max(2, r * 0.6), 0.5);
    cv.paint(circle(x, y, r), (px, py) => shade(cap, 1.2 - 0.55 * (Math.hypot(px - x, py - y) / r) ** 2));
    if (spots) {
        for (let k = 0; k < Math.max(3, Math.round(r * 0.8)); k++) {
            const angle = rng.next() * Math.PI * 2;
            const distance = Math.sqrt(rng.next()) * r * 0.7;
            cv.paint(circle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, Math.max(0.5, r * (0.1 + rng.next() * 0.08))), P.white);
        }
    }
    if (blocks) p.block(circle(x, y, r));
}

/** A cluster of small mushrooms that glow softly in the dusk. */
export function glowingMushrooms(p, x, y, spread, count, colour = P.fairy) {
    const { cv, rng } = p;
    cv.glow(x, y, spread * 2.2, colour, 0.22);
    for (let k = 0; k < count; k++) {
        const angle = rng.next() * Math.PI * 2;
        const distance = Math.sqrt(rng.next()) * spread;
        mushroom(p, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 1.4 + rng.next() * 1.6, {
            cap: mix(colour, P.violet, rng.next() * 0.6), spots: false,
        });
    }
}

/** A fairy ring: toadstools in a circle, with a faint glow where the fairies dance. */
export function fairyRing(p, x, y, r, count = 14) {
    const { cv, rng } = p;
    cv.paint(ring(x, y, r - 2, r + 2), P.grassLight, 0.25);
    cv.glow(x, y, r * 1.3, P.fairy, 0.12);
    for (let k = 0; k < count; k++) {
        const angle = (k / count) * Math.PI * 2 + rng.next() * 0.2;
        mushroom(p, x + Math.cos(angle) * r, y + Math.sin(angle) * r, 1.8 + rng.next() * 1.4, {
            cap: k % 3 ? P.toadstool : P.woodLight, spots: k % 3 !== 0,
        });
    }
}

/** Fireflies drifting over an area. */
export function fireflies(p, area, count) {
    const { cv, rng } = p;
    const [x0, y0, x1, y1] = area.box.map((v) => Math.max(2, Math.min(TILE - 2, v)));
    for (let k = 0; k < count; k++) {
        const x = x0 + rng.next() * (x1 - x0);
        const y = y0 + rng.next() * (y1 - y0);
        if (!area(x, y)) continue;
        cv.glow(x, y, 5, P.firefly, 0.4);
        cv.paint(circle(x, y, 0.5), P.white);
    }
}

/** A cluster of glowing crystals. */
export function crystals(p, x, y, size, colour = P.lilac) {
    const { cv, rng } = p;
    cv.glow(x, y, size * 2.5, colour, 0.3);
    cv.shadowCircle(x, y, size * 0.6, 4, 0.45);
    for (let k = 0; k < 5; k++) {
        const angle = rng.next() * Math.PI * 2;
        const length = size * (0.6 + rng.next() * 0.5);
        const width = size * 0.22;
        const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
        const tip = [x + cos * length, y + sin * length];
        cv.paint(polygon([[x - sin * width, y + cos * width], tip, [x + sin * width, y - cos * width]]),
            (px, py) => mix(colour, P.white, 0.2 + 0.5 * (Math.hypot(px - x, py - y) / length)));
    }
    p.block(circle(x, y, size * 0.7));
}

/** A fairy lantern on a curling iron post. */
export function lantern(p, x, y) {
    const { cv } = p;
    cv.glow(x, y, 24, P.glow, 0.32);
    cv.shadowCircle(x, y, 2, 3, 0.4);
    cv.paint(circle(x, y, 2.4), P.bark);
    cv.paint(circle(x, y, 1.6), P.glow);
    cv.paint(circle(x, y, 0.7), P.white);
    p.block(circle(x, y, 2.6));
}

// ---------------------------------------------------------------- wood and stone

/** A tree stump: rings in the cut face, bark round the edge. */
export function stump(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 4, 0.55);
    cv.paint(circle(x, y, r), P.bark);
    cv.paint(circle(x, y, r - 1.4), (px, py) => {
        const d = Math.hypot(px - x, py - y);
        const band = Math.sin(d * 2.2 + noise(seed + 701, px * 0.3, py * 0.3) * 2) > 0.6;
        return shade(P.woodLight, band ? 0.75 : 1);
    });
    p.block(circle(x, y, r));
}

/** A fallen log from (x0, y0) to (x1, y1). */
export function log(p, x0, y0, x1, y1, r) {
    const { cv, seed } = p;
    const length = Math.hypot(x1 - x0, y1 - y0);
    const [ux, uy] = [(x1 - x0) / length, (y1 - y0) / length];
    const body = segment(x0, y0, x1, y1, r * 2);
    cv.shadowCircle((x0 + x1) / 2, (y0 + y1) / 2, length / 2, 4, 0.35);
    cv.paint(body, (px, py) => {
        const across = Math.abs((px - x0) * uy - (py - y0) * ux) / r;
        const along = (px - x0) * ux + (py - y0) * uy;
        const grain = noise(seed + 703, along * 0.15, across * 3);
        return shade(P.bark, 1.25 - across * across * 0.6 + (grain - 0.5) * 0.35);
    });
    for (const [ex, ey] of [[x0, y0], [x1, y1]]) {
        cv.paint(circle(ex, ey, r * 0.85), P.woodLight);
        cv.paint(ring(ex, ey, r * 0.35, r * 0.45), P.wood);
    }
    const moss = (px, py) => (fbm(seed + 705, px * 0.2, py * 0.2, 3) > 0.58 ? P.moss : null);
    cv.paint(body, moss, 0.7);
    p.block(body);
}

/** A mossy boulder. */
export function boulder(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 5, 0.6);
    const outline = shape((px, py) => {
        const angle = Math.atan2(py - y, px - x);
        return Math.hypot(px - x, py - y) < r * (0.85 + 0.18 * noise(seed + 707, Math.cos(angle) * 2 + 5, Math.sin(angle) * 2 + 5));
    }, [x - r * 1.1, y - r * 1.1, x + r * 1.1, y + r * 1.1]);
    cv.paint(outline, (px, py) => {
        const d = Math.hypot(px - x, py - y) / r;
        const stone = shade(P.stone, 1.15 - 0.55 * d * d + (noise(seed + 709, px * 0.5, py * 0.5) - 0.5) * 0.2);
        return fbm(seed + 711, px * 0.18, py * 0.18, 3) > 0.55 ? mix(stone, P.moss, 0.7) : stone;
    });
    p.block(outline);
}

/** A standing stone, grey and lichened. */
export function standingStone(p, x, y, size) {
    const { cv, seed } = p;
    const half = size / 2;
    const stone = roundRect(x - half, y - half * 0.7, x + half, y + half * 0.7, size * 0.2);
    cv.shadowRect(x - half, y - half * 0.7, x + half, y + half * 0.7, 5, 0.6);
    cv.paint(stone, (px, py) => {
        const edge = Math.min(px - (x - half), x + half - px, py - (y - half * 0.7), y + half * 0.7 - py) / half;
        const lichen = noise(seed + 713, px * 0.5, py * 0.5) > 0.7;
        return lichen ? mix(P.stone, P.grassLight, 0.45) : shade(P.stone, 0.75 + Math.min(edge, 0.6) * 0.6);
    });
    p.block(stone);
}

/** A wooden signpost with two arms. */
export function signpost(p, x, y) {
    const { cv } = p;
    cv.shadowCircle(x, y, 2, 3, 0.5);
    for (const [dx, dy] of [[1, -0.5], [-1, 0.4]]) {
        cv.paint(polygon([[x, y - 1.3], [x + dx * 9, y - 1.3 + dy * 2], [x + dx * 10.5, y + dy * 2], [x + dx * 9, y + 1.3 + dy * 2], [x, y + 1.3]]), P.woodLight);
    }
    cv.paint(circle(x, y, 1.8), P.wood);
    p.block(circle(x, y, 2.2));
}

/** A wishing well, stone-rimmed with a little shingled roof. */
export function wishingWell(p, x, y, r) {
    const { cv } = p;
    cv.shadowCircle(x, y, r + 3, 5, 0.55);
    cv.paint(ring(x, y, r, r + 3), (px, py) => shade(P.stone, 0.85 + noise(717, px, py) * 0.2));
    cv.paint(circle(x, y, r), (px, py) => mix(P.soot, P.waterDeep, Math.hypot(px - x, py - y) / r));
    cv.paint(rect(x - r - 4, y - 2.2, x + r + 4, y + 2.2), (px, py) => shade(P.wood, ((px - x) % 3 + 3) % 3 < 0.5 ? 0.6 : 1));
    p.block(circle(x, y, r + 3));
}

// ---------------------------------------------------------------- water

/** Water filling a shape, with ripples. Not walkable. */
export function water(p, area, { blocks = true } = {}) {
    const { cv, seed } = p;
    cv.paint(area, (x, y) => {
        const depth = fbm(seed + 721, x * 0.06, y * 0.06, 3);
        let colour = mix(P.waterDeep, P.water, depth);
        const ripple = noise(seed + 723, x * 0.25 + depth * 4, y * 0.7);
        if (ripple > 0.78) colour = mix(colour, P.waterLight, (ripple - 0.78) * 2.2);
        return colour;
    });
    if (blocks) p.block(area);
}

/** A pond with reeds round the edge and lily pads on top. */
export function pond(p, x, y, rx, ry) {
    const { cv, rng } = p;
    const edge = ellipse(x, y, rx + 2.5, ry + 2.5);
    cv.paint(edge, P.dirtDark, 0.6);
    water(p, ellipse(x, y, rx, ry));
    for (let k = 0; k < 5; k++) {
        const angle = rng.next() * Math.PI * 2;
        const distance = rng.next() * 0.7;
        lilyPad(p, x + Math.cos(angle) * rx * distance, y + Math.sin(angle) * ry * distance, 2.2 + rng.next() * 1.6, rng.next() < 0.4);
    }
    for (let k = 0; k < 14; k++) {
        const angle = rng.next() * Math.PI * 2;
        const [ex, ey] = [x + Math.cos(angle) * (rx + 1.5), y + Math.sin(angle) * (ry + 1.5)];
        cv.paint(segment(ex, ey, ex + Math.cos(angle) * 3, ey + Math.sin(angle) * 3, 0.7), P.fernLight);
    }
}

export function lilyPad(p, x, y, r, flower = false) {
    const { cv } = p;
    cv.paint(shape((px, py) => (px - x) ** 2 + (py - y) ** 2 < r * r && !(px > x && Math.abs(py - y) < (px - x) * 0.4), [x - r, y - r, x + r, y + r]),
        mix(P.grass, P.grassLight, 0.4));
    if (flower) {
        cv.paint(circle(x - r * 0.2, y, r * 0.45), P.blossom);
        cv.paint(circle(x - r * 0.2, y, r * 0.18), P.buttercup);
    }
}

/**
 * A shallow brook crossing the tile from side to side under the trees: `along` is 'ew' (west to east) or 'ns'. It
 * fades into the canopy near the tile edges, so it doesn't stop abruptly against the next tile. It can be waded, so
 * it doesn't block.
 */
export function brook(p, along, centre, width) {
    const { cv, seed } = p;
    const area = along === 'ew'
        ? shape((x, y) => Math.abs(y - centre - Math.sin(x * 0.05 + seed) * 4) < width / 2, [0, centre - width, TILE, centre + width])
        : shape((x, y) => Math.abs(x - centre - Math.sin(y * 0.05 + seed) * 4) < width / 2, [centre - width, 0, centre + width, TILE]);
    cv.paint(area, (x, y) => {
        const depth = fbm(seed + 725, x * 0.08, y * 0.08, 3);
        const ripple = noise(seed + 727, along === 'ew' ? x * 0.12 : x * 0.6, along === 'ew' ? y * 0.6 : y * 0.12);
        const colour = mix(P.waterDeep, P.water, depth);
        return ripple > 0.75 ? mix(colour, P.waterLight, 0.5) : colour;
    }, (x, y) => {
        const fromEdge = along === 'ew' ? Math.min(x, TILE - x) : Math.min(y, TILE - y);
        return Math.min(1, fromEdge / 26);
    });
    return area;
}

/** A wooden footbridge across a rectangle. `across` true means its planks run east-west. */
export function footbridge(p, x0, y0, x1, y1, across) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 3, 0.5);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const along = across ? y - y0 : x - x0;
        const plank = Math.floor(along / 3.2);
        const gap = along % 3.2 < 0.45;
        return shade(P.woodLight, gap ? 0.55 : 0.85 + hash(seed + 729, plank, 0) * 0.25);
    });
    const rails = across ? [rect(x0 - 1, y0, x0 + 1, y1), rect(x1 - 1, y0, x1 + 1, y1)] : [rect(x0, y0 - 1, x1, y0 + 1), rect(x0, y1 - 1, x1, y1 + 1)];
    for (const rail of rails) cv.paint(rail, P.bark);
}

/** Flat stepping stones. */
export function steppingStones(p, stones) {
    const { cv, rng } = p;
    for (const [x, y, r] of stones) {
        cv.shadowCircle(x, y, r, 2.5, 0.45);
        cv.paint(ellipse(x, y, r, r * 0.8, rng.next() * Math.PI), (px, py) => shade(P.stone, 1.1 - 0.35 * (Math.hypot(px - x, py - y) / r) ** 2));
    }
}

// ---------------------------------------------------------------- plants

/** A fern, its fronds fanning out from the middle. */
export function fern(p, x, y, r) {
    const { cv, rng } = p;
    for (let k = 0; k < 7; k++) {
        const angle = (k / 7) * Math.PI * 2 + rng.next() * 0.5;
        const [ex, ey] = [x + Math.cos(angle) * r, y + Math.sin(angle) * r];
        cv.paint(segment(x, y, ex, ey, 1.6), shade(P.fernLight, 0.8 + rng.next() * 0.3));
        for (let t = 0.3; t < 1; t += 0.22) {
            const [mx, my] = [x + Math.cos(angle) * r * t, y + Math.sin(angle) * r * t];
            for (const side of [-1, 1]) {
                const leaf = angle + side * 0.9;
                cv.paint(segment(mx, my, mx + Math.cos(leaf) * r * 0.25, my + Math.sin(leaf) * r * 0.25, 0.8), P.fernLight);
            }
        }
    }
}

/** Wildflowers scattered over an area. */
export function flowers(p, area, count, colours = [P.daisy, P.buttercup, P.blossom, P.bluebell, P.poppy]) {
    const { cv, rng } = p;
    const [x0, y0, x1, y1] = area.box.map((v) => Math.max(1, Math.min(TILE - 1, v)));
    for (let k = 0; k < count; k++) {
        const x = x0 + rng.next() * (x1 - x0);
        const y = y0 + rng.next() * (y1 - y0);
        if (!area(x, y)) continue;
        const colour = colours[Math.floor(rng.next() * colours.length)];
        for (let petal = 0; petal < 5; petal++) {
            const angle = (petal / 5) * Math.PI * 2;
            cv.paint(circle(x + Math.cos(angle) * 0.9, y + Math.sin(angle) * 0.9, 0.7), colour);
        }
        cv.paint(circle(x, y, 0.5), P.buttercup);
    }
}

/** Tree roots snaking across the ground. */
export function roots(p, x0, y0, x1, y1, count) {
    const { cv, rng } = p;
    for (let k = 0; k < count; k++) {
        let [x, y] = [x0 + (x1 - x0) * rng.next(), y0];
        const drift = (rng.next() - 0.5) * 2;
        while (y < y1) {
            const [nx, ny] = [x + drift + (rng.next() - 0.5) * 3, y + 3];
            cv.paint(segment(x, y, nx, ny, 1.6), shade(P.bark, 0.9 + rng.next() * 0.3));
            [x, y] = [nx, ny];
        }
    }
}

/** A young tree at the edge of a clearing. Its trunk is in the way; its crown is overhead. */
export function sapling(p, x, y, r) {
    treetop(p.cv, x, y, r, mix(P.canopyLight, P.leafLight, p.rng.next() * 0.4), p.seed + Math.round(x * 3 + y));
    p.block(circle(x, y, r * 0.55));
}

/**
 * An ancient oak's trunk seen from above, with its roots spreading out across the ground and dappled shade.
 */
export function ancientOak(p, x, y, r) {
    const { cv, rng, seed } = p;
    cv.paint(circle(x, y, r * 2.6), P.soot, (px, py) => 0.22 * (1 - Math.hypot(px - x, py - y) / (r * 2.6)) * (0.6 + noise(seed + 731, px * 0.1, py * 0.1)));
    for (let k = 0; k < 9; k++) {
        const angle = (k / 9) * Math.PI * 2 + rng.next() * 0.3;
        const length = r * (1.4 + rng.next() * 0.9);
        cv.paint(segment(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, r * 0.35 * (0.7 + rng.next() * 0.4)), shade(P.bark, 0.9 + rng.next() * 0.3));
    }
    cv.shadowCircle(x, y, r, 5, 0.5);
    cv.paint(circle(x, y, r), (px, py) => {
        const d = Math.hypot(px - x, py - y);
        return shade(P.bark, 0.8 + Math.sin(Math.atan2(py - y, px - x) * 18) * 0.12 + (1 - d / r) * 0.25);
    });
    cv.paint(circle(x, y, r * 0.4), P.soot, 0.6);
    p.block(circle(x, y, r * 1.1));
}

// ---------------------------------------------------------------- dwellings

/** A little house made from a giant mushroom, with a lit window. */
export function mushroomHouse(p, x, y, r, cap = P.toadstool) {
    const { cv } = p;
    cv.glow(x + r * 0.5, y + r * 0.6, r, P.glow, 0.25);
    mushroom(p, x, y, r, { cap });
    cv.paint(circle(x + r * 0.45, y + r * 0.5, r * 0.16), P.glow);
    cv.paint(rect(x - r * 0.15, y + r * 0.85, x + r * 0.15, y + r * 1.05), P.wood);
    p.block(circle(x, y, r));
}

/** A woodcutter's cottage, its thatched roof seen from above, with a chimney. */
export function cottage(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 6, 0.6);
    const ridge = (y0 + y1) / 2;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const slope = 1 - Math.abs(y - ridge) / ((y1 - y0) / 2);
        const straw = noise(seed + 741, x * 1.5, y * 0.35);
        return shade(mix(P.woodLight, P.buttercup, 0.25), 0.7 + slope * 0.35 + (straw - 0.5) * 0.25);
    });
    cv.paint(rect(x0, ridge - 0.8, x1, ridge + 0.8), shade(P.wood, 0.8));
    const chimney = rect(x1 - (x1 - x0) * 0.25, y0 + 2, x1 - (x1 - x0) * 0.25 + 5, y0 + 7);
    cv.paint(chimney, P.stoneDark);
    cv.paint(circle(x1 - (x1 - x0) * 0.25 + 2.5, y0 + 1, 4), P.white, 0.25);
    p.block(rect(x0, y0, x1, y1));
}

/** A campfire in a ring of stones. */
export function campfire(p, x, y) {
    const { cv, seed } = p;
    cv.glow(x, y, 36, P.glow, 0.4);
    for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2;
        cv.paint(circle(x + Math.cos(angle) * 5.5, y + Math.sin(angle) * 5.5, 1.6), P.stone);
    }
    cv.paint(circle(x, y, 4.2), (px, py) => {
        const heat = noise(seed + 743, px * 0.9, py * 0.9);
        return heat > 0.5 ? mix(P.poppy, P.glow, (heat - 0.5) * 2) : mix(P.soot, P.poppy, heat);
    });
    cv.glow(x, y, 8, P.glow, 0.5);
    p.block(circle(x, y, 6.5));
}

/** A little canvas tent, ridge running east-west. */
export function tent(p, x0, y0, x1, y1) {
    const { cv } = p;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.55);
    const ridge = (y0 + y1) / 2;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => shade(mix(P.daisy, P.woodLight, 0.35), 0.75 + (1 - Math.abs(y - ridge) / ((y1 - y0) / 2)) * 0.3));
    cv.paint(rect(x0, ridge - 0.5, x1, ridge + 0.5), P.wood);
    p.block(rect(x0, y0, x1, y1));
}

/** A maypole hung with ribbons, ready for a fairy dance. */
export function maypole(p, x, y, reach) {
    const { cv } = p;
    const colours = [P.poppy, P.buttercup, P.bluebell, P.blossom, P.daisy, P.lilac];
    for (let k = 0; k < 12; k++) {
        const angle = (k / 12) * Math.PI * 2;
        cv.paint(segment(x, y, x + Math.cos(angle) * reach, y + Math.sin(angle) * reach, 0.8), colours[k % colours.length], 0.9);
    }
    cv.paint(ring(x, y, 3.2, 4.4), mix(P.fernLight, P.blossom, 0.3));
    cv.shadowCircle(x, y, 2, 3, 0.5);
    cv.paint(circle(x, y, 2.2), P.woodLight);
    p.block(circle(x, y, 2.6));
}

/** A tangle of brambles hung with berries. */
export function brambles(p, x, y, r) {
    const { cv, rng, seed } = p;
    cv.shadowCircle(x, y, r, 4, 0.5);
    const outline = shape((px, py) => Math.hypot(px - x, py - y) < r * (0.8 + 0.3 * noise(seed + 745, px * 0.2, py * 0.2)),
        [x - r * 1.1, y - r * 1.1, x + r * 1.1, y + r * 1.1]);
    cv.paint(outline, (px, py) => shade(P.fern, 0.7 + noise(seed + 747, px * 0.8, py * 0.8) * 0.4));
    for (let k = 0; k < 16; k++) {
        const angle = rng.next() * Math.PI * 2;
        const distance = Math.sqrt(rng.next()) * r * 0.8;
        cv.paint(circle(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.9), rng.next() < 0.6 ? P.violet : P.poppy);
    }
    p.block(outline);
}
