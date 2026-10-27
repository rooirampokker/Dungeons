import { BIT, CARDINALS, STEP } from '../core/directions.js';
import { slotAt } from '../tileset/tileset.js';
import { chooseVariant, constraintsAt } from './selection.js';

/**
 * Big rooms are stamped onto the map before the corridors are filled in, so the corridors simply connect to
 * whichever doors each room ended up with. Room shapes come from the tileset's `rooms` templates.
 *
 * Rooms are either scattered (random positions, a few per map) or packed (the map filled with rooms in reading
 * order, each as close to the ones before it as `spacing` allows, so the corridors become the gaps between them).
 *
 * @typedef {import('./dungeon.js').Dungeon} Dungeon
 * @typedef {import('./dungeon.js').Cell} Cell
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../tileset/tileset.js').RoomTemplate} RoomTemplate
 * @typedef {import('../core/rng.js').Rng} Rng
 *
 * @typedef {object} PlacedRoom
 * @property {string} id                Unique within the dungeon, e.g. "great-hall#1".
 * @property {RoomTemplate} template
 * @property {string|null} theme        One of the template's themes, or null when it has none.
 * @property {number} row               Top-left tile.
 * @property {number} col
 *
 * @typedef {object} RoomOptions
 * @property {boolean} enabled
 * @property {number|null} max          Most rooms to place. Null scales with the dungeon's area, or, when packed,
 *                                      places as many as fit.
 * @property {string[]|null} templates  Template ids to use. Null uses all of the tileset's templates.
 * @property {number} margin            Minimum distance in tiles from the edge of the map.
 * @property {number} spacing           Minimum gap in tiles between a room and anything already placed.
 * @property {number|null} attempts     Scattered rooms: random positions to try before giving up. Null allows 10
 *                                      per room.
 * @property {boolean} packed           Fill the map with rooms instead of scattering a few.
 * @property {number} adjoin            Packed rooms: chance (0-1) that a room may go right up against those already
 *                                      placed, sharing a wall (and any doors in it), instead of `spacing` away.
 * @property {number} minDoors          A room with fewer doors is rebuilt from other pieces, or left out.
 */

/** Tiles of map area per room when RoomOptions.max is null. */
const AREA_PER_ROOM = 60;

/** How many times to rebuild a room that has too few doors before leaving it out. */
const DOOR_TRIES = 12;

/**
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @param {RoomOptions} options
 * @param {Rng} rng
 */
export function placeRooms(dungeon, tileset, options, rng) {
    const templates = options.templates
        ? tileset.rooms.filter((template) => options.templates.includes(template.id))
        : tileset.rooms;
    if (!options.enabled || templates.length === 0) return;

    if (options.packed) {
        packRooms(dungeon, tileset, templates, options, rng);
        return;
    }

    const max = options.max ?? Math.max(1, Math.floor((dungeon.cols * dungeon.rows) / AREA_PER_ROOM));
    const attempts = options.attempts ?? max * 10;
    for (let attempt = 0; attempt < attempts && dungeon.rooms.length < max; attempt++) {
        const template = rng.pick(templates);
        const lastRow = dungeon.rows - options.margin - template.height;
        const lastCol = dungeon.cols - options.margin - template.width;
        if (lastRow < options.margin || lastCol < options.margin) continue;

        const row = rng.int(options.margin, lastRow);
        const col = rng.int(options.margin, lastCol);
        if (!hasRoomFor(dungeon, template, row, col, options.spacing)) continue;
        tryPlaceRoom(dungeon, tileset, template, row, col, options, rng);
    }
}

/**
 * Goes through the map in reading order and starts a room wherever one fits, trying the templates in a random
 * order, so every room ends up `spacing` tiles from its neighbours above and to the left, or now and then
 * (`adjoin`) right against them.
 */
function packRooms(dungeon, tileset, templates, options, rng) {
    const max = options.max ?? Infinity;
    const { margin } = options;
    for (let row = margin; row < dungeon.rows - margin; row++) {
        for (let col = margin; col < dungeon.cols - margin; col++) {
            if (dungeon.rooms.length >= max) return;
            if (dungeon.get(row, col)) continue;
            const gap = options.adjoin && rng.chance(options.adjoin) ? 0 : options.spacing;
            for (const template of rng.shuffle(templates)) {
                if (row + template.height > dungeon.rows - margin || col + template.width > dungeon.cols - margin) continue;
                if (!hasRoomFor(dungeon, template, row, col, gap)) continue;
                if (tryPlaceRoom(dungeon, tileset, template, row, col, options, rng)) break;
            }
        }
    }
}

/**
 * Places a piece in every cell of the room, or nothing if some cell has no piece that fits or the room ends up
 * with too few doors.
 * @returns {boolean}
 */
function tryPlaceRoom(dungeon, tileset, template, row, col, options, rng) {
    const room = { id: `${template.id}#${dungeon.rooms.length + 1}`, template, theme: chooseTheme(dungeon, template, rng), row, col };
    for (let tries = 0; tries < DOOR_TRIES; tries++) {
        const placed = buildRoom(dungeon, tileset, room, rng);
        if (placed && countDoors(dungeon, room) >= options.minDoors) {
            dungeon.rooms.push(room);
            return true;
        }
        for (const cell of placed ?? []) dungeon.clear(cell.row, cell.col);
        if (!placed) return false;
    }
    return false;
}

/**
 * A theme from the template's list: whichever of them the fewest rooms have so far, so a big map gets a fair mix.
 * Null for templates without themes.
 * @param {Dungeon} dungeon
 * @param {RoomTemplate} template
 * @param {Rng} rng
 * @returns {string|null}
 */
function chooseTheme(dungeon, template, rng) {
    if (!template.themes) return null;
    const uses = (theme) => dungeon.rooms.filter((room) => room.theme === theme).length;
    const fewest = Math.min(...template.themes.map(uses));
    return rng.pick(template.themes.filter((theme) => uses(theme) === fewest));
}

/**
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @param {PlacedRoom} room
 * @param {Rng} rng
 * @returns {Cell[]|null} The placed cells, or null (with nothing placed) if a cell had no piece that fits.
 */
function buildRoom(dungeon, tileset, room, rng) {
    const { template } = room;
    const placed = [];
    for (let r = 0; r < template.height; r++) {
        for (let c = 0; c < template.width; c++) {
            const row = room.row + r;
            const col = room.col + c;
            const constraints = constraintsAt(dungeon, row, col, (rr, cc) => isInRoom(room, rr, cc));
            const variant = chooseVariant(tileset, 'room', constraints, rng, slotAt(template, r, c), room.theme);
            if (!variant) {
                for (const cell of placed) dungeon.clear(cell.row, cell.col);
                return null;
            }
            placed.push(dungeon.place(row, col, variant, { room }));
        }
    }
    return placed;
}

/** Openings from the room's pieces to the outside. */
function countDoors(dungeon, room) {
    let doors = 0;
    for (let row = room.row; row < room.row + room.template.height; row++) {
        for (let col = room.col; col < room.col + room.template.width; col++) {
            const cell = dungeon.get(row, col);
            for (const side of CARDINALS) {
                if ((cell.exits & BIT[side]) && !isInRoom(room, row + STEP[side].dy, col + STEP[side].dx)) doors++;
            }
        }
    }
    return doors;
}

function isInRoom(room, row, col) {
    return row >= room.row && row < room.row + room.template.height && col >= room.col && col < room.col + room.template.width;
}

/** Whether the room's cells, and `gap` tiles around them, are all still empty. */
function hasRoomFor(dungeon, template, row, col, gap) {
    const top = row - gap;
    const left = col - gap;
    const height = template.height + 2 * gap;
    const width = template.width + 2 * gap;
    for (let r = Math.max(0, top); r < Math.min(dungeon.rows, top + height); r++) {
        for (let c = Math.max(0, left); c < Math.min(dungeon.cols, left + width); c++) {
            if (dungeon.get(r, c)) return false;
        }
    }
    return true;
}
