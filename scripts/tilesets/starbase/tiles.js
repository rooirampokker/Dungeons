import {
    CELL as C, TILE, WALL, arm, chamber, chamberSpots, cornerSpot, corridor, corridorWall, floorSpot,
    rockSpot, roomPiece, wallSpot,
} from '../lib/layout.js';
import { circle, mix, polygon, rect, ring, shade, union } from '../lib/raster.js';
import {
    barCounter, blastDoor, boxDroid, bunk, cable, canister, cantinaTable, controlConsole, crate, domeDroid, forceField,
    grating, healingTank, holoTable, lamp, lightPanel, meditationMat, pipes, rack, reactor, scrap, shuttle, strut,
    vent, viewport,
} from './decor.js';
import { P, grime, scorch } from './style.js';

/**
 * Every tile in the Starbase set: the floor outline, the furnishings, and the spots where the generator may add
 * overlays. Exits, walk maps and images are all derived from these, so the art and the movement data can't disagree.
 */

/** Dead-end rooms are weighted down, or the map would break into small pockets. */
const ROOM_WEIGHT = 0.15;

/** The far edge of the wall beside a corridor running north-south (west side) or east-west (north side). */
const wallTop = 2 * C - WALL;

/** A shaft dropping away beyond a catwalk's railings: dark, with girders and something glowing far below. */
function shaft(p, area) {
    const [x0, y0, x1, y1] = area.box;
    p.cv.paint(area, (x, y) => {
        const depth = Math.min(y - y0, y1 - y) / ((y1 - y0) / 2);
        if (((x % 35) + 35) % 35 < 2.5) return shade(P.gunmetal, 0.9 - depth * 0.4);
        return mix(P.space, P.amber, 0.04 + 0.1 * depth);
    });
    p.cv.glow((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, P.amber, 0.05);
}

/** @type {object[]} */
export const TILES = [
    // ------------------------------------------------------------ start
    {
        id: 'docking-bay', role: 'start', exits: ['s'], tags: ['hangar'], spawn: '4,3',
        style: 'hall', hallRect: [0.6 * C, 0.6 * C, 5.4 * C, 5 * C], perimeter: ['n', 'e', 'w'],
        floor: union(rect(0.6 * C, 0.6 * C, 5.4 * C, 5 * C), arm.s),
        decorate(p) {
            shuttle(p, 3 * C, 2.15 * C, 2.9 * C, -Math.PI / 2);
            for (const [x, y] of [[1.2, 1.2], [4.8, 1.2], [1.2, 4.4], [4.8, 4.4]]) lamp(p, x * C, y * C, P.amber, 16, 0.3);
        },
        spots: [cornerSpot('sw', 0.6 * C, 5 * C, 16)],
    },
    {
        id: 'lift-arrival', role: 'start', exits: ['s'], tags: ['lift'], spawn: '2,3',
        floor: chamber(['s'], 0.8),
        decorate(p) {
            // Turbolift doors set into the north wall.
            p.cv.paint(rect(2.1 * C, 0.8 * C - WALL, 3.9 * C, 0.8 * C + 1.5), P.gunmetal);
            p.cv.paint(rect(2.25 * C, 0.8 * C - WALL + 1, 2.98 * C, 0.8 * C + 1), P.metal);
            p.cv.paint(rect(3.02 * C, 0.8 * C - WALL + 1, 3.75 * C, 0.8 * C + 1), P.metal);
            lamp(p, 1.9 * C, 0.8 * C - WALL / 2, P.green, 12, 0.25);
            lamp(p, 4.1 * C, 0.8 * C - WALL / 2, P.green, 12, 0.25);
            controlConsole(p, 0.9 * C, 2.2 * C, 1.4 * C, 3.8 * C);
            grime(p, 0.4);
        },
        spots: [cornerSpot('sw', 0.8 * C, 5.2 * C, 16), cornerSpot('se', 5.2 * C, 5.2 * C, 16, { canBlock: true }), wallSpot('e', 5.2 * C, 2.2 * C, 3.8 * C)],
    },

    // ------------------------------------------------------------ north-south corridors
    {
        id: 'passage-ns', exits: ['n', 's'], tags: ['passage'], floor: corridor('n', 's'),
        decorate(p) {
            lightPanel(p, wallTop + 1, 2.4 * C, 2 * C - 1, 3.6 * C);
            grime(p, 0.4);
        },
        spots: [floorSpot(3 * C, 30, 34, 36), floorSpot(3 * C, 110, 34, 36), wallSpot('e', 4 * C, 20, 120)],
    },
    {
        id: 'passage-ns-grating', exits: ['n', 's'], tags: ['passage'], floor: corridor('n', 's'),
        decorate(p) {
            grating(p, 2.2 * C, 1.8 * C, 3.8 * C, 4.2 * C);
        },
        spots: [wallSpot('w', 2 * C, 15, 125), wallSpot('e', 4 * C, 15, 125)],
    },
    {
        id: 'passage-ns-blastdoor', exits: ['n', 's'], tags: ['passage', 'door'], floor: corridor('n', 's'),
        decorate(p) {
            blastDoor(p, 2 * C, 2.65 * C, 4 * C, 3.35 * C, true);
            lamp(p, corridorWall, 2.4 * C, P.red, 12, 0.3);
            lamp(p, 4 * C + WALL / 2, 3.6 * C, P.red, 12, 0.3);
        },
        spots: [floorSpot(3 * C, 22, 34, 30), floorSpot(3 * C, 118, 34, 30)],
    },
    {
        id: 'passage-ns-pipes', exits: ['n', 's'], tags: ['passage'], floor: corridor('n', 's'),
        decorate(p) {
            pipes(p, 3.62 * C, -1, 3.97 * C, TILE + 1, 2);
            vent(p, 2.6 * C, 3.6 * C, 9);
            grime(p, 0.6);
        },
        spots: [floorSpot(2.7 * C, 30, 24, 30), wallSpot('w', 2 * C, 15, 70)],
    },
    {
        id: 'passage-ns-viewport', exits: ['n', 's'], tags: ['passage', 'viewport'], floor: corridor('n', 's'),
        decorate(p) {
            viewport(p, wallTop, 0.7 * C, 2 * C, 5.3 * C);
        },
        spots: [floorSpot(3 * C, 3 * C, 30, 40), wallSpot('e', 4 * C, 20, 120)],
    },
    {
        id: 'passage-ns-wreck', exits: ['n', 's'], weight: 0.3, tags: ['passage', 'deadend', 'ruin'], floor: corridor('n', 's'),
        decorate(p) {
            scorch(p, 0.9);
            scrap(p, 3 * C, 3 * C, 1.5 * C, 30);
            cable(p, 2.2 * C, 0.5 * C, 3.6 * C, 2 * C, P.red);
        },
        spots: [floorSpot(3 * C, 16, 34, 22), floorSpot(3 * C, TILE - 16, 34, 22)],
    },

    // ------------------------------------------------------------ east-west corridors
    {
        id: 'passage-ew', exits: ['e', 'w'], tags: ['passage'], floor: corridor('e', 'w'),
        decorate(p) {
            lightPanel(p, 2.4 * C, wallTop + 1, 3.6 * C, 2 * C - 1);
            grime(p, 0.4);
        },
        spots: [floorSpot(30, 3 * C, 36, 34), floorSpot(110, 3 * C, 36, 34), wallSpot('s', 4 * C, 20, 120)],
    },
    {
        id: 'passage-ew-grating', exits: ['e', 'w'], tags: ['passage'], floor: corridor('e', 'w'),
        decorate(p) {
            grating(p, 1.8 * C, 2.2 * C, 4.2 * C, 3.8 * C);
        },
        spots: [wallSpot('n', 2 * C, 15, 125), wallSpot('s', 4 * C, 15, 125)],
    },
    {
        id: 'passage-ew-blastdoor', exits: ['e', 'w'], tags: ['passage', 'door'], floor: corridor('e', 'w'),
        decorate(p) {
            blastDoor(p, 2.65 * C, 2 * C, 3.35 * C, 4 * C, false);
            lamp(p, 2.4 * C, corridorWall, P.red, 12, 0.3);
            lamp(p, 3.6 * C, 4 * C + WALL / 2, P.red, 12, 0.3);
        },
        spots: [floorSpot(22, 3 * C, 30, 34), floorSpot(118, 3 * C, 30, 34)],
    },
    {
        id: 'passage-ew-viewport', exits: ['e', 'w'], tags: ['passage', 'viewport'], floor: corridor('e', 'w'),
        decorate(p) {
            viewport(p, 0.7 * C, wallTop, 5.3 * C, 2 * C);
        },
        spots: [floorSpot(3 * C, 3 * C, 40, 30), wallSpot('s', 4 * C, 20, 120)],
    },
    {
        // A catwalk across a shaft, with railings instead of walls.
        id: 'passage-ew-catwalk', exits: ['e', 'w'], tags: ['passage', 'catwalk'], floor: corridor('e', 'w'),
        decorate(p) {
            shaft(p, rect(0, 0, TILE, wallTop));
            shaft(p, rect(0, 4 * C + WALL, TILE, TILE));
            for (const y of [wallTop, 4 * C + WALL]) {
                p.cv.paint(rect(0, y - 1, TILE, y + 1), P.metal);
            }
            for (let x = 5; x < TILE; x += 10) {
                p.cv.paint(rect(x - 1, wallTop - 1, x + 1, 2 * C), P.metalDark);
                p.cv.paint(rect(x - 1, 4 * C, x + 1, 4 * C + WALL + 1), P.metalDark);
            }
        },
        spots: [floorSpot(3 * C, 3 * C, 34, 30)],
    },

    // ------------------------------------------------------------ corners
    {
        id: 'passage-es', exits: ['e', 's'], tags: ['passage'], floor: corridor('e', 's'),
        decorate(p) {
            grime(p, 0.4);
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
        id: 'passage-es-chamfer', exits: ['e', 's'], tags: ['passage'],
        floor: union(arm.e, arm.s, polygon([[2 * C, 4 * C], [2 * C, 3.1 * C], [3.1 * C, 2 * C], [4 * C, 2 * C], [4 * C, 4 * C]])),
        decorate(p) {
            lamp(p, 2.55 * C - 3, 2.55 * C - 3, P.glow, 16, 0.25);
            grime(p, 0.5);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), floorSpot(3 * C, 115, 34, 30)],
    },
    {
        id: 'passage-es-pipes', exits: ['e', 's'], tags: ['passage'], floor: corridor('e', 's'),
        decorate(p) {
            pipes(p, 2.6 * C, 2.03 * C, TILE + 1, 2.38 * C, 2);
            pipes(p, 2.03 * C, 2.6 * C, 2.38 * C, TILE + 1, 2);
            vent(p, 3.3 * C, 3.3 * C, 8);
        },
        spots: [floorSpot(3.4 * C, 115, 22, 30), cornerSpot('nw', 2 * C, 2 * C, 14)],
    },
    {
        id: 'passage-es-grating', exits: ['e', 's'], tags: ['passage'], floor: corridor('e', 's'),
        decorate(p) {
            grating(p, 2.2 * C, 2.2 * C, 3.8 * C, 3.8 * C);
        },
        spots: [floorSpot(115, 3 * C, 34, 34), floorSpot(3 * C, 115, 34, 34), wallSpot('n', 2 * C, 95, 135)],
    },

    // ------------------------------------------------------------ junctions
    {
        id: 'passage-esw', exits: ['e', 's', 'w'], tags: ['passage'], floor: corridor('e', 's', 'w'),
        decorate(p) {
            lightPanel(p, 2.5 * C, wallTop + 1, 3.5 * C, 2 * C - 1);
            grime(p, 0.4);
        },
        spots: [floorSpot(3 * C, 75, 36, 30), wallSpot('s', 4 * C, 5, 41), wallSpot('s', 4 * C, 99, 135)],
    },
    {
        id: 'passage-esw-console', exits: ['e', 's', 'w'], tags: ['passage'],
        floor: union(corridor('e', 's', 'w'), rect(2.2 * C, 1.1 * C, 3.8 * C, 2.1 * C)),
        decorate(p) {
            controlConsole(p, 2.3 * C, 1.15 * C, 3.7 * C, 1.6 * C);
        },
        spots: [floorSpot(25, 3 * C, 30, 34), floorSpot(115, 3 * C, 30, 34), wallSpot('s', 4 * C, 5, 41), wallSpot('s', 4 * C, 99, 135)],
    },
    {
        id: 'passage-nes', exits: ['n', 'e', 's'], tags: ['passage'], floor: corridor('n', 'e', 's'),
        decorate(p) {
            lightPanel(p, wallTop + 1, 2.5 * C, 2 * C - 1, 3.5 * C);
            grime(p, 0.4);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), wallSpot('e', 4 * C, 5, 41), wallSpot('e', 4 * C, 99, 135)],
    },
    {
        id: 'passage-nes-lift', exits: ['n', 'e', 's'], tags: ['passage', 'lift'], floor: corridor('n', 'e', 's'),
        decorate(p) {
            // Turbolift doors in the west wall.
            p.cv.paint(rect(wallTop - 1.5, 2.15 * C, 2 * C + 1.5, 3.85 * C), P.gunmetal);
            p.cv.paint(rect(wallTop, 2.3 * C, 2 * C, 2.98 * C), P.metal);
            p.cv.paint(rect(wallTop, 3.02 * C, 2 * C, 3.7 * C), P.metal);
            lamp(p, corridorWall, 2 * C, P.green, 10, 0.25);
        },
        spots: [floorSpot(115, 3 * C, 30, 34), wallSpot('e', 4 * C, 5, 41), wallSpot('e', 4 * C, 99, 135)],
    },
    {
        id: 'crossroad', exits: ['n', 'e', 's', 'w'], tags: ['crossroad'], floor: corridor('n', 'e', 's', 'w'),
        decorate(p) {
            vent(p, 3 * C, 3 * C, 10);
            grime(p, 0.5);
        },
        spots: [
            floorSpot(3 * C, 22, 34, 30, { chance: 0.25 }),
            floorSpot(118, 3 * C, 30, 34, { chance: 0.25 }),
            floorSpot(3 * C, 118, 34, 30, { chance: 0.25 }),
            floorSpot(22, 3 * C, 30, 34, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-hub', exits: ['n', 'e', 's', 'w'], tags: ['crossroad'],
        floor: union(circle(3 * C, 3 * C, 2.5 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            strut(p, 3 * C, 3 * C, 1.1 * C);
            p.cv.paint(ring(3 * C, 3 * C, 1.7 * C, 1.8 * C), P.hazard, 0.7);
        },
        spots: [
            floorSpot(3 * C, 26, 34, 26, { chance: 0.25 }),
            floorSpot(114, 3 * C, 26, 34, { chance: 0.25 }),
            floorSpot(3 * C, 114, 34, 26, { chance: 0.25 }),
            floorSpot(26, 3 * C, 26, 34, { chance: 0.25 }),
        ],
    },
    {
        id: 'crossroad-holo', exits: ['n', 'e', 's', 'w'], tags: ['crossroad'],
        floor: union(rect(1.2 * C, 1.2 * C, 4.8 * C, 4.8 * C), corridor('n', 'e', 's', 'w')),
        decorate(p) {
            holoTable(p, 3 * C, 3 * C, 0.75 * C);
        },
        spots: ['nw', 'ne', 'sw', 'se'].map((corner) =>
            cornerSpot(corner, corner.includes('e') ? 4.8 * C : 1.2 * C, corner.includes('s') ? 4.8 * C : 1.2 * C, 18, { canBlock: true })),
    },
    {
        id: 'crossroad-wreck', exits: ['n', 'e', 's', 'w'], weight: 0.3, tags: ['crossroad', 'deadend', 'ruin'],
        floor: corridor('n', 'e', 's', 'w'),
        decorate(p) {
            scorch(p, 0.8);
            scrap(p, 1.1 * C, 3 * C, 1.05 * C, 18);
        },
        spots: [floorSpot(118, 3 * C, 30, 34), floorSpot(3 * C, 118, 34, 30)],
    },

    // ------------------------------------------------------------ rooms off a corridor
    {
        id: 'chamber-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['s']),
        decorate(p) {
            grime(p, 0.5);
        },
        spots: chamberSpots('s'),
    },
    {
        id: 'chamber-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e']),
        decorate(p) {
            grime(p, 0.5);
        },
        spots: chamberSpots('e'),
    },
    {
        // Two cells along the west wall, each behind a force field.
        id: 'detention-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'detention'],
        floor: union(chamber(['e'], 1.3), rect(0.5 * C, 1.3 * C, 1.5 * C, 2.7 * C), rect(0.5 * C, 3.3 * C, 1.5 * C, 4.7 * C)),
        decorate(p) {
            for (const y of [1.3, 3.3]) {
                bunk(p, 0.6 * C, (y + 0.15) * C, 1.25 * C, (y + 1.25) * C);
                forceField(p, 1.3 * C, (y + 0.05) * C, 1.55 * C, (y + 1.35) * C);
                p.block(rect(0.5 * C, y * C, 1.6 * C, (y + 1.4) * C));
            }
            controlConsole(p, 3.7 * C, 1.4 * C, 4.6 * C, 1.85 * C);
            grime(p, 0.6);
        },
        spots: [floorSpot(3 * C, 4.1 * C, 30, 20), cornerSpot('se', 4.7 * C, 4.7 * C, 16, { canBlock: true })],
    },
    {
        id: 'quarters-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e'], 0.8),
        decorate(p) {
            bunk(p, 0.9 * C, 0.9 * C, 2.6 * C, 1.6 * C);
            bunk(p, 0.9 * C, 4.4 * C, 2.6 * C, 5.1 * C);
            rack(p, 0.85 * C, 2.2 * C, 1.3 * C, 3.8 * C);
            crate(p, 3.2 * C, 0.95 * C, 4.0 * C, 1.55 * C, P.gunmetal);
            grime(p, 0.4);
        },
        spots: [floorSpot(2.6 * C, 3 * C, 34, 30), cornerSpot('se', 5.2 * C, 5.2 * C, 16, { canBlock: true })],
    },
    {
        id: 'medbay-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'medical'], floor: chamber(['s'], 0.8),
        decorate(p) {
            healingTank(p, 1.65 * C, 1.65 * C, 0.6 * C);
            bunk(p, 3.1 * C, 1.0 * C, 4.9 * C, 1.75 * C);
            bunk(p, 3.1 * C, 2.5 * C, 4.9 * C, 3.25 * C);
            controlConsole(p, 0.9 * C, 3.2 * C, 1.35 * C, 4.6 * C);
            for (const y of [1.4, 2.9]) lamp(p, 5.0 * C, y * C, P.green, 10, 0.2);
        },
        spots: [floorSpot(3 * C, 4.2 * C, 28, 20), cornerSpot('se', 5.2 * C, 5.2 * C, 16, { canBlock: true })],
    },
    {
        id: 'armory-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room'], floor: chamber(['e'], 0.8),
        decorate(p) {
            rack(p, 1.0 * C, 0.85 * C, 4.6 * C, 1.3 * C);
            rack(p, 0.85 * C, 1.5 * C, 1.3 * C, 4.5 * C);
            crate(p, 3.0 * C, 4.3 * C, 3.9 * C, 5.05 * C, P.gunmetal);
            crate(p, 4.05 * C, 4.4 * C, 4.7 * C, 5.05 * C);
            lamp(p, 3 * C, 3 * C, P.red, 26, 0.12);
        },
        spots: [floorSpot(2.7 * C, 2.6 * C, 30, 26, { canBlock: true }), cornerSpot('ne', 5.2 * C, 0.8 * C, 16)],
    },
    {
        id: 'cargo-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'cargo'], floor: chamber(['s'], 0.8),
        decorate(p) {
            crate(p, 0.9 * C, 0.9 * C, 2.1 * C, 1.9 * C);
            crate(p, 2.2 * C, 0.9 * C, 3.0 * C, 1.6 * C, P.rust);
            crate(p, 0.9 * C, 2.0 * C, 1.7 * C, 3.2 * C, P.gunmetal);
            crate(p, 3.9 * C, 0.95 * C, 5.1 * C, 2.0 * C);
            for (const [x, y] of [[4.6, 2.6], [4.6, 3.35], [3.9, 2.6]]) canister(p, x * C, y * C, 0.3 * C);
            cable(p, 1.6 * C, 4.6 * C, 3.6 * C, 3.6 * C);
            grime(p, 0.6);
        },
        spots: [floorSpot(2.8 * C, 2.9 * C, 26, 24, { canBlock: true }), cornerSpot('sw', 0.8 * C, 5.2 * C, 16, { canBlock: true })],
    },
    {
        id: 'reactor-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'reactor'],
        floor: union(circle(3 * C, 2.85 * C, 2.3 * C), arm.s),
        decorate(p) {
            p.cv.paint(ring(3 * C, 2.45 * C, 1.15 * C, 1.3 * C), P.hazard, 0.75);
            reactor(p, 3 * C, 2.45 * C, 0.95 * C);
        },
        spots: [floorSpot(3 * C, 122, 34, 22, { chance: 0.3 })],
    },
    {
        id: 'comms-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'comms'], floor: chamber(['e'], 0.8),
        decorate(p) {
            controlConsole(p, 1.0 * C, 0.85 * C, 4.6 * C, 1.35 * C);
            controlConsole(p, 0.85 * C, 1.6 * C, 1.35 * C, 4.4 * C);
            controlConsole(p, 1.0 * C, 4.65 * C, 4.6 * C, 5.15 * C);
            holoTable(p, 2.9 * C, 3 * C, 0.55 * C);
        },
        spots: [floorSpot(4.4 * C, 1.95 * C, 18, 16), floorSpot(4.4 * C, 4.05 * C, 18, 16)],
    },
    {
        id: 'cantina-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'cantina'], floor: chamber(['s'], 0.8),
        decorate(p) {
            barCounter(p, 1.1 * C, 0.9 * C, 4.9 * C, 1.45 * C);
            cantinaTable(p, 1.6 * C, 2.6 * C, 0.42 * C);
            cantinaTable(p, 4.4 * C, 2.6 * C, 0.42 * C);
            cantinaTable(p, 1.6 * C, 4.3 * C, 0.42 * C);
            grime(p, 0.7);
        },
        spots: [floorSpot(3 * C, 2.9 * C, 26, 22), floorSpot(4.4 * C, 4.3 * C, 18, 18, { canBlock: true })],
    },
    {
        id: 'compactor-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'ruin'], floor: chamber(['e'], 0.8),
        decorate(p) {
            p.cv.paint(p.floor, P.coolant, (x, y) => (Math.sin(x * 0.2) + Math.cos(y * 0.17) > 1 ? 0.55 : 0.3));
            scrap(p, 1.8 * C, 1.6 * C, 0.9 * C, 18);
            scrap(p, 1.6 * C, 4.2 * C, 0.7 * C, 12);
            scrap(p, 4.0 * C, 4.5 * C, 0.5 * C, 8, false);
            for (let y = 0.8 * C; y < 5.2 * C; y += 6) p.cv.paint(rect(0.8 * C - WALL, y, 0.8 * C, y + 3), P.hazard, 0.7);
        },
        spots: [floorSpot(3.4 * C, 2.6 * C, 26, 22)],
    },
    {
        id: 'droid-bay-s', exits: ['s'], weight: ROOM_WEIGHT, tags: ['room', 'droids'], floor: chamber(['s'], 0.8),
        decorate(p) {
            rack(p, 1.0 * C, 0.85 * C, 3.6 * C, 1.3 * C);
            domeDroid(p, 1.7 * C, 2.4 * C, 0.38 * C, P.amber);
            boxDroid(p, 4.3 * C, 2.55 * C, 0.75 * C);
            scrap(p, 4.2 * C, 4.2 * C, 0.55 * C, 10);
            cable(p, 1.7 * C, 2.9 * C, 3.2 * C, 4.6 * C, P.amber);
            grime(p, 0.6);
        },
        spots: [floorSpot(2.9 * C, 3.2 * C, 24, 22), cornerSpot('sw', 0.8 * C, 5.2 * C, 16, { canBlock: true })],
    },
    {
        id: 'meditation-e', exits: ['e'], weight: ROOM_WEIGHT, tags: ['room', 'meditation'], floor: chamber(['e'], 0.8),
        decorate(p) {
            p.cv.paint(p.floor, P.soot, 0.35);
            meditationMat(p, 2.8 * C, 3 * C, 1.25 * C);
            for (const [x, y] of [[1.2, 1.2], [1.2, 4.8], [4.8, 1.2], [4.8, 4.8]]) lamp(p, x * C, y * C, P.holo, 14, 0.2);
        },
        spots: [cornerSpot('nw', 0.8 * C, 0.8 * C, 14), cornerSpot('sw', 0.8 * C, 5.2 * C, 14)],
    },

    // ------------------------------------------------------------ hull
    {
        id: 'hull', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        spots: [rockSpot(35, 35, 50, 46), rockSpot(105, 100, 50, 46)],
    },
    {
        id: 'hull-pipes', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        decorate(p) {
            pipes(p, -1, 1.6 * C, TILE + 1, 2.4 * C, 3);
            pipes(p, 3.6 * C, -1, 4.2 * C, TILE + 1, 2);
        },
        spots: [rockSpot(32, 100, 44, 40)],
    },

    // ------------------------------------------------------------ the hangar
    ...hangar(),
];

/** Pieces of the hangar deck, from which the generator builds rooms of any size. */
function hangar() {
    const piece = (slot, options = {}) => roomPiece('hangar', slot, {
        ...options,
        decorate(p) {
            struts(p, slot);
            options.decorate?.(p);
        },
    });

    return [
        piece('nw', { tags: ['corner'] }),
        piece('ne', { tags: ['corner'] }),
        piece('sw', { tags: ['corner'] }),
        piece('se', { tags: ['corner'] }),
        // Doors are weighted up so that a hangar rarely ends up sealed.
        ...['n', 'e', 's', 'w'].flatMap((slot) => [
            piece(slot, { door: true, weight: 2, tags: ['entrance'], decorate: (p) => doorLights(p, slot) }),
            piece(slot, { tags: ['wall'] }),
        ]),
        piece('n', { suffix: '-viewport', tags: ['wall', 'viewport'], wallSpots: false, decorate: (p) => viewport(p, 1.7 * C, C - WALL, 4.3 * C, C) }),
        piece('s', {
            suffix: '-consoles', tags: ['wall'], wallSpots: false,
            decorate: (p) => controlConsole(p, 1.8 * C, 4.45 * C, 4.2 * C, 4.95 * C),
        }),
        piece('c', { tags: ['center'] }),
        piece('c', {
            suffix: '-landing', tags: ['center'],
            decorate: (p) => {
                p.cv.paint(ring(3 * C, 3 * C, 1.85 * C, 2 * C), P.hazard, 0.8);
                p.cv.paint(circle(3 * C, 3 * C, 0.12 * C), P.amber);
            },
        }),
        piece('c', { suffix: '-shuttle', tags: ['center'], weight: 0.6, openCentre: false, decorate: (p) => shuttle(p, 3 * C, 3 * C, 3.4 * C, -Math.PI / 4) }),
        piece('c', { suffix: '-holotable', tags: ['center'], openCentre: false, decorate: (p) => holoTable(p, 3 * C, 3 * C, 0.85 * C) }),
        piece('c', {
            suffix: '-cargo', tags: ['center', 'cargo'], openCentre: false,
            decorate: (p) => {
                crate(p, 2.0 * C, 2.1 * C, 3.0 * C, 3.1 * C);
                crate(p, 3.1 * C, 2.3 * C, 4.0 * C, 3.0 * C, P.rust);
                crate(p, 2.3 * C, 3.2 * C, 3.5 * C, 3.9 * C, P.gunmetal);
            },
        }),
    ];
}

/** Support struts along a hangar's outer walls, flanking where a door could be. */
function struts(p, slot) {
    const y = { n: 1.65 * C, s: 4.35 * C };
    const x = { w: 1.65 * C, e: 4.35 * C };
    const near = 1.3 * C;
    const far = 4.7 * C;
    for (const side of slot === 'c' ? [] : slot.split('')) {
        // Corner pieces only get the strut away from the corner.
        const positions = slot.length === 2 ? [slot.includes(side === 'n' || side === 's' ? 'w' : 'n') ? far : near] : [near, far];
        for (const at of positions) {
            if (side === 'n' || side === 's') strut(p, at, y[side], 0.6 * C);
            else strut(p, x[side], at, 0.6 * C);
        }
    }
}

/** Red lights either side of a hangar doorway. */
function doorLights(p, side) {
    const edge = { n: C - WALL / 2, s: 5 * C + WALL / 2, w: C - WALL / 2, e: 5 * C + WALL / 2 }[side];
    for (const at of [2 * C - 4, 4 * C + 4]) {
        const [x, y] = side === 'n' || side === 's' ? [at, edge] : [edge, at];
        lamp(p, x, y, P.red, 12, 0.3);
    }
}
