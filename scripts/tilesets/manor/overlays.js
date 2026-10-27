import { circle, ellipse, mix, noise, polygon, rect, ring, roundRect, segment, shade, union } from '../lib/raster.js';
import {
    armchair, armour, barrel, bed, book, bookcase, bottle, candle, cat, cauldron, chair, chest, cobweb, fireplace,
    mug, pantryShelf, plate, pottedPlant, range, rotatedRect, roundTable, rug, sack, statue, stool, vase, woodTop,
} from './decor.js';
import { P } from './style.js';

/**
 * Furniture the generator places on tile spots. Each overlay has a footprint (`size`), which must fit the spot, and
 * an image (`image`, default the same as size) centred on that footprint, so glows can spill past it. `onTags` keeps
 * an overlay to rooms of one kind: the kitchen range to kitchens, beds to bedchambers.
 *
 * Overlays are drawn as if their spot were against the north wall or in the north-west corner; the game mirrors
 * them for other walls and corners. Wall overlays (spots: ['wall']) are drawn with their back against the top edge,
 * and the build also makes a turned copy for east and west walls.
 *
 * Kinds of spot: floor (the middle of a room piece), nook (a smaller patch of floor), corner, wall.
 */
export const OVERLAYS = [
    // ------------------------------------------------------------ the taproom
    {
        id: 'tavern-table', spots: ['floor'], size: [56, 56], blocks: true, onTags: ['taproom'],
        paint(p) {
            for (let k = 0; k < 4; k++) {
                const angle = Math.PI / 4 + (k * Math.PI) / 2 + (p.rng.next() - 0.5) * 0.4;
                stool(p, 28 + Math.cos(angle) * 21, 28 + Math.sin(angle) * 21, 4.6);
            }
            roundTable(p, 28, 28, 14, P.oak);
            mug(p, 22, 23);
            mug(p, 33, 31);
            mug(p, 31, 20);
            plate(p, 23, 33, 3.4, P.oakLight);
            candle(p, 28, 27, 14);
        },
    },
    {
        id: 'trestle-table', spots: ['floor'], size: [62, 46], blocks: true, onTags: ['taproom'],
        paint(p) {
            woodTop(p, 9, 5, 53, 11, P.wood);
            woodTop(p, 9, 35, 53, 41, P.wood);
            woodTop(p, 6, 14, 56, 32, P.oak);
            for (const x of [16, 30, 44]) {
                mug(p, x, 18);
                plate(p, x - 3, 27, 3.2, P.terracotta);
            }
            bottle(p, 38, 23, P.green);
            candle(p, 24, 23, 14);
        },
    },
    {
        id: 'bar-counter', spots: ['wall'], size: [92, 26], blocks: true, onTags: ['taproom'], perRoom: 1,
        paint(p) {
            const { cv } = p;
            // Shelves of bottles against the wall, then the counter.
            woodTop(p, 4, 0, 88, 6, P.walnut, { radius: 0.5, rim: 0.8 });
            for (let x = 8; x < 86; x += 4.2) {
                bottle(p, x, 3, P.books[Math.floor(noise(p.seed, x, 1) * P.books.length)]);
            }
            woodTop(p, 0, 12, 92, 24, P.oakDark, { radius: 1.5 });
            cv.paint(rect(1.5, 13, 90.5, 14.2), shade(P.oakLight, 1.1), 0.7);
            for (const x of [16, 22, 28]) {
                cv.paint(circle(x, 16, 1.6), P.brass);
                cv.paint(rect(x - 0.5, 16, x + 0.5, 19), P.brass);
            }
            for (const x of [46, 58, 70]) mug(p, x, 18);
            cv.paint(rect(78, 15, 86, 21), P.linen);
        },
    },
    {
        id: 'cask-rack', spots: ['wall'], size: [72, 24], blocks: true, onTags: ['taproom'], perRoom: 2,
        paint(p) {
            const { cv } = p;
            woodTop(p, 2, 1, 70, 22, P.woodDark, { radius: 0.5, rim: 1 });
            for (const x of [13, 36, 59]) {
                cv.shadowRect(x - 10, 3, x + 10, 20, 2, 0.4);
                cv.paint(roundRect(x - 10, 3, x + 10, 20, 4), (px, py) => shade(P.wood, 0.75 + 0.35 * Math.sin(((py - 3) / 17) * Math.PI)));
                for (const dx of [-6, 6]) cv.paint(rect(x + dx - 0.8, 3, x + dx + 0.8, 20), P.iron);
                cv.paint(circle(x, 11.5, 1.6), P.brass);
            }
        },
    },
    {
        id: 'hearth', spots: ['wall'], size: [56, 26], blocks: true, onTags: ['hearth'], perRoom: 1,
        paint(p) {
            fireplace(p, 2, 0, 54, 18);
            p.cv.paint(rect(8, 18, 48, 25), (x, y) => shade(P.stone, 0.75 + noise(p.seed, x * 0.4, y * 0.4) * 0.2));
            p.cv.paint(segment(42, 21, 50, 25, 1), P.iron);
        },
    },
    {
        id: 'barrels', spots: ['corner'], size: [38, 38], blocks: true, onTags: ['stores'],
        paint(p) {
            barrel(p, 11, 11, 9.5);
            barrel(p, 29, 11, 8);
            barrel(p, 12, 28, 8);
        },
    },

    {
        id: 'small-table', spots: ['nook'], size: [30, 30], blocks: true, onTags: ['taproom'],
        paint(p) {
            stool(p, 7, 23, 4);
            stool(p, 23, 7, 4);
            roundTable(p, 15, 15, 8, P.oak);
            mug(p, 13, 14);
            mug(p, 18, 17);
        },
    },
    {
        // A high-backed settle against the wall, with a narrow table in front of it.
        id: 'settle', spots: ['wall'], size: [70, 30], blocks: true, onTags: ['taproom'],
        paint(p) {
            woodTop(p, 2, 0, 68, 5, P.oakDark, { radius: 0.5, rim: 0.8 });
            woodTop(p, 2, 5, 68, 13, P.oak, { radius: 0.8 });
            p.cv.paint(rect(4, 6.5, 66, 11.5), shade(P.crimson, 0.9), 0.85);
            woodTop(p, 8, 17, 62, 28, P.wood);
            mug(p, 20, 22);
            mug(p, 46, 23);
            candle(p, 33, 22, 14);
        },
    },

    // ------------------------------------------------------------ the kitchen
    {
        id: 'range', spots: ['wall'], size: [80, 28], blocks: true, onTags: ['kitchen'], perRoom: 1,
        paint(p) {
            range(p, 6, 0, 74, 22);
            for (const x of [3, 77]) {
                p.cv.paint(rect(x - 2.5, 2, x + 2.5, 26), shade(P.iron, 1.2));
            }
            p.cv.paint(segment(10, 25, 20, 26, 1), P.copper);
            p.cv.paint(circle(22, 26, 2.6), P.copper);
        },
    },
    {
        id: 'kitchen-shelves', spots: ['wall'], size: [84, 16], blocks: true, onTags: ['kitchen'],
        paint(p) {
            pantryShelf(p, 1, 0, 83, 15);
        },
    },
    {
        id: 'work-table', spots: ['floor'], size: [58, 38], blocks: true, onTags: ['kitchen'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 3, 5, 55, 33, mix(P.woodLight, P.linen, 0.25));
            cv.paint(roundRect(8, 10, 24, 22, 2), shade(P.woodLight, 1.1));
            cv.paint(segment(12, 25, 22, 28, 1.2), P.pewter);
            cv.paint(segment(22, 28, 26, 29, 1.6), P.woodDark);
            for (const [x, y, colour] of [[34, 13, P.terracotta], [38, 16, P.flowers[1]], [42, 12, P.leafLight], [36, 21, P.flowers[0]]]) {
                cv.shadowCircle(x, y, 2.2, 1.5, 0.35);
                cv.paint(circle(x, y, 2.4), colour);
            }
            cv.paint(ellipse(46, 26, 6, 4, 0.3), mix(P.oakLight, P.linen, 0.35));
            cv.paint(circle(30, 27, 4), P.linen, 0.35);
        },
    },
    {
        id: 'cauldron', spots: ['nook'], size: [28, 28], image: [40, 40], blocks: true, onTags: ['kitchen'], perRoom: 1,
        paint(p) {
            p.cv.glow(20, 20, 18, P.glow, 0.3);
            for (let k = 0; k < 5; k++) p.cv.paint(circle(20 + Math.cos(k * 1.3) * 9, 20 + Math.sin(k * 1.3) * 9, 1.4), P.ember, 0.8);
            cauldron(p, 20, 20, 9);
        },
    },
    {
        id: 'sacks', spots: ['corner'], size: [34, 34], blocks: true, onTags: ['stores'],
        paint(p) {
            sack(p, 10, 11, 8, 0.4);
            sack(p, 24, 10, 7, -0.3);
            sack(p, 11, 25, 7, 1.9);
        },
    },

    {
        id: 'chopping-block', spots: ['nook'], size: [26, 26], blocks: true, onTags: ['kitchen'],
        paint(p) {
            const { cv } = p;
            cv.shadowCircle(13, 13, 10, 4, 0.55);
            cv.paint(circle(13, 13, 10), shade(P.wood, 0.7));
            cv.paint(circle(13, 13, 9), (x, y) => shade(P.woodLight, 0.85 + 0.15 * Math.sin(Math.hypot(x - 13, y - 13) * 1.6)));
            cv.paint(segment(8, 15, 15, 9, 1.4), P.pewter);
            cv.paint(segment(15, 9, 18, 6.5, 2), P.woodDark);
        },
    },
    {
        // A dresser with plates standing in its rack.
        id: 'plate-dresser', spots: ['wall'], size: [62, 18], blocks: true, onTags: ['kitchen'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 1, 0, 61, 17, P.woodLight, { radius: 0.6 });
            cv.paint(rect(3, 1.5, 59, 6), shade(P.woodLight, 0.6));
            for (let x = 6; x < 58; x += 6.5) {
                cv.paint(ellipse(x, 3.8, 3, 1.6), P.ivory);
                cv.paint(ellipse(x, 3.8, 1.8, 0.8), P.blue, 0.7);
            }
            for (const x of [12, 30, 48]) {
                cv.paint(circle(x, 12, 2.6), P.terracotta);
                cv.paint(circle(x, 12, 1.5), shade(P.terracotta, 0.6));
            }
        },
    },
    {
        id: 'sink', spots: ['wall'], size: [40, 24], blocks: true, onTags: ['kitchen'], perRoom: 1,
        paint(p) {
            const { cv } = p;
            cv.shadowRect(2, 0, 38, 22, 3, 0.5);
            cv.paint(rect(2, 0, 38, 22), shade(P.stone, 0.75));
            cv.paint(roundRect(6, 3, 34, 19, 3), shade(P.stone, 0.55));
            cv.paint(roundRect(7.5, 4.5, 32.5, 17.5, 2), mix(P.water, P.stone, 0.45));
            cv.paint(rect(18, 0, 22, 6), P.iron);
            cv.paint(segment(20, 3, 30, 1, 1.4), P.ironLight);
        },
    },

    // ------------------------------------------------------------ bedchambers
    {
        id: 'bed', spots: ['wall'], size: [44, 54], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            bed(p, 2, 0, 42, 52, p.rng.pick([P.red, P.blue, P.green, P.plum]));
        },
    },
    {
        id: 'wardrobe', spots: ['wall'], size: [50, 22], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            woodTop(p, 1, 0, 49, 20, P.walnut, { radius: 0.8 });
            p.cv.paint(rect(24.6, 1.5, 25.4, 18.5), shade(P.walnut, 0.5));
            for (const x of [22.5, 27.5]) p.cv.paint(circle(x, 15, 1), P.brass);
        },
    },
    {
        id: 'dresser', spots: ['wall'], size: [44, 18], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 1, 0, 43, 16, P.woodLight, { radius: 0.8 });
            cv.paint(ellipse(22, 3.5, 9, 2.5), P.brass);
            cv.paint(ellipse(22, 3.5, 7.8, 1.6), mix(P.waterLight, P.ivory, 0.5));
            candle(p, 7, 9, 14);
            cv.paint(ellipse(34, 10, 3.5, 1.8, 0.3), P.walnut);
        },
    },
    {
        id: 'chest', spots: ['nook'], size: [30, 20], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            chest(p, 1, 1, 29, 19);
        },
    },
    {
        id: 'washstand', spots: ['corner'], size: [26, 26], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 1, 1, 25, 25, P.wood);
            cv.paint(circle(13, 13, 8), P.ivory);
            cv.paint(circle(13, 13, 6.5), mix(P.waterLight, P.ivory, 0.4));
            cv.paint(circle(20, 6, 3.2), P.blue);
            cv.paint(rect(3, 19, 10, 24), P.linen);
        },
    },
    {
        id: 'bedroom-rug', spots: ['floor'], size: [64, 46], onTags: ['bedchamber'],
        paint(p) {
            rug(p, 3, 4, 61, 42, p.rng.pick([P.red, P.blue, P.plum]), P.gold);
        },
    },

    {
        id: 'bedside-chair', spots: ['nook'], size: [26, 26], blocks: true, onTags: ['bedchamber'],
        paint(p) {
            armchair(p, 13, 13, -Math.PI / 2 + (p.rng.next() - 0.5) * 0.6, p.rng.pick([P.blue, P.plum, P.green]), 18);
        },
    },

    // ------------------------------------------------------------ the great hall
    {
        id: 'banquet-table', spots: ['floor'], size: [58, 64], blocks: true, onTags: ['great-hall'],
        paint(p) {
            for (const y of [10, 25, 39, 54]) {
                chair(p, 10, y, 0, P.walnut, 9);
                chair(p, 48, y, Math.PI, P.walnut, 9);
            }
            woodTop(p, 17, 2, 41, 62, P.walnut, { axis: 'y' });
            p.cv.paint(rect(20, 4, 38, 60), P.linen, 0.85);
            for (const y of [10, 25, 39, 54]) {
                plate(p, 23, y, 3, P.oakLight);
                plate(p, 35, y, 3, P.oakLight);
            }
            for (const y of [17, 47]) candle(p, 29, y, 18);
            bottle(p, 29, 32, P.red);
        },
    },
    {
        id: 'tapestry', spots: ['wall'], size: [70, 8], onTags: ['great-hall'],
        paint(p) {
            const { cv } = p;
            cv.paint(rect(0, 0, 70, 2), P.brass);
            cv.paint(rect(3, 1.5, 67, 7), (x) => {
                const band = Math.floor(x / 8) % 3;
                return [P.crimson, P.gold, P.blue][band];
            });
            cv.paint(rect(3, 6.2, 67, 7), P.goldDark);
        },
    },
    {
        id: 'armour', spots: ['corner'], size: [26, 26], blocks: true, onTags: ['grand'],
        paint(p) {
            armour(p, 13, 13, 11);
        },
    },
    {
        id: 'candelabrum', spots: ['nook'], size: [24, 24], image: [50, 50], blocks: true, onTags: ['grand'],
        paint(p) {
            const { cv } = p;
            cv.glow(25, 25, 25, P.glow, 0.3);
            cv.shadowCircle(25, 25, 3.5, 4, 0.5);
            for (let k = 0; k < 5; k++) {
                const angle = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
                cv.paint(segment(25, 25, 25 + Math.cos(angle) * 9, 25 + Math.sin(angle) * 9, 1.1), P.brass);
                candle(p, 25 + Math.cos(angle) * 10, 25 + Math.sin(angle) * 10, 7);
            }
            cv.paint(circle(25, 25, 3), P.brass);
        },
    },

    {
        // A long sideboard laid with silver and candles.
        id: 'sideboard', spots: ['wall'], size: [80, 20], blocks: true, onTags: ['great-hall'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 1, 0, 79, 18, P.walnut);
            for (const x of [16, 40, 64]) {
                cv.shadowCircle(x, 9, 6, 2, 0.35);
                cv.paint(ellipse(x, 9, 7, 5.5), P.pewter);
                cv.paint(ellipse(x, 9, 5.5, 4), shade(P.pewter, 1.25));
            }
            for (const x of [28, 52]) candle(p, x, 7, 16);
        },
    },

    // ------------------------------------------------------------ the library
    {
        id: 'bookcase', spots: ['wall'], size: [86, 18], blocks: true, onTags: ['library'],
        paint(p) {
            bookcase(p, 1, 0, 85, 17);
        },
    },
    {
        id: 'reading-table', spots: ['floor'], size: [56, 44], blocks: true, onTags: ['library'],
        paint(p) {
            const { cv } = p;
            chair(p, 28, 37, -Math.PI / 2, P.walnut, 10);
            woodTop(p, 5, 4, 51, 30, P.walnut);
            book(p, 24, 16, 16, 11, 0.1, P.books[0]);
            book(p, 41, 12, 8, 11, -0.4, P.books[2]);
            book(p, 41, 22, 9, 12, 0.3, P.books[4]);
            cv.paint(rotatedRect(13, 22, 9, 12, -0.2), P.linen);
            cv.paint(segment(11, 18, 17, 9, 0.6), P.ivory);
            candle(p, 11, 10, 18);
        },
    },
    {
        id: 'armchair', spots: ['corner'], size: [32, 32], blocks: true, onTags: ['library'],
        paint(p) {
            armchair(p, 15, 15, Math.PI / 4, P.green, 21);
            p.cv.paint(circle(27, 27, 3.5), P.walnut);
            candle(p, 27, 27, 10);
        },
    },
    {
        id: 'globe', spots: ['nook'], size: [26, 26], blocks: true, onTags: ['library'], perRoom: 1,
        paint(p) {
            const { cv, seed } = p;
            cv.shadowCircle(13, 13, 10, 4, 0.5);
            cv.paint(ring(13, 13, 10, 11.5), P.brass);
            cv.paint(circle(13, 13, 10), (x, y) => {
                const land = noise(seed + 501, x * 0.25, y * 0.25) > 0.55;
                const lit = 1.1 - Math.hypot(x - 11, y - 11) / 14;
                return shade(land ? mix(P.leafLight, P.oakLight, 0.5) : mix(P.blue, P.waterLight, 0.35), lit);
            });
            cv.paint(segment(3, 13, 23, 13, 0.6), P.brass, 0.7);
        },
    },
    {
        id: 'book-pile', spots: ['nook'], size: [24, 20], onTags: ['library'],
        paint(p) {
            book(p, 9, 9, 11, 8, 0.4, P.books[1]);
            book(p, 14, 12, 12, 9, -0.2, P.books[5]);
            book(p, 12, 10, 9, 7, 1.1, P.books[3]);
        },
    },

    {
        id: 'writing-desk', spots: ['wall'], size: [50, 34], blocks: true, onTags: ['library'],
        paint(p) {
            const { cv } = p;
            chair(p, 25, 27, -Math.PI / 2, P.walnut, 10);
            woodTop(p, 2, 0, 48, 18, P.walnut);
            cv.paint(rotatedRect(20, 9, 12, 9, 0.15), P.linen);
            cv.paint(segment(28, 6, 33, 12, 0.6), P.ivory);
            cv.paint(circle(36, 5, 1.8), P.ebony);
            candle(p, 8, 6, 16);
        },
    },
    {
        id: 'lectern', spots: ['nook'], size: [22, 24], blocks: true, onTags: ['library'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 3, 4, 19, 18, P.walnut, { radius: 1 });
            book(p, 11, 11, 13, 9, 0, P.books[0]);
            cv.paint(rect(10, 18, 12, 23), P.walnut);
        },
    },

    // ------------------------------------------------------------ the ballroom
    {
        id: 'grand-piano', spots: ['floor'], size: [54, 62], blocks: true, onTags: ['ballroom'], perRoom: 1,
        paint(p) {
            const { cv } = p;
            // Straight along the keyboard and the right-hand side; the left-hand side sweeps in to a rounded tail.
            const outline = [[6, 46], [48, 46], [48, 14]];
            for (let k = 1; k <= 10; k++) {
                const angle = -(k / 10) * Math.PI;
                outline.push([40 + Math.cos(angle) * 8, 14 + Math.sin(angle) * 9]);
            }
            for (let k = 1; k <= 10; k++) {
                const t = k / 10;
                outline.push([32 - 26 * t, 14 + 20 * t * t * (3 - 2 * t)]);
            }
            const body = polygon(outline);
            cv.shadowRect(6, 3, 48, 46, 5, 0.6);
            cv.paint(body, P.ebony);
            cv.paint(body, (x, y) => mix(P.ebony, P.ivory, 0.2 * Math.max(0, 1 - Math.hypot(x - 34, y - 20) / 16)));
            cv.paint(segment(10, 44, 46, 14, 0.5), shade(P.ebony, 2.2), 0.6);
            cv.paint(rect(6, 45, 48, 51), P.ebony);
            for (let x = 7; x < 47; x += 1.6) cv.paint(rect(x, 46, x + 1.3, 50.5), P.ivory);
            for (let x = 8.2; x < 46; x += 1.6 * 7 / 5) cv.paint(rect(x, 46, x + 0.8, 48.5), P.ebony);
            woodTop(p, 14, 54, 40, 60, P.ebony, { radius: 1, shadow: 0.4 });
        },
    },
    {
        id: 'card-table', spots: ['floor'], size: [56, 56], blocks: true, onTags: ['ballroom'],
        paint(p) {
            const { cv } = p;
            for (let k = 0; k < 4; k++) {
                const angle = (k * Math.PI) / 2;
                chair(p, 28 + Math.cos(angle) * 20, 28 + Math.sin(angle) * 20, angle + Math.PI, P.walnut, 9);
            }
            roundTable(p, 28, 28, 14, P.walnut);
            cv.paint(circle(28, 28, 11.5), mix(P.green, P.leaf, 0.3));
            for (let k = 0; k < 6; k++) {
                const angle = p.rng.next() * Math.PI * 2;
                const distance = 3 + p.rng.next() * 6;
                cv.paint(rotatedRect(28 + Math.cos(angle) * distance, 28 + Math.sin(angle) * distance, 3, 4.4, p.rng.next() * Math.PI), P.ivory);
            }
            candle(p, 28, 28, 12);
        },
    },
    {
        id: 'sofa', spots: ['wall'], size: [66, 24], blocks: true, onTags: ['ballroom'],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(1, 0, 65, 22, 4, 0.55);
            cv.paint(roundRect(1, 0, 65, 22, 3), shade(P.plum, 0.6));
            cv.paint(roundRect(2, 1, 64, 7, 2), shade(P.plum, 0.85));
            for (const x of [1, 57]) cv.paint(roundRect(x, 1, x + 8, 21, 2.5), shade(P.plum, 0.8));
            for (const [x0, x1] of [[10, 33], [33, 56]]) {
                cv.paint(roundRect(x0 + 0.5, 7.5, x1 - 0.5, 20.5, 2), (x, y) => shade(P.plum, 1.0 + 0.12 * Math.sin(((y - 7) / 13) * Math.PI)));
            }
            cv.paint(roundRect(13, 9, 20, 15, 1.5), P.gold);
        },
    },
    {
        id: 'potted-palm', spots: ['corner'], size: [32, 32], image: [36, 36], blocks: true, onTags: ['ballroom'],
        paint(p) {
            pottedPlant(p, 18, 18, 16, P.ivory);
        },
    },
    {
        id: 'harp', spots: ['nook'], size: [22, 28], blocks: true, onTags: ['ballroom'], perRoom: 1,
        paint(p) {
            const { cv } = p;
            cv.shadowRect(4, 3, 18, 25, 3, 0.45);
            cv.paint(polygon([[5, 25], [17, 25], [17, 5], [5, 3]]), P.gold, 0.15);
            for (let x = 6.5; x < 17; x += 1.6) cv.paint(segment(x, 3.5 + (x - 5) * 0.17, x, 25, 0.25), P.ivory, 0.8);
            cv.paint(segment(5, 3, 5, 25, 2), P.gold);
            cv.paint(segment(5, 25, 17, 25, 2), P.goldDark);
            cv.paint(segment(5, 3, 17, 5, 1.8), P.gold);
        },
    },
    {
        id: 'statue', spots: ['corner'], size: [28, 28], blocks: true, onTags: ['grand'],
        paint(p) {
            statue(p, 14, 14, 12);
        },
    },

    {
        id: 'gilt-mirror', spots: ['wall'], size: [50, 6], onTags: ['ballroom'],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(1, 0, 49, 4, 2, 0.35);
            cv.paint(rect(1, 0, 49, 5), P.gold);
            cv.paint(rect(3, 0, 47, 3.2), (x) => mix(P.waterLight, P.ivory, 0.4 + 0.3 * Math.sin(x * 0.2)));
        },
    },
    {
        // Four chairs and music stands for a string quartet.
        id: 'quartet', spots: ['floor'], size: [60, 50], blocks: true, onTags: ['ballroom'],
        paint(p) {
            const { cv } = p;
            for (let k = 0; k < 4; k++) {
                const angle = Math.PI * (0.15 + (k / 3) * 0.7);
                const x = 30 - Math.cos(angle) * 22;
                const y = 40 - Math.sin(angle) * 26;
                chair(p, x, y, angle, P.walnut, 8);
                const sx = 30 - Math.cos(angle) * 12;
                const sy = 40 - Math.sin(angle) * 15;
                cv.paint(rotatedRect(sx, sy, 7, 1.4, angle + Math.PI / 2), P.iron);
                cv.paint(rotatedRect(sx - Math.cos(angle) * 0.9, sy - Math.sin(angle) * 0.9, 5.5, 2.4, angle + Math.PI / 2), P.ivory);
            }
            candle(p, 30, 40, 14);
        },
    },

    // ------------------------------------------------------------ hallways
    {
        id: 'portrait', spots: ['wall'], size: [44, 6], onTags: ['hallway'],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(1, 0, 43, 4, 2, 0.35);
            cv.paint(rect(1, 0, 43, 4.5), P.gold);
            cv.paint(rect(2.5, 0, 41.5, 3), shade(P.goldDark, 0.8));
            cv.paint(rect(4, 0, 40, 2), p.rng.pick([P.green, P.crimson, P.blue]));
        },
    },
    {
        id: 'side-table', spots: ['wall'], size: [42, 16], blocks: true, onTags: ['hallway'],
        paint(p) {
            const { cv } = p;
            cv.shadowRect(2, 0, 40, 14, 3, 0.5);
            cv.paint(union(rect(2, 0, 40, 6), ellipse(21, 6, 19, 8)), (x, y) => (y < 0 ? null : shade(P.walnut, 1.3)));
            cv.paint(union(rect(3, 0, 39, 5.5), ellipse(21, 5.5, 17.6, 6.8)), (x, y) => (y < 0 ? null : shade(P.walnut, 1.7)));
            vase(p, 15, 6, 4.5);
            candle(p, 30, 5, 12);
        },
    },
    {
        id: 'clock', spots: ['wall'], size: [20, 16], blocks: true, onTags: ['hallway'],
        paint(p) {
            const { cv } = p;
            woodTop(p, 2, 0, 18, 14, P.walnut, { radius: 1 });
            cv.paint(roundRect(5, 2.5, 15, 11, 3), shade(P.walnut, 1.5));
            cv.paint(circle(10, 7, 1.6), P.brass);
        },
    },
    {
        id: 'hall-plant', spots: ['corner'], size: [28, 28], image: [32, 32], blocks: true, onTags: ['hallway'],
        paint(p) {
            pottedPlant(p, 16, 16, 13, P.blue);
        },
    },

    // ------------------------------------------------------------ anywhere
    {
        id: 'cat', spots: ['nook'], size: [20, 16], weight: 0.5,
        paint(p) {
            cat(p, 10, 8, 7.5, 0.3 + p.rng.next() * 0.4);
        },
    },
    {
        id: 'cobweb', spots: ['corner'], size: [24, 24], onTags: ['dusty'], weight: 0.5,
        paint(p) {
            cobweb(p, 0, 0, 23);
        },
    },
];
