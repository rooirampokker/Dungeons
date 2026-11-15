import { BEYOND as B, CELL as C, TILE } from '../lib/layout.js';
import { circle, ellipse, mix, noise, rect, ring, segment, shade, union } from '../lib/raster.js';
import { transposed } from '../lib/transpose.js';
import {
    armchair, banister, barrel, bed, bench, bookcase, candle, chest, crate, flowerBed, pantryShelf, pottedPlant,
    roundTable, rug, sack, stairs, stairsDown, statue, tree, tub, vase, woodTop,
} from './decor.js';
import { P, THIN as T } from './style.js';

/**
 * Every tile in the Manor set: the floor outline, the furnishings, and the spots where the generator may add
 * overlays. Exits, walk maps and images are all derived from these, so the art and the movement data can't disagree.
 *
 * The set is laid out like a house plan. Walls are thin and run along the tile edges; most of the map is large rooms
 * (taproom, kitchen, bedchambers, great hall, library, ballroom), each built from its own pieces so a room is all one
 * floor and all one kind of furniture. The hallways between them are a whole tile wide, and small rooms (a guest
 * room, the privy, the pantry, the stairs) open off them.
 *
 * Every opening is the middle four walk cells of a side, whether it's a door into a room or the hallway carrying on,
 * so any two tiles join up. Short stretches of wall either side of it make door posts.
 */

const SIDES = ['n', 'e', 's', 'w'];

/** A doorway through each side, from just inside the wall to beyond the tile edge. */
const doorway = {
    n: rect(C, -B, 5 * C, T + 1),
    s: rect(C, TILE - T - 1, 5 * C, B),
    w: rect(-B, C, T + 1, 5 * C),
    e: rect(TILE - T - 1, C, B, 5 * C),
};

/** The floor of a tile walled along its edges, with doorways through `doors` and wide open towards `open`. */
function plan(doors, open = []) {
    const box = rect(
        open.includes('w') ? -B : T,
        open.includes('n') ? -B : T,
        open.includes('e') ? B : TILE - T,
        open.includes('s') ? B : TILE - T,
    );
    return union(box, ...doors.map((side) => doorway[side]));
}

// ---------------------------------------------------------------- spots

/** Against a wall, from `from` to `to` along it and `depth` into the room. */
function wallSpot(side, from, to, depth, options = {}) {
    const rects = {
        n: [from, T, to - from, depth],
        s: [from, TILE - T - depth, to - from, depth],
        w: [T, from, depth, to - from],
        e: [TILE - T - depth, from, depth, to - from],
    };
    const kind = side === 'n' || side === 's' ? 'wall-h' : 'wall-v';
    return { kind, facing: side, rect: rects[side], chance: 0.4, canBlock: true, ...options };
}

function cornerSpot(corner, size, options = {}) {
    const x = corner.includes('e') ? TILE - T - size : T;
    const y = corner.includes('s') ? TILE - T - size : T;
    return { kind: 'corner', facing: corner, rect: [x, y, size, size], chance: 0.4, canBlock: true, ...options };
}

/** Open floor of the given kind ('floor' or the smaller 'nook'), centred on (x, y). */
function floorSpot(kind, x, y, width, height, options = {}) {
    return { kind, rect: [x - width / 2, y - height / 2, width, height], chance: 0.3, canBlock: true, ...options };
}

// ---------------------------------------------------------------- doorways

/** Door posts where the wall stops either side of an opening. */
function jambs(p, side) {
    const { cv } = p;
    const deep = T + 1.6;
    const posts = {
        n: [[C - 3, 0, C, deep], [5 * C, 0, 5 * C + 3, deep]],
        s: [[C - 3, TILE - deep, C, TILE], [5 * C, TILE - deep, 5 * C + 3, TILE]],
        w: [[0, C - 3, deep, C], [0, 5 * C, deep, 5 * C + 3]],
        e: [[TILE - deep, C - 3, TILE, C], [TILE - deep, 5 * C, TILE, 5 * C + 3]],
    }[side];
    for (const [x0, y0, x1, y1] of posts) {
        cv.shadowRect(x0, y0, x1, y1, 2, 0.35);
        cv.paint(rect(x0, y0, x1, y1), P.walnut);
        cv.paint(rect(x0 + 0.6, y0 + 0.6, x1 - 0.6, y1 - 0.6), shade(P.walnut, 1.45));
    }
}

/** A pale stone sill across a doorway, in the line of the wall. */
function threshold(p, side) {
    const sill = { n: [C, 0, 5 * C, T], s: [C, TILE - T, 5 * C, TILE], w: [0, C, T, 5 * C], e: [TILE - T, C, TILE, 5 * C] }[side];
    p.cv.paint(rect(...sill), (x, y) => shade(P.stone, 0.8 + noise(p.seed + 601, x * 0.3, y * 0.3) * 0.2));
}

/**
 * A pair of doors standing open into the room through `side`, drawn as on a plan: each leaf square to the wall,
 * with the arc it swings through.
 */
function doors(p, side) {
    const { cv } = p;
    // Work along the wall (u) and into the room (v), then turn that to the side's own coordinates.
    const at = {
        n: (u, v) => [u, v],
        s: (u, v) => [u, TILE - v],
        w: (u, v) => [v, u],
        e: (u, v) => [TILE - v, u],
    }[side];
    const box = (u0, v0, u1, v1) => {
        const [x0, y0] = at(u0, v0);
        const [x1, y1] = at(u1, v1);
        return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
    };
    const length = 2 * C - 1.5;
    for (const [hinge, towards] of [[C + 1.2, 1], [5 * C - 1.2, -1]]) {
        let previous = at(hinge + towards * length, T);
        for (let k = 1; k <= 12; k++) {
            const angle = (k / 12) * (Math.PI / 2);
            const next = at(hinge + towards * length * Math.cos(angle), T + length * Math.sin(angle));
            cv.paint(segment(...previous, ...next, 0.6), P.wall, 0.35);
            previous = next;
        }
        const leaf = box(hinge - (towards > 0 ? 0 : 2.4), T, hinge + (towards > 0 ? 2.4 : 0), T + length);
        cv.shadowRect(...leaf, 2, 0.35);
        cv.paint(rect(...leaf), shade(P.oak, 0.7));
        const inner = [leaf[0] + 0.5, leaf[1] + 0.5, leaf[2] - 0.5, leaf[3] - 0.5];
        cv.paint(rect(...inner), P.oakLight);
    }
}

/** Everything that marks a doorway into a room: the sill, the posts and the open doors. */
function roomDoor(p, side) {
    threshold(p, side);
    jambs(p, side);
    doors(p, side);
}

/** The front door of the house, shut, in the middle of the north wall. */
function frontDoor(p) {
    const { cv } = p;
    cv.paint(rect(1.9 * C, 0, 4.1 * C, T + 2.5), P.walnut);
    cv.paint(rect(2 * C, 0.6, 4 * C, T + 1.8), (x, y) => shade(P.oak, 0.8 + noise(p.seed + 611, x * 0.2, y) * 0.3));
    cv.paint(rect(3 * C - 0.4, 0, 3 * C + 0.4, T + 2.5), P.walnut);
    for (const x of [3 * C - 3, 3 * C + 3]) cv.paint(circle(x, T + 0.8, 1), P.brass);
    for (const x of [1.5 * C, 4.5 * C]) {
        cv.paint(rect(x - 2.5, 0, x + 2.5, T + 3), P.iron);
        candle(p, x, T + 1, 22);
    }
}

// ---------------------------------------------------------------- big rooms

const PERIMETER = { nw: ['n', 'w'], n: ['n'], ne: ['n', 'e'], w: ['w'], c: [], e: ['e'], sw: ['s', 'w'], s: ['s'], se: ['s', 'e'] };

/**
 * The kinds of room, each with its own floor. Tags let overlays furnish them: `hearth` rooms can have a fireplace,
 * `stores` rooms barrels and sacks, `grand` rooms armour and statues, and `dusty` ones cobwebs.
 */
const THEMES = {
    taproom: { floorStyle: 'oak', tags: ['taproom', 'hearth', 'stores'] },
    kitchen: { floorStyle: 'flagstone', tags: ['kitchen', 'stores'] },
    bedchamber: { floorStyle: 'boards', tags: ['bedchamber'] },
    'great-hall': { floorStyle: 'marble', tags: ['great-hall', 'hearth', 'grand'] },
    library: { floorStyle: 'carpet', tags: ['library', 'hearth', 'dusty'] },
    ballroom: { floorStyle: 'parquet', tags: ['ballroom', 'grand'] },
};

/** How likely each piece on a room's outer wall is to have a door, against 1 for a plain wall. */
const DOOR_WEIGHT = 0.3;

/** How deep furniture against a room's wall can be. */
const ROOM_WALL_DEPTH = 2.4 * C;

/** Every piece of one kind of room: each slot plain, and with a door through each of its outer walls. */
function roomPieces(theme) {
    return Object.entries(PERIMETER).flatMap(([slot, perimeter]) => [null, ...perimeter].map((door) => roomPiece(theme, slot, door)));
}

function roomPiece(theme, slot, door) {
    const perimeter = PERIMETER[slot];
    const open = SIDES.filter((side) => !perimeter.includes(side));
    return {
        id: `${theme}-${slot}${door ? `-door-${door}` : ''}`,
        role: 'room',
        roomSlot: slot,
        theme,
        exits: SIDES.filter((side) => open.includes(side) || side === door),
        tags: THEMES[theme].tags,
        ...(door && { weight: DOOR_WEIGHT }),
        floorStyle: THEMES[theme].floorStyle,
        perimeter,
        floor: plan(door ? [door] : [], open),
        decorate(p) {
            if (door) roomDoor(p, door);
        },
        spots: roomSpots(slot, door),
    };
}

/** Where each side's piece keeps a smaller patch of floor, away from its wall. */
const NOOK = { n: [3, 3.9], s: [3, 2.1], w: [3.9, 3], e: [2.1, 3] };

/**
 * The middle of the room takes a table or the like; walls take furniture against them, corners a corner piece. A
 * wall with a door keeps clear.
 */
function roomSpots(slot, door) {
    if (slot === 'c') return [floorSpot('floor', 3 * C, 3 * C, 2.8 * C, 2.8 * C, { chance: 0.85 })];
    if (slot.length === 1) {
        const [x, y] = NOOK[slot];
        const nook = floorSpot('nook', x * C, y * C, 1.3 * C, 1.3 * C, { chance: 0.4 });
        // Whole walk cells, so a big piece of furniture never leaves one stranded at either end.
        return door ? [nook] : [wallSpot(slot, C, 5 * C, ROOM_WALL_DEPTH, { chance: 0.8 }), nook];
    }
    const spots = door ? [] : [cornerSpot(slot, 1.7 * C, { chance: 0.6 })];
    for (const side of slot) {
        if (side === door) continue;
        // The stretch of this wall away from the corner.
        const corner = slot.replace(side, '');
        const [from, to] = corner === 'n' || corner === 'w' ? [1.9 * C, 5.7 * C] : [0.3 * C, 4.1 * C];
        spots.push(wallSpot(side, from, to, ROOM_WALL_DEPTH, { chance: 0.55 }));
    }
    return spots;
}

// ---------------------------------------------------------------- hallways

const HALL_TAGS = ['hallway', 'grand', 'dusty'];

/** Hallways are weighted up so that they usually carry on rather than stopping at a small room. */
const HALL_WEIGHT = 1.5;

function hallway(id, exits, { weight = HALL_WEIGHT, floor, decorate, spots } = {}) {
    return {
        id,
        exits,
        tags: HALL_TAGS,
        weight,
        floorStyle: 'hall',
        runner: true,
        floor: floor ?? plan(exits),
        decorate(p) {
            for (const side of exits) jambs(p, side);
            decorate?.(p);
        },
        spots: spots ?? hallSpots(exits),
    };
}

/** Pictures, side tables and clocks on the walls, and plants or armour in the corners. */
function hallSpots(exits) {
    const closed = SIDES.filter((side) => !exits.includes(side));
    const spots = closed.map((side) => wallSpot(side, 1.5 * C, 4.5 * C, C, { chance: 0.35 }));
    for (const corner of ['nw', 'ne', 'sw', 'se']) {
        if ([...corner].every((side) => closed.includes(side))) spots.push(cornerSpot(corner, 1.4 * C, { chance: 0.45 }));
    }
    return spots;
}

/** Steps across a hallway, rising northwards: bands of shade laid over whatever floor is there. */
function hallSteps(p, y0, y1, count) {
    const { cv } = p;
    const tread = (y1 - y0) / count;
    cv.each(rect(T, y0, TILE - T, y1), (x, y, index) => {
        const step = Math.floor((y - y0) / tread);
        const within = (y - y0 - step * tread) / tread;
        cv.dim(index, 0.05 + (step / count) * 0.25);
        if (within < 0.14) cv.over(index, P.ivory, 0.25);
        else if (within > 0.86) cv.dim(index, 0.35);
    });
}

const hallNs = hallway('hall-ns', ['n', 's']);
const hallNsBench = hallway('hall-ns-bench', ['n', 's'], {
    decorate(p) {
        bench(p, T + 1, 2 * C, T + 11, 4 * C, P.walnut);
        p.cv.paint(rect(T + 2.5, 2.3 * C, T + 9.5, 3.7 * C), shade(P.crimson, 0.9));
        p.block(rect(T, 2 * C, T + 11, 4 * C));
    },
    spots: [wallSpot('e', 1.5 * C, 4.5 * C, C, { chance: 0.35 })],
});
const hallNsSteps = hallway('hall-ns-steps', ['n', 's'], {
    decorate(p) {
        hallSteps(p, 2.2 * C, 3.8 * C, 3);
    },
});
const hallEsw = hallway('hall-esw', ['e', 's', 'w']);
const hallSNiche = hallway('hall-s-niche', ['s'], {
    weight: 0.2,
    decorate(p) {
        // A statue in an alcove at the end of the hallway.
        p.cv.paint(rect(2 * C, T, 4 * C, T + 6), shade(P.wall, 1.3));
        statue(p, 3 * C, T + 15, 12);
        p.block(circle(3 * C, T + 15, 12));
        for (const x of [1.4 * C, 4.6 * C]) candle(p, x, T + 3, 18);
    },
    spots: [wallSpot('w', 1.5 * C, 4.5 * C, C, { chance: 0.35 }), wallSpot('e', 1.5 * C, 4.5 * C, C, { chance: 0.35 })],
});

const HALLWAYS = [
    hallNs,
    transposed(hallNs, 'hall-ew'),
    hallNsBench,
    transposed(hallNsBench, 'hall-ew-bench'),
    hallNsSteps,
    transposed(hallNsSteps, 'hall-ew-steps'),
    hallway('hall-es', ['e', 's']),
    hallway('hall-es-urn', ['e', 's'], {
        decorate(p) {
            pottedPlant(p, 1.25 * C, 1.25 * C, 0.95 * C, P.blue);
            p.block(circle(1.25 * C, 1.25 * C, 0.6 * C));
        },
        spots: [wallSpot('n', 2.6 * C, 4.6 * C, C, { chance: 0.35 }), wallSpot('w', 2.6 * C, 4.6 * C, C, { chance: 0.35 })],
    }),
    hallEsw,
    transposed(hallEsw, 'hall-nes'),
    hallway('hall-nesw', ['n', 'e', 's', 'w']),
    hallway('hall-nesw-rotunda', ['n', 'e', 's', 'w'], {
        weight: 0.8,
        decorate(p) {
            p.cv.paint(ring(3 * C, 3 * C, 1.55 * C, 1.65 * C), P.gold, 0.8);
            roundTable(p, 3 * C, 3 * C, 0.85 * C, P.walnut);
            vase(p, 3 * C, 3 * C, 7);
            p.block(circle(3 * C, 3 * C, 0.85 * C));
        },
        spots: [],
    }),
    hallSNiche,
    transposed(hallSNiche, 'hall-e-niche'),
];

// ---------------------------------------------------------------- small rooms off a hallway

/** Small rooms are dead ends, weighted down or the hallways would keep stopping. */
const SMALL_WEIGHT = 0.12;

/** A small room with its door to the south. Each one also comes turned, with its door to the east. */
function smallRoom(id, { floorStyle, tags, decorate, spots = [], floor, weight = SMALL_WEIGHT }) {
    return {
        id,
        exits: ['s'],
        tags: ['small-room', ...tags],
        weight,
        floorStyle,
        perimeter: ['n', 'e', 'w'],
        floor: floor ?? plan(['s']),
        decorate(p) {
            decorate(p);
            roomDoor(p, 's');
        },
        spots,
    };
}

const SMALL_ROOMS = [
    smallRoom('guest-room', {
        floorStyle: 'boards', tags: ['bedroom'],
        decorate(p) {
            rug(p, 1.9 * C, 3.5 * C, 4.6 * C, 5.1 * C, P.blue, P.red);
            bed(p, 1.1 * C, T, 2.9 * C, T + 54, P.green);
            p.block(rect(1.1 * C, T, 2.9 * C, T + 54));
            woodTop(p, 3.1 * C, T + 1, 3.9 * C, T + 17, P.wood);
            candle(p, 3.5 * C, T + 8, 18);
            p.block(rect(3.1 * C, T, 3.9 * C, T + 17));
            chest(p, 1.3 * C, T + 58, 2.7 * C, T + 72);
            p.block(rect(1.3 * C, T + 58, 2.7 * C, T + 72));
            woodTop(p, TILE - T - 18, 1.2 * C, TILE - T, 3 * C, P.walnut);
            p.block(rect(TILE - T - 18, 1.2 * C, TILE - T, 3 * C));
        },
        spots: [floorSpot('nook', 4.6 * C, 4.1 * C, 1.1 * C, 1.1 * C, { chance: 0.3, canBlock: false })],
    }),
    smallRoom('privy', {
        floorStyle: 'flagstone', tags: ['privy'],
        decorate(p) {
            const { cv } = p;
            woodTop(p, 0.6 * C, T, 5.4 * C, T + 1.3 * C, P.wood, { axis: 'x' });
            for (const x of [1.8 * C, 4.2 * C]) {
                cv.paint(ellipse(x, T + 0.65 * C, 6, 4.5), P.soot);
                cv.paint(ellipse(x, T + 0.65 * C, 7.5, 6), shade(P.wood, 0.7), 0.5);
            }
            cv.paint(rect(3 * C - 1.2, T, 3 * C + 1.2, 2.6 * C), P.walnut);
            p.block(rect(0.6 * C, T, 5.4 * C, T + 1.3 * C));
            barrel(p, 4.9 * C, 3.4 * C, 9);
            p.block(circle(4.9 * C, 3.4 * C, 9));
            cv.paint(circle(1 * C, 3.6 * C, 5), P.wood);
            cv.paint(circle(1 * C, 3.6 * C, 4), mix(P.water, P.soil, 0.5));
        },
    }),
    smallRoom('pantry', {
        floorStyle: 'flagstone', tags: ['pantry', 'dusty'],
        decorate(p) {
            pantryShelf(p, 0.5 * C, T, 5.5 * C, T + 16);
            p.block(rect(0.5 * C, T, 5.5 * C, T + 16));
            sack(p, 1.1 * C, 2.2 * C, 9, 0.5);
            sack(p, 1.0 * C, 3.3 * C, 8, 1.6);
            p.block(rect(T, 1.6 * C, 1.6 * C, 3.9 * C));
            barrel(p, 4.85 * C, 2.3 * C, 10);
            barrel(p, 4.9 * C, 3.45 * C, 8);
            p.block(rect(4.3 * C, 1.6 * C, TILE - T, 3.9 * C));
            for (const [x, y] of [[2.4, 1.8], [3.0, 1.95], [3.6, 1.8]]) {
                p.cv.shadowCircle(x * C, y * C, 3, 2, 0.35);
                p.cv.paint(ellipse(x * C, y * C, 3, 4.5), mix(P.copper, P.oakDark, 0.4));
            }
        },
        spots: [cornerSpot('sw', 1.2 * C, { chance: 0.5, canBlock: false })],
    }),
    smallRoom('stairs-up', {
        floorStyle: 'boards', tags: ['stairs'],
        floor: union(rect(C, T, 5 * C, TILE - T), rect(T, 4 * C, TILE - T, TILE - T), doorway.s),
        decorate(p) {
            stairs(p, C, T, 5 * C, 4 * C, 'n', 9, P.oak);
            p.cv.paint(rect(2.2 * C, T, 3.8 * C, 4 * C), shade(P.crimson, 1.1), 0.75);
            banister(p, C, T, C + 3, 4 * C);
            banister(p, 5 * C - 3, T, 5 * C, 4 * C);
        },
    }),
    smallRoom('cellar-stairs', {
        floorStyle: 'boards', tags: ['stairs', 'dusty'],
        decorate(p) {
            stairsDown(p, 1.6 * C, T, 4.4 * C, 3.2 * C, 'n', 7);
            banister(p, 1.6 * C - 3, T, 1.6 * C, 3.2 * C);
            banister(p, 4.4 * C, T, 4.4 * C + 3, 3.2 * C);
            barrel(p, 0.75 * C, 3.5 * C, 9);
            p.block(circle(0.75 * C, 3.5 * C, 9));
            crate(p, TILE - T - 22, 0.6 * C, TILE - T - 2, 0.6 * C + 20);
            p.block(rect(TILE - T - 22, 0.6 * C, TILE - T, 0.6 * C + 20));
        },
        spots: [cornerSpot('nw', 1.2 * C, { chance: 0.5, canBlock: false })],
    }),
    smallRoom('study', {
        floorStyle: 'carpet', tags: ['study', 'dusty'],
        decorate(p) {
            bookcase(p, 0.5 * C, T, 5.5 * C, T + 17);
            p.block(rect(0.5 * C, T, 5.5 * C, T + 17));
            woodTop(p, 1.7 * C, 1.6 * C, 4.3 * C, 2.5 * C, P.walnut);
            p.cv.paint(rect(2.2 * C, 1.75 * C, 2.9 * C, 2.35 * C), P.linen);
            candle(p, 3.9 * C, 1.85 * C, 20);
            p.block(rect(1.7 * C, 1.6 * C, 4.3 * C, 2.5 * C));
            armchair(p, 3 * C, 3.05 * C, -Math.PI / 2, P.red, 17);
            p.block(rect(2.6 * C, 2.6 * C, 3.4 * C, 3.4 * C));
            pottedPlant(p, TILE - T - 13, 2.6 * C, 12, P.terracotta);
            p.block(circle(TILE - T - 13, 2.6 * C, 8));
        },
    }),
    smallRoom('bathroom', {
        floorStyle: 'glazed', tags: ['bath'],
        decorate(p) {
            // The tub leaves a way past it at the east end, so the corner behind the washstand isn't cut off.
            tub(p, 1.0 * C, T + 3, 4.1 * C, T + 1.6 * C);
            p.block(rect(1.0 * C, T, 4.1 * C, T + 1.6 * C));
            p.cv.paint(rect(T + 1, 2.4 * C, T + 4, 3.8 * C), P.brass);
            p.cv.paint(rect(T + 2, 2.5 * C, T + 9, 3.7 * C), P.linen);
            woodTop(p, TILE - T - 20, 2.2 * C, TILE - T, 3.3 * C, P.wood);
            p.cv.paint(circle(TILE - T - 10, 2.75 * C, 6), P.ivory);
            p.block(rect(TILE - T - 20, 2.2 * C, TILE - T, 3.3 * C));
            p.cv.paint(rect(2.3 * C, 2.3 * C, 3.7 * C, 3 * C), mix(P.linen, P.blue, 0.2));
        },
    }),
    smallRoom('chapel', {
        floorStyle: 'marble', tags: ['chapel', 'dusty'],
        decorate(p) {
            const { cv } = p;
            cv.paint(rect(2.3 * C, T, 3.7 * C, TILE - T), shade(P.crimson, 1.0), 0.9);
            woodTop(p, 2 * C, T, 4 * C, T + C, P.ivory, { axis: 'x' });
            cv.paint(rect(2.85 * C, T + 2, 3.15 * C, T + C - 2), P.gold);
            cv.paint(rect(2.6 * C, T + 0.4 * C - 1, 3.4 * C, T + 0.4 * C + 1), P.gold);
            p.block(rect(2 * C, T, 4 * C, T + C));
            for (const x of [1.4 * C, 4.6 * C]) candle(p, x, T + 7, 24);
            for (const y of [2.2, 3.3]) {
                bench(p, 0.4 * C, y * C, 1.95 * C, (y + 0.5) * C, P.walnut);
                bench(p, 4.05 * C, y * C, 5.6 * C, (y + 0.5) * C, P.walnut);
                p.block(rect(0.4 * C, y * C, 1.95 * C, (y + 0.5) * C));
                p.block(rect(4.05 * C, y * C, 5.6 * C, (y + 0.5) * C));
            }
        },
        spots: [cornerSpot('nw', 1.2 * C, { chance: 0.6, canBlock: false })],
    }),
].flatMap((room) => [room, transposed(room, `${room.id}-e`)]);

// ---------------------------------------------------------------- the way in

const START = [
    {
        id: 'entrance', role: 'start', exits: ['s'], tags: ['hallway', 'entrance'], spawn: '1,3',
        floorStyle: 'hall', runner: ['n', 's'], floor: plan(['s']),
        decorate(p) {
            frontDoor(p);
            rug(p, 2.2 * C, T + 4, 3.8 * C, T + 18, P.soil, P.oakDark);
            // A coat stand and a bench for boots.
            p.cv.shadowCircle(0.9 * C, 0.9 * C, 6, 3, 0.5);
            p.cv.paint(circle(0.9 * C, 0.9 * C, 6), P.walnut);
            for (let k = 0; k < 4; k++) p.cv.paint(circle(0.9 * C + Math.cos(k * 1.6) * 5, 0.9 * C + Math.sin(k * 1.6) * 5, 2.6), [P.blue, P.oakDark, P.green, P.crimson][k]);
            p.block(circle(0.9 * C, 0.9 * C, 7));
            bench(p, TILE - T - 11, 1.5 * C, TILE - T - 1, 3.5 * C, P.walnut);
            p.block(rect(TILE - T - 11, 1.5 * C, TILE - T, 3.5 * C));
            jambs(p, 's');
        },
        spots: [wallSpot('w', 2 * C, 4.5 * C, C, { chance: 0.5 })],
    },
    {
        id: 'foyer', role: 'start', exits: ['e', 's', 'w'], tags: ['hallway', 'entrance'], spawn: '1,3',
        floorStyle: 'hall', runner: ['n', 'e', 's', 'w'], floor: plan(['e', 's', 'w']),
        decorate(p) {
            frontDoor(p);
            p.cv.paint(ring(3 * C, 3 * C, 1.6 * C, 1.7 * C), P.gold, 0.8);
            for (const x of [0.95 * C, 5.05 * C]) {
                pottedPlant(p, x, 0.95 * C, 0.75 * C, P.ivory);
                p.block(circle(x, 0.95 * C, 0.55 * C));
            }
            for (const side of ['e', 's', 'w']) jambs(p, side);
        },
        spots: [],
    },
];

// ---------------------------------------------------------------- open to the sky

/** Courtyards fill cells that no door reaches: you can't go in, but they aren't blank. */
const FILLERS = [
    {
        id: 'courtyard', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        ground: rect(T, T, TILE - T, TILE - T), groundStyle: 'lawn',
        decorate(p) {
            flowerBed(p, union(rect(T, T, TILE - T, T + 12), rect(T, TILE - T - 12, TILE - T, TILE - T)));
            p.cv.paint(ring(3 * C, 3 * C, 1.4 * C, 1.75 * C), mix(P.cobble, P.soil, 0.3));
            tree(p, 3 * C, 3 * C, 1.25 * C);
        },
    },
    {
        id: 'light-well', role: 'filler', exits: [], tags: [], floor: rect(0, 0, 0, 0),
        ground: rect(T, T, TILE - T, TILE - T), groundStyle: 'paving',
        decorate(p) {
            const { cv } = p;
            // A well with a little roof over it.
            cv.shadowCircle(3 * C, 3 * C, 0.8 * C, 6, 0.6);
            cv.paint(circle(3 * C, 3 * C, 0.8 * C), shade(P.stone, 0.8));
            cv.paint(circle(3 * C, 3 * C, 0.55 * C), mix(P.water, P.soot, 0.5));
            cv.paint(segment(2 * C, 3 * C, 4 * C, 3 * C, 2.4), P.woodDark);
            for (const [x, y] of [[0.8, 0.8], [5.2, 0.8], [0.8, 5.2], [5.2, 5.2]]) pottedPlant(p, x * C, y * C, 0.6 * C);
        },
    },
];

/** @type {object[]} */
export const TILES = [
    ...START,
    ...HALLWAYS,
    ...SMALL_ROOMS,
    ...FILLERS,
    ...Object.keys(THEMES).flatMap(roomPieces),
];

