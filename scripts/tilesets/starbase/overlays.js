import { WALL } from '../lib/layout.js';
import { circle, ellipse, fbm, mix, noise, polygon, rect, ring, roundRect, segment, shade } from '../lib/raster.js';
import { boxDroid, cable, canister, crate, domeDroid, scrap, vent } from './decor.js';
import { P } from './style.js';

/**
 * Decorations the generator places on Starbase tile spots. Each has a footprint (`size`) that must fit the spot
 * and an image (`image`, default the footprint) centred on it, so glows can spill past.
 *
 * Wall overlays (spots: ['wall']) are drawn for a north wall, with the wall top filling the footprint's first
 * WALL pixels; the build makes a turned copy for east and west walls. Corner overlays are drawn for the
 * north-west corner.
 */
export const OVERLAYS = [
    // ------------------------------------------------------------ on the deck
    {
        id: 'mouse-droid', spots: ['floor', 'corner'], size: [12, 9], image: [16, 13],
        paint(p) {
            mouseDroid(p, 8, 6.5);
        },
    },
    {
        id: 'dome-droid', spots: ['floor'], size: [18, 18], image: [24, 24], blocks: true,
        paint(p) {
            domeDroid(p, 12, 12, 7, P.amber);
        },
    },
    {
        id: 'box-droid', spots: ['floor'], size: [18, 16], image: [24, 22], blocks: true,
        paint(p) {
            boxDroid(p, 12, 11, 13);
        },
    },
    {
        id: 'crate', spots: ['floor', 'corner'], size: [18, 16], image: [22, 20], blocks: true,
        paint(p) {
            crate(p, 2, 2, 20, 18);
        },
    },
    {
        id: 'crates', spots: ['floor'], size: [24, 22], image: [28, 26], blocks: true,
        paint(p) {
            crate(p, 2, 2, 16, 14, P.gunmetal);
            crate(p, 11, 11, 26, 24);
        },
    },
    {
        id: 'canisters', spots: ['floor', 'corner'], size: [20, 14], image: [24, 18], blocks: true,
        paint(p) {
            canister(p, 7, 9, 5);
            canister(p, 17, 9, 5, P.olive);
        },
    },
    {
        id: 'toolbox', spots: ['floor', 'corner'], size: [14, 10], image: [18, 14],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(2, 2, 16, 12, 2.5, 0.5);
            cv.paint(roundRect(2, 2, 16, 12, 1), P.red);
            cv.paint(rect(2, 6.4, 16, 7.6), shade(P.red, 0.6));
            cv.paint(rect(6, 1, 12, 3), P.metalDark);
            cv.paint(segment(13, 9, 19, 12, 1), P.metal);
        },
    },
    {
        id: 'datapad', spots: ['floor', 'corner'], size: [10, 8], image: [18, 16],
        paint(p) {
            const { cv } = p;
            cv.glow(9, 8, 8, P.holo, 0.2);
            cv.paint(roundRect(4, 4, 14, 12, 1), P.gunmetal);
            cv.paint(rect(5.2, 5.2, 12.8, 10.8), mix(P.soot, P.holo, 0.5));
            for (const y of [6.5, 8, 9.5]) cv.paint(rect(6, y, 6 + 3 + y % 3, y + 0.5), P.holo, 0.9);
        },
    },
    {
        id: 'cables', spots: ['floor'], size: [26, 18],
        paint(p) {
            cable(p, 2, 4, 24, 14);
            cable(p, 3, 14, 22, 3, P.red);
        },
    },
    {
        id: 'scorch-mark', spots: ['floor', 'corner'], size: [22, 18],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(ellipse(11, 9, 10, 8), P.soot, (x, y) =>
                0.85 * Math.max(0, 1 - Math.hypot((x - 11) / 10, (y - 9) / 8)) * (0.6 + fbm(seed + 3, x * 0.4, y * 0.4, 3) * 0.6));
            for (const [x, y] of [[9, 8], [13, 10], [11, 6]]) cv.paint(circle(x, y, 0.5), P.amber, 0.9);
        },
    },
    {
        id: 'coolant-spill', spots: ['floor'], size: [24, 16],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(rect(0, 0, 24, 16), mix(P.coolant, P.holo, 0.2), (x, y) =>
                (((x - 12) / 11) ** 2 + ((y - 8) / 7) ** 2 < 0.55 + 0.6 * fbm(seed + 5, x * 0.3, y * 0.3, 3) ? 0.7 : 0));
            cv.paint(ellipse(9, 6, 3, 1, 0.3), P.white, 0.35);
        },
    },
    {
        id: 'debris', spots: ['floor', 'corner'], size: [22, 18], image: [26, 22],
        paint(p) {
            scrap(p, 13, 11, 8, 9, false);
        },
    },
    {
        id: 'helmet', spots: ['floor', 'corner'], size: [12, 12], image: [16, 16],
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(8, 8, 5, 2.5, 0.5);
            cv.paint(circle(8, 8, 5.5), (x, y) => shade(P.bulkhead, 1.15 - 0.4 * (Math.hypot(x - 8, y - 8) / 5.5) ** 2));
            cv.paint(ellipse(8, 10, 4, 1.8), P.soot);
            cv.paint(rect(4, 5.6, 12, 6.4), P.amber, 0.8);
        },
    },
    {
        id: 'blaster', spots: ['floor', 'corner'], size: [14, 8], image: [18, 12],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(3, 4, 15, 8, 2, 0.45);
            cv.paint(polygon([[3, 4], [15, 4], [15, 6], [8, 6], [7, 9.5], [4.5, 9.5], [5, 6], [3, 6]]), P.soot);
            cv.paint(rect(8, 4.6, 14, 5.4), P.metalDark);
        },
    },
    {
        id: 'holo-projector', spots: ['floor'], size: [14, 14], image: [44, 44],
        paint(p) {
            const { cv } = p;
            cv.glow(22, 22, 20, P.holo, 0.3);
            cv.paint(circle(22, 22, 5.5), P.gunmetal);
            cv.paint(ring(22, 22, 3.5, 4.3), P.holo);
            // The flickering figure it projects.
            cv.paint(ellipse(22, 22, 2.6, 1.8), P.holo, 0.55);
            cv.paint(circle(22, 20.5, 1.2), P.holo, 0.7);
        },
    },
    {
        id: 'floor-vent', spots: ['floor', 'corner'], size: [16, 16], image: [30, 30],
        paint(p) {
            vent(p, 15, 15, 12);
        },
    },
    {
        id: 'sparks', spots: ['floor', 'corner'], size: [16, 16], image: [32, 32],
        paint(p) {
            sparks(p, 16, 16);
        },
    },
    {
        id: 'med-kit', spots: ['floor', 'corner'], size: [12, 10], image: [16, 14],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(2, 2, 14, 12, 2.5, 0.5);
            cv.paint(roundRect(2, 2, 14, 12, 1.2), P.white);
            cv.paint(rect(2, 6.2, 14, 7.8), P.green);
        },
    },
    {
        id: 'ration-packs', spots: ['floor', 'corner'], size: [16, 12], image: [20, 16],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 4; k++) {
                const x = 4 + rng.next() * 10;
                const y = 4 + rng.next() * 7;
                cv.shadowRect(x - 2.5, y - 1.6, x + 2.5, y + 1.6, 1.5, 0.35);
                cv.paint(roundRect(x - 2.5, y - 1.6, x + 2.5, y + 1.6, 0.6), shade(P.olive, 0.9 + rng.next() * 0.3));
            }
        },
    },
    {
        id: 'bench', spots: ['floor'], size: [24, 10], image: [28, 14], blocks: true,
        paint(p) {
            const { cv } = p;
            cv.shadowRect(2, 2, 26, 12, 2.5, 0.5);
            cv.paint(rect(2, 2, 26, 12), P.metalDark);
            cv.paint(rect(3, 3, 25, 11), (x) => shade(P.metal, 0.75 + ((x - 3) % 4 < 0.6 ? -0.25 : 0)));
        },
    },
    {
        id: 'holo-chess', spots: ['floor'], size: [20, 20], image: [40, 40], blocks: true,
        paint(p) {
            const { cv, rng } = p;
            cv.glow(20, 20, 18, P.holo, 0.22);
            cv.shadowCircle(20, 20, 9.5, 3, 0.55);
            cv.paint(circle(20, 20, 10), P.gunmetal);
            cv.paint(circle(20, 20, 7.5), (x, y) => {
                const ringIndex = Math.floor(Math.hypot(x - 20, y - 20) / 2.5);
                const sector = Math.floor(((Math.atan2(y - 20, x - 20) + Math.PI) / (Math.PI * 2)) * 12);
                return (ringIndex + sector) % 2 ? mix(P.soot, P.holo, 0.4) : P.soot;
            });
            for (let k = 0; k < 6; k++) {
                const angle = rng.next() * Math.PI * 2;
                const distance = 2 + rng.next() * 4.5;
                cv.paint(circle(20 + Math.cos(angle) * distance, 20 + Math.sin(angle) * distance, 0.9), k % 2 ? P.green : P.red, 0.9);
            }
        },
    },
    {
        id: 'landing-marker', spots: ['floor'], size: [44, 44],
        paint(p) {
            const { cv } = p;
            cv.paint(ring(22, 22, 19, 21), P.hazard, 0.75);
            for (let k = 0; k < 4; k++) {
                const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
                cv.paint(segment(22 + Math.cos(angle) * 9, 22 + Math.sin(angle) * 9, 22 + Math.cos(angle) * 16, 22 + Math.sin(angle) * 16, 2), P.white, 0.6);
            }
            cv.paint(circle(22, 22, 2.5), P.amber, 0.85);
        },
    },

    // ------------------------------------------------------------ in a corner (drawn for the north-west corner)
    {
        id: 'cable-coil', spots: ['corner'], size: [16, 16],
        paint(p) {
            const { cv } = p;
            for (const r of [3, 4.6, 6.2]) cv.paint(ring(7, 7, r - 0.6, r + 0.6), P.soot);
            cv.paint(segment(7 + 6.2, 7, 16, 14, 1.1), P.soot);
        },
    },
    {
        id: 'corner-crates', spots: ['corner'], size: [20, 20], image: [22, 22], blocks: true,
        paint(p) {
            crate(p, 1, 1, 13, 12, P.gunmetal);
            crate(p, 1, 13, 10, 21);
            crate(p, 13, 1, 21, 9, P.rust);
        },
    },
    {
        id: 'corner-light', spots: ['corner'], size: [14, 14], image: [48, 48],
        paint(p) {
            const { cv } = p;
            cv.glow(19, 19, 24, P.glow, 0.3);
            cv.shadowRect(17, 17, 25, 25, 3, 0.5);
            cv.paint(rect(17, 17, 25, 25), P.gunmetal);
            cv.paint(circle(21, 21, 2.3), mix(P.trim, P.white, 0.5));
        },
    },
    {
        id: 'corner-debris', spots: ['corner'], size: [18, 16],
        paint(p) {
            scrap(p, 6, 6, 8, 9, false);
        },
    },
    {
        id: 'corner-sparks', spots: ['corner'], size: [14, 14], image: [34, 34],
        paint(p) {
            sparks(p, 13, 13);
        },
    },

    // ------------------------------------------------------------ on a wall (drawn for the north wall)
    {
        id: 'light-strip', spots: ['wall'], size: [20, 10], image: [44, 30],
        paint(p) {
            const { cv } = p;
            const top = 10;
            cv.glow(22, top + 6, 18, P.glow, 0.28);
            cv.paint(rect(12, top + 1, 32, top + WALL - 1), P.bulkheadDark);
            cv.paint(rect(13, top + 2, 31, top + WALL - 2), mix(P.trim, P.white, 0.5));
        },
    },
    {
        id: 'warning-stripes', spots: ['wall'], size: [24, 12],
        paint(p) {
            const { cv } = p;
            cv.paint(rect(0, 0, 24, 12), (x, y) => (Math.floor((x + y) / 3) % 2 ? P.hazard : P.soot), (x, y) => (y < WALL ? 0.85 : 0.6 * (1 - (y - WALL) / 5)));
        },
    },
    {
        id: 'wall-screen', spots: ['wall'], size: [14, 12], image: [30, 28],
        paint(p) {
            const { cv, rng } = p;
            const [x0, y0] = [8, 8];
            cv.glow(15, 15, 12, P.holo, 0.2);
            cv.paint(rect(x0, y0, x0 + 14, y0 + 12), P.gunmetal);
            cv.paint(rect(x0 + 1, y0 + 1, x0 + 13, y0 + WALL), mix(P.soot, P.holo, 0.35));
            for (let k = 0; k < 3; k++) cv.paint(rect(x0 + 2, y0 + 2 + k * 1.4, x0 + 2 + 4 + rng.next() * 6, y0 + 2.6 + k * 1.4), P.holo);
            cv.paint(circle(x0 + 4, y0 + 10, 0.8), P.green);
            cv.paint(circle(x0 + 7, y0 + 10, 0.8), P.amber);
        },
    },
    {
        id: 'vent-grille', spots: ['wall'], size: [16, 12],
        paint(p) {
            const { cv } = p;
            cv.paint(rect(1, 0.5, 15, WALL + 2), P.metalDark);
            for (let x = 2.5; x < 14; x += 2) cv.paint(rect(x, 1.5, x + 0.9, WALL + 1), P.soot);
        },
    },
    {
        id: 'pipe-run', spots: ['wall'], size: [34, 12],
        paint(p) {
            const { cv } = p;
            for (const [y, colour] of [[WALL + 1.5, P.metal], [WALL + 3.8, P.rust]]) {
                cv.paint(rect(0, y - 1, 34, y + 1), (x, py) => shade(colour, 1.1 - Math.abs(py - y) * 0.35 - (x % 11 < 1.2 ? 0.35 : 0)));
            }
        },
    },
    {
        id: 'status-lights', spots: ['wall'], size: [16, 10], image: [32, 26],
        paint(p) {
            const { cv, rng } = p;
            cv.paint(rect(8, 8, 24, 8 + WALL), P.bulkheadDark);
            for (let k = 0; k < 5; k++) {
                const colour = rng.next() < 0.6 ? P.green : P.red;
                cv.glow(10 + k * 3, 8 + WALL / 2, 4, colour, 0.25);
                cv.paint(circle(10 + k * 3, 8 + WALL / 2, 0.8), colour);
            }
        },
    },
    {
        id: 'emergency-panel', spots: ['wall'], size: [10, 12],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(1, 1, 9, 10, 2, 0.45);
            cv.paint(rect(1, 1, 9, 10), P.red);
            cv.paint(rect(2.5, 3, 7.5, 5), P.white);
            cv.paint(circle(5, 7.8, 1), P.amber);
        },
    },

    // ------------------------------------------------------------ on the hull
    {
        id: 'hull-vents', spots: ['rock'], size: [40, 30],
        paint(p) {
            const { cv } = p;
            for (const x0 of [2, 21]) {
                cv.paint(rect(x0, 4, x0 + 17, 26), P.hullLight);
                for (let y = 6; y < 25; y += 2.4) cv.paint(rect(x0 + 1.5, y, x0 + 15.5, y + 1.1), P.soot);
            }
        },
    },
    {
        id: 'hull-lights', spots: ['rock'], size: [36, 32],
        paint(p) {
            const { cv, rng } = p;
            for (let k = 0; k < 5; k++) {
                const [x, y] = [4 + rng.next() * 28, 4 + rng.next() * 24];
                const colour = k % 3 ? P.red : P.white;
                cv.glow(x, y, 5, colour, 0.35);
                cv.paint(circle(x, y, 0.9), colour);
            }
        },
    },
    {
        id: 'hull-panel', spots: ['rock'], size: [44, 36],
        paint(p) {
            const { cv, seed } = p;
            cv.paint(rect(2, 2, 42, 34), (x, y) => {
                const edge = Math.min(x - 2, 42 - x, y - 2, 34 - y);
                return shade(P.hullLight, edge < 1 ? 0.45 : edge < 2 ? 1.3 : 0.9 + noise(seed + 7, x * 0.4, y * 0.4) * 0.15);
            });
            for (const [x, y] of [[5, 5], [39, 5], [5, 31], [39, 31]]) cv.paint(circle(x, y, 0.9), P.metal);
        },
    },
];

/** Hooded traveller, the hero of this tileset. */
export const SPRITES = [
    {
        id: 'hero', file: 'spacer.png', size: [29, 33],
        paint(p) {
            const { cv, seed } = p;
            const robe = (x, y) => shade(P.cloth, 0.8 + noise(seed + 9, x * 0.5, y * 0.25) * 0.35);
            cv.shadowCircle(14.5, 18, 10, 3, 0.45);
            cv.paint(ellipse(14.5, 19.5, 11, 12), robe);
            cv.paint(ellipse(14.5, 22, 5, 7), shade(P.clothLight, 1.05));
            cv.paint(rect(9.5, 21, 19.5, 22.6), shade(P.cloth, 0.55));
            cv.paint(circle(14.5, 11, 6.5), (x, y) => shade(P.cloth, 1.05 - 0.4 * (Math.hypot(x - 14.5, y - 11) / 6.5) ** 2));
            cv.paint(ellipse(14.5, 14.2, 3.4, 2.4), P.soot);
        },
    },
];

/** A little boxy droid that scurries along the corridors. */
function mouseDroid(p, x, y) {
    const { cv } = p;
    cv.shadowRect(x - 5, y - 3.5, x + 5, y + 3.5, 2.5, 0.5);
    cv.paint(roundRect(x - 5, y - 3.5, x + 5, y + 3.5, 1.2), P.soot);
    cv.paint(rect(x - 4, y - 2.5, x + 4, y - 1.5), P.metalDark);
    cv.paint(circle(x + 3.5, y + 1.5, 0.7), P.red);
}

/** A burst of sparks from damaged wiring. */
function sparks(p, x, y) {
    const { cv, rng } = p;
    cv.glow(x, y, 12, P.amber, 0.35);
    for (let k = 0; k < 9; k++) {
        const angle = rng.next() * Math.PI * 2;
        const length = 3 + rng.next() * 6;
        cv.paint(segment(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length, 0.5), mix(P.amber, P.white, rng.next()), 0.9);
    }
    cv.paint(circle(x, y, 1.4), P.white);
}
