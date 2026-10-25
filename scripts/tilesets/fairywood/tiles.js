import {
    BEYOND as B, CELL as C, TILE, arm, corridor, cornerSpot, floorSpot, rockSpot, roomPiece,
} from '../lib/layout.js';
import { circle, intersect, noise, rect, ring, shape, union } from '../lib/raster.js';
import {
    ancientOak, boulder, brambles, brook, campfire, cottage, crystals, fairyRing, fern, fireflies, flowers, footbridge,
    glowingMushrooms, lantern, log, maypole, mushroom, mushroomHouse, pond, roots, sapling, signpost, standingStone,
    steppingStones, stump, tent, water, wishingWell,
} from './decor.js';
import { P, leafLitter, mossy } from './style.js';

/**
 * Every tile in the Fairy Wood set: the path's outline, the furnishings, and the spots where the generator may add
 * overlays. Exits, walk maps and images are all derived from these, so the art and the movement data can't disagree.
 *
 * Paths still leave every tile through the middle two walk cells of a side, so any two tiles join up, but in between
 * they wind, bend in smooth curves and open into round glades.
 */

/** Dead-end glades are weighted down, or the map would break into small pockets. */
const ROOM_WEIGHT = 0.18;

/** A path's way out through each side, from the tile edge onwards (the part inside the tile is drawn per tile). */
const beyond = {
    n: rect(2 * C, -B, 4 * C, 0),
    s: rect(2 * C, TILE, 4 * C, B),
    e: rect(TILE, 2 * C, B, 4 * C),
    w: rect(-B, 2 * C, 0, 4 * C),
};

/**
 * A path from one side to the opposite one, swaying `sway` cells to one side on the way: `waves` 1 bows it, 2 makes
 * an S. It's straight where it meets the tile edges.
 */
function winding(axis, sway, waves = 1) {
    const reach = (1 + Math.abs(sway)) * C;
    const offset = (t) => sway * C * Math.sin(waves * Math.PI * Math.max(0, Math.min(1, t / TILE)));
    return axis === 'ns'
        ? shape((x, y) => Math.abs(x - 3 * C - offset(y)) < C, [3 * C - reach, -B, 3 * C + reach, B])
        : shape((x, y) => Math.abs(y - 3 * C - offset(x)) < C, [-B, 3 * C - reach, B, 3 * C + reach]);
}

/** Where a winding path's middle is, `along` pixels into the tile. */
function windingCentre(sway, waves, along) {
    return 3 * C + sway * C * Math.sin(waves * Math.PI * (along / TILE));
}

/** A smooth bend between two neighbouring sides, curving round the tile corner between them. */
function bend(a, b) {
    const cx = [a, b].includes('e') ? TILE : 0;
    const cy = [a, b].includes('s') ? TILE : 0;
    return union(beyond[a], beyond[b], intersect(ring(cx, cy, 2 * C, 4 * C), rect(0, 0, TILE, TILE)));
}

/** A junction of paths, opening into a small round space where they meet. */
const junction = (...exits) => union(corridor(...exits), circle(3 * C, 3 * C, 1.4 * C));

/** A round glade at the end of a path, its edge a little uneven. */
function glade(exit, variation = 1) {
    const [cx, cy] = gladeCentre(exit);
    const r = 2.15 * C;
    const blob = shape((x, y) => {
        const angle = Math.atan2(y - cy, x - cx);
        return Math.hypot(x - cx, y - cy) < r * (0.93 + 0.12 * noise(variation, Math.cos(angle) * 2 + 7, Math.sin(angle) * 2 + 7));
    }, [cx - r * 1.1, cy - r * 1.1, cx + r * 1.1, cy + r * 1.1]);
    return union(blob, arm[exit]);
}

function gladeCentre(exit) {
    return exit === 's' ? [3 * C, 2.8 * C] : [3.2 * C, 3 * C];
}

/** A big patch of open grass in the middle of a glade, and three smaller spots round its rim. */
function gladeSpots(exit) {
    const [cx, cy] = gladeCentre(exit);
    const rim = exit === 's'
        ? [[1.4 * C, 2.6 * C], [4.6 * C, 2.6 * C], [3 * C, 1.05 * C]]
        : [[1.45 * C, 3 * C], [3.2 * C, 1.2 * C], [3.2 * C, 4.8 * C]];
    return [
        floorSpot(cx, cy, 56, 40, { chance: 0.5 }),
        ...rim.map(([x, y]) => floorSpot(x, y, 20, 20, { canBlock: true, chance: 0.35 })),
    ];
}

/** @type {object[]} */
export const TILES = [
    // ------------------------------------------------------------ start
    {
        id: 'fairy-ring-start', role: 'start', exits: ['s'], tags: ['magic'], spawn: '2,2',
        floor: glade('s', 3),
        decorate(p) {
            fairyRing(p, 3 * C, 2.7 * C, 1.25 * C, 16);
            fireflies(p, circle(3 * C, 2.7 * C, 2 * C), 14);
            flowers(p, circle(3 * C, 2.8 * C, 2 * C), 30);
        },
        spots: [floorSpot(3 * C, 4.7 * C, 24, 14)],
    },
    {
        id: 'hollow-oak-start', role: 'start', exits: ['s'], tags: ['tree'], spawn: '3,3',
        floor: union(rect(0.8 * C, 1.6 * C, 5.2 * C, 5 * C), arm.s),
        decorate(p) {
            ancientOak(p, 3 * C, 1.2 * C, 0.8 * C);
            // A little round door in the trunk, warm light behind it.
            p.cv.glow(3 * C, 1.85 * C, 16, P.glow, 0.35);
            p.cv.paint(circle(3 * C, 1.85 * C, 3), P.woodLight);
            lantern(p, 1.3 * C, 2.1 * C);
            lantern(p, 4.7 * C, 2.1 * C);
            flowers(p, rect(0.9 * C, 3.6 * C, 5.1 * C, 4.9 * C), 26);
        },
        spots: [cornerSpot('sw', 0.8 * C, 5 * C, 16), cornerSpot('se', 5.2 * C, 5 * C, 16)],
    },

    // ------------------------------------------------------------ north-south paths
    {
        id: 'path-ns', exits: ['n', 's'], tags: ['path'], floor: winding('ns', 0.45),
        decorate(p) {
            mossy(p, 0.3);
            leafLitter(p, 0.4);
        },
        spots: [floorSpot(windingCentre(0.45, 1, 35), 35, 26, 26), floorSpot(windingCentre(0.45, 1, 105), 105, 26, 26)],
    },
    {
        id: 'path-ns-s', exits: ['n', 's'], tags: ['path'], floor: winding('ns', 0.4, 2),
        decorate(p) {
            mossy(p, 0.4);
        },
        spots: [floorSpot(windingCentre(0.4, 2, 35), 35, 26, 26), floorSpot(windingCentre(0.4, 2, 105), 105, 26, 26)],
    },
    {
        id: 'path-ns-brook', exits: ['n', 's'], tags: ['path', 'water'], floor: winding('ns', -0.3),
        decorate(p) {
            brook(p, 'ew', 3 * C, 14);
            const x = windingCentre(-0.3, 1, 3 * C);
            steppingStones(p, [[x - 9, 3 * C - 3, 4.5], [x + 1, 3 * C + 2, 4.5], [x + 10, 3 * C - 2, 4]]);
            fern(p, x - 1.3 * C, 3 * C - 14, 7);
        },
        spots: [floorSpot(windingCentre(-0.3, 1, 25), 25, 26, 22), floorSpot(windingCentre(-0.3, 1, 115), 115, 26, 22)],
    },
    {
        id: 'path-ns-bridge', exits: ['n', 's'], tags: ['path', 'water'], floor: corridor('n', 's'),
        decorate(p) {
            brook(p, 'ew', 3 * C, 30);
            footbridge(p, 2 * C - 1, 2.2 * C, 4 * C + 1, 3.8 * C, true);
        },
        spots: [floorSpot(3 * C, 22, 30, 22), floorSpot(3 * C, 118, 30, 22)],
    },
    {
        id: 'path-ns-roots', exits: ['n', 's'], tags: ['path'], floor: winding('ns', 0.35),
        decorate(p) {
            roots(p, 2 * C, 1.6 * C, 4.4 * C, 2.6 * C, 4);
            roots(p, 1.8 * C, 3.6 * C, 4.2 * C, 4.5 * C, 3);
            mossy(p, 0.6);
        },
        spots: [floorSpot(windingCentre(0.35, 1, 70), 70, 24, 22)],
    },
    {
        id: 'path-ns-fallen', exits: ['n', 's'], weight: 0.3, tags: ['path', 'deadend'], floor: corridor('n', 's'),
        decorate(p) {
            log(p, 1.5 * C, 2.6 * C, 4.5 * C, 3.4 * C, 0.42 * C);
            leafLitter(p, 1);
        },
        spots: [floorSpot(3 * C, 18, 30, 22), floorSpot(3 * C, TILE - 18, 30, 22)],
    },

    // ------------------------------------------------------------ east-west paths
    {
        id: 'path-ew', exits: ['e', 'w'], tags: ['path'], floor: winding('ew', 0.45),
        decorate(p) {
            mossy(p, 0.3);
            leafLitter(p, 0.4);
        },
        spots: [floorSpot(35, windingCentre(0.45, 1, 35), 26, 26), floorSpot(105, windingCentre(0.45, 1, 105), 26, 26)],
    },
    {
        id: 'path-ew-s', exits: ['e', 'w'], tags: ['path'], floor: winding('ew', -0.4, 2),
        decorate(p) {
            mossy(p, 0.4);
        },
        spots: [floorSpot(35, windingCentre(-0.4, 2, 35), 26, 26), floorSpot(105, windingCentre(-0.4, 2, 105), 26, 26)],
    },
    {
        id: 'path-ew-bridge', exits: ['e', 'w'], tags: ['path', 'water'], floor: corridor('e', 'w'),
        decorate(p) {
            brook(p, 'ns', 3 * C, 30);
            footbridge(p, 2.2 * C, 2 * C - 1, 3.8 * C, 4 * C + 1, false);
        },
        spots: [floorSpot(22, 3 * C, 22, 30), floorSpot(118, 3 * C, 22, 30)],
    },
    {
        id: 'path-ew-lanterns', exits: ['e', 'w'], tags: ['path', 'magic'], floor: winding('ew', 0.3),
        decorate(p) {
            for (const [x, side] of [[35, -1], [105, 1], [70, -1]]) {
                lantern(p, x, windingCentre(0.3, 1, x) + side * (C + 4.5));
            }
            fireflies(p, rect(0, 1.5 * C, TILE, 4.5 * C), 10);
        },
        spots: [floorSpot(105, windingCentre(0.3, 1, 105), 24, 24)],
    },
    {
        id: 'path-ew-mushrooms', exits: ['e', 'w'], tags: ['path', 'magic'], floor: winding('ew', -0.35),
        decorate(p) {
            glowingMushrooms(p, 1.4 * C, windingCentre(-0.35, 1, 1.4 * C) - C - 2, 6, 8);
            glowingMushrooms(p, 4.3 * C, windingCentre(-0.35, 1, 4.3 * C) + C + 2, 6, 7, P.lilac);
            mushroom(p, 2.6 * C, windingCentre(-0.35, 1, 2.6 * C) + C - 3, 3);
        },
        spots: [floorSpot(70, windingCentre(-0.35, 1, 70), 24, 24)],
    },

    // ------------------------------------------------------------ bends
    {
        id: 'path-es', exits: ['e', 's'], tags: ['path'], floor: bend('e', 's'),
        decorate(p) {
            mossy(p, 0.35);
            leafLitter(p, 0.5);
        },
        spots: [rockSpot(24, 24, 44, 44), floorSpot(TILE - 3 * C * Math.SQRT1_2, TILE - 3 * C * Math.SQRT1_2, 24, 24)],
    },
    {
        id: 'path-es-boulder', exits: ['e', 's'], tags: ['path'], floor: bend('e', 's'),
        decorate(p) {
            boulder(p, TILE - 3.75 * C * Math.SQRT1_2, TILE - 3.75 * C * Math.SQRT1_2, 7);
            fern(p, TILE - 4.3 * C * Math.SQRT1_2, TILE - 4.3 * C * Math.SQRT1_2 + 12, 6);
        },
        spots: [rockSpot(24, 24, 44, 44), floorSpot(TILE - 0.8 * C, 3 * C, 22, 24), floorSpot(3 * C, TILE - 0.8 * C, 24, 22)],
    },
    {
        id: 'path-es-flowers', exits: ['e', 's'], tags: ['path'], floor: bend('e', 's'),
        decorate(p) {
            flowers(p, intersect(ring(TILE, TILE, 2 * C, 4 * C), rect(0, 0, TILE, TILE)), 40);
        },
        spots: [rockSpot(24, 24, 44, 44), floorSpot(TILE - 3 * C * Math.SQRT1_2, TILE - 3 * C * Math.SQRT1_2, 24, 24)],
    },
    {
        id: 'path-es-mushrooms', exits: ['e', 's'], tags: ['path', 'magic'], floor: bend('e', 's'),
        decorate(p) {
            glowingMushrooms(p, TILE - 4.2 * C * Math.SQRT1_2, TILE - 4.2 * C * Math.SQRT1_2, 7, 9);
            mushroom(p, TILE - 1.6 * C * Math.SQRT1_2, TILE - 1.6 * C * Math.SQRT1_2, 3.5);
        },
        spots: [rockSpot(24, 24, 44, 44), floorSpot(TILE - 0.8 * C, 3 * C, 22, 24)],
    },

    // ------------------------------------------------------------ junctions
    {
        id: 'path-esw', exits: ['e', 's', 'w'], tags: ['path'], floor: junction('e', 's', 'w'),
        decorate(p) {
            mossy(p, 0.3);
            flowers(p, circle(3 * C, 3 * C, 1.3 * C), 12);
        },
        spots: [floorSpot(3 * C, 3 * C, 30, 30), floorSpot(20, 3 * C, 22, 26), floorSpot(TILE - 20, 3 * C, 22, 26)],
    },
    {
        id: 'path-esw-signpost', exits: ['e', 's', 'w'], tags: ['path'], floor: junction('e', 's', 'w'),
        decorate(p) {
            signpost(p, 3 * C, 2.05 * C);
            leafLitter(p, 0.5);
        },
        spots: [floorSpot(20, 3 * C, 22, 26), floorSpot(TILE - 20, 3 * C, 22, 26)],
    },
    {
        id: 'path-nes', exits: ['n', 'e', 's'], tags: ['path'], floor: junction('n', 'e', 's'),
        decorate(p) {
            mossy(p, 0.35);
        },
        spots: [floorSpot(3 * C, 3 * C, 30, 30), floorSpot(TILE - 20, 3 * C, 22, 26)],
    },
    {
        id: 'path-nes-well', exits: ['n', 'e', 's'], tags: ['path', 'water'],
        floor: union(junction('n', 'e', 's'), rect(1.05 * C, 2.2 * C, 2.2 * C, 3.8 * C)),
        decorate(p) {
            wishingWell(p, 1.65 * C, 3 * C, 0.42 * C);
            flowers(p, rect(1.1 * C, 2.2 * C, 2.2 * C, 3.8 * C), 10);
        },
        spots: [floorSpot(TILE - 20, 3 * C, 22, 26)],
    },
    {
        id: 'crossroad', exits: ['n', 'e', 's', 'w'], tags: ['path'], floor: junction('n', 'e', 's', 'w'),
        decorate(p) {
            fairyRing(p, 3 * C, 3 * C, 0.75 * C, 9);
        },
        spots: [
            floorSpot(3 * C, 18, 26, 22, { chance: 0.25 }),
            floorSpot(TILE - 18, 3 * C, 22, 26, { chance: 0.25 }),
            floorSpot(3 * C, TILE - 18, 26, 22, { chance: 0.25 }),
            floorSpot(18, 3 * C, 22, 26, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-oak', exits: ['n', 'e', 's', 'w'], tags: ['path', 'tree'],
        floor: union(circle(3 * C, 3 * C, 2.4 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            ancientOak(p, 3 * C, 3 * C, 0.62 * C);
        },
        spots: [
            floorSpot(3 * C, 18, 26, 20, { chance: 0.25 }),
            floorSpot(TILE - 18, 3 * C, 20, 26, { chance: 0.25 }),
            floorSpot(3 * C, TILE - 18, 26, 20, { chance: 0.25 }),
            floorSpot(18, 3 * C, 20, 26, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-pond', exits: ['n', 'e', 's', 'w'], tags: ['path', 'water'],
        floor: union(circle(3 * C, 3 * C, 2.4 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            pond(p, 3 * C, 3 * C, 0.95 * C, 0.8 * C);
        },
        spots: ['nw', 'ne', 'sw', 'se'].map((corner) => floorSpot(
            corner.includes('e') ? 4.4 * C : 1.6 * C, corner.includes('s') ? 4.4 * C : 1.6 * C, 18, 18, { canBlock: true, chance: 0.3 })),
    },
    {
        id: 'crossroad-fallen', exits: ['n', 'e', 's', 'w'], weight: 0.3, tags: ['path', 'deadend'],
        floor: junction('n', 'e', 's', 'w'),
        decorate(p) {
            log(p, 0.5 * C, 2.1 * C, 1.5 * C, 3.95 * C, 0.4 * C);
            leafLitter(p, 0.8);
        },
        spots: [floorSpot(TILE - 18, 3 * C, 22, 26), floorSpot(3 * C, TILE - 18, 26, 22)],
    },

    // ------------------------------------------------------------ glades off a path
    {
        id: 'glade-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade'], floor: glade('s', 11),
        decorate(p) {
            flowers(p, circle(3 * C, 2.8 * C, 2 * C), 24);
        },
        spots: gladeSpots('s'),
    },
    {
        id: 'glade-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['glade'], floor: glade('e', 12),
        decorate(p) {
            mossy(p, 0.4);
            flowers(p, circle(3.2 * C, 3 * C, 2 * C), 20);
        },
        spots: gladeSpots('e'),
    },
    {
        id: 'fairy-ring-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade', 'magic'], floor: glade('s', 13),
        decorate(p) {
            fairyRing(p, 3 * C, 2.8 * C, 1.45 * C, 18);
            fireflies(p, circle(3 * C, 2.8 * C, 2 * C), 22);
        },
        spots: [floorSpot(3 * C, 2.8 * C, 36, 30, { chance: 0.5 })],
    },
    {
        id: 'mushroom-houses-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['glade', 'magic'], floor: glade('e', 14),
        decorate(p) {
            mushroomHouse(p, 2.0 * C, 1.85 * C, 0.6 * C);
            mushroomHouse(p, 1.75 * C, 4.05 * C, 0.5 * C, P.violet);
            mushroomHouse(p, 3.4 * C, 4.5 * C, 0.42 * C, P.woodLight);
            flowers(p, circle(3.2 * C, 3 * C, 1.9 * C), 20);
            fireflies(p, circle(3.2 * C, 3 * C, 2 * C), 10);
        },
        spots: [floorSpot(3.4 * C, 2.6 * C, 26, 22)],
    },
    {
        id: 'lily-pond-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade', 'water'], floor: glade('s', 15),
        decorate(p) {
            pond(p, 3 * C, 2.55 * C, 1.05 * C, 0.82 * C);
        },
        spots: [floorSpot(3 * C, 4.4 * C, 30, 18), floorSpot(1.1 * C, 2.6 * C, 16, 20)],
    },
    {
        id: 'cottage-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['glade', 'dwelling'], floor: glade('e', 16),
        decorate(p) {
            cottage(p, 1.4 * C, 1.4 * C, 3.6 * C, 2.9 * C);
            steppingStones(p, [[3.3 * C, 3.35 * C, 3], [3.9 * C, 3.25 * C, 3], [4.5 * C, 3.15 * C, 3]]);
            flowers(p, rect(1.2 * C, 3.3 * C, 3 * C, 4.6 * C), 30);
            stump(p, 4.3 * C, 4.3 * C, 6);
        },
        spots: [floorSpot(2.1 * C, 4.1 * C, 22, 18), floorSpot(4.4 * C, 1.6 * C, 18, 18, { canBlock: true })],
    },
    {
        id: 'standing-stones-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade', 'magic'], floor: glade('s', 17),
        decorate(p) {
            for (let k = 0; k < 6; k++) {
                const angle = -Math.PI / 2 + (k / 6) * Math.PI * 2 + Math.PI / 6;
                standingStone(p, 3 * C + Math.cos(angle) * 1.45 * C, 2.8 * C + Math.sin(angle) * 1.45 * C, 9);
            }
            p.cv.glow(3 * C, 2.8 * C, 30, P.fairy, 0.15);
        },
        spots: [floorSpot(3 * C, 2.8 * C, 26, 22)],
    },
    {
        id: 'campsite-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['glade', 'camp'], floor: glade('e', 18),
        decorate(p) {
            campfire(p, 3.2 * C, 3 * C);
            tent(p, 1.3 * C, 1.4 * C, 2.8 * C, 2.3 * C);
            log(p, 2.4 * C, 4.1 * C, 3.9 * C, 4.2 * C, 3.2);
            lantern(p, 1.5 * C, 3.6 * C);
        },
        spots: [floorSpot(4.4 * C, 1.7 * C, 18, 18), floorSpot(1.6 * C, 4.3 * C, 18, 16)],
    },
    {
        id: 'crystal-grotto-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade', 'magic'], floor: glade('s', 19),
        decorate(p) {
            p.cv.paint(p.floor, P.soot, 0.25);
            crystals(p, 1.7 * C, 1.9 * C, 9, P.lilac);
            crystals(p, 4.3 * C, 2.1 * C, 8, P.fairy);
            crystals(p, 3 * C, 1.2 * C, 7, P.blossom);
            boulder(p, 4.2 * C, 3.9 * C, 6);
            fireflies(p, circle(3 * C, 2.8 * C, 2 * C), 8);
        },
        spots: [floorSpot(2.6 * C, 3.4 * C, 26, 22)],
    },
    {
        id: 'giant-mushrooms-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['glade', 'magic'], floor: glade('e', 20),
        decorate(p) {
            mushroom(p, 2.0 * C, 1.9 * C, 11, { blocks: true });
            mushroom(p, 1.9 * C, 4.0 * C, 9, { blocks: true, cap: P.violet });
            mushroom(p, 3.6 * C, 1.35 * C, 7, { blocks: true, cap: P.woodLight, spots: false });
            glowingMushrooms(p, 3.5 * C, 4.3 * C, 7, 9);
        },
        spots: [floorSpot(3.3 * C, 3 * C, 26, 24)],
    },
    {
        id: 'spring-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade', 'water', 'magic'], floor: glade('s', 21),
        decorate(p) {
            p.cv.glow(3 * C, 2.3 * C, 40, P.fairy, 0.2);
            for (let k = 0; k < 9; k++) {
                const angle = (k / 9) * Math.PI * 2;
                boulder(p, 3 * C + Math.cos(angle) * 0.85 * C, 2.3 * C + Math.sin(angle) * 0.7 * C, 3.6);
            }
            water(p, circle(3 * C, 2.3 * C, 0.62 * C));
            p.block(circle(3 * C, 2.3 * C, 0.9 * C));
            flowers(p, rect(1 * C, 3.5 * C, 5 * C, 4.8 * C), 20, [P.bluebell, P.daisy]);
        },
        spots: [floorSpot(3 * C, 4.2 * C, 28, 18), floorSpot(1.25 * C, 2.9 * C, 18, 20, { canBlock: true })],
    },
    {
        id: 'bramble-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['glade'], floor: glade('s', 22),
        decorate(p) {
            brambles(p, 1.9 * C, 1.8 * C, 0.8 * C);
            brambles(p, 4.3 * C, 3.6 * C, 0.6 * C);
            leafLitter(p, 1);
        },
        spots: [floorSpot(2.4 * C, 3.6 * C, 24, 20)],
    },

    // ------------------------------------------------------------ deep forest
    {
        id: 'forest', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        spots: [rockSpot(35, 35, 50, 46), rockSpot(105, 100, 50, 46)],
    },
    {
        id: 'forest-blossom', role: 'filler', exits: [], tags: ['blossom'], floor: rect(0, 0, 0, 0), blossom: 0.6,
        spots: [rockSpot(70, 70, 50, 46)],
    },

    // ------------------------------------------------------------ the clearing
    ...clearing(),
];

/** Pieces of a forest clearing, from which the generator builds clearings of any size. */
function clearing() {
    const piece = (slot, options = {}) => roomPiece('clearing', slot, {
        ...options,
        decorate(p) {
            trees(p, slot);
            options.decorate?.(p);
        },
    });

    return [
        piece('nw', { tags: ['corner'] }),
        piece('ne', { tags: ['corner'] }),
        piece('sw', { tags: ['corner'] }),
        piece('se', { tags: ['corner'] }),
        // Paths in are weighted up so that a clearing rarely ends up cut off.
        ...['n', 'e', 's', 'w'].flatMap((slot) => [
            piece(slot, { door: true, weight: 2, tags: ['entrance'] }),
            piece(slot, { tags: ['edge'] }),
        ]),
        piece('n', {
            suffix: '-flowers', tags: ['edge'], wallSpots: false,
            decorate: (p) => flowers(p, rect(1.7 * C, C, 4.3 * C, 1.9 * C), 60),
        }),
        piece('e', {
            suffix: '-brambles', tags: ['edge'], wallSpots: false,
            decorate: (p) => brambles(p, 4.45 * C, 3 * C, 0.5 * C),
        }),
        piece('c', { tags: ['center'] }),
        piece('c', { suffix: '-ring', tags: ['center', 'magic'], decorate: (p) => fairyRing(p, 3 * C, 3 * C, 1.9 * C, 22) }),
        piece('c', { suffix: '-oak', tags: ['center', 'tree'], weight: 0.6, openCentre: false, decorate: (p) => ancientOak(p, 3 * C, 3 * C, 0.75 * C) }),
        piece('c', { suffix: '-pond', tags: ['center', 'water'], weight: 0.6, openCentre: false, decorate: (p) => pond(p, 3 * C, 3 * C, 1.3 * C, 1.0 * C) }),
        piece('c', { suffix: '-maypole', tags: ['center', 'magic'], weight: 0.6, openCentre: false, decorate: (p) => maypole(p, 3 * C, 3 * C, 1.1 * C) }),
        piece('c', {
            suffix: '-stone', tags: ['center', 'magic'], weight: 0.6, openCentre: false,
            decorate: (p) => {
                standingStone(p, 3 * C, 3 * C, 12);
                flowers(p, ring(3 * C, 3 * C, 14, 30), 30, [P.bluebell, P.daisy, P.lilac]);
            },
        }),
    ];
}

/** Young trees round the edge of a clearing, flanking where a path could come in. */
function trees(p, slot) {
    const y = { n: 1.55 * C, s: 4.45 * C };
    const x = { w: 1.55 * C, e: 4.45 * C };
    const near = 1.3 * C;
    const far = 4.7 * C;
    for (const side of slot === 'c' ? [] : slot.split('')) {
        // Corner pieces only get the tree away from the corner.
        const positions = slot.length === 2 ? [slot.includes(side === 'n' || side === 's' ? 'w' : 'n') ? far : near] : [near, far];
        for (const at of positions) {
            if (side === 'n' || side === 's') sapling(p, at, y[side], 11);
            else sapling(p, x[side], at, 11);
        }
    }
}
