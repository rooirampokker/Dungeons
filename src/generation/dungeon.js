/**
 * The generated map: a grid of tiles, each with its orientation, exits and decorations. Contains no drawing or
 * browser code, so it can be generated, tested, saved or sent anywhere.
 *
 * @typedef {import('../tileset/tileset.js').TileDef} TileDef
 * @typedef {import('../tileset/tileset.js').OverlayDef} OverlayDef
 * @typedef {import('../tileset/tileset.js').Variant} Variant
 * @typedef {import('../core/directions.js').Orientation} Orientation
 * @typedef {import('./rooms.js').PlacedRoom} PlacedRoom
 *
 * @typedef {object} Cell
 * @property {number} row
 * @property {number} col
 * @property {TileDef} tile
 * @property {Orientation} orientation
 * @property {number} exits             Exit bitmask after orientation.
 * @property {PlacedRoom|null} room     The room this tile belongs to, if any.
 * @property {OverlayDef|null} overlay
 * @property {boolean} conflict         No tile fitted all neighbours, so the closest match was used.
 *
 * @typedef {object} DungeonStats
 * @property {number} attempts          Layouts generated before this one was accepted.
 * @property {number} reachableRatio    Share of tiles reachable from the start tile (0-1).
 * @property {number} conflicts         Tiles that don't fit their neighbours.
 */
export class Dungeon {
    /**
     * @param {number} cols
     * @param {number} rows
     */
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        /** @type {(Cell|null)[]} Row-major. */
        this.cells = new Array(cols * rows).fill(null);
        /** @type {{row: number, col: number}|null} */
        this.start = null;
        /** @type {PlacedRoom[]} */
        this.rooms = [];
        /** @type {Uint8Array} 1 where a tile is reachable from the start tile. Row-major. */
        this.reachable = new Uint8Array(cols * rows);
        this.seed = '';
        /** @type {DungeonStats} */
        this.stats = { attempts: 0, reachableRatio: 0, conflicts: 0 };
    }

    inBounds(row, col) {
        return row >= 0 && col >= 0 && row < this.rows && col < this.cols;
    }

    /** @returns {Cell|null} Null outside the map and for cells not decided yet. */
    get(row, col) {
        return this.inBounds(row, col) ? this.cells[row * this.cols + col] : null;
    }

    /**
     * @param {number} row
     * @param {number} col
     * @param {Variant} variant
     * @param {{room?: PlacedRoom|null, conflict?: boolean}} [extra]
     * @returns {Cell}
     */
    place(row, col, variant, { room = null, conflict = false } = {}) {
        /** @type {Cell} */
        const cell = {
            row,
            col,
            tile: variant.tile,
            orientation: variant.orientation,
            exits: variant.exits,
            room,
            overlay: null,
            conflict,
        };
        this.cells[row * this.cols + col] = cell;
        return cell;
    }

    clear(row, col) {
        this.cells[row * this.cols + col] = null;
    }

    isReachable(row, col) {
        return this.inBounds(row, col) && this.reachable[row * this.cols + col] === 1;
    }

    /** @returns {IterableIterator<Cell>} Every decided cell, row by row. */
    *[Symbol.iterator]() {
        for (const cell of this.cells) {
            if (cell) yield cell;
        }
    }
}
