import { slotAt } from '../tileset/tileset.js';
import { chooseVariant, constraintsAt } from './selection.js';

/**
 * Big rooms are stamped onto the map before the corridors are filled in, so the corridors simply connect to
 * whichever doors each room ended up with. Room shapes come from the tileset's `rooms` templates.
 *
 * @typedef {import('./dungeon.js').Dungeon} Dungeon
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../tileset/tileset.js').RoomTemplate} RoomTemplate
 * @typedef {import('../core/rng.js').Rng} Rng
 *
 * @typedef {object} PlacedRoom
 * @property {string} id                Unique within the dungeon, e.g. "great-hall#1".
 * @property {RoomTemplate} template
 * @property {number} row               Top-left tile.
 * @property {number} col
 *
 * @typedef {object} RoomOptions
 * @property {boolean} enabled
 * @property {number|null} max          Most rooms to place. Null scales with the dungeon's area.
 * @property {string[]|null} templates  Template ids to use. Null uses all of the tileset's templates.
 * @property {number} margin            Minimum distance in tiles from the edge of the map.
 * @property {number} spacing           Minimum gap in tiles between a room and anything already placed.
 * @property {number|null} attempts     Random positions to try before giving up. Null allows 10 per room.
 */

/** Tiles of map area per room when RoomOptions.max is null. */
const AREA_PER_ROOM = 60;

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

    const max = options.max ?? Math.max(1, Math.floor((dungeon.cols * dungeon.rows) / AREA_PER_ROOM));
    const attempts = options.attempts ?? max * 10;
    for (let attempt = 0; attempt < attempts && dungeon.rooms.length < max; attempt++) {
        const template = rng.pick(templates);
        const lastRow = dungeon.rows - options.margin - template.height;
        const lastCol = dungeon.cols - options.margin - template.width;
        if (lastRow < options.margin || lastCol < options.margin) continue;

        const row = rng.int(options.margin, lastRow);
        const col = rng.int(options.margin, lastCol);
        const gap = options.spacing;
        if (!isAreaEmpty(dungeon, row - gap, col - gap, template.height + 2 * gap, template.width + 2 * gap)) continue;

        const room = { id: `${template.id}#${dungeon.rooms.length + 1}`, template, row, col };
        if (tryPlaceRoom(dungeon, tileset, room, rng)) dungeon.rooms.push(room);
    }
}

/**
 * Places a piece in every cell of the room, or nothing if some cell has no piece that fits.
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @param {PlacedRoom} room
 * @param {Rng} rng
 * @returns {boolean}
 */
function tryPlaceRoom(dungeon, tileset, room, rng) {
    const { template } = room;
    const insideRoom = (row, col) => row >= room.row && row < room.row + template.height
        && col >= room.col && col < room.col + template.width;

    const placed = [];
    for (let r = 0; r < template.height; r++) {
        for (let c = 0; c < template.width; c++) {
            const row = room.row + r;
            const col = room.col + c;
            const constraints = constraintsAt(dungeon, row, col, insideRoom);
            const variant = chooseVariant(tileset, 'room', constraints, rng, slotAt(template, r, c));
            if (!variant) {
                for (const cell of placed) dungeon.clear(cell.row, cell.col);
                return false;
            }
            placed.push(dungeon.place(row, col, variant, { room }));
        }
    }
    return true;
}

function isAreaEmpty(dungeon, top, left, height, width) {
    for (let row = Math.max(0, top); row < Math.min(dungeon.rows, top + height); row++) {
        for (let col = Math.max(0, left); col < Math.min(dungeon.cols, left + width); col++) {
            if (dungeon.get(row, col)) return false;
        }
    }
    return true;
}
