import { circle, ellipse, fbm, hex, mix, noise, polygon, rect, ring, roundRect, segment, shade } from '../lib/raster.js';
import { barrel, birdcage, candle, cobweb, feathers, ivy, puddle, rubble, rug, sack, statue } from './decor.js';
import { P, WALL } from './style.js';

const CLOAK = hex('#34463b');

/**
 * Decorations the generator places on tile spots. Each overlay has a footprint (`size`), which must fit the spot,
 * and an image (`image`, default the same as size) centred on that footprint, so glows can spill past it.
 *
 * Overlays are drawn as if their spot were against the north wall or in the north-west corner; the game mirrors
 * them for other walls and corners. Wall overlays (spots: ['wall']) are drawn for a north wall with the wall's top
 * filling the footprint's first WALL pixels, and the build also makes a turned copy for east and west walls.
 *
 * Kinds of spot: floor, corner, wall (wall-h and wall-v once built), rock (on solid masonry).
 */
export const OVERLAYS = [
    // ------------------------------------------------------------ on the floor
    {
        id: 'cats', spots: ['floor'], size: [64, 44],
        paint(p) {
            cat(p, 16, 26, 8, 0.4);
            cat(p, 38, 15, 7, -2.2);
            cat(p, 47, 31, 7.5, 1.9);
        },
    },
    {
        id: 'cat', spots: ['floor'], size: [18, 16], image: [22, 20],
        paint(p) {
            cat(p, 11, 10, 6.2, 0.6);
        },
    },
    {
        id: 'candelabrum', spots: ['floor'], size: [24, 24], image: [52, 52], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.glow(26, 26, 26, P.glow, 0.32);
            cv.shadowCircle(26, 26, 3.5, 4, 0.5);
            for (let k = 0; k < 5; k++) {
                const angle = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
                cv.paint(segment(26, 26, 26 + Math.cos(angle) * 9.5, 26 + Math.sin(angle) * 9.5, 1.2), P.iron);
                candle(p, 26 + Math.cos(angle) * 10.5, 26 + Math.sin(angle) * 10.5, 7);
            }
            cv.paint(circle(26, 26, 3.2), shade(P.iron, 1.8));
        },
    },
    {
        id: 'ledger', spots: ['floor'], size: [26, 22], image: [40, 40], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.shadowRect(7, 9, 33, 31, 4, 0.55);
            cv.paint(rect(7, 9, 33, 31), P.woodDark);
            for (const [x0, x1] of [[8.5, 19.6], [20.4, 31.5]]) {
                cv.paint(rect(x0, 10.5, x1, 29.5), (x) => shade(P.parchment, 0.9 + 0.1 * Math.sin(((x - x0) / (x1 - x0)) * Math.PI)));
                for (let y = 13; y < 28; y += 2) cv.paint(rect(x0 + 1.5, y, x1 - 1.5, y + 0.45), shade(P.woodDark, 1.2), 0.55);
            }
            cv.paint(rect(19.6, 10.5, 20.4, 29.5), P.woodDark);
            cv.paint(segment(24, 29, 26, 35, 1), P.crimsonLight);
            candle(p, 34, 7, 14);
        },
    },
    {
        id: 'fallen-masonry', spots: ['floor'], size: [24, 22], image: [36, 32], blocks: true,
        paint(p) {
            rubble(p, 18, 16, 10.5, 15, false);
        },
    },
    {
        id: 'statue', spots: ['floor'], size: [22, 22], image: [30, 30], blocks: true,
        paint(p) {
            statue(p, 15, 15, 20);
        },
    },
    {
        id: 'papers', spots: ['floor'], size: [26, 20], image: [30, 24],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 5; k++) {
                const x = 7 + rng.next() * 16;
                const y = 6 + rng.next() * 12;
                const angle = rng.next() * Math.PI;
                const sheet = rotatedRect(x, y, 5, 3.6, angle);
                cv.shadowCircle(x, y, 3.5, 2, 0.25);
                cv.paint(sheet, shade(P.parchment, 0.85 + rng.next() * 0.2));
                for (const t of [-1.6, -0.4, 0.8]) cv.paint(rotatedRect(x + Math.sin(angle) * t, y - Math.cos(angle) * t, 3.6, 0.22, angle), P.woodDark, 0.5);
            }
            cv.paint(circle(16, 12, 1.4), P.crimson);
        },
    },
    {
        id: 'wine-stain', spots: ['floor'], size: [20, 14],
        paint(p) {
            blob(p, 10, 7, 8, 5, mix(P.crimson, P.soot, 0.45), 0.6);
            p.cv.paint(ellipse(16, 4, 2.4, 1.1, 0.7), shade(P.iron, 3), 0.9);
        },
    },
    {
        id: 'cloak', spots: ['floor'], size: [24, 18], image: [28, 22],
        paint(p) {
            const { cv, seed } = p;
            const outline = polygon([[3, 9], [7, 3.5], [13, 5], [19, 2.5], [25, 7], [23, 13], [26, 18], [17, 19.5], [11, 17], [4, 18.5], [6, 13]]);
            cv.shadowRect(4, 4, 24, 18, 3, 0.4);
            cv.paint(outline, (x, y) => {
                const fold = Math.sin(x * 0.9 + noise(seed + 5, x * 0.3, y * 0.3) * 5);
                return shade(CLOAK, 0.7 + 0.35 * (fold * 0.5 + 0.5));
            });
            cv.paint(polygon([[13, 5], [19, 2.5], [21, 6], [15, 8.5]]), P.crimsonLight);
            cv.paint(circle(8.5, 6.5, 1.3), P.gold);
        },
    },
    {
        id: 'feathers', spots: ['floor'], size: [24, 20],
        paint(p) {
            feathers(p, rect(1, 1, 23, 19), 14);
        },
    },
    {
        id: 'leaves', spots: ['floor'], size: [26, 20],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 16; k++) {
                const x = 3 + rng.next() * 20;
                const y = 3 + rng.next() * 14;
                const colour = mix(mix(P.moss, P.woodLight, rng.next()), P.gold, rng.next() * 0.3);
                cv.paint(ellipse(x, y, 1.9, 1.1, rng.next() * Math.PI), colour, 0.9);
            }
        },
    },
    {
        id: 'rats', spots: ['floor'], size: [20, 14], image: [28, 22],
        paint(p) {
            rat(p, 10, 9, 0.3);
            rat(p, 19, 14, 2.6);
        },
    },
    {
        id: 'chalk-circle', spots: ['floor'], size: [44, 44], image: [52, 52],
        paint(p) {
            const { cv, seed } = p;
            const chalk = mix(P.white, P.dust, 0.25);
            cv.paint(ring(26, 26, 17, 18), chalk, (x, y) => 0.45 + noise(seed + 9, x, y) * 0.4);
            cv.paint(ring(26, 26, 12.5, 13.2), chalk, 0.5);
            for (let k = 0; k < 12; k++) {
                const angle = (k / 12) * Math.PI * 2;
                const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
                cv.paint(segment(26 + cos * 13.8, 26 + sin * 13.8, 26 + cos * 16.4, 26 + sin * 16.4, 0.6), chalk, 0.6);
            }
            for (let k = 0; k < 5; k++) {
                const angle = -Math.PI / 2 + (k * 4 * Math.PI) / 5;
                const next = -Math.PI / 2 + ((k + 1) * 4 * Math.PI) / 5;
                cv.paint(segment(26 + Math.cos(angle) * 12.5, 26 + Math.sin(angle) * 12.5, 26 + Math.cos(next) * 12.5, 26 + Math.sin(next) * 12.5, 0.5), chalk, 0.45);
            }
            for (const angle of [0.3, 1.9, 3.5, 5.1]) candle(p, 26 + Math.cos(angle) * 20, 26 + Math.sin(angle) * 20, 9);
        },
    },
    {
        id: 'round-rug', spots: ['floor'], size: [36, 26],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(ellipse(18, 13, 17.5, 12.5), (x, y) => {
                const d = Math.hypot((x - 18) / 17.5, (y - 13) / 12.5);
                const colour = d > 0.86 ? P.gold : d > 0.55 && d < 0.62 ? P.gold : d < 0.2 ? P.gold : P.crimson;
                return shade(colour, 0.8 + noise(seed + 3, x * 0.5, y * 0.5) * 0.3);
            }, 0.95);
        },
    },
    {
        id: 'puddle', spots: ['floor'], size: [24, 16],
        paint(p) {
            puddle(p, 12, 8, 9, 5.5);
        },
    },
    {
        id: 'pebbles', spots: ['floor'], size: [20, 16], image: [24, 20],
        paint(p) {
            rubble(p, 12, 10, 8, 10, false);
        },
    },
    {
        id: 'birdcage', spots: ['floor'], size: [18, 18], image: [24, 24], blocks: true,
        paint(p) {
            birdcage(p, 12, 12, 8.5);
        },
    },
    {
        id: 'barrel', spots: ['floor', 'corner'], size: [16, 16], image: [22, 22], blocks: true,
        paint(p) {
            barrel(p, 11, 11, 7.5);
        },
    },
    {
        id: 'crates', spots: ['floor', 'corner'], size: [20, 18], image: [26, 24], blocks: true,
        paint(p) {
            crate(p, 3, 3, 15, 14);
            crate(p, 12, 10, 23, 21);
        },
    },
    {
        id: 'sacks', spots: ['floor', 'corner'], size: [20, 16], image: [26, 22], blocks: true,
        paint(p) {
            sack(p, 9, 11, 6, 0.5);
            sack(p, 17, 10, 5.5, -0.7);
        },
    },
    {
        id: 'urn', spots: ['floor', 'corner'], size: [14, 14], image: [20, 20], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(10, 10, 6, 3, 0.55);
            cv.paint(circle(10, 10, 6.5), (x, y) => shade(mix(P.stone, P.woodLight, 0.3), 1.1 - 0.5 * (Math.hypot(x - 10, y - 10) / 6.5) ** 2));
            cv.paint(ring(10, 10, 3, 4.2), shade(P.stone, 1.15));
            cv.paint(circle(10, 10, 3), P.soot);
        },
    },
    {
        id: 'brazier', spots: ['floor'], size: [20, 20], image: [80, 80], blocks: true,
        paint(p) {
            const { cv, seed } = p;
            cv.glow(40, 40, 38, P.glow, 0.38);
            cv.shadowCircle(40, 40, 6, 5, 0.6);
            for (let k = 0; k < 3; k++) {
                const angle = (k * 2 * Math.PI) / 3 + 0.5;
                cv.paint(segment(40, 40, 40 + Math.cos(angle) * 9, 40 + Math.sin(angle) * 9, 1.4), P.iron);
            }
            cv.paint(circle(40, 40, 6.5), P.iron);
            cv.paint(circle(40, 40, 5.2), (x, y) => {
                const heat = noise(seed + 11, x * 0.9, y * 0.9);
                return heat > 0.55 ? mix(P.ember, P.flame, (heat - 0.55) * 2) : mix(P.soot, P.ember, heat * 0.9);
            });
            cv.glow(40, 40, 9, P.flame, 0.5);
        },
    },
    {
        id: 'carving', spots: ['floor', 'corner'], size: [14, 14], image: [18, 18], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(9, 9, 5.5, 3, 0.5);
            cv.paint(circle(9, 9, 6), P.woodDark);
            carvedFigure(p, 9, 9);
        },
    },
    {
        id: 'runner', spots: ['floor'], size: [104, 18],
        paint(p) {
            rug(p, 0, 0, 104, 18, P.crimson, P.gold);
        },
    },
    {
        id: 'candle-stub', spots: ['floor', 'corner'], size: [10, 10], image: [36, 36],
        paint(p) {
            candle(p, 18, 18, 16);
            p.cv.paint(circle(18, 18, 2.4), P.cream, 0.35);
        },
    },
    {
        id: 'books', spots: ['floor', 'corner'], size: [16, 14], image: [20, 18],
        paint(p) {
            const { cv, rng } = p;
            cv.shadowRect(4, 4, 16, 14, 2.5, 0.45);
            for (let k = 0; k < 4; k++) {
                const colour = P.books[Math.floor(rng.next() * P.books.length)];
                const angle = (rng.next() - 0.5) * 0.6;
                cv.paint(rotatedRect(10 + (rng.next() - 0.5) * 2, 9 + (rng.next() - 0.5) * 2, 5.5 - k * 0.4, 4 - k * 0.25, angle), colour);
                cv.paint(rotatedRect(10, 9, 4.8 - k * 0.4, 3.3 - k * 0.25, angle), P.parchment, 0.25);
            }
        },
    },
    {
        id: 'bucket', spots: ['floor', 'corner'], size: [12, 12], image: [16, 16], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(8, 8, 5, 2.5, 0.5);
            cv.paint(circle(8, 8, 5.5), shade(P.wood, 0.9));
            cv.paint(ring(8, 8, 4.3, 5.5), P.iron);
            cv.paint(circle(8, 8, 4.2), P.water);
            cv.paint(segment(3, 8, 13, 8, 0.5), P.iron, 0.6);
        },
    },
    {
        id: 'bench', spots: ['floor'], size: [24, 10], image: [28, 14], blocks: true,
        paint(p) {
            const { cv, seed } = p;
            cv.shadowRect(2, 2, 26, 12, 2.5, 0.5);
            cv.paint(rect(2, 2, 26, 12), (x, y) => shade(P.wood, 0.75 + noise(seed + 7, x * 0.15, y * 1.4) * 0.4 - ((y - 2) % 3.33 < 0.35 ? 0.3 : 0)));
        },
    },

    // ------------------------------------------------------------ in a corner (drawn for the north-west corner)
    {
        id: 'cobweb', spots: ['corner'], size: [18, 18],
        paint(p) {
            cobweb(p, 0.5, 0.5, 1, 1, 17);
        },
    },
    {
        id: 'corner-rubble', spots: ['corner'], size: [18, 16],
        paint(p) {
            rubble(p, 6, 6, 9.5, 12, false);
        },
    },
    {
        id: 'corner-cat', spots: ['corner'], size: [16, 14], image: [20, 18],
        paint(p) {
            cat(p, 8, 8, 5.6, 0.8);
        },
    },
    {
        id: 'corner-candles', spots: ['corner'], size: [14, 14], image: [50, 50],
        paint(p) {
            for (const [x, y] of [[20, 20], [24.5, 19], [19, 24.5], [23, 23.5]]) candle(p, x, y, 10);
        },
    },
    {
        id: 'corner-moss', spots: ['corner'], size: [20, 20],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(rect(0, 0, 20, 20), (x, y) => mix(P.moss, P.mossLight, noise(seed + 13, x * 0.8, y * 0.8)),
                (x, y) => Math.max(0, 1 - Math.hypot(x, y) / 18 - (fbm(seed + 15, x * 0.3, y * 0.3, 3) - 0.5) * 0.8) * 0.9);
        },
    },
    {
        id: 'rat-hole', spots: ['corner'], size: [10, 10],
        paint(p) {
            const { cv } = p;
            cv.paint(circle(2, 2, 5), P.soot, 0.9);
            cv.paint(ring(2, 2, 5, 6.2), shade(P.stone, 0.6), 0.6);
        },
    },

    // ------------------------------------------------------------ on a wall (drawn for the north wall)
    {
        id: 'banner', spots: ['wall'], size: [16, 14],
        paint(p) {
            const { cv, seed } = p;
            cv.shadowRect(2, 1.5, 14, 13.5, 2, 0.5);
            cv.paint(rect(2, 1.5, 14, 13.5), (x, y) => {
                const edge = Math.min(x - 2, 14 - x, 13.5 - y);
                return edge < 1 ? P.gold : shade(P.crimson, 0.75 + noise(seed + 17, x * 0.9, y * 0.2) * 0.45);
            });
            cv.paint(rect(1, 1, 15, 2.2), P.woodDark);
            cv.paint(circle(8, 8.5, 2.2), P.gold);
        },
    },
    {
        id: 'sconce', spots: ['wall'], size: [8, 10], image: [64, 64],
        paint(p) {
            const { cv } = p;
            const x = 32;
            const y = 27 + WALL / 2;
            cv.glow(x, y + 3, 30, P.glow, 0.32);
            cv.paint(roundRect(x - 2.2, y - 2.2, x + 2.2, y + 3.5, 0.8), P.iron);
            cv.paint(circle(x, y + 1.5, 1.4), P.ember);
            cv.paint(circle(x, y + 1.3, 0.8), P.flame);
            cv.glow(x, y + 1.5, 7, P.flame, 0.4);
        },
    },
    {
        id: 'shield', spots: ['wall'], size: [12, 13],
        paint(p) {
            const { cv } = p;
            const outline = polygon([[0.5, 1], [11.5, 1], [11.5, 6], [6, 12.5], [0.5, 6]]);
            cv.shadowRect(1, 1.5, 11, 11, 2, 0.5);
            cv.paint(outline, P.gold);
            cv.paint(polygon([[1.6, 2], [10.4, 2], [10.4, 5.7], [6, 11], [1.6, 5.7]]), P.crimson);
            cv.paint(polygon([[1.8, 7.5], [6, 4.2], [10.2, 7.5], [10.2, 8.8], [6, 5.6], [1.8, 8.8]]), P.gold);
        },
    },
    {
        id: 'tapestry', spots: ['wall'], size: [36, 12],
        paint(p) {
            const { cv, seed } = p;
            cv.shadowRect(1, 1, 35, 11.5, 2, 0.5);
            cv.paint(rect(1, 1, 35, 11.5), (x, y) => {
                const edge = Math.min(x - 1, 35 - x, 11.5 - y, y - 1);
                if (edge < 0.9) return shade(P.gold, 0.8);
                const motif = (Math.floor(x / 4) + Math.floor(y / 3)) % 3;
                const base = [P.hallBorder, mix(P.moss, P.hallBorder, 0.4), mix(P.crimson, P.hallBorder, 0.3)][motif];
                return shade(base, 0.85 + noise(seed + 19, x * 0.6, y * 0.6) * 0.35);
            });
            cv.paint(rect(0.5, 0.5, 35.5, 1.6), P.woodDark);
        },
    },
    {
        id: 'wall-ivy', spots: ['wall'], size: [34, 12],
        paint(p) {
            ivy(p, rect(1, 0, 33, 11), 6);
        },
    },
    {
        id: 'ledge-candles', spots: ['wall'], size: [20, 10], image: [52, 44],
        paint(p) {
            const { cv } = p;
            const top = 17;
            cv.paint(rect(16, top + 2, 36, top + 6), shade(P.stone, 0.8));
            for (const x of [19.5, 26, 32.5]) candle(p, x, top + 4, 12);
        },
    },
    {
        id: 'damp-stain', spots: ['wall'], size: [24, 13],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(rect(0, 0, 24, 13), shade(mix(P.water, P.moss, 0.5), 0.7), (x, y) => {
                const streak = fbm(seed + 21, x * 0.35, y * 0.08, 3);
                return Math.min(0.85, Math.max(0, streak - 0.38) * 3.2 * (1 - y / 16) * (1 - Math.abs(x - 12) / 13));
            });
        },
    },

    // ------------------------------------------------------------ on solid masonry
    {
        id: 'rock-ivy', spots: ['rock'], size: [44, 40],
        paint(p) {
            ivy(p, ellipse(22, 20, 20, 17), 3);
        },
    },
    {
        id: 'rock-lichen', spots: ['rock'], size: [36, 32],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(ellipse(18, 16, 17, 15), mix(P.lichen, P.white, 0.35), (x, y) =>
                (noise(seed + 23, x * 0.7, y * 0.7) > 0.52 ? 0.85 : 0) * Math.min(1, 1.6 * (1 - Math.hypot((x - 18) / 17, (y - 16) / 15))));
        },
    },
    {
        id: 'rock-crack', spots: ['rock'], size: [44, 30],
        paint(p) {
            const { cv, rng } = p;
            let [x, y] = [3, 15];
            let angle = (rng.next() - 0.5) * 0.6;
            while (x < 41) {
                const nx = x + 3 + rng.next() * 3;
                const ny = Math.max(3, Math.min(27, y + Math.tan(angle) * 4));
                cv.paint(segment(x, y, nx, ny, 0.9), P.soot, 0.8);
                if (rng.next() < 0.25) cv.paint(segment(nx, ny, nx + 4, ny + (rng.next() - 0.5) * 8, 0.5), P.soot, 0.6);
                [x, y] = [nx, ny];
                angle += (rng.next() - 0.5) * 0.9;
            }
        },
    },
];

/** One of the Countess's white cats, curled up asleep. */
function cat(p, x, y, size, angle) {
    const { cv } = p;
    const fur = (cx, cy, r) => (px, py) => shade(mix(P.white, P.dust, 0.15), 1.08 - 0.35 * (Math.hypot(px - cx, py - cy) / r) ** 2);
    cv.shadowCircle(x, y, size * 0.8, 3.5, 0.45);
    for (let k = 0; k < 9; k++) {
        const t = angle + Math.PI * 0.55 + k * 0.17;
        const tx = x + Math.cos(t) * size * 0.95;
        const ty = y + Math.sin(t) * size * 0.95;
        cv.paint(circle(tx, ty, size * 0.2), fur(tx, ty, size * 0.2));
    }
    cv.paint(ellipse(x, y, size, size * 0.78, angle), fur(x, y, size));
    const hx = x + Math.cos(angle) * size * 0.85;
    const hy = y + Math.sin(angle) * size * 0.85;
    const head = size * 0.45;
    for (const side of [-1, 1]) {
        const ear = angle + side * 0.75;
        const ex = hx + Math.cos(ear) * head * 0.9;
        const ey = hy + Math.sin(ear) * head * 0.9;
        const tip = [ex + Math.cos(ear) * head * 0.6, ey + Math.sin(ear) * head * 0.6];
        const across = [Math.cos(ear + Math.PI / 2) * head * 0.35, Math.sin(ear + Math.PI / 2) * head * 0.35];
        cv.paint(polygon([[ex + across[0], ey + across[1]], [ex - across[0], ey - across[1]], tip]), mix(P.white, P.crimsonLight, 0.25));
    }
    cv.paint(circle(hx, hy, head), fur(hx, hy, head));
}

function rat(p, x, y, angle) {
    const { cv } = p;
    const fur = mix(P.dust, P.woodLight, 0.45);
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    cv.shadowCircle(x, y, 3, 2, 0.4);
    cv.paint(segment(x - cos * 3.2, y - sin * 3.2, x - cos * 8.5 + sin * 2, y - sin * 8.5 - cos * 2, 0.6), mix(P.crimsonLight, P.cream, 0.4));
    cv.paint(ellipse(x, y, 4, 2.4, angle), (px, py) => shade(fur, 1.1 - 0.35 * (Math.hypot(px - x, py - y) / 4) ** 2));
    cv.paint(ellipse(x + cos * 3.8, y + sin * 3.8, 1.9, 1.3, angle), fur);
    cv.paint(circle(x + cos * 3 + sin * 1.3, y + sin * 3 - cos * 1.3, 0.8), mix(fur, P.crimsonLight, 0.3));
    cv.paint(circle(x + cos * 3 - sin * 1.3, y + sin * 3 + cos * 1.3, 0.8), mix(fur, P.crimsonLight, 0.3));
}
function crate(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 3, 0.5);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const plank = (y - y0) % 3.2 < 0.35;
        return shade(P.woodLight, (edge < 1 ? 0.6 : plank ? 0.65 : 0.85) + noise(seed + 25, x * 0.3, y * 1.5) * 0.2);
    });
    cv.paint(segment(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 0.9), shade(P.wood, 0.8));
}

/** A painted wooden figure from the Hall of Bright Carvings. */
function carvedFigure(p, x, y) {
    const { cv, rng } = p;
    const colour = mix(P.paint[Math.floor(rng.next() * P.paint.length)], P.dust, 0.2);
    cv.paint(ellipse(x, y + 0.4, 3, 2.3, 0.3), (cx, cy) => shade(colour, 1.15 - 0.5 * (Math.hypot(cx - x, cy - y) / 3) ** 2));
    cv.paint(circle(x, y - 0.4, 1.35), shade(P.woodLight, 1.25));
    cv.paint(rect(x - 1, y - 2.2, x + 1, y - 1.3), P.gold);
}

/** An irregular translucent splash. */
function blob(p, x, y, rx, ry, colour, alpha) {
    const { cv, seed } = p;
    cv.paint(rect(x - rx * 1.3, y - ry * 1.3, x + rx * 1.3, y + ry * 1.3), colour, (cx, cy) =>
        (((cx - x) / rx) ** 2 + ((cy - y) / ry) ** 2 < 0.6 + 0.7 * fbm(seed + 27, cx * 0.3, cy * 0.3, 3) ? alpha : 0));
}

function rotatedRect(x, y, halfWidth, halfHeight, angle) {
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    return polygon([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [
        x + u * halfWidth * cos - v * halfHeight * sin,
        y + u * halfWidth * sin + v * halfHeight * cos,
    ]));
}