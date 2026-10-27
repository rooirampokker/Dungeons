import {
    circle, ellipse, fbm, hash, mix, noise, polygon, rect, ring, roundRect, segment, shade, wedge,
} from '../lib/raster.js';
import { P } from './style.js';

/**
 * Furniture and fittings, seen from above. Every function takes a painter `p` ({cv, rng, seed, block}) and
 * coordinates in tile pixels. Anything that should stop the hero calls p.block(shape); the walk map is worked out
 * from those.
 *
 * Shadows are soft and spread evenly in every direction, so mirrored tiles still look right.
 */

// ---------------------------------------------------------------- shapes

/** A rectangle of width w and height h centred on (cx, cy), turned by `angle` radians. */
export function rotatedRect(cx, cy, w, h, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return polygon([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
        .map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]));
}

/** Wood with its grain running along x ('x') or y ('y'). */
function grained(p, colour, axis = 'x', amount = 0.3) {
    const { seed } = p;
    return (x, y) => {
        const along = axis === 'x' ? x : y;
        const across = axis === 'x' ? y : x;
        return shade(colour, 1 - amount / 2 + fbm(seed + 301, along * 0.03, across * 0.45, 3) * amount);
    };
}

/** A wooden box or tabletop: shadow, grained top, darker rim and a highlight along one long edge's inside. */
export function woodTop(p, x0, y0, x1, y1, colour = P.wood, { radius = 1.5, rim = 1.2, axis, shadow = 0.55 } = {}) {
    const { cv } = p;
    const grain = axis ?? (x1 - x0 >= y1 - y0 ? 'x' : 'y');
    cv.shadowRect(x0, y0, x1, y1, 4, shadow);
    cv.paint(roundRect(x0, y0, x1, y1, radius), shade(colour, 0.6));
    cv.paint(roundRect(x0 + rim, y0 + rim, x1 - rim, y1 - rim, Math.max(0.5, radius - rim)), grained(p, colour, grain));
}

// ---------------------------------------------------------------- light

export function candle(p, x, y, reach = 16) {
    p.cv.paint(circle(x, y, 1.6), P.ivory);
    p.cv.paint(circle(x, y, 0.75), P.flame);
    p.cv.glow(x, y, reach, P.glow, 0.24);
    p.cv.glow(x, y, 4, P.flame, 0.4);
}

/** A fire in a grate: embers and flames inside the given box, and the light it throws. */
export function fire(p, x0, y0, x1, y1, reach = 40) {
    const { cv, seed } = p;
    cv.paint(rect(x0, y0, x1, y1), P.soot);
    cv.paint(rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1), (x, y) => {
        const heat = noise(seed + 311, x * 0.5, y * 0.5) * 0.6 + noise(seed + 313, x * 1.4, y * 1.4) * 0.4;
        return heat > 0.5 ? mix(P.ember, P.flame, (heat - 0.5) * 2.2) : mix(P.soot, P.ember, heat * 1.5);
    });
    for (let k = 0; k < 3; k++) {
        const lx = x0 + ((k + 0.5) / 3) * (x1 - x0);
        cv.paint(rotatedRect(lx, (y0 + y1) / 2, (x1 - x0) / 3.4, 2, 0.3 * (k - 1)), P.woodDark);
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    cv.glow(cx, cy, reach, P.glow, 0.42);
    cv.glow(cx, cy, Math.max(x1 - x0, y1 - y0) / 2, P.flame, 0.35);
}

// ---------------------------------------------------------------- seating and tables

export function stool(p, x, y, r = 4.2) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 3, 0.5);
    cv.paint(circle(x, y, r), shade(P.wood, 0.75));
    cv.paint(circle(x, y, r - 1), grained(p, P.woodLight, 'x', 0.25));
    cv.paint(ring(x, y, r - 1.1, r - 0.6), shade(P.wood, 0.6), 0.6);
}

/**
 * A chair facing `angle` (radians, 0 = facing east, towards whatever it's pulled up to): a square seat with the back
 * along the far side.
 */
export function chair(p, x, y, angle, colour = P.wood, size = 9) {
    const { cv } = p;
    const back = angle + Math.PI;
    cv.shadowRect(x - size / 2, y - size / 2, x + size / 2, y + size / 2, 3, 0.45);
    cv.paint(rotatedRect(x, y, size, size, angle), shade(colour, 0.65));
    cv.paint(rotatedRect(x, y, size - 2, size - 2, angle), grained(p, colour, 'x', 0.2));
    const bx = x + Math.cos(back) * (size / 2 - 0.8);
    const by = y + Math.sin(back) * (size / 2 - 0.8);
    cv.paint(rotatedRect(bx, by, 2.2, size + 0.6, angle), shade(colour, 0.5));
}

/** An upholstered armchair facing `angle`. */
export function armchair(p, x, y, angle, cloth = P.red, size = 20) {
    const { cv } = p;
    const s = size;
    cv.shadowCircle(x, y, s * 0.45, 5, 0.55);
    cv.paint(rotatedRect(x, y, s, s, angle), shade(cloth, 0.6));
    cv.paint(rotatedRect(x, y, s - 2, s - 2, angle), shade(cloth, 0.85));
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const at = (along, side) => [x + cos * along - sin * side, y + sin * along + cos * side];
    // Back and arms, a little raised.
    cv.paint(rotatedRect(...at(-s * 0.36, 0), s * 0.26, s, angle), shade(cloth, 0.7));
    for (const side of [-1, 1]) cv.paint(rotatedRect(...at(0, side * s * 0.38), s * 0.9, s * 0.22, angle), shade(cloth, 0.72));
    cv.paint(rotatedRect(...at(s * 0.08, 0), s * 0.5, s * 0.5, angle), (px, py) => shade(cloth, 1.0 + (noise(p.seed + 321, px * 0.4, py * 0.4) - 0.5) * 0.15));
}

/** A round table with things on it. */
export function roundTable(p, x, y, r, colour = P.wood) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 5, 0.6);
    cv.paint(circle(x, y, r), shade(colour, 0.6));
    cv.paint(circle(x, y, r - 1.3), grained(p, colour, 'x', 0.3));
    cv.paint(ring(x, y, r * 0.55, r * 0.58), shade(colour, 0.8), 0.5);
}

export function bench(p, x0, y0, x1, y1, colour = P.wood) {
    woodTop(p, x0, y0, x1, y1, colour, { radius: 1, rim: 0.9, shadow: 0.45 });
}

// ---------------------------------------------------------------- tableware

export function mug(p, x, y) {
    const { cv } = p;
    cv.shadowCircle(x, y, 2, 1.5, 0.4);
    cv.paint(circle(x, y, 2.1), P.pewter);
    cv.paint(circle(x, y, 1.4), shade(P.oakLight, 0.8));
    cv.paint(rect(x + 1.8, y - 0.6, x + 3.2, y + 0.6), P.pewter);
}

export function plate(p, x, y, r = 3.2, food = null) {
    const { cv } = p;
    cv.paint(circle(x, y, r), P.ivory);
    cv.paint(ring(x, y, r * 0.65, r * 0.75), P.linenShade, 0.6);
    if (food) cv.paint(circle(x + 0.4, y - 0.3, r * 0.5), food);
}

export function bottle(p, x, y, colour = P.green) {
    const { cv } = p;
    cv.shadowCircle(x, y, 1.6, 1.4, 0.4);
    cv.paint(circle(x, y, 1.7), shade(colour, 0.8));
    cv.paint(circle(x - 0.4, y - 0.4, 0.6), mix(colour, P.ivory, 0.6));
}

export function book(p, x, y, w, h, angle, colour) {
    const { cv } = p;
    cv.shadowRect(x - w / 2, y - h / 2, x + w / 2, y + h / 2, 2, 0.3);
    cv.paint(rotatedRect(x, y, w, h, angle), colour);
    cv.paint(rotatedRect(x, y, w - 1.6, h - 1.6, angle), P.ivory);
    cv.paint(rotatedRect(x, y, 0.5, h - 1.6, angle), shade(colour, 0.7));
}

// ---------------------------------------------------------------- storage

/** A barrel seen from above: staves, iron hoops and a lid. */
export function barrel(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 4, 0.6);
    cv.paint(circle(x, y, r), (px, py) => {
        const angle = Math.atan2(py - y, px - x);
        const stave = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 14);
        return shade(P.wood, 0.75 + hash(seed + 331, stave, Math.round(x)) * 0.3);
    });
    cv.paint(ring(x, y, r - 1.2, r), P.iron);
    cv.paint(ring(x, y, r * 0.62, r * 0.68), P.iron, 0.8);
    cv.paint(circle(x, y, r * 0.58), grained(p, P.woodLight, 'x', 0.25));
    cv.paint(circle(x + r * 0.25, y, r * 0.09), P.woodDark);
}

export function sack(p, x, y, r, angle = 0) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 3, 0.5);
    cv.paint(ellipse(x, y, r, r * 0.82, angle), (px, py) => shade(mix(P.linenShade, P.soil, 0.25), 0.8 + noise(seed + 341, px * 0.5, py * 0.5) * 0.3));
    cv.paint(ellipse(x + Math.cos(angle) * r * 0.75, y + Math.sin(angle) * r * 0.75, r * 0.32, r * 0.22, angle), shade(P.linenShade, 0.7));
}

export function crate(p, x0, y0, x1, y1, colour = P.woodLight) {
    const { cv } = p;
    woodTop(p, x0, y0, x1, y1, colour, { radius: 0.6, rim: 1.4 });
    cv.paint(segment(x0 + 1.5, y0 + 1.5, x1 - 1.5, y1 - 1.5, 1.2), shade(colour, 0.65));
    cv.paint(segment(x1 - 1.5, y0 + 1.5, x0 + 1.5, y1 - 1.5, 1.2), shade(colour, 0.65));
}

/** A row of books on a shelf, spines towards the room (+y side), filling the box. */
export function bookRow(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    let x = x0;
    let k = 0;
    while (x < x1 - 0.5) {
        const width = Math.min(x1 - x, 1.6 + hash(seed + 351, k, 1) * 2.4);
        const depth = (y1 - y0) * (0.75 + hash(seed + 353, k, 2) * 0.25);
        const colour = P.books[Math.floor(hash(seed + 355, k, 3) * P.books.length)];
        if (hash(seed + 357, k, 4) > 0.08) {
            cv.paint(rect(x, y1 - depth, x + width - 0.25, y1), shade(colour, 0.85 + hash(seed + 359, k, 5) * 0.3));
            cv.paint(rect(x, y1 - 0.8, x + width - 0.25, y1), shade(colour, 1.25), 0.6);
        }
        x += width;
        k++;
    }
}

/** A bookcase against a north wall (y0), as wide as the box. */
export function bookcase(p, x0, y0, x1, y1) {
    const { cv } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.walnut);
    cv.paint(rect(x0 + 1.2, y0 + 1, x1 - 1.2, y1 - 1.2), shade(P.walnut, 0.55));
    const bays = Math.max(1, Math.round((x1 - x0) / 22));
    const bay = (x1 - x0 - 2.4) / bays;
    for (let k = 0; k < bays; k++) {
        bookRow(p, x0 + 1.2 + k * bay + 0.6, y0 + 1.5, x0 + 1.2 + (k + 1) * bay - 0.6, y1 - 1.4);
        if (k > 0) cv.paint(rect(x0 + 1.2 + k * bay - 0.6, y0 + 1, x0 + 1.2 + k * bay + 0.6, y1 - 1.2), P.walnut);
    }
}

/** Shelves against a north wall with crocks, jars and a loaf or two. */
export function pantryShelf(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    woodTop(p, x0, y0, x1, y1, P.wood, { radius: 0.5, rim: 1 });
    let x = x0 + 3;
    let k = 0;
    const cy = (y0 + y1) / 2;
    const r = Math.min(4, (y1 - y0) / 2 - 1.5);
    while (x < x1 - 3) {
        const kind = hash(seed + 361, k, 1);
        if (kind < 0.4) {
            cv.shadowCircle(x + r, cy, r, 2, 0.4);
            cv.paint(circle(x + r, cy, r), P.terracotta);
            cv.paint(circle(x + r, cy, r * 0.55), shade(P.terracotta, 0.6));
        } else if (kind < 0.7) {
            cv.paint(circle(x + r, cy, r * 0.85), mix(P.waterLight, P.green, 0.4), 0.85);
            cv.paint(circle(x + r, cy, r * 0.45), P.linen);
        } else {
            cv.paint(ellipse(x + r + 1, cy, r + 1, r * 0.8), mix(P.oakLight, P.linen, 0.3));
        }
        x += 2 * r + 2 + hash(seed + 363, k, 2) * 2;
        k++;
    }
}

// ---------------------------------------------------------------- hearths

/** A fireplace set into a north wall: stone surround and hearth, the fire, and its light. */
export function fireplace(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    const depth = y1 - y0;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.5);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => shade(mix(P.stone, P.mortar, 0.25), 0.8 + noise(seed + 371, x * 0.4, y * 0.4) * 0.25));
    cv.paint(rect(x0, y1 - 2, x1, y1), shade(P.stone, 0.75));
    const inset = (x1 - x0) * 0.2;
    fire(p, x0 + inset, y0 - 1, x1 - inset, y0 + depth * 0.62, 46);
    cv.paint(rect(x0 + inset - 1, y0 + depth * 0.62, x1 - inset + 1, y0 + depth * 0.62 + 1.2), P.iron);
}

/** A kitchen range: a wide hearth with a pot on a chain and a spit. */
export function range(p, x0, y0, x1, y1) {
    const { cv } = p;
    fireplace(p, x0, y0, x1, y1);
    const cx = (x0 + x1) / 2;
    const cy = y0 + (y1 - y0) * 0.35;
    cv.paint(segment(x0 + (x1 - x0) * 0.22, cy - 2, x1 - (x1 - x0) * 0.22, cy - 2, 1), P.ironLight);
    cauldron(p, cx, cy + 1, 5.5, false);
}

export function cauldron(p, x, y, r, legs = true) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 3.5, 0.55);
    if (legs) for (let k = 0; k < 3; k++) cv.paint(circle(x + Math.cos(k * 2.1 + 0.5) * r, y + Math.sin(k * 2.1 + 0.5) * r, 1.2), P.iron);
    cv.paint(circle(x, y, r), P.iron);
    cv.paint(ring(x, y, r - 1.1, r - 0.4), P.ironLight, 0.6);
    cv.paint(circle(x, y, r - 1.3), (px, py) => mix(shade(P.soil, 0.9), P.oakLight, noise(seed + 381, px * 0.8, py * 0.8) * 0.5));
}

// ---------------------------------------------------------------- beds and cloth

/** A bed with its head against a north wall (y0): headboard, pillows, a turned-down cover. */
export function bed(p, x0, y0, x1, y1, cover = P.red) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.walnut);
    cv.paint(rect(x0, y0, x1, y0 + 3.5), shade(P.walnut, 0.75));
    const ix0 = x0 + 1.4;
    const ix1 = x1 - 1.4;
    cv.paint(rect(ix0, y0 + 3.5, ix1, y1 - 1.4), P.linen);
    const pillows = x1 - x0 > 30 ? 2 : 1;
    const pw = (ix1 - ix0 - 2) / pillows;
    for (let k = 0; k < pillows; k++) {
        const px0 = ix0 + 1 + k * pw;
        cv.paint(roundRect(px0 + 0.6, y0 + 5, px0 + pw - 0.6, y0 + 12, 2.5), (x, y) => shade(P.linen, 0.92 + 0.12 * Math.sin(((y - y0 - 5) / 7) * Math.PI)));
    }
    const fold = y0 + 16;
    cv.paint(rect(ix0, fold, ix1, y1 - 1.4), (x, y) => shade(cover, 0.85 + fbm(seed + 391, x * 0.15, y * 0.15, 3) * 0.25));
    cv.paint(rect(ix0, fold, ix1, fold + 3), shade(P.linen, 0.95));
    cv.paint(rect(ix0, fold + 3, ix1, fold + 3.8), shade(cover, 0.6), 0.6);
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) cv.paint(circle(x, y, 1.8), shade(P.walnut, 1.3));
}

/** A rug: field, border and fringe. */
export function rug(p, x0, y0, x1, y1, field = P.red, border = P.blue) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 1.5, 0.25);
    const fringe = 1.6;
    for (let x = x0 + 0.5; x < x1; x += 1.4) {
        cv.paint(rect(x, y0 - fringe, x + 0.6, y0), P.linen, 0.8);
        cv.paint(rect(x, y1, x + 0.6, y1 + fringe), P.linen, 0.8);
    }
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const fluff = 0.9 + noise(seed + 401, x * 1.2, y * 1.2) * 0.14;
        if (edge < 3.2) return shade(border, fluff);
        if (edge < 4.2) return shade(P.gold, 0.85 * fluff);
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        const motif = Math.abs(x - cx) / (x1 - x0) + Math.abs(y - cy) / (y1 - y0);
        if (Math.abs(motif - 0.28) < 0.03 || motif < 0.08) return shade(border, fluff);
        return shade(field, fluff * (0.9 + 0.1 * Math.sin((x + y) * 0.5)));
    });
}

// ---------------------------------------------------------------- plants and garden

export function pottedPlant(p, x, y, r, pot = P.terracotta) {
    const { cv, seed, rng } = p;
    cv.shadowCircle(x, y, r * 0.55, 4, 0.5);
    cv.paint(circle(x, y, r * 0.5), shade(pot, 0.8));
    cv.paint(circle(x, y, r * 0.38), P.soil);
    const leaves = 9;
    for (let k = 0; k < leaves; k++) {
        const angle = (k / leaves) * Math.PI * 2 + rng.next() * 0.4;
        const length = r * (0.75 + rng.next() * 0.25);
        const lx = x + Math.cos(angle) * length * 0.55;
        const ly = y + Math.sin(angle) * length * 0.55;
        cv.paint(ellipse(lx, ly, length * 0.5, r * 0.16, angle), (px, py) => mix(P.leaf, P.leafLight, 0.3 + noise(seed + 411, px * 0.4, py * 0.4) * 0.5));
        cv.paint(segment(x, y, lx + Math.cos(angle) * length * 0.3, ly + Math.sin(angle) * length * 0.3, 0.5), shade(P.leaf, 0.7), 0.7);
    }
}

export function tree(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 8, 0.6);
    cv.paint(circle(x, y, r), (px, py) => {
        const clump = fbm(seed + 421, px * 0.12, py * 0.12, 4);
        const t = Math.hypot(px - x, py - y) / r;
        return shade(mix(P.leaf, P.leafLight, clump), 1.05 - t * 0.35);
    });
}

export function flowerBed(p, area) {
    const { cv, seed } = p;
    cv.paint(area, (x, y) => shade(P.soil, 0.8 + noise(seed + 431, x * 0.6, y * 0.6) * 0.3));
    cv.paint(area, (x, y) => {
        const n = hash(seed + 433, Math.floor(x / 3), Math.floor(y / 3));
        if (n < 0.55) return mix(P.leaf, P.leafLight, n);
        return P.flowers[Math.floor(hash(seed + 435, Math.floor(x / 3), Math.floor(y / 3)) * P.flowers.length)];
    }, (x, y) => (noise(seed + 437, x * 0.5, y * 0.5) > 0.35 ? 0.9 : 0));
}

// ---------------------------------------------------------------- stairs

/**
 * A flight of stairs across a box, rising towards `up`: each step a little lighter than the one below, with a
 * shadowed nosing.
 * @param {'n'|'s'|'e'|'w'} up
 */
export function stairs(p, x0, y0, x1, y1, up, count, colour = P.wood) {
    const { cv, seed } = p;
    const vertical = up === 'n' || up === 's';
    const length = vertical ? y1 - y0 : x1 - x0;
    const tread = length / count;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const along = vertical ? y - y0 : x - x0;
        const step = Math.min(count - 1, Math.floor(along / tread));
        const towardsUp = up === 'n' || up === 'w' ? count - 1 - step : step;
        const within = (along - step * tread) / tread;
        let c = shade(colour, 0.7 + (towardsUp / count) * 0.45);
        c = shade(c, 0.92 + fbm(seed + 441, (vertical ? x : y) * 0.04, (vertical ? y : x) * 0.5, 3) * 0.16);
        const nose = up === 'n' || up === 'w' ? within : 1 - within;
        if (nose < 0.12) c = shade(c, 1.2);
        else if (nose > 0.9) c = shade(c, 0.6);
        return c;
    });
}

/** Stairs going down into the dark, getting darker step by step towards `down`. */
export function stairsDown(p, x0, y0, x1, y1, down, count) {
    const { cv, seed } = p;
    const vertical = down === 'n' || down === 's';
    const length = vertical ? y1 - y0 : x1 - x0;
    const tread = length / count;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const along = vertical ? y - y0 : x - x0;
        const step = Math.min(count - 1, Math.floor(along / tread));
        const deeper = down === 's' || down === 'e' ? step : count - 1 - step;
        const within = (along - step * tread) / tread;
        let c = shade(mix(P.stone, P.mortar, 0.4), 0.95 - (deeper / count) * 0.8);
        c = shade(c, 0.9 + noise(seed + 451, x * 0.5, y * 0.5) * 0.2);
        const nose = down === 's' || down === 'e' ? within : 1 - within;
        if (nose < 0.14) c = shade(c, 1.25);
        return c;
    });
}

/** A handrail along a box, with a newel post at each end. */
export function banister(p, x0, y0, x1, y1) {
    const { cv } = p;
    const across = x1 - x0 >= y1 - y0;
    cv.shadowRect(x0, y0, x1, y1, 2, 0.45);
    cv.paint(rect(x0, y0, x1, y1), P.walnut);
    cv.paint(rect(x0 + 0.5, y0 + 0.5, x1 - 0.5, y1 - 0.5), shade(P.walnut, 1.4));
    const ends = across ? [[x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2]] : [[(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1]];
    for (const [x, y] of ends) {
        cv.paint(rect(x - 2, y - 2, x + 2, y + 2), P.walnut);
        cv.paint(rect(x - 1.2, y - 1.2, x + 1.2, y + 1.2), shade(P.walnut, 1.5));
    }
}

// ---------------------------------------------------------------- odds and ends

/** A black cat curled up, or sitting; `angle` turns it. */
export function cat(p, x, y, size, angle, colour = P.ebony) {
    const { cv } = p;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const at = (u, v) => [x + cos * u - sin * v, y + sin * u + cos * v];
    cv.shadowCircle(x, y, size * 0.6, 2.5, 0.35);
    cv.paint(ellipse(...at(0, 0), size * 0.62, size * 0.42, angle), colour);
    cv.paint(circle(...at(size * 0.55, -size * 0.1), size * 0.3), colour);
    for (const side of [-1, 1]) {
        const [ex, ey] = at(size * 0.66, -size * 0.1 + side * size * 0.17);
        cv.paint(polygon([[ex - cos * 1.4, ey - sin * 1.4], [ex + cos * 1.6 - sin * side * 0.6, ey + sin * 1.6 + cos * side * 0.6], [ex + sin * side * 1.4, ey - cos * side * 1.4]]), colour);
        cv.paint(circle(...at(size * 0.72, -size * 0.1 + side * size * 0.1), 0.55), CAT_EYES);
    }
    const tail = at(-size * 0.55, size * 0.25);
    cv.paint(segment(...at(-size * 0.45, 0), ...tail, size * 0.14), colour);
    cv.paint(segment(...tail, ...at(-size * 0.1, size * 0.48), size * 0.13), colour);
}

const CAT_EYES = [0.85, 0.8, 0.25];

/** A cobweb spanning a north-west corner at (x, y). */
export function cobweb(p, x, y, size) {
    const { cv } = p;
    const colour = [0.85, 0.85, 0.82];
    for (let k = 0; k <= 4; k++) {
        const angle = (k / 4) * (Math.PI / 2);
        cv.paint(segment(x, y, x + Math.cos(angle) * size, y + Math.sin(angle) * size, 0.35), colour, 0.6);
    }
    for (let r = size * 0.25; r < size; r += size * 0.22) {
        cv.paint(wedge(x, y, r - 0.2, r + 0.2, 0, Math.PI / 2), colour, 0.45);
    }
}

/** A suit of armour on a small plinth. */
export function armour(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowRect(x - r, y - r, x + r, y + r, 4, 0.55);
    cv.paint(rect(x - r, y - r, x + r, y + r), shade(P.stone, 0.75));
    cv.paint(rect(x - r + 1, y - r + 1, x + r - 1, y + r - 1), (px, py) => shade(P.stone, 0.95 + noise(seed + 461, px * 0.5, py * 0.5) * 0.15));
    const metal = (px, py) => shade(P.pewter, 0.75 + 0.45 * (1 - Math.hypot(px - x + 1, py - y + 1) / (r * 0.8)));
    cv.paint(ellipse(x, y + r * 0.05, r * 0.72, r * 0.42), metal);
    cv.paint(circle(x, y, r * 0.34), metal);
    cv.paint(segment(x - r * 0.3, y, x + r * 0.3, y, 0.6), P.iron, 0.8);
    cv.paint(segment(x + r * 0.72, y - r * 0.9, x + r * 0.72, y + r * 0.9, 1), P.ironLight);
    cv.paint(polygon([[x + r * 0.72, y - r * 1.05], [x + r * 0.5, y - r * 0.7], [x + r * 0.94, y - r * 0.7]]), P.pewter);
}

/** A statue on a round plinth: a robed figure seen from above. */
export function statue(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 5, 0.55);
    cv.paint(circle(x, y, r), shade(P.stone, 0.8));
    cv.paint(ring(x, y, r - 1.2, r), shade(P.stone, 0.6));
    const marbleShade = (px, py) => shade(P.marbleLight, 0.8 + 0.25 * (1 - Math.hypot(px - x + 1, py - y + 1) / r) + (noise(seed + 471, px * 0.6, py * 0.6) - 0.5) * 0.08);
    cv.paint(ellipse(x, y + r * 0.1, r * 0.62, r * 0.48), marbleShade);
    cv.paint(circle(x, y - r * 0.05, r * 0.3), marbleShade);
}

export function vase(p, x, y, r) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 2, 0.4);
    cv.paint(circle(x, y, r), P.blue);
    cv.paint(ring(x, y, r * 0.5, r * 0.7), P.ivory, 0.8);
    for (let k = 0; k < 6; k++) {
        const angle = k * 1.05;
        cv.paint(circle(x + Math.cos(angle) * r * 0.55, y + Math.sin(angle) * r * 0.55, r * 0.35), P.flowers[k % P.flowers.length]);
    }
    cv.paint(circle(x, y, r * 0.3), P.flowers[1]);
}

export function chest(p, x0, y0, x1, y1) {
    const { cv } = p;
    woodTop(p, x0, y0, x1, y1, P.wood, { radius: 1.5, rim: 1.2 });
    for (const t of [0.22, 0.78]) {
        const x = x0 + (x1 - x0) * t;
        cv.paint(rect(x - 1, y0, x + 1, y1), P.iron);
    }
    cv.paint(rect((x0 + x1) / 2 - 1.5, y1 - 2.6, (x0 + x1) / 2 + 1.5, y1 - 0.6), P.brass);
}

/** A tub of water, round or long. */
export function tub(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    const r = Math.min(x1 - x0, y1 - y0) / 2;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(roundRect(x0, y0, x1, y1, r), P.copper);
    cv.paint(roundRect(x0 + 2, y0 + 2, x1 - 2, y1 - 2, r - 2), (x, y) => mix(P.water, P.waterLight, noise(seed + 481, x * 0.2, y * 0.2) * 0.6));
    cv.paint(ring((x0 + x1) / 2, y0 + r, r - 2.2, r - 1.6), P.ivory, 0.25);
}

/** Things to block a walk-cell area without painting anything: walls of stairwells, the inside of a big object. */
export function blockRect(p, x0, y0, x1, y1) {
    p.block(rect(x0, y0, x1, y1));
}
