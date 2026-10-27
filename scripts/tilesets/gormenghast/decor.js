import {
    circle, ellipse, fbm, hash, mix, noise, polygon, rect, ring, roundRect, segment, shade, shape, wedge,
} from '../lib/raster.js';
import { P } from './style.js';

/**
 * Furniture and fittings. Every function takes a painter `p` ({cv, rng, seed, block}) and coordinates in tile
 * pixels. Anything that should stop the hero calls p.block(shape); the walk map is worked out from those.
 *
 * Shadows are soft and spread evenly in every direction, so mirrored tiles still look right.
 */

// ---------------------------------------------------------------- light

export function candle(p, x, y, reach = 16) {
    p.cv.paint(circle(x, y, 1.6), P.cream);
    p.cv.paint(circle(x, y, 0.75), P.flame);
    p.cv.glow(x, y, reach, P.glow, 0.26);
    p.cv.glow(x, y, 4, P.flame, 0.45);
}

/** An iron sconce with a burning torch, fixed to the top of a wall. */
export function sconce(p, x, y) {
    p.cv.paint(roundRect(x - 2.2, y - 2.2, x + 2.2, y + 2.2, 0.8), P.iron);
    p.cv.paint(circle(x, y, 1.4), P.ember);
    p.cv.paint(circle(x, y, 0.8), P.flame);
    p.cv.glow(x, y, 30, P.glow, 0.3);
    p.cv.glow(x, y, 7, P.flame, 0.4);
}

export function brazier(p, x, y, r = 6) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 6, 0.6);
    for (let k = 0; k < 3; k++) {
        const angle = (k * 2 * Math.PI) / 3 + 0.5;
        cv.paint(segment(x, y, x + Math.cos(angle) * (r + 3), y + Math.sin(angle) * (r + 3), 1.4), P.iron);
    }
    cv.paint(circle(x, y, r), P.iron);
    cv.paint(ring(x, y, r - 1.2, r), shade(P.stone, 0.6));
    cv.paint(circle(x, y, r - 1.3), (cx, cy) => {
        const heat = noise(seed + 101, cx * 0.9, cy * 0.9);
        return heat > 0.55 ? mix(P.ember, P.flame, (heat - 0.55) * 2) : mix(P.soot, P.ember, heat * 0.9);
    });
    cv.glow(x, y, 46, P.glow, 0.42);
    cv.glow(x, y, 10, P.flame, 0.5);
    p.block(circle(x, y, r + 1.5));
}

// ---------------------------------------------------------------- architecture

/** The top of a stone column. */
export function pillar(p, x, y, r) {
    const { cv, seed } = p;
    const base = r + 2.2;
    cv.shadowRect(x - base, y - base, x + base, y + base, 6, 0.55);
    cv.paint(rect(x - base, y - base, x + base, y + base), (cx, cy) => {
        const edge = Math.min(cx - (x - base), x + base - cx, cy - (y - base), y + base - cy);
        return shade(P.stone, (edge < 0.9 ? 0.45 : 0.68) + noise(seed + 111, cx * 0.7, cy * 0.7) * 0.1);
    });
    cv.paint(circle(x, y, r), (cx, cy) => {
        const t = Math.hypot(cx - x, cy - y) / r;
        return shade(mix(P.marble, P.stone, 0.45), 1.1 - 0.5 * t * t + (noise(seed + 113, cx, cy) - 0.5) * 0.08);
    });
    cv.paint(ring(x, y, r * 0.72, r * 0.8), shade(P.stone, 0.55), 0.6);
    p.block(rect(x - base, y - base, x + base, y + base));
}

/**
 * A flight of steps across a rectangle, getting darker towards the `down` side.
 * @param {'n'|'s'|'e'|'w'} down
 */
export function steps(p, x0, y0, x1, y1, down, count) {
    const { cv, seed } = p;
    const vertical = down === 'n' || down === 's';
    const length = vertical ? y1 - y0 : x1 - x0;
    const tread = length / count;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const along = vertical ? y - y0 : x - x0;
        const step = Math.min(count - 1, Math.floor(along / tread));
        const within = (along - step * tread) / tread;
        const towardsDown = down === 's' || down === 'e';
        const depth = towardsDown ? step / count : (count - 1 - step) / count;
        let colour = shade(mix(P.stone, P.wallDark, 0.3), 1 - depth * 0.6);
        colour = shade(colour, 0.9 + noise(seed + 121, x * 0.6, y * 0.6) * 0.2);
        const nose = towardsDown ? 1 - within : within;
        if (nose < 0.14) colour = shade(colour, 0.4);
        else if (nose < 0.26) colour = shade(colour, 1.18);
        return colour;
    });
}

/** A spiral stair seen from above, winding down into the dark. */
export function spiralStair(p, x, y, r) {
    const { cv, seed } = p;
    const count = 13;
    const start = -Math.PI / 2;
    const span = (Math.PI * 1.8) / count;
    cv.shadowCircle(x, y, r, 5, 0.6);
    cv.paint(circle(x, y, r), P.soot);
    for (let k = 0; k < count; k++) {
        const from = start + k * span;
        const tone = 1 - (k / count) * 0.75;
        cv.paint(wedge(x, y, r * 0.2, r - 1.5, from, from + span), (cx, cy) =>
            shade(mix(P.stone, P.wallDark, 0.35), tone * (0.9 + noise(seed + 131, cx * 0.7, cy * 0.7) * 0.2)));
        cv.paint(wedge(x, y, r * 0.2, r - 1.5, from + span * 0.86, from + span), shade(P.soot, 1.5), 0.85);
    }
    cv.paint(ring(x, y, r - 1.5, r), P.wallDark);
    cv.paint(circle(x, y, r * 0.22), (cx, cy) => shade(P.stone, 1.05 - 0.6 * (Math.hypot(cx - x, cy - y) / (r * 0.22)) ** 2));
    p.block(circle(x, y, r));
}

/** An arched niche's worth of rubble, a collapsed ceiling, a heap of fallen stone. */
export function rubble(p, x, y, radius, count, blocks = true) {
    const { cv, rng, seed } = p;
    cv.paint(circle(x, y, radius * 1.35), P.dust, (cx, cy) =>
        0.5 * (1 - Math.hypot(cx - x, cy - y) / (radius * 1.35)) * (0.5 + noise(seed + 141, cx * 0.4, cy * 0.4)));
    const stones = Array.from({ length: count }, () => {
        const angle = rng.next() * Math.PI * 2;
        const distance = Math.sqrt(rng.next()) * radius;
        return {
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            size: (1.4 + rng.next() * 4.5) * (1 - (distance / radius) * 0.45),
            tone: rng.next(),
            spin: rng.next() * Math.PI,
            corners: 5 + Math.floor(rng.next() * 3),
        };
    }).sort((a, b) => b.size - a.size);

    for (const stone of stones) {
        const points = Array.from({ length: stone.corners }, (_, k) => {
            const angle = stone.spin + (k / stone.corners) * Math.PI * 2;
            const reach = stone.size * (0.65 + hash(seed + 143, k, Math.round(stone.x * 10)) * 0.45);
            return [stone.x + Math.cos(angle) * reach, stone.y + Math.sin(angle) * reach];
        });
        const colour = shade(mix(P.wallDark, P.stone, stone.tone), 0.75 + stone.tone * 0.3);
        cv.shadowCircle(stone.x, stone.y, stone.size * 0.6, 2.5, 0.35);
        cv.paint(polygon(points), (cx, cy) => shade(colour, 0.85 + 0.3 * (1 - Math.hypot(cx - stone.x, cy - stone.y) / stone.size)));
    }
    if (blocks) p.block(circle(x, y, radius * 0.85));
}

// ---------------------------------------------------------------- water

/** Water filling a shape, with faint ripples. Water can't be walked on. */
export function water(p, area) {
    const { cv, seed } = p;
    cv.paint(area, (x, y) => {
        const depth = fbm(seed + 151, x * 0.06, y * 0.06, 3);
        let colour = mix(P.waterDeep, P.water, depth);
        const ripple = noise(seed + 153, x * 0.22 + depth * 4, y * 0.7);
        if (ripple > 0.8) colour = mix(colour, P.waterLight, (ripple - 0.8) * 2);
        return colour;
    });
    p.block(area);
}

export function puddle(p, x, y, rx, ry) {
    const { cv, seed } = p;
    const area = shape((cx, cy) => ((cx - x) / rx) ** 2 + ((cy - y) / ry) ** 2 < 0.7 + 0.6 * fbm(seed + 155, cx * 0.18, cy * 0.18, 3),
        [x - rx * 1.4, y - ry * 1.4, x + rx * 1.4, y + ry * 1.4]);
    cv.paint(area, (cx, cy) => {
        const shine = noise(seed + 157, cx * 0.5, cy * 0.5);
        return shine > 0.78 ? mix(P.water, P.waterLight, 0.5) : P.water;
    }, 0.72);
}

export function well(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r + 3.5, 6, 0.6);
    cv.paint(ring(x, y, r, r + 3.5), (cx, cy) => {
        const angle = Math.atan2(cy - y, cx - x);
        const joint = Math.abs(((angle / (Math.PI / 6)) % 1 + 1) % 1 - 0.5);
        return shade(P.stone, (joint > 0.46 ? 0.5 : 0.85) + noise(seed + 161, cx, cy) * 0.15);
    });
    cv.paint(circle(x, y, r), (cx, cy) => mix(P.soot, P.waterDeep, Math.hypot(cx - x, cy - y) / r));
    cv.paint(ellipse(x - r * 0.3, y - r * 0.35, r * 0.35, r * 0.12, -0.5), P.waterLight, 0.35);
    cv.paint(rect(x - r - 5, y - 1, x + r + 5, y + 1), P.woodDark);
    cv.paint(rect(x - r - 6, y - 2.5, x - r - 3, y + 2.5), P.wood);
    cv.paint(rect(x + r + 3, y - 2.5, x + r + 6, y + 2.5), P.wood);
    p.block(circle(x, y, r + 3.5));
}

// ---------------------------------------------------------------- furniture

export function table(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.55);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const across = lengthwise ? y - y0 : x - x0;
        const plank = Math.floor(across / 4.5);
        const grain = noise(seed + 171 + plank * 17, lengthwise ? x * 0.12 : x * 1.6, lengthwise ? y * 1.6 : y * 0.12);
        let colour = shade(P.wood, 0.8 + grain * 0.35 + (hash(seed + 173, plank, 0) - 0.5) * 0.15);
        if (across % 4.5 < 0.45) colour = shade(colour, 0.5);
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        if (edge < 1) colour = shade(colour, 0.6);
        return colour;
    });
    p.block(rect(x0, y0, x1, y1));
}

export function plate(p, x, y) {
    p.cv.paint(circle(x, y, 2.6), shade(P.stone, 1.05));
    p.cv.paint(ring(x, y, 1.7, 2.6), shade(P.stone, 0.7));
    p.cv.paint(circle(x + 0.4, y - 0.2, 1.1), P.woodLight);
}

export function bench(p, x0, y0, x1, y1) {
    table(p, x0, y0, x1, y1);
}

export function bookshelf(p, x0, y0, x1, y1, { burnt = false } = {}) {
    const { cv, rng, seed } = p;
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.woodDark);
    const [a0, a1, b0, b1] = lengthwise ? [x0 + 1, x1 - 1, y0 + 1, y1 - 1] : [y0 + 1, y1 - 1, x0 + 1, x1 - 1];
    for (let pos = a0; pos < a1;) {
        const width = Math.min(a1 - pos, 1.4 + rng.next() * 2.2);
        if (rng.next() < 0.08) {
            pos += width;
            continue;
        }
        const depth = (b1 - b0) * (0.7 + rng.next() * 0.3);
        let colour = P.books[Math.floor(rng.next() * P.books.length)];
        if (burnt) colour = mix(colour, P.soot, 0.6 + rng.next() * 0.35);
        const area = lengthwise ? rect(pos, b0, pos + width - 0.3, b0 + depth) : rect(b0, pos, b0 + depth, pos + width - 0.3);
        cv.paint(area, (x, y) => shade(colour, 0.85 + noise(seed + 181, x * 2, y * 2) * 0.25));
        pos += width;
    }
    if (burnt) {
        cv.paint(rect(x0, y0, x1, y1), P.ember, (x, y) => (noise(seed + 183, x * 1.3, y * 1.3) > 0.86 ? 0.8 : 0));
    }
    p.block(rect(x0, y0, x1, y1));
}

export function barrel(p, x, y, r) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 4, 0.55);
    cv.paint(circle(x, y, r), (cx, cy) => {
        const plank = Math.floor((cx - x + r) / 2.2);
        return shade(P.wood, 0.8 + hash(41, plank, 0) * 0.3);
    });
    cv.paint(ring(x, y, r - 1, r), P.iron);
    cv.paint(ring(x, y, r * 0.55, r * 0.55 + 0.8), shade(P.iron, 1.6));
    p.block(circle(x, y, r + 0.5));
}

export function sack(p, x, y, r, angle = 0) {
    const { cv } = p;
    cv.shadowCircle(x, y, r * 0.8, 4, 0.45);
    cv.paint(ellipse(x, y, r, r * 0.8, angle), (cx, cy) =>
        shade(mix(P.parchment, P.dust, 0.5), 1.1 - 0.4 * (Math.hypot(cx - x, cy - y) / r) ** 2));
    cv.paint(circle(x + Math.cos(angle) * r * 0.85, y + Math.sin(angle) * r * 0.85, 1), P.woodDark);
    p.block(ellipse(x, y, r, r * 0.8, angle));
}

export function chest(p, x0, y0, x1, y1) {
    const { cv } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => shade(P.wood, 0.85 + noise(191, x * 1.5, y * 0.3) * 0.25));
    const lengthwise = x1 - x0 >= y1 - y0;
    for (const t of [0.2, 0.8]) {
        const band = lengthwise
            ? rect(x0 + (x1 - x0) * t - 0.7, y0, x0 + (x1 - x0) * t + 0.7, y1)
            : rect(x0, y0 + (y1 - y0) * t - 0.7, x1, y0 + (y1 - y0) * t + 0.7);
        cv.paint(band, P.iron);
    }
    cv.paint(circle((x0 + x1) / 2, (y0 + y1) / 2, 1.2), P.gold);
    p.block(rect(x0, y0, x1, y1));
}

/** A canopied bed with its head against the west wall. */
export function bed(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.woodDark);
    cv.paint(rect(x0 + 1.5, y0 + 1.5, x1 - 1.5, y1 - 1.5), (x, y) => {
        const fold = noise(seed + 201, x * 0.25, y * 0.9);
        return shade(P.crimson, 0.8 + fold * 0.45);
    });
    cv.paint(rect(x0 + 1.5, y0 + 1.5, x1 - 1.5, y1 - 1.5), P.gold, (x, y) =>
        Math.min(x - x0, x1 - x, y - y0, y1 - y) < 2.6 ? 0.5 : 0);
    const pillowWidth = (x1 - x0) * 0.22;
    cv.paint(roundRect(x0 + 2, y0 + 2.5, x0 + 2 + pillowWidth, (y0 + y1) / 2 - 0.6, 1.5), P.cream);
    cv.paint(roundRect(x0 + 2, (y0 + y1) / 2 + 0.6, x0 + 2 + pillowWidth, y1 - 2.5, 1.5), P.cream);
    for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) cv.paint(circle(x, y, 1.8), P.woodLight);
    p.block(rect(x0, y0, x1, y1));
}

export function rug(p, x0, y0, x1, y1, colour = P.crimson, border = P.gold) {
    const { cv, seed } = p;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        let c;
        if (edge < 1) c = shade(border, 0.6);
        else if (edge < 3) c = Math.floor((x + y) / 2) % 2 ? border : shade(border, 0.7);
        else c = (Math.abs(x - cx) + Math.abs(y - cy)) % 9 < 1.2 ? mix(colour, border, 0.5) : colour;
        return shade(c, 0.85 + noise(seed + 211, x * 0.4, y * 0.4) * 0.25);
    }, 0.95);
}

export function altar(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.6);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        return shade(P.marble, (edge < 1 ? 0.6 : 0.85) + noise(seed + 221, x * 0.5, y * 0.5) * 0.12);
    });
    const lengthwise = x1 - x0 >= y1 - y0;
    const cloth = lengthwise
        ? rect(x0 + (x1 - x0) * 0.35, y0 - 1, x0 + (x1 - x0) * 0.65, y1 + 1)
        : rect(x0 - 1, y0 + (y1 - y0) * 0.35, x1 + 1, y0 + (y1 - y0) * 0.65);
    rug(p, ...cloth.box, P.crimson, P.gold);
    const [c1, c2] = lengthwise
        ? [[x0 + 3, (y0 + y1) / 2], [x1 - 3, (y0 + y1) / 2]]
        : [[(x0 + x1) / 2, y0 + 3], [(x0 + x1) / 2, y1 - 3]];
    candle(p, ...c1, 22);
    candle(p, ...c2, 22);
    p.block(rect(x0, y0, x1, y1));
}

/** A robed stone figure on a plinth. */
export function statue(p, x, y, size) {
    const { cv, seed } = p;
    const half = size / 2;
    cv.shadowRect(x - half, y - half, x + half, y + half, 6, 0.6);
    cv.paint(rect(x - half, y - half, x + half, y + half), (cx, cy) => {
        const edge = Math.min(cx - (x - half), x + half - cx, cy - (y - half), y + half - cy);
        return shade(P.stone, (edge < 1 ? 0.5 : 0.75) + noise(seed + 231, cx * 0.6, cy * 0.6) * 0.1);
    });
    const marble = (cx0, cy0, r) => (cx, cy) => shade(P.marble, 1.08 - 0.45 * (Math.hypot(cx - cx0, cy - cy0) / r) ** 2);
    cv.shadowCircle(x, y, size * 0.3, 3, 0.4);
    cv.paint(ellipse(x, y + size * 0.05, size * 0.36, size * 0.24), marble(x, y, size * 0.36));
    cv.paint(circle(x, y - size * 0.02, size * 0.15), marble(x, y - size * 0.02, size * 0.15));
    p.block(rect(x - half, y - half, x + half, y + half));
}

/** One of the painted wooden figures from the Hall of Bright Carvings. */
export function carving(p, x, y, scale = 1) {
    const { cv, rng } = p;
    const colour = P.paint[Math.floor(rng.next() * P.paint.length)];
    const faded = mix(colour, P.dust, 0.15 + rng.next() * 0.25);
    cv.shadowCircle(x, y, 3.2 * scale, 3, 0.5);
    cv.paint(circle(x, y, 3.4 * scale), P.woodDark);
    cv.paint(ellipse(x, y + 0.3 * scale, 2.8 * scale, 2.2 * scale, rng.next()), (cx, cy) =>
        shade(faded, 1.15 - 0.5 * (Math.hypot(cx - x, cy - y) / (2.8 * scale)) ** 2));
    cv.paint(circle(x, y - 0.4 * scale, 1.25 * scale), shade(P.woodLight, 1.25));
    if (rng.next() < 0.4) cv.paint(rect(x - 0.9 * scale, y - 1.9 * scale, x + 0.9 * scale, y - 1.1 * scale), P.gold);
}

/** Painted figures on a low wooden stand. */
export function carvingStand(p, x0, y0, x1, y1, columns, rows) {
    const { cv } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.5);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => shade(P.woodDark, 1.1 + noise(241, x * 1.2, y * 0.2) * 0.2));
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
            carving(p, x0 + ((col + 0.5) * (x1 - x0)) / columns, y0 + ((row + 0.5) * (y1 - y0)) / rows, 0.9);
        }
    }
    p.block(rect(x0, y0, x1, y1));
}

export function cauldron(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r, 5, 0.6);
    cv.paint(circle(x, y, r), P.iron);
    cv.paint(ring(x, y, r * 0.8, r * 0.95), shade(P.iron, 2.2));
    cv.paint(circle(x, y, r * 0.8), (cx, cy) => mix(P.woodDark, shade(P.moss, 1.2), noise(seed + 251, cx * 0.5, cy * 0.5)));
    for (let k = 0; k < 4; k++) {
        const angle = k * 1.7 + 0.3;
        cv.paint(ring(x + Math.cos(angle) * r * 0.4, y + Math.sin(angle) * r * 0.4, 0.5, 1), P.cream, 0.5);
    }
    p.block(circle(x, y, r + 1));
}

/** A great kitchen hearth set into the wall above (north of) y0. */
export function hearth(p, x, y0, width, depth) {
    const { cv, seed } = p;
    const left = x - width / 2;
    const right = x + width / 2;
    cv.shadowRect(left - 3, y0, right + 3, y0 + depth + 3, 6, 0.55);
    cv.paint(rect(left - 3, y0, right + 3, y0 + depth + 3), (cx, cy) => {
        const joint = (Math.floor(cx / 6) + Math.floor(cy / 4)) % 2 ? 0.95 : 0.85;
        return shade(P.stone, joint * (0.85 + noise(seed + 261, cx * 0.7, cy * 0.7) * 0.2));
    });
    cv.paint(rect(left, y0, right, y0 + depth), (cx, cy) => {
        const heat = noise(seed + 263, cx * 0.7, cy * 0.7) * (1 - (cy - y0) / depth * 0.4);
        return heat > 0.5 ? mix(P.ember, P.flame, (heat - 0.5) * 2) : mix(P.soot, P.ember, heat * 0.8);
    });
    cv.paint(segment(left + 3, y0 + depth * 0.45, right - 3, y0 + depth * 0.6, 2.2), P.woodDark);
    cv.paint(segment(left + 4, y0 + depth * 0.7, right - 5, y0 + depth * 0.5, 2.2), P.wood);
    cv.glow(x, y0 + depth * 0.6, 52, P.glow, 0.45);
    cv.glow(x, y0 + depth * 0.5, 14, P.flame, 0.45);
    p.block(rect(left - 3, y0, right + 3, y0 + depth + 3));
}

/** A raised dais with a high-backed chair, facing south. */
export function dais(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 5, 0.5);
    const stone = mix(P.marble, P.stone, 0.65);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        return shade(stone, (edge < 1.2 ? 0.5 : edge < 3 ? 0.9 : 0.72) + noise(seed + 271, x * 0.4, y * 0.4) * 0.1);
    });
    const x = (x0 + x1) / 2;
    rug(p, x - 4, (y0 + y1) / 2, x + 4, y1 + 6, P.crimson, P.gold);
    cv.shadowRect(x - 6, y0 + 2, x + 6, y0 + 12, 3, 0.6);
    cv.paint(rect(x - 6, y0 + 2, x + 6, y0 + 5), P.woodDark);
    cv.paint(rect(x - 5, y0 + 5, x + 5, y0 + 12), P.woodDark);
    cv.paint(rect(x - 3.6, y0 + 5.5, x + 3.6, y0 + 11), P.crimsonLight);
    p.block(rect(x - 6, y0 + 2, x + 6, y0 + 12));
}

/** A round inlaid stone crest set into the floor. */
export function mosaic(p, x, y, r) {
    const { cv, seed } = p;
    cv.paint(circle(x, y, r), (cx, cy) => {
        const d = Math.hypot(cx - x, cy - y) / r;
        const angle = Math.atan2(cy - y, cx - x);
        const star = Math.abs(Math.cos(angle * 4)) ** 6;
        let colour;
        if (d > 0.9) colour = P.hallBorder;
        else if (d > 0.8) colour = P.inlay;
        else if (d < 0.25) colour = P.crimson;
        else colour = d < 0.25 + star * 0.5 ? P.inlay : P.hallDark;
        const tessera = hash(seed + 281, Math.floor(cx * 0.8), Math.floor(cy * 0.8));
        return shade(colour, 0.8 + tessera * 0.3);
    });
}

export function grate(p, x, y, size) {
    const { cv } = p;
    const half = size / 2;
    cv.paint(rect(x - half - 1, y - half - 1, x + half + 1, y + half + 1), shade(P.stone, 0.6));
    cv.paint(rect(x - half, y - half, x + half, y + half), P.soot);
    for (let k = 1; k < 5; k++) {
        const bx = x - half + (k * size) / 5;
        cv.paint(rect(bx - 0.6, y - half, bx + 0.6, y + half), shade(P.iron, 2));
    }
}

/** A crimson banner with a gold border, hanging on a wall. */
export function banner(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 2.5, 0.5);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const fold = noise(seed + 291, x * 0.8, y * 0.15);
        return edge < 1.1 ? P.gold : shade(P.crimson, 0.75 + fold * 0.45);
    });
    cv.paint(circle((x0 + x1) / 2, (y0 + y1) / 2, Math.min(x1 - x0, y1 - y0) * 0.22), P.gold);
}

/** Cobwebs spreading from a corner at (x, y) towards (x + dx·size, y + dy·size). */
export function cobweb(p, x, y, dx, dy, size) {
    const { cv } = p;
    const threads = 5;
    const ends = Array.from({ length: threads }, (_, k) => {
        const angle = (k / (threads - 1)) * (Math.PI / 2);
        return [Math.cos(angle) * dx, Math.sin(angle) * dy];
    });
    for (const [ux, uy] of ends) cv.paint(segment(x, y, x + ux * size, y + uy * size, 0.35), P.cream, 0.3);
    for (const t of [0.3, 0.55, 0.8]) {
        for (let k = 0; k < threads - 1; k++) {
            const [ax, ay] = ends[k];
            const [bx, by] = ends[k + 1];
            cv.paint(segment(x + ax * size * t, y + ay * size * t, x + bx * size * t, y + by * size * t, 0.3), P.cream, 0.25);
        }
    }
}

/** Ivy leaves growing over an area. */
export function ivy(p, area, density) {
    const { cv, rng } = p;
    const [x0, y0, x1, y1] = area.box.map((v, i) => Math.max(i < 2 ? -2 : -1e9, Math.min(i < 2 ? 1e9 : 142, v)));
    const count = Math.round((x1 - x0) * (y1 - y0) * density * 0.02);
    for (let k = 0; k < count; k++) {
        const x = x0 + rng.next() * (x1 - x0);
        const y = y0 + rng.next() * (y1 - y0);
        if (!area(x, y)) continue;
        const size = 1.2 + rng.next() * 1.4;
        const angle = rng.next() * Math.PI;
        cv.shadowCircle(x, y, size * 0.6, 1.5, 0.3);
        cv.paint(ellipse(x, y, size, size * 0.6, angle), shade(mix(P.moss, P.mossLight, rng.next()), 0.8 + rng.next() * 0.4));
    }
}

/** Scattered pale feathers, as left by the owls of the Tower of Flints. */
export function feathers(p, area, count) {
    const { cv, rng } = p;
    const [x0, y0, x1, y1] = area.box;
    for (let k = 0; k < count; k++) {
        const x = x0 + rng.next() * (x1 - x0);
        const y = y0 + rng.next() * (y1 - y0);
        if (!area(x, y)) continue;
        const angle = rng.next() * Math.PI;
        cv.paint(ellipse(x, y, 2.2, 0.6, angle), mix(P.white, P.dust, rng.next() * 0.4), 0.85);
    }
}

/** Blackened, sooty patches, for fire-damaged rooms. */
export function scorch(p, area, amount) {
    const { cv, seed } = p;
    cv.paint(area, P.soot, (x, y) => Math.max(0, fbm(seed + 301, x * 0.05, y * 0.05, 4) - 0.35) * amount * 2.2);
}

/** Pale dust sheets thrown over stored things. */
export function dustSheet(p, x, y, rx, ry, angle) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, Math.min(rx, ry), 4, 0.45);
    cv.paint(ellipse(x, y, rx, ry, angle), (cx, cy) =>
        shade(mix(P.cream, P.dust, 0.35), 0.8 + noise(seed + 311, cx * 0.3, cy * 0.3) * 0.35));
    p.block(ellipse(x, y, rx, ry, angle));
}

// ---------------------------------------------------------------- studies, sickrooms and the Countess's birds

/** A high-backed chair. `facing` is the side its seat opens towards. */
export function chair(p, x, y, facing = 's') {
    const { cv } = p;
    const half = 3.4;
    cv.shadowRect(x - half, y - half, x + half, y + half, 3, 0.5);
    cv.paint(rect(x - half, y - half, x + half, y + half), P.woodDark);
    cv.paint(rect(x - half + 1, y - half + 1, x + half - 1, y + half - 1), P.crimsonLight);
    const back = {
        n: rect(x - half, y + half - 1.6, x + half, y + half),
        s: rect(x - half, y - half, x + half, y - half + 1.6),
        e: rect(x - half, y - half, x - half + 1.6, y + half),
        w: rect(x + half - 1.6, y - half, x + half, y + half),
    }[facing];
    cv.paint(back, shade(P.woodDark, 0.7));
    p.block(rect(x - half, y - half, x + half, y + half));
}

/** A shelf of little coloured bottles, as in Doctor Prunesquallor's dispensary. */
export function bottles(p, x0, y0, x1, y1) {
    const { cv, rng } = p;
    const glass = [P.mossLight, P.ember, P.waterLight, P.crimsonLight, P.cream, P.gold].map((c) => mix(c, P.soot, 0.25));
    cv.shadowRect(x0, y0, x1, y1, 3.5, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.woodDark);
    const lengthwise = x1 - x0 >= y1 - y0;
    const across = lengthwise ? (y0 + y1) / 2 : (x0 + x1) / 2;
    const [from, to] = lengthwise ? [x0 + 2, x1 - 1.5] : [y0 + 2, y1 - 1.5];
    for (let at = from; at < to;) {
        const r = 0.9 + rng.next() * 0.9;
        const [x, y] = lengthwise ? [at + r, across + (rng.next() - 0.5) * 1.2] : [across + (rng.next() - 0.5) * 1.2, at + r];
        const colour = glass[Math.floor(rng.next() * glass.length)];
        cv.paint(circle(x, y, r), colour);
        cv.paint(circle(x - r * 0.3, y - r * 0.3, r * 0.35), P.white, 0.6);
        at += r * 2 + 0.5;
    }
    p.block(rect(x0, y0, x1, y1));
}

/** A tall cabinet of drawers. */
export function cabinet(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const along = lengthwise ? x - x0 : y - y0;
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const seam = along % 5 < 0.4;
        return shade(P.wood, (edge < 0.8 || seam ? 0.55 : 0.85) + noise(seed + 321, x * 0.8, y * 0.8) * 0.15);
    });
    const length = lengthwise ? x1 - x0 : y1 - y0;
    for (let at = 2.5; at < length; at += 5) {
        const [x, y] = lengthwise ? [x0 + at, (y0 + y1) / 2] : [(x0 + x1) / 2, y0 + at];
        cv.paint(circle(x, y, 0.6), P.gold);
    }
    p.block(rect(x0, y0, x1, y1));
}

/** A stone mortar and pestle. */
export function mortar(p, x, y) {
    p.cv.shadowCircle(x, y, 2.4, 2, 0.45);
    p.cv.paint(circle(x, y, 2.6), P.stone);
    p.cv.paint(circle(x, y, 1.6), shade(P.stone, 0.55));
    p.cv.paint(segment(x - 0.5, y - 0.5, x + 3.5, y - 3, 1), shade(P.stone, 1.15));
}

/** An inkwell and quill. */
export function inkwell(p, x, y) {
    p.cv.paint(circle(x, y, 1.4), P.soot);
    p.cv.paint(segment(x + 0.5, y - 0.5, x + 5, y - 3.5, 0.6), P.white, 0.85);
}

/** A sheet of parchment, written on. */
export function parchment(p, x0, y0, x1, y1) {
    p.cv.paint(rect(x0, y0, x1, y1), P.parchment);
    for (let y = y0 + 1.2; y < y1 - 0.8; y += 1.4) p.cv.paint(rect(x0 + 0.8, y, x1 - 0.8, y + 0.35), P.woodDark, 0.5);
}

/** A perching bird, head towards `angle`. */
export function bird(p, x, y, colour, angle) {
    const { cv } = p;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    cv.shadowCircle(x, y, 1.6, 1.5, 0.3);
    cv.paint(ellipse(x - cos * 2, y - sin * 2, 1.6, 0.8, angle), shade(colour, 0.7));
    cv.paint(ellipse(x, y, 2.2, 1.4, angle), (px, py) => shade(colour, 1.15 - 0.4 * (Math.hypot(px - x, py - y) / 2.2) ** 2));
    cv.paint(circle(x + cos * 1.9, y + sin * 1.9, 1.05), colour);
    cv.paint(circle(x + cos * 2.9, y + sin * 2.9, 0.45), P.gold);
}

/** One of the Countess's birdcages, with a bird inside. */
export function birdcage(p, x, y, r) {
    const { cv } = p;
    const s = r / 8.5;
    const yellow = mix(P.gold, P.flame, 0.5);
    cv.shadowCircle(x, y, r * 0.95, 3, 0.5);
    cv.paint(circle(x, y, r), shade(P.wood, 0.8));
    cv.paint(circle(x, y, r - 1.2 * s), shade(P.mortar, 1.4));
    cv.paint(ellipse(x + 0.5 * s, y, 2.6 * s, 1.7 * s, 0.4), yellow);
    cv.paint(circle(x + 2.2 * s, y - 0.8 * s, s), yellow);
    for (let k = 0; k < 12; k++) {
        const angle = (k / 12) * Math.PI * 2;
        cv.paint(segment(x, y, x + Math.cos(angle) * r, y + Math.sin(angle) * r, 0.45), P.gold, 0.85);
    }
    cv.paint(ring(x, y, r - 0.7 * s, r + 0.1 * s), P.gold);
    cv.paint(circle(x, y, 1.4 * s), P.gold);
    p.block(circle(x, y, r));
}

/** A wooden perch on two posts. Only the posts are in the way. */
export function perch(p, x0, y, x1) {
    const { cv } = p;
    cv.paint(segment(x0, y, x1, y, 1.5), P.woodLight);
    for (const x of [x0, x1]) {
        cv.shadowCircle(x, y, 1.6, 2.5, 0.5);
        cv.paint(circle(x, y, 1.8), P.woodDark);
        p.block(circle(x, y, 2));
    }
}

/** A round stone basin with a spout in the middle and rings spreading across the water. */
export function fountain(p, x, y, r) {
    const { cv, seed } = p;
    cv.shadowCircle(x, y, r + 3.5, 6, 0.55);
    cv.paint(ring(x, y, r, r + 3.5), (cx, cy) => {
        const angle = Math.atan2(cy - y, cx - x);
        const joint = Math.abs(((angle / (Math.PI / 8)) % 1 + 1) % 1 - 0.5);
        return shade(P.marble, (joint > 0.46 ? 0.45 : 0.75) + noise(seed + 331, cx, cy) * 0.12);
    });
    cv.paint(circle(x, y, r), (cx, cy) => {
        const d = Math.hypot(cx - x, cy - y);
        const ripple = Math.sin(d * 1.6 - noise(seed + 333, cx * 0.2, cy * 0.2) * 3) > 0.85;
        return ripple ? mix(P.water, P.waterLight, 0.45) : mix(P.waterDeep, P.water, d / r);
    });
    cv.paint(circle(x, y, r * 0.24), (cx, cy) => shade(P.marble, 1.05 - 0.5 * (Math.hypot(cx - x, cy - y) / (r * 0.24)) ** 2));
    cv.paint(circle(x, y, r * 0.09), P.waterLight);
    p.block(circle(x, y, r + 3.5));
}

/** A stack of books on the floor. */
export function bookPile(p, x, y) {
    const { cv, rng } = p;
    cv.shadowRect(x - 3, y - 2.5, x + 3, y + 2.5, 2.5, 0.45);
    for (let k = 0; k < 3; k++) {
        const colour = P.books[Math.floor(rng.next() * P.books.length)];
        const dx = (rng.next() - 0.5) * 1.5;
        const dy = (rng.next() - 0.5) * 1.5;
        cv.paint(rect(x - 3 + dx + k * 0.3, y - 2.2 + dy + k * 0.3, x + 3 + dx - k * 0.3, y + 2.2 + dy - k * 0.3), colour);
    }
    p.block(rect(x - 3, y - 2.5, x + 3, y + 2.5));
}
