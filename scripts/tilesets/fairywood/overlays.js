import { WALL } from '../lib/layout.js';
import { circle, ellipse, fbm, mix, noise, polygon, rect, ring, segment, shade } from '../lib/raster.js';
import { boulder, crystals, fern, fireflies, flowers, glowingMushrooms, lantern, log, mushroom, stump } from './decor.js';
import { P, treetop } from './style.js';

/**
 * Decorations the generator places on Fairy Wood tile spots. Each has a footprint (`size`) that must fit the spot
 * and an image (`image`, default the footprint) centred on it, so glows can spill past.
 *
 * Wall overlays (spots: ['wall']) are drawn for the north edge of a clearing, with the undergrowth filling the
 * footprint's first WALL pixels; the build makes a turned copy for east and west edges. Corner overlays are drawn for
 * the north-west corner.
 */
export const OVERLAYS = [
    // ------------------------------------------------------------ on the ground
    {
        id: 'toadstools', spots: ['floor', 'corner'], size: [16, 14], image: [20, 18],
        paint(p) {
            mushroom(p, 7, 8, 3.6);
            mushroom(p, 13, 11, 2.6);
            mushroom(p, 12, 5, 1.8);
        },
    },
    {
        id: 'glow-mushrooms', spots: ['floor'], size: [16, 16], image: [36, 36],
        paint(p) {
            glowingMushrooms(p, 18, 18, 5.5, 8);
        },
    },
    {
        id: 'big-toadstool', spots: ['floor', 'corner'], size: [16, 16], image: [22, 22], blocks: true,
        paint(p) {
            mushroom(p, 11, 11, 7.5);
        },
    },
    {
        id: 'wildflowers', spots: ['floor'], size: [24, 18],
        paint(p) {
            flowers(p, ellipse(12, 9, 11, 8), 22);
        },
    },
    {
        id: 'bluebells', spots: ['floor', 'corner'], size: [22, 16],
        paint(p) {
            flowers(p, ellipse(11, 8, 10, 7), 20, [P.bluebell, P.lilac, P.bluebell]);
        },
    },
    {
        id: 'daisies', spots: ['floor'], size: [22, 16],
        paint(p) {
            flowers(p, ellipse(11, 8, 10, 7), 18, [P.daisy, P.daisy, P.buttercup]);
        },
    },
    {
        id: 'fern', spots: ['floor', 'corner'], size: [22, 22], image: [26, 26],
        paint(p) {
            fern(p, 13, 13, 11);
        },
    },
    {
        id: 'stump', spots: ['floor', 'corner'], size: [16, 16], image: [22, 22], blocks: true,
        paint(p) {
            stump(p, 11, 11, 7);
        },
    },
    {
        id: 'log', spots: ['floor'], size: [26, 12], image: [32, 18], blocks: true,
        paint(p) {
            log(p, 6, 9, 26, 9, 4.5);
        },
    },
    {
        id: 'mossy-rock', spots: ['floor', 'corner'], size: [16, 14], image: [22, 20], blocks: true,
        paint(p) {
            boulder(p, 11, 10, 7);
        },
    },
    {
        id: 'pebbles', spots: ['floor', 'corner'], size: [18, 14],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 7; k++) {
                const [x, y, r] = [3 + rng.next() * 12, 3 + rng.next() * 8, 1 + rng.next() * 1.6];
                cv.shadowCircle(x, y, r, 1.5, 0.35);
                cv.paint(circle(x, y, r), shade(P.stone, 0.85 + rng.next() * 0.3));
            }
        },
    },
    {
        id: 'acorns', spots: ['floor', 'corner'], size: [16, 12],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 4; k++) {
                const [x, y, angle] = [3 + rng.next() * 10, 3 + rng.next() * 6, rng.next() * Math.PI];
                cv.paint(ellipse(x, y, 3, 1.6, angle), shade(P.woodLight, 0.9 + rng.next() * 0.3), 0.9);
            }
            for (let k = 0; k < 5; k++) {
                const [x, y] = [3 + rng.next() * 10, 3 + rng.next() * 6];
                cv.paint(circle(x, y, 1.1), P.wood);
                cv.paint(circle(x - 0.3, y - 0.3, 0.6), P.bark);
            }
        },
    },
    {
        id: 'rabbit', spots: ['floor', 'corner'], size: [12, 10], image: [16, 14],
        paint(p) {
            const { cv } = p;
            const fur = (x, y, r) => (px, py) => shade(mix(P.dirtLight, P.daisy, 0.3), 1.1 - 0.4 * (Math.hypot(px - x, py - y) / r) ** 2);
            cv.shadowCircle(8, 8, 3.5, 2, 0.4);
            cv.paint(ellipse(7, 8, 4, 3), fur(7, 8, 4));
            cv.paint(circle(10.5, 6.5, 2), fur(10.5, 6.5, 2));
            cv.paint(ellipse(11, 3.5, 0.8, 2.2, 0.3), mix(P.dirtLight, P.blossom, 0.3));
            cv.paint(ellipse(12.5, 4, 0.8, 2.2, -0.2), mix(P.dirtLight, P.blossom, 0.3));
            cv.paint(circle(3.2, 8.6, 1.3), P.daisy);
        },
    },
    {
        id: 'hedgehog', spots: ['floor', 'corner'], size: [12, 10], image: [16, 14],
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(8, 7, 3.5, 2, 0.4);
            cv.paint(ellipse(7.5, 7, 4.5, 3.5), (x, y) => shade(P.bark, 0.8 + noise(31, x * 2, y * 2) * 0.6));
            cv.paint(ellipse(12, 7.5, 1.8, 1.4), P.dirtLight);
            cv.paint(circle(13.5, 7.5, 0.5), P.soot);
        },
    },
    {
        id: 'sleeping-fox', spots: ['floor'], size: [20, 14], image: [26, 20],
        paint(p) {
            const { cv } = p;
            const fox = mix(P.poppy, P.woodLight, 0.45);
            cv.shadowCircle(13, 10, 6, 3, 0.45);
            for (let k = 0; k < 8; k++) {
                const angle = 1.2 + k * 0.32;
                cv.paint(circle(13 + Math.cos(angle) * 6.8, 10 + Math.sin(angle) * 5, 2.2 - k * 0.12), k > 5 ? P.daisy : fox);
            }
            cv.paint(ellipse(13, 10, 6.5, 4.8), (x, y) => shade(fox, 1.1 - 0.35 * (Math.hypot(x - 13, y - 10) / 6.5) ** 2));
            cv.paint(circle(17.5, 8, 2.6), fox);
            cv.paint(polygon([[18.5, 5.6], [20.5, 4.2], [20, 6.8]]), shade(fox, 0.7));
        },
    },
    {
        id: 'butterflies', spots: ['floor', 'corner'], size: [22, 18], image: [28, 24],
        paint(p) {
            const { rng } = p;
            for (const colour of [P.buttercup, P.lilac, P.bluebell]) butterfly(p, 5 + rng.next() * 18, 5 + rng.next() * 14, colour, rng.next() * Math.PI);
        },
    },
    {
        id: 'fireflies', spots: ['floor'], size: [26, 22], image: [40, 36],
        paint(p) {
            fireflies(p, ellipse(20, 18, 14, 12), 9);
        },
    },
    {
        id: 'fairy', spots: ['floor', 'corner'], size: [10, 10], image: [36, 36],
        paint(p) {
            fairy(p, 18, 18);
        },
    },
    {
        id: 'fairy-lantern', spots: ['floor', 'corner'], size: [10, 10], image: [52, 52], blocks: true,
        paint(p) {
            lantern(p, 26, 26);
        },
    },
    {
        id: 'puddle', spots: ['floor'], size: [22, 14],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(rect(0, 0, 22, 14), P.water, (x, y) =>
                (((x - 11) / 10) ** 2 + ((y - 7) / 6) ** 2 < 0.55 + 0.6 * fbm(seed + 3, x * 0.3, y * 0.3, 3) ? 0.7 : 0));
            cv.paint(ellipse(8, 5, 3, 1, 0.3), P.waterLight, 0.4);
        },
    },
    {
        id: 'picnic', spots: ['floor'], size: [30, 22],
        paint(p) {
            const { cv } = p;
            cv.paint(rect(2, 2, 26, 20), (x, y) => (Math.floor(x / 3) + Math.floor(y / 3)) % 2 ? P.poppy : P.daisy, 0.9);
            cv.shadowRect(19, 9, 28, 18, 2.5, 0.45);
            cv.paint(rect(19, 9, 28, 18), (x, y) => shade(P.woodLight, 0.8 + ((x + y) % 2 < 1 ? 0.15 : 0)));
            cv.paint(segment(19.5, 13.5, 27.5, 13.5, 1), P.wood);
            cv.paint(circle(8, 8, 1.6), P.poppy);
            cv.paint(circle(11, 13, 1.6), P.buttercup);
        },
    },
    {
        id: 'snail', spots: ['floor', 'corner'], size: [10, 8],
        paint(p) {
            const { cv } = p;
            cv.paint(ellipse(5, 5, 4, 1.6), mix(P.dirtLight, P.daisy, 0.4));
            cv.paint(circle(4.2, 4.5, 2.6), (x, y) => (Math.sin(Math.hypot(x - 4.2, y - 4.5) * 3.5) > 0 ? P.woodLight : P.wood));
        },
    },
    {
        id: 'frog', spots: ['floor', 'corner'], size: [10, 8], image: [14, 12],
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(7, 6, 2.6, 1.5, 0.4);
            for (const [x, y] of [[4, 3.5], [4, 8.5], [10, 3.8], [10, 8.2]]) cv.paint(ellipse(x, y, 1.8, 0.9, 0.5), P.grass);
            cv.paint(ellipse(7, 6, 3.4, 2.6), P.grassLight);
            cv.paint(circle(9.2, 4.9, 0.7), P.soot);
            cv.paint(circle(9.2, 7.1, 0.7), P.soot);
        },
    },
    {
        id: 'flower-ring', spots: ['floor'], size: [40, 40],
        paint(p) {
            flowers(p, ring(20, 20, 13, 18), 40);
        },
    },
    {
        id: 'crystal', spots: ['floor', 'corner'], size: [14, 14], image: [36, 36], blocks: true,
        paint(p) {
            crystals(p, 18, 18, 6.5, P.fairy);
        },
    },
    {
        id: 'owl-on-stump', spots: ['floor', 'corner'], size: [16, 16], image: [22, 22], blocks: true,
        paint(p) {
            const { cv } = p;
            stump(p, 11, 11, 7);
            cv.paint(ellipse(11, 11, 3.6, 3.2), (x, y) => shade(P.woodLight, 1.1 - 0.35 * (Math.hypot(x - 11, y - 11) / 3.6) ** 2));
            for (const dx of [-1.5, 1.5]) cv.paint(circle(11 + dx, 10, 1), P.buttercup);
        },
    },
    {
        id: 'berry-basket', spots: ['floor', 'corner'], size: [12, 12], image: [16, 16],
        paint(p) {
            const { cv, rng } = p;
            cv.shadowCircle(8, 8, 4.5, 2.5, 0.45);
            cv.paint(circle(8, 8, 5), P.woodLight);
            cv.paint(ring(8, 8, 4, 5), P.wood);
            for (let k = 0; k < 10; k++) cv.paint(circle(5 + rng.next() * 6, 5 + rng.next() * 6, 1), rng.next() < 0.5 ? P.violet : P.poppy);
        },
    },

    // ------------------------------------------------------------ in a corner (drawn for the north-west corner)
    {
        id: 'corner-ferns', spots: ['corner'], size: [20, 20],
        paint(p) {
            fern(p, 4, 4, 15);
        },
    },
    {
        id: 'corner-mushrooms', spots: ['corner'], size: [16, 16], image: [30, 30],
        paint(p) {
            glowingMushrooms(p, 11, 11, 5, 7, P.lilac);
        },
    },
    {
        id: 'corner-roots', spots: ['corner'], size: [20, 18],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 4; k++) {
                const angle = (k / 3) * (Math.PI / 2) + (rng.next() - 0.5) * 0.3;
                cv.paint(segment(0, 0, Math.cos(angle) * 18, Math.sin(angle) * 16, 2.2 - k * 0.3), shade(P.bark, 0.9 + rng.next() * 0.3));
            }
        },
    },
    {
        id: 'corner-flowers', spots: ['corner'], size: [18, 18],
        paint(p) {
            flowers(p, circle(2, 2, 15), 18);
        },
    },
    {
        id: 'dewy-web', spots: ['corner'], size: [18, 18],
        paint(p) {
            const { cv, rng } = p;
            const threads = 5;
            const ends = Array.from({ length: threads }, (_, k) => [Math.cos((k / (threads - 1)) * (Math.PI / 2)), Math.sin((k / (threads - 1)) * (Math.PI / 2))]);
            for (const [ux, uy] of ends) cv.paint(segment(0.5, 0.5, ux * 17, uy * 17, 0.35), P.white, 0.4);
            for (const t of [0.35, 0.6, 0.85]) {
                for (let k = 0; k < threads - 1; k++) {
                    cv.paint(segment(ends[k][0] * 17 * t, ends[k][1] * 17 * t, ends[k + 1][0] * 17 * t, ends[k + 1][1] * 17 * t, 0.3), P.white, 0.35);
                }
            }
            for (let k = 0; k < 6; k++) cv.paint(circle(2 + rng.next() * 12, 2 + rng.next() * 12, 0.5), P.fairy, 0.9);
        },
    },
    {
        id: 'corner-stones', spots: ['corner'], size: [18, 16],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 5; k++) {
                const [x, y, r] = [2 + rng.next() * 10, 2 + rng.next() * 9, 1.5 + rng.next() * 2.5];
                cv.shadowCircle(x, y, r, 2, 0.4);
                cv.paint(circle(x, y, r), (px, py) => (noise(41, px, py) > 0.65 ? P.moss : shade(P.stone, 0.85 + rng.next() * 0.2)));
            }
        },
    },

    // ------------------------------------------------------------ at the edge of a clearing (drawn for the north edge)
    {
        id: 'edge-flowers', spots: ['wall'], size: [30, 12],
        paint(p) {
            flowers(p, rect(1, 2, 29, 11), 26);
        },
    },
    {
        id: 'berry-bush', spots: ['wall'], size: [18, 13],
        paint(p) {
            const { cv, rng, seed } = p;
            cv.shadowCircle(9, 5, 7, 3, 0.4);
            cv.paint(ellipse(9, 5, 8.5, 6), (x, y) => shade(P.fern, 0.8 + noise(seed + 5, x * 0.7, y * 0.7) * 0.45));
            for (let k = 0; k < 10; k++) cv.paint(circle(2 + rng.next() * 14, 1 + rng.next() * 8, 0.9), rng.next() < 0.5 ? P.poppy : P.violet);
        },
    },
    {
        id: 'fairy-lights', spots: ['wall'], size: [34, 12], image: [40, 24],
        paint(p) {
            const { cv } = p;
            let previous = null;
            for (let k = 0; k <= 8; k++) {
                const x = 3 + k * 4.25;
                const y = 6 + WALL / 2 + Math.sin(k * 0.8) * 1.5 + 2;
                if (previous) cv.paint(segment(previous[0], previous[1], x, y, 0.3), P.bark, 0.8);
                const colour = [P.glow, P.fairy, P.blossom][k % 3];
                cv.glow(x, y, 4.5, colour, 0.4);
                cv.paint(circle(x, y, 0.7), P.white);
                previous = [x, y];
            }
        },
    },
    {
        id: 'shelf-fungus', spots: ['wall'], size: [14, 10],
        paint(p) {
            const { cv } = p;
            for (const [x, r] of [[4, 3.2], [8.5, 2.6], [11.5, 2]]) {
                cv.paint(ellipse(x, WALL - 1, r, r * 0.6), (px, py) => shade(mix(P.woodLight, P.buttercup, 0.3), 1.1 - 0.4 * (Math.hypot(px - x, py - (WALL - 1)) / r)));
            }
        },
    },
    {
        id: 'flowering-vines', spots: ['wall'], size: [30, 12],
        paint(p) {
            const { cv, rng } = p;
            let [x, y] = [1, WALL];
            while (x < 29) {
                const [nx, ny] = [x + 2.5, WALL + Math.sin(x * 0.5) * 2.5];
                cv.paint(segment(x, y, nx, ny, 0.8), P.fernLight);
                if (rng.next() < 0.5) {
                    for (let petal = 0; petal < 5; petal++) {
                        const angle = (petal / 5) * Math.PI * 2;
                        cv.paint(circle(nx + Math.cos(angle) * 0.9, ny + Math.sin(angle) * 0.9, 0.7), P.blossom);
                    }
                }
                [x, y] = [nx, ny];
            }
        },
    },
    {
        id: 'edge-mushrooms', spots: ['wall'], size: [20, 12], image: [32, 24],
        paint(p) {
            glowingMushrooms(p, 16, 6 + WALL, 5, 7);
        },
    },

    // ------------------------------------------------------------ in the canopy
    {
        id: 'blossom-crown', spots: ['rock'], size: [44, 44],
        paint(p) {
            treetop(p.cv, 22, 22, 18, P.blossom, p.seed);
        },
    },
    {
        id: 'lilac-crown', spots: ['rock'], size: [40, 40],
        paint(p) {
            treetop(p.cv, 20, 20, 16, P.lilac, p.seed);
        },
    },
    {
        id: 'birch-crown', spots: ['rock'], size: [40, 40],
        paint(p) {
            treetop(p.cv, 20, 20, 16, mix(P.leafLight, P.daisy, 0.35), p.seed);
        },
    },
    {
        id: 'canopy-fireflies', spots: ['rock'], size: [44, 40], image: [52, 48],
        paint(p) {
            fireflies(p, ellipse(26, 24, 20, 18), 12);
        },
    },
    {
        id: 'bird-nest', spots: ['rock'], size: [16, 16],
        paint(p) {
            const { cv } = p;
            cv.paint(circle(8, 8, 6.5), (x, y) => shade(P.woodLight, 0.7 + noise(43, x * 2, y * 2) * 0.5));
            cv.paint(circle(8, 8, 4), P.wood);
            for (const [x, y] of [[6.5, 7], [9, 6.5], [8, 9.3]]) cv.paint(ellipse(x, y, 1.4, 1.1), mix(P.bluebell, P.daisy, 0.4));
        },
    },
];

/** The wanderer, with a fairy for company. */
export const SPRITES = [
    {
        id: 'hero', file: 'wanderer.png', size: [29, 33],
        paint(p) {
            const { cv, seed } = p;
            const cloak = (x, y) => shade(P.cloak, 0.8 + noise(seed + 9, x * 0.5, y * 0.25) * 0.35);
            cv.shadowCircle(14, 18, 10, 3, 0.45);
            cv.paint(ellipse(14, 19.5, 10.5, 11.5), cloak);
            cv.paint(segment(14, 10, 14, 30, 0.8), shade(P.cloak, 0.65));
            cv.paint(circle(14, 11, 6.2), (x, y) => shade(P.cloakLight, 1.05 - 0.4 * (Math.hypot(x - 14, y - 11) / 6.2) ** 2));
            cv.paint(ellipse(14, 14, 3.2, 2.2), P.soot);
            cv.paint(circle(9, 15, 1.2), P.buttercup);
            fairy(p, 24, 7);
        },
    },
];

/** A tiny fairy: a bright point of light with gauzy wings. */
function fairy(p, x, y) {
    const { cv } = p;
    cv.glow(x, y, 9, P.fairy, 0.45);
    for (const side of [-1, 1]) {
        cv.paint(ellipse(x + side * 1.8, y - 0.8, 1.8, 1.1, side * 0.6), P.white, 0.55);
        cv.paint(ellipse(x + side * 1.4, y + 1, 1.2, 0.8, -side * 0.5), P.white, 0.45);
    }
    cv.paint(circle(x, y, 0.9), P.white);
}

function butterfly(p, x, y, colour, angle) {
    const { cv } = p;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    for (const side of [-1, 1]) {
        cv.paint(ellipse(x - sin * side * 1.8, y + cos * side * 1.8, 1.7, 1.2, angle), colour);
        cv.paint(ellipse(x - sin * side * 1.3 + cos * 1.4, y + cos * side * 1.3 + sin * 1.4, 1.1, 0.8, angle), shade(colour, 0.8));
    }
    cv.paint(segment(x - cos * 1.5, y - sin * 1.5, x + cos * 1.5, y + sin * 1.5, 0.5), P.soot);
}
