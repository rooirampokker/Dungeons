import {
    BEYOND as B, CELL as C, TILE, WALL, arm, chamber, chamberSpots, cornerSpot, corridor, corridorWall, floorSpot,
    rockSpot, roomPiece, wallSpot,
} from '../lib/layout.js';
import { circle, intersect, mix, polygon, rect, union } from '../lib/raster.js';
import {
    altar, banner, barrel, bed, bench, bird, birdcage, bookPile, bookshelf, bottles, brazier, cabinet, candle, carving,
    carvingStand, cauldron, chair, chest, cobweb, dais, dustSheet, feathers, fountain, grate, hearth, inkwell, ivy,
    mortar, mosaic, parchment, perch, pillar, plate, puddle, rubble, rug, sack, sconce, scorch, spiralStair, statue,
    steps, table, water, well,
} from './decor.js';
import { P, grime, moss } from './style.js';

/**
 * Every tile in the Gormenghast set. Each entry gives the floor's outline (the walkable surface, carried on past
 * the tile edge wherever there's an exit), paints its furnishings, and lists the spots where the generator may add
 * overlays. Exits, walk maps and images are all derived from these, so the art and the movement data can't disagree.
 */

/**
 * Rooms off a corridor are dead ends. Picking them as often as corridors would wall the map into small pockets, so
 * they're weighted down.
 */
const ROOM_WEIGHT = 0.2;

const westWall = corridorWall;
const northWall = corridorWall;

/** @type {object[]} */
export const TILES = [
    // ------------------------------------------------------------ start
    {
        id: 'gatehouse', role: 'start', exits: ['s'], tags: ['stairs'], spawn: '3,2',
        floor: union(rect(0.8 * C, 0.8 * C, 5.2 * C, 5 * C), arm.s),
        decorate(p) {
            steps(p, 0.8 * C, 0.8 * C, 5.2 * C, 2 * C, 'n', 5);
            rug(p, 2.3 * C, 2.1 * C, 3.7 * C, 5 * C);
            brazier(p, 1.5 * C, 3.7 * C);
            brazier(p, 4.5 * C, 3.7 * C);
            banner(p, 0.55 * C, 2.4 * C, 0.95 * C, 3.6 * C);
            banner(p, 5.05 * C, 2.4 * C, 5.45 * C, 3.6 * C);
        },
        spots: [cornerSpot('sw', 0.8 * C, 5 * C, 16), cornerSpot('se', 5.2 * C, 5 * C, 16)],
    },
    {
        id: 'stairhead', role: 'start', exits: ['s'], tags: ['stairs', 'tower'], spawn: '3,3',
        floor: union(rect(0.9 * C, 0.9 * C, 5.1 * C, 5 * C), arm.s),
        decorate(p) {
            spiralStair(p, 1.95 * C, 1.95 * C, 0.85 * C);
            rug(p, 2.5 * C, 2.9 * C, 4.6 * C, 4.6 * C, P.crimson, P.gold);
            brazier(p, 4.35 * C, 1.6 * C);
            feathers(p, rect(1.2 * C, 3.2 * C, 2.3 * C, 4.7 * C), 8);
            grime(p, 0.5);
        },
        spots: [cornerSpot('sw', 0.9 * C, 5 * C, 16), wallSpot('e', 5.1 * C, 2.7 * C, 4.5 * C)],
    },

    // ------------------------------------------------------------ north-south corridors
    {
        id: 'passage-ns', exits: ['n', 's'], tags: ['passage'], floor: corridor('n', 's'),
        decorate(p) {
            sconce(p, westWall, 3 * C);
            moss(p, 0.2);
            grime(p, 0.5);
        },
        spots: [floorSpot(3 * C, 30, 34, 36), floorSpot(3 * C, 110, 34, 36), wallSpot('e', 4 * C, 20, 120)],
    },
    {
        id: 'passage-ns-damp', exits: ['n', 's'], tags: ['passage', 'damp'], floor: corridor('n', 's'),
        decorate(p) {
            moss(p, 0.7);
            puddle(p, 2.7 * C, 1.6 * C, 9, 6);
            puddle(p, 3.4 * C, 4.2 * C, 7, 10);
        },
        spots: [floorSpot(3 * C, 3 * C, 34, 30), wallSpot('w', 2 * C, 15, 125), wallSpot('e', 4 * C, 15, 125)],
    },
    {
        id: 'passage-ns-stairs', exits: ['n', 's'], tags: ['passage', 'stairs'], floor: corridor('n', 's'),
        decorate(p) {
            steps(p, 2 * C, 1.5 * C, 4 * C, 4.5 * C, 's', 7);
            sconce(p, westWall, 1.2 * C);
        },
        spots: [wallSpot('e', 4 * C, 4, 32), wallSpot('w', 2 * C, 108, 136)],
    },
    {
        id: 'passage-ns-carvings', exits: ['n', 's'], tags: ['passage', 'carvings'],
        floor: union(corridor('n', 's'),
            rect(1.3 * C, 1.2 * C, 2.1 * C, 2.5 * C), rect(1.3 * C, 3.5 * C, 2.1 * C, 4.8 * C),
            rect(3.9 * C, 1.2 * C, 4.7 * C, 2.5 * C), rect(3.9 * C, 3.5 * C, 4.7 * C, 4.8 * C)),
        decorate(p) {
            for (const x of [1.7 * C, 4.3 * C]) {
                for (const y of [1.85 * C, 4.15 * C]) {
                    carving(p, x, y - 6, 1.1);
                    carving(p, x, y + 6, 1.1);
                    p.block(rect(x - 0.45 * C, y - 0.7 * C, x + 0.45 * C, y + 0.7 * C));
                }
            }
            grime(p, 0.7);
        },
        spots: [floorSpot(3 * C, 3 * C, 34, 30)],
    },
    {
        id: 'passage-ns-crooked', exits: ['n', 's'], tags: ['passage', 'crooked'],
        floor: union(polygon([
            [2 * C, -B], [4 * C, -B], [4 * C, 1.4 * C], [3 * C, 2.4 * C], [3 * C, 3.6 * C], [4 * C, 4.6 * C],
            [4 * C, B], [2 * C, B], [2 * C, 4.6 * C], [1 * C, 3.6 * C], [1 * C, 2.4 * C], [2 * C, 1.4 * C],
        ])),
        decorate(p) {
            moss(p, 0.35);
            cobweb(p, 1 * C, 2.4 * C, 1, 1, 9);
        },
        spots: [floorSpot(2 * C, 3 * C, 30, 24)],
    },
    {
        id: 'passage-ns-collapsed', exits: ['n', 's'], weight: 0.3, tags: ['passage', 'deadend', 'ruin'], floor: corridor('n', 's'),
        decorate(p) {
            rubble(p, 3 * C, 3 * C, 1.55 * C, 30);
            grime(p, 1);
        },
        spots: [floorSpot(3 * C, 16, 34, 22), floorSpot(3 * C, TILE - 16, 34, 22)],
    },

    // ------------------------------------------------------------ east-west corridors
    {
        id: 'passage-ew', exits: ['e', 'w'], tags: ['passage'], floor: corridor('e', 'w'),
        decorate(p) {
            sconce(p, 3 * C, northWall);
            moss(p, 0.2);
            grime(p, 0.5);
        },
        spots: [floorSpot(30, 3 * C, 36, 34), floorSpot(110, 3 * C, 36, 34), wallSpot('s', 4 * C, 20, 120)],
    },
    {
        id: 'passage-ew-banners', exits: ['e', 'w'], tags: ['passage'], floor: corridor('e', 'w'),
        decorate(p) {
            // Hung from the tops of the walls, falling a little onto the floor.
            banner(p, 1.2 * C, 2 * C - WALL + 1, 2.4 * C, 2 * C + 2.5);
            banner(p, 3.6 * C, 4 * C - 2.5, 4.8 * C, 4 * C + WALL - 1);
            sconce(p, 4.2 * C, northWall);
            sconce(p, 1.8 * C, 4 * C + WALL / 2);
        },
        spots: [floorSpot(3 * C, 3 * C, 36, 34)],
    },
    {
        id: 'passage-ew-damp', exits: ['e', 'w'], tags: ['passage', 'damp'], floor: corridor('e', 'w'),
        decorate(p) {
            moss(p, 0.7);
            puddle(p, 1.5 * C, 3.3 * C, 10, 6);
            puddle(p, 4.3 * C, 2.6 * C, 8, 5);
        },
        spots: [floorSpot(3 * C, 3 * C, 30, 34), wallSpot('n', 2 * C, 15, 125), wallSpot('s', 4 * C, 15, 125)],
    },
    {
        id: 'passage-ew-stairs', exits: ['e', 'w'], tags: ['passage', 'stairs'], floor: corridor('e', 'w'),
        decorate(p) {
            steps(p, 1.5 * C, 2 * C, 4.5 * C, 4 * C, 'e', 7);
            sconce(p, 1.2 * C, northWall);
        },
        spots: [wallSpot('s', 4 * C, 4, 32), wallSpot('n', 2 * C, 108, 136)],
    },
    {
        id: 'passage-ew-carvings', exits: ['e', 'w'], tags: ['passage', 'carvings'],
        floor: union(corridor('e', 'w'),
            rect(1.2 * C, 1.3 * C, 2.5 * C, 2.1 * C), rect(3.5 * C, 1.3 * C, 4.8 * C, 2.1 * C),
            rect(1.2 * C, 3.9 * C, 2.5 * C, 4.7 * C), rect(3.5 * C, 3.9 * C, 4.8 * C, 4.7 * C)),
        decorate(p) {
            for (const y of [1.7 * C, 4.3 * C]) {
                for (const x of [1.85 * C, 4.15 * C]) {
                    carving(p, x - 6, y, 1.1);
                    carving(p, x + 6, y, 1.1);
                    p.block(rect(x - 0.7 * C, y - 0.45 * C, x + 0.7 * C, y + 0.45 * C));
                }
            }
            grime(p, 0.7);
        },
        spots: [floorSpot(3 * C, 3 * C, 30, 34)],
    },
    {
        id: 'gallery-ew', exits: ['e', 'w'], tags: ['passage'],
        floor: union(corridor('e', 'w'), rect(0.9 * C, 1.1 * C, 5.1 * C, 4.9 * C)),
        decorate(p) {
            for (const x of [1.45 * C, 4.55 * C]) {
                for (const y of [1.65 * C, 4.35 * C]) pillar(p, x, y, 0.32 * C);
            }
            grime(p, 0.6);
        },
        spots: [
            floorSpot(3 * C, 3 * C, 104, 24, { chance: 0.6 }),
            wallSpot('n', 1.1 * C, 45, 95),
            wallSpot('s', 4.9 * C, 45, 95),
        ],
    },

    // ------------------------------------------------------------ corners
    {
        id: 'passage-es', exits: ['e', 's'], tags: ['passage'], floor: corridor('e', 's'),
        decorate(p) {
            moss(p, 0.25);
        },
        spots: [
            cornerSpot('nw', 2 * C, 2 * C, 18),
            floorSpot(115, 3 * C, 34, 34),
            floorSpot(3 * C, 115, 34, 34),
            wallSpot('n', 2 * C, 75, 135),
            wallSpot('w', 2 * C, 75, 135),
        ],
    },
    {
        id: 'passage-es-crooked', exits: ['e', 's'], tags: ['passage', 'crooked'],
        floor: union(arm.e, arm.s, polygon([[2 * C, 4 * C], [2 * C, 3.1 * C], [3.1 * C, 2 * C], [4 * C, 2 * C], [4 * C, 4 * C]])),
        decorate(p) {
            moss(p, 0.5);
            puddle(p, 3.4 * C, 3.3 * C, 7, 5);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), floorSpot(3 * C, 115, 34, 30)],
    },
    {
        // The bend's outer wall curves round, as under a vault.
        id: 'passage-es-vault', exits: ['e', 's'], tags: ['passage'],
        floor: union(rect(4 * C, 2 * C, B, 4 * C), rect(2 * C, 4 * C, 4 * C, B), intersect(circle(4 * C, 4 * C, 2 * C), rect(2 * C, 2 * C, 4 * C, 4 * C))),
        decorate(p) {
            const wall = 4 * C - (2 * C + WALL / 2) * Math.SQRT1_2;
            sconce(p, wall, wall);
            moss(p, 0.3);
            grime(p, 0.5);
        },
        spots: [floorSpot(115, 3 * C, 34, 34), floorSpot(3 * C, 115, 34, 34)],
    },
    {
        id: 'passage-es-damp', exits: ['e', 's'], tags: ['passage', 'damp'], floor: corridor('e', 's'),
        decorate(p) {
            moss(p, 0.8);
            puddle(p, 3.1 * C, 3 * C, 9, 7);
            grate(p, 3 * C, 4.6 * C, 7);
        },
        spots: [cornerSpot('nw', 2 * C, 2 * C, 18), wallSpot('n', 2 * C, 75, 135), wallSpot('w', 2 * C, 75, 135)],
    },

    // ------------------------------------------------------------ junctions
    {
        id: 'passage-esw', exits: ['e', 's', 'w'], tags: ['passage'], floor: corridor('e', 's', 'w'),
        decorate(p) {
            grime(p, 0.6);
        },
        spots: [
            floorSpot(3 * C, 75, 36, 30),
            wallSpot('n', 2 * C, 5, 135),
            wallSpot('s', 4 * C, 5, 41),
            wallSpot('s', 4 * C, 99, 135),
        ],
    },
    {
        id: 'passage-esw-statue', exits: ['e', 's', 'w'], tags: ['passage'],
        floor: union(corridor('e', 's', 'w'), rect(2.25 * C, 1.05 * C, 3.75 * C, 2.1 * C)),
        decorate(p) {
            statue(p, 3 * C, 1.55 * C, 0.95 * C);
            candle(p, 2.45 * C, 2.35 * C);
            candle(p, 3.55 * C, 2.35 * C);
        },
        spots: [
            floorSpot(25, 3 * C, 30, 34),
            floorSpot(115, 3 * C, 30, 34),
            wallSpot('s', 4 * C, 5, 41),
            wallSpot('s', 4 * C, 99, 135),
        ],
    },
    {
        // The junction opens into a landing, with a bench between two columns.
        id: 'passage-esw-landing', exits: ['e', 's', 'w'], tags: ['passage'],
        floor: union(corridor('e', 's', 'w'), rect(1.3 * C, 1.15 * C, 4.7 * C, 4 * C)),
        decorate(p) {
            pillar(p, 1.75 * C, 1.65 * C, 0.3 * C);
            pillar(p, 4.25 * C, 1.65 * C, 0.3 * C);
            bench(p, 2.4 * C, 1.25 * C, 3.6 * C, 1.6 * C);
            candle(p, 2.2 * C, 1.45 * C, 18);
            candle(p, 3.8 * C, 1.45 * C, 18);
            grime(p, 0.6);
        },
        spots: [floorSpot(3 * C, 2.6 * C, 30, 20), wallSpot('s', 4 * C, 5, 41), wallSpot('s', 4 * C, 99, 135)],
    },
    {
        id: 'passage-nes', exits: ['n', 'e', 's'], tags: ['passage'], floor: corridor('n', 'e', 's'),
        decorate(p) {
            moss(p, 0.25);
        },
        spots: [
            floorSpot(115, 3 * C, 30, 34),
            wallSpot('w', 2 * C, 5, 135),
            wallSpot('e', 4 * C, 5, 41),
            wallSpot('e', 4 * C, 99, 135),
        ],
    },
    {
        id: 'passage-nes-damp', exits: ['n', 'e', 's'], tags: ['passage', 'damp'], floor: corridor('n', 'e', 's'),
        decorate(p) {
            moss(p, 0.75);
            puddle(p, 3 * C, 3.2 * C, 11, 8);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), wallSpot('w', 2 * C, 5, 135)],
    },
    {
        // A little shrine set into the west wall.
        id: 'passage-nes-shrine', exits: ['n', 'e', 's'], tags: ['passage', 'ritual'],
        floor: union(corridor('n', 'e', 's'), rect(1.1 * C, 2.25 * C, 2.1 * C, 3.75 * C)),
        decorate(p) {
            altar(p, 1.2 * C, 2.45 * C, 1.75 * C, 3.55 * C);
            candle(p, 2.15 * C, 2.35 * C, 14);
            candle(p, 2.15 * C, 3.65 * C, 14);
            grime(p, 0.5);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), wallSpot('e', 4 * C, 5, 41), wallSpot('e', 4 * C, 99, 135)],
    },
    {
        id: 'crossroad', exits: ['n', 'e', 's', 'w'], tags: ['crossroad'], floor: corridor('n', 'e', 's', 'w'),
        decorate(p) {
            grate(p, 3 * C, 3 * C, 9);
            grime(p, 0.6);
        },
        spots: [
            floorSpot(3 * C, 22, 34, 30, { chance: 0.25 }),
            floorSpot(118, 3 * C, 30, 34, { chance: 0.25 }),
            floorSpot(3 * C, 118, 34, 30, { chance: 0.25 }),
            floorSpot(22, 3 * C, 30, 34, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-rotunda', exits: ['n', 'e', 's', 'w'], tags: ['crossroad'],
        floor: union(circle(3 * C, 3 * C, 2.5 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            pillar(p, 3 * C, 3 * C, 0.55 * C);
            for (const [x, y] of [[1.4, 1.4], [4.6, 1.4], [1.4, 4.6], [4.6, 4.6]]) candle(p, x * C, y * C, 20);
        },
        spots: [
            floorSpot(3 * C, 26, 34, 26, { chance: 0.25 }),
            floorSpot(114, 3 * C, 26, 34, { chance: 0.25 }),
            floorSpot(3 * C, 114, 34, 26, { chance: 0.25 }),
            floorSpot(26, 3 * C, 26, 34, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-well', exits: ['n', 'e', 's', 'w'], tags: ['crossroad', 'water'],
        floor: union(rect(1.2 * C, 1.2 * C, 4.8 * C, 4.8 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            moss(p, 0.5);
            well(p, 3 * C, 3 * C, 0.7 * C);
        },
        spots: ['nw', 'ne', 'sw', 'se'].map((corner) =>
            cornerSpot(corner, corner.includes('e') ? 4.8 * C : 1.2 * C, corner.includes('s') ? 4.8 * C : 1.2 * C, 18, { canBlock: true })),
    },
    {
        id: 'crossroad-collapsed', exits: ['n', 'e', 's', 'w'], weight: 0.3, tags: ['crossroad', 'deadend', 'ruin'],
        floor: corridor('n', 'e', 's', 'w'),
        decorate(p) {
            rubble(p, 1.1 * C, 3 * C, 1.05 * C, 18);
            grime(p, 1);
        },
        spots: [floorSpot(118, 3 * C, 30, 34), floorSpot(3 * C, 118, 34, 30)],
    },
    {
        id: 'crossroad-fountain', exits: ['n', 'e', 's', 'w'], tags: ['crossroad', 'water'],
        floor: union(rect(1.1 * C, 1.1 * C, 4.9 * C, 4.9 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            moss(p, 0.4);
            fountain(p, 3 * C, 3 * C, 0.85 * C);
        },
        spots: ['nw', 'ne', 'sw', 'se'].map((corner) =>
            cornerSpot(corner, corner.includes('e') ? 4.9 * C : 1.1 * C, corner.includes('s') ? 4.9 * C : 1.1 * C, 18, { canBlock: true })),
    },

    // ------------------------------------------------------------ rooms off a corridor
    {
        id: 'chamber-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'empty'], floor: chamber(['s']),
        decorate(p) {
            grime(p, 0.6);
        },
        spots: chamberSpots('s'),
    },
    {
        id: 'chamber-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'empty'], floor: chamber(['e']),
        decorate(p) {
            moss(p, 0.3);
        },
        spots: chamberSpots('e'),
    },
    {
        id: 'kitchen-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'kitchen'], floor: chamber(['s'], 0.8),
        decorate(p) {
            hearth(p, 3 * C, 0.8 * C, 2.3 * C, 0.9 * C);
            cauldron(p, 3 * C, 1.3 * C, 0.38 * C);
            table(p, 1.15 * C, 2.3 * C, 1.85 * C, 4.6 * C);
            for (const y of [2.7, 3.3, 3.9]) plate(p, 1.5 * C, y * C);
            barrel(p, 4.65 * C, 2.5 * C, 0.33 * C);
            barrel(p, 4.65 * C, 3.25 * C, 0.33 * C);
            sack(p, 4.55 * C, 4.3 * C, 0.4 * C, 0.4);
            grime(p, 0.8);
        },
        spots: [floorSpot(3 * C, 3.3 * C, 30, 26)],
    },
    {
        id: 'library-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'library'], floor: chamber(['e'], 0.8),
        decorate(p) {
            bookshelf(p, 1.0 * C, 0.8 * C, 5.0 * C, 1.3 * C);
            bookshelf(p, 1.0 * C, 4.7 * C, 5.0 * C, 5.2 * C);
            bookshelf(p, 0.8 * C, 1.4 * C, 1.3 * C, 4.6 * C);
            rug(p, 2.0 * C, 2.1 * C, 4.0 * C, 3.9 * C, P.crimson, P.gold);
            table(p, 2.5 * C, 2.6 * C, 3.5 * C, 3.4 * C);
            candle(p, 2.8 * C, 2.85 * C, 24);
            p.cv.paint(rect(3.0 * C, 2.8 * C, 3.35 * C, 3.2 * C), P.parchment);
        },
        spots: [floorSpot(4.45 * C, 1.85 * C, 20, 18), floorSpot(4.45 * C, 4.15 * C, 20, 18)],
    },
    {
        id: 'library-burnt-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'library', 'ruin'], floor: chamber(['s'], 0.8),
        decorate(p) {
            scorch(p, p.floor, 1);
            bookshelf(p, 1.0 * C, 0.8 * C, 5.0 * C, 1.3 * C, { burnt: true });
            bookshelf(p, 0.8 * C, 1.4 * C, 1.3 * C, 4.6 * C, { burnt: true });
            bookshelf(p, 4.7 * C, 1.4 * C, 5.2 * C, 3.2 * C, { burnt: true });
            rubble(p, 4.2 * C, 4.1 * C, 0.65 * C, 14);
            feathers(p, rect(1.5 * C, 1.6 * C, 4.5 * C, 4.6 * C), 10);
        },
        spots: [floorSpot(2.8 * C, 2.8 * C, 30, 26)],
    },
    {
        id: 'tower-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'stairs', 'tower'],
        floor: union(circle(3 * C, 2.85 * C, 2.3 * C), arm.s),
        decorate(p) {
            spiralStair(p, 3 * C, 2.45 * C, 1.0 * C);
            feathers(p, circle(3 * C, 2.85 * C, 2.2 * C), 40);
            moss(p, 0.3);
        },
        spots: [floorSpot(3 * C, 122, 34, 22, { chance: 0.3 })],
    },
    {
        id: 'chapel-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'ritual'], floor: chamber(['e'], 0.8),
        decorate(p) {
            rug(p, 1.6 * C, 2.5 * C, 5.2 * C, 3.5 * C, P.crimson, P.gold);
            altar(p, 1.0 * C, 2.1 * C, 1.65 * C, 3.9 * C);
            for (const x of [2.95, 3.95]) {
                bench(p, x * C, 1.05 * C, (x + 0.4) * C, 2.2 * C);
                bench(p, x * C, 3.8 * C, (x + 0.4) * C, 4.95 * C);
            }
            for (const [x, y] of [[1.2, 1.2], [1.2, 4.8], [4.8, 1.2], [4.8, 4.8]]) candle(p, x * C, y * C, 18);
        },
        spots: [floorSpot(4.55 * C, 3 * C, 18, 18)],
    },
    {
        id: 'cistern-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'water'], floor: chamber(['s'], 0.8),
        decorate(p) {
            moss(p, 0.8);
            p.cv.paint(rect(1.45 * C, 1.25 * C, 4.55 * C, 3.75 * C), (x, y) => {
                const edge = Math.min(x - 1.45 * C, 4.55 * C - x, y - 1.25 * C, 3.75 * C - y);
                return edge < 0.8 ? shade(P.stone, 0.4) : shade(P.stone, 0.8);
            });
            water(p, rect(1.65 * C, 1.45 * C, 4.35 * C, 3.55 * C));
            p.block(rect(1.45 * C, 1.25 * C, 4.55 * C, 3.75 * C));
            puddle(p, 3.6 * C, 4.4 * C, 7, 4);
        },
        spots: [
            cornerSpot('sw', 0.8 * C, 5.2 * C, 18, { canBlock: true }),
            cornerSpot('se', 5.2 * C, 5.2 * C, 18, { canBlock: true }),
            floorSpot(1.6 * C, 4.3 * C, 22, 18),
        ],
    },
    {
        id: 'bedchamber-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e'], 0.8),
        decorate(p) {
            rug(p, 1.5 * C, 1.6 * C, 4.6 * C, 4.4 * C, P.hallBorder, P.crimsonLight);
            bed(p, 1.0 * C, 2.2 * C, 2.9 * C, 3.8 * C);
            chest(p, 3.1 * C, 2.55 * C, 3.55 * C, 3.45 * C);
            candle(p, 1.25 * C, 1.4 * C, 22);
            candle(p, 1.25 * C, 4.6 * C, 22);
        },
        spots: [
            cornerSpot('ne', 5.2 * C, 0.8 * C, 18, { canBlock: true }),
            cornerSpot('se', 5.2 * C, 5.2 * C, 18, { canBlock: true }),
            wallSpot('n', 0.8 * C, 2.2 * C, 4.6 * C),
        ],
    },
    {
        id: 'attic-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'carvings'], floor: chamber(['s'], 0.8),
        decorate(p) {
            grime(p, 1);
            carvingStand(p, 1.1 * C, 1.05 * C, 4.9 * C, 1.6 * C, 7, 1);
            carvingStand(p, 1.1 * C, 2.4 * C, 2.2 * C, 3.6 * C, 2, 2);
            carvingStand(p, 3.8 * C, 2.4 * C, 4.9 * C, 3.6 * C, 2, 2);
            dustSheet(p, 1.6 * C, 4.5 * C, 9, 6, 0.3);
            dustSheet(p, 4.4 * C, 4.5 * C, 8, 6, -0.4);
            cobweb(p, 0.8 * C, 0.8 * C, 1, 1, 12);
            cobweb(p, 5.2 * C, 0.8 * C, -1, 1, 10);
        },
        spots: [floorSpot(3 * C, 2.9 * C, 26, 22)],
    },
    {
        id: 'storeroom-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e'], 0.8),
        decorate(p) {
            grime(p, 0.8);
            for (const [x, y] of [[1.25, 1.25], [1.95, 1.25], [1.25, 1.95], [1.25, 4.1], [1.95, 4.75]]) barrel(p, x * C, y * C, 0.32 * C);
            sack(p, 2.8 * C, 1.3 * C, 0.42 * C, 0.2);
            sack(p, 3.6 * C, 1.35 * C, 0.38 * C, -0.5);
            chest(p, 2.6 * C, 4.3 * C, 3.6 * C, 4.95 * C);
            sack(p, 1.35 * C, 3.1 * C, 0.38 * C, 1.3);
        },
        spots: [floorSpot(3.5 * C, 2.5 * C, 24, 22, { canBlock: true }), cornerSpot('se', 5.2 * C, 5.2 * C, 18, { canBlock: true })],
    },
    {
        id: 'collapsed-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'ruin'], floor: chamber(['s']),
        decorate(p) {
            grime(p, 1);
            rubble(p, 2.3 * C, 1.9 * C, 1.1 * C, 22);
            rubble(p, 4.1 * C, 2.2 * C, 0.8 * C, 14);
            rubble(p, 1.6 * C, 4.1 * C, 0.4 * C, 6, false);
        },
        spots: [floorSpot(4.2 * C, 4.3 * C, 22, 18), cornerSpot('se', 5 * C, 5 * C, 18)],
    },
    {
        // Sourdust's study: the ledgers of the ritual, a desk and a single candle.
        id: 'study-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'library', 'ritual'], floor: chamber(['e'], 0.8),
        decorate(p) {
            grime(p, 0.6);
            bookshelf(p, 1.0 * C, 0.8 * C, 4.4 * C, 1.3 * C);
            cabinet(p, 0.8 * C, 1.6 * C, 1.3 * C, 3.4 * C);
            rug(p, 1.6 * C, 2.2 * C, 3.9 * C, 4.3 * C, P.hallBorder, P.gold);
            table(p, 1.8 * C, 2.6 * C, 3.3 * C, 3.4 * C);
            parchment(p, 2.0 * C, 2.72 * C, 2.45 * C, 3.25 * C);
            parchment(p, 2.55 * C, 2.78 * C, 2.95 * C, 3.2 * C);
            inkwell(p, 3.1 * C, 2.85 * C);
            candle(p, 1.95 * C, 3.25 * C, 24);
            chair(p, 2.55 * C, 3.8 * C, 'n');
            bookPile(p, 1.3 * C, 4.6 * C);
            bookPile(p, 4.3 * C, 4.75 * C);
            cobweb(p, 5.2 * C, 0.8 * C, -1, 1, 9);
        },
        spots: [cornerSpot('se', 5.2 * C, 5.2 * C, 16, { canBlock: true }), floorSpot(4.45 * C, 1.9 * C, 18, 16)],
    },
    {
        // The Countess's birds, their perches, their cages and their mess.
        id: 'aviary-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'birds'], floor: chamber(['s'], 0.8),
        decorate(p) {
            const { cv, rng } = p;
            grime(p, 0.4);
            for (let k = 0; k < 70; k++) {
                cv.paint(circle(1.1 * C + rng.next() * 3.8 * C, 1.1 * C + rng.next() * 3.8 * C, 0.45), P.gold, 0.7);
            }
            feathers(p, rect(1.1 * C, 1.1 * C, 4.9 * C, 4.9 * C), 30);
            perch(p, 1.25 * C, 1.45 * C, 4.75 * C);
            const colours = [P.white, P.crimsonLight, mix(P.gold, P.flame, 0.5), P.waterLight, P.mossLight, P.white];
            colours.forEach((colour, k) => bird(p, (1.6 + k * 0.6) * C, 1.45 * C - 1.5, colour, Math.PI / 2 + (k % 2 ? 0.3 : -0.3)));
            perch(p, 1.25 * C, 2.55 * C, 2.6 * C);
            bird(p, 1.7 * C, 2.55 * C - 1.5, P.white, Math.PI / 2);
            bird(p, 2.2 * C, 2.55 * C - 1.5, P.crimsonLight, 1.2);
            birdcage(p, 4.2 * C, 3.3 * C, 0.4 * C);
            birdcage(p, 1.7 * C, 4.1 * C, 0.36 * C);
        },
        spots: [floorSpot(3.2 * C, 3.1 * C, 22, 18), cornerSpot('se', 5.2 * C, 5.2 * C, 16, { canBlock: true })],
    },
    {
        // Doctor Prunesquallor's dispensary.
        id: 'dispensary-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e'], 0.8),
        decorate(p) {
            grime(p, 0.4);
            bottles(p, 1.0 * C, 0.8 * C, 4.6 * C, 1.2 * C);
            bottles(p, 0.8 * C, 1.5 * C, 1.2 * C, 4.5 * C);
            cabinet(p, 1.6 * C, 4.8 * C, 4.2 * C, 5.2 * C);
            table(p, 2.0 * C, 2.6 * C, 3.4 * C, 3.45 * C);
            mortar(p, 2.4 * C, 3.05 * C);
            parchment(p, 2.75 * C, 2.75 * C, 3.2 * C, 3.25 * C);
            candle(p, 3.25 * C, 2.8 * C, 22);
            chair(p, 2.7 * C, 3.95 * C, 'n');
        },
        spots: [floorSpot(4.4 * C, 1.9 * C, 18, 16), cornerSpot('ne', 5.2 * C, 0.8 * C, 16, { canBlock: true })],
    },
    {
        id: 'refectory-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'kitchen'], floor: chamber(['s'], 0.8),
        decorate(p) {
            grime(p, 0.7);
            table(p, 2.35 * C, 1.1 * C, 3.65 * C, 3.9 * C);
            bench(p, 1.85 * C, 1.2 * C, 2.2 * C, 3.8 * C);
            bench(p, 3.8 * C, 1.2 * C, 4.15 * C, 3.8 * C);
            for (let y = 1.5; y < 3.7; y += 0.65) {
                plate(p, 2.7 * C, y * C);
                plate(p, 3.3 * C, y * C);
            }
            candle(p, 3 * C, 1.6 * C, 22);
            candle(p, 3 * C, 3.4 * C, 22);
        },
        spots: [floorSpot(1.4 * C, 4.4 * C, 18, 16), floorSpot(4.6 * C, 4.4 * C, 18, 16), cornerSpot('nw', 0.8 * C, 0.8 * C, 16)],
    },

    // ------------------------------------------------------------ solid castle
    {
        id: 'masonry', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        spots: [rockSpot(35, 35, 50, 46), rockSpot(105, 100, 50, 46)],
    },
    {
        id: 'masonry-ivy', role: 'filler', exits: [], tags: ['ivy'], floor: rect(0, 0, 0, 0),
        decorate(p) {
            ivy(p, circle(1.6 * C, 1.8 * C, 1.5 * C), 2.2);
            ivy(p, circle(4.4 * C, 4.2 * C, 1.2 * C), 1.8);
        },
        spots: [rockSpot(105, 35, 50, 46)],
    },

    // ------------------------------------------------------------ the great hall
    ...greatHall(),
];

/**
 * Pieces of the great hall. Rooms of any size are assembled from these by the generator: corners, edges (with or
 * without a door) and centres.
 */
function greatHall() {
    const piece = (slot, options = {}) => roomPiece('hall', slot, {
        ...options,
        decorate(p) {
            columns(p, slot);
            options.decorate?.(p);
        },
    });

    return [
        piece('nw', { tags: ['corner'] }),
        piece('ne', { tags: ['corner'] }),
        piece('sw', { tags: ['corner'] }),
        piece('se', { tags: ['corner'], decorate: (p) => cobweb(p, 5 * C, 5 * C, -1, -1, 10) }),
        // Doors are weighted up so that a hall rarely ends up sealed.
        ...['n', 'e', 's', 'w'].flatMap((slot) => [
            piece(slot, { door: true, weight: 2, tags: ['entrance'] }),
            piece(slot, { tags: ['wall'] }),
        ]),
        piece('n', {
            suffix: '-carvings', tags: ['wall', 'carvings'], wallSpots: false,
            decorate: (p) => carvingStand(p, 2.1 * C, 1.15 * C, 3.9 * C, 1.75 * C, 4, 1),
        }),
        piece('s', { suffix: '-banners', tags: ['wall'], wallSpots: false, decorate: (p) => banner(p, 2.2 * C, 4.75 * C, 3.8 * C, 5.25 * C) }),
        piece('n', {
            suffix: '-hearth', tags: ['wall', 'kitchen'], weight: 0.7, wallSpots: false,
            decorate: (p) => hearth(p, 3 * C, C, 2.1 * C, 0.8 * C),
        }),
        piece('c', { tags: ['center', 'empty'], decorate: (p) => mosaic(p, 3 * C, 3 * C, 1.5 * C) }),
        piece('c', { suffix: '-brazier', tags: ['center'], openCentre: false, decorate: (p) => brazier(p, 3 * C, 3 * C, 8) }),
        piece('c', {
            suffix: '-pool', tags: ['center', 'water'], weight: 0.6, openCentre: false,
            decorate: (p) => {
                p.cv.paint(rect(1.6 * C, 1.9 * C, 4.4 * C, 4.1 * C), (x, y) => {
                    const edge = Math.min(x - 1.6 * C, 4.4 * C - x, y - 1.9 * C, 4.1 * C - y);
                    return shade(P.marble, edge < 0.9 ? 0.45 : 0.72);
                });
                water(p, rect(1.75 * C, 2.05 * C, 4.25 * C, 3.95 * C));
                p.block(rect(1.6 * C, 1.9 * C, 4.4 * C, 4.1 * C));
            },
        }),
        piece('c', {
            suffix: '-table', tags: ['center'], openCentre: false,
            decorate: (p) => {
                table(p, 1.9 * C, 2.35 * C, 4.1 * C, 3.65 * C);
                for (const x of [2.3, 2.9, 3.5]) {
                    plate(p, (x + 0.15) * C, 2.65 * C);
                    plate(p, (x + 0.15) * C, 3.35 * C);
                }
                candle(p, 3 * C, 3 * C, 26);
            },
        }),
        piece('c', { suffix: '-dais', tags: ['center'], weight: 0.4, openCentre: false, decorate: (p) => dais(p, 2 * C, 2 * C, 4 * C, 3.6 * C) }),
    ];
}

/** Columns along a hall's outer walls, flanking where a door could be. */
function columns(p, slot) {
    const y = { n: 1.65 * C, s: 4.35 * C };
    const x = { w: 1.65 * C, e: 4.35 * C };
    const near = 1.3 * C;
    const far = 4.7 * C;
    for (const side of slot === 'c' ? [] : slot.split('')) {
        // Corner pieces only get the column away from the corner.
        const positions = slot.length === 2 ? [slot.includes(side === 'n' || side === 's' ? 'w' : 'n') ? far : near] : [near, far];
        for (const at of positions) {
            if (side === 'n' || side === 's') pillar(p, at, y[side], 0.3 * C);
            else pillar(p, x[side], at, 0.3 * C);
        }
    }
}

function shade(colour, factor) {
    return colour.map((c) => c * factor);
}
