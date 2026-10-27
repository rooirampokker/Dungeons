import {
    ALL_EXITS, BIT, CARDINALS, DIRECTIONS, IDENTITY, OPPOSITE, ORIENTATIONS, STEP, orientMask, toMask,
} from '../core/directions.js';

/**
 * A tileset is plain JSON data (see src/data/tilesets/). createTileset() checks it and builds the lookup
 * structures the generator, movement and renderer need, so none of them have to parse it again.
 *
 * @typedef {import('../core/directions.js').Cardinal} Cardinal
 * @typedef {import('../core/directions.js').Direction} Direction
 * @typedef {import('../core/directions.js').Orientation} Orientation
 *
 * @typedef {'corridor'|'room'|'start'|'filler'} TileRole
 * @typedef {'nw'|'n'|'ne'|'w'|'c'|'e'|'sw'|'s'|'se'} RoomSlot
 *
 * @typedef {object} TileDef
 * @property {string} id
 * @property {string} image                 File name inside each resolution folder.
 * @property {TileRole} role                corridor: general fill; room: piece of a big room; start: where the
 *                                          hero begins; filler: solid rock, used when a cell can have no exits.
 * @property {Cardinal[]} exits             Sides with an opening, as drawn (before any mirroring).
 * @property {string[]} tags                Free-form descriptors, e.g. 'passage', 'empty', 'deadend'.
 * @property {RoomSlot} [roomSlot]          Room pieces: which part of a room the piece forms.
 * @property {boolean} [fixedOrientation]   Never mirror this tile. Room pieces are never mirrored.
 * @property {string} [spawn]               Start tile: "row,col" sub-cell where the hero appears.
 * @property {Object<string, Direction[]>} [walk]  "row,col" sub-cell → directions you can move from it.
 *                                          Tiles without a walk map can't be entered yet.
 *
 * @typedef {object} RoomTemplate
 * @property {string} id
 * @property {number} width                 In tiles, at least 2.
 * @property {number} height                In tiles, at least 2.
 * @property {RoomSlot[][]} [slots]         Slot for each cell, row by row. Inferred from position when omitted:
 *                                          corners, edges ('n', 'e', 's', 'w') and centre ('c').
 *
 * @typedef {object} OverlayDef             A decoration drawn on top of a tile, unmirrored.
 * @property {string} id
 * @property {string} image
 * @property {[number, number]} offset      [x, y] in pixels at the tileset's referenceSize.
 * @property {string[]} onTags              Only placed on tiles that have every one of these tags.
 * @property {Cardinal[]} [onExits]         Only placed on tiles with exactly these exits. Preferred over overlays
 *                                          without onExits whenever one fits.
 *
 * @typedef {object} TilesetData            The JSON file's shape.
 * @property {string} id
 * @property {string} name
 * @property {string} [credits]
 * @property {number} referenceSize         Pixel size that overlay offsets and sprite sizes are measured in.
 * @property {number} subGrid               Walk cells per tile side.
 * @property {Object<string, string>} resolutions  Tile pixel size → image folder, relative to index.html.
 * @property {number} overlayChance         Chance (0-1) that a tile with matching overlays gets one.
 * @property {RoomTemplate[]} rooms
 * @property {TileDef[]} tiles
 * @property {OverlayDef[]} overlays
 *
 * @typedef {object} Variant                A tile in one orientation.
 * @property {TileDef} tile
 * @property {Orientation} orientation
 * @property {number} exits                 Exit bitmask after orientation.
 *
 * @typedef {TilesetData & {
 *     tilesById: Map<string, TileDef>,
 *     walkMasks: Map<string, Uint16Array>,
 *     warnings: string[],
 *     variants: (role: TileRole, slot?: RoomSlot) => Variant[],
 *     candidates: (role: TileRole, required: number, forbidden: number, slot?: RoomSlot) => Variant[][],
 * }} Tileset
 */

/** Walk-mask flag for a sub-cell that can be stood on. Bits 0-7 are the directions you may move in. */
export const WALKABLE = 0x100;

export const ROLES = ['corridor', 'room', 'start', 'filler'];
export const ROOM_SLOTS = ['nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'];

/**
 * Validates the data and builds lookup tables. Throws if the data has errors; warnings are kept on the result.
 * @param {TilesetData} data
 * @returns {Tileset}
 */
export function createTileset(data) {
    const { errors, warnings } = validateTileset(data);
    if (errors.length) {
        throw new Error(`Tileset "${data.id}" is invalid:\n  ${errors.join('\n  ')}`);
    }

    const tilesById = new Map(data.tiles.map((tile) => [tile.id, tile]));
    const walkMasks = new Map(data.tiles.map((tile) => [tile.id, compileWalk(tile, data.subGrid)]));

    /** @type {Map<string, Variant[]>} */
    const variantsByKey = new Map();
    for (const tile of data.tiles) {
        const orientations = tile.role === 'room' || tile.fixedOrientation ? [IDENTITY] : ORIENTATIONS;
        const key = variantKey(tile.role, tile.roomSlot);
        if (!variantsByKey.has(key)) variantsByKey.set(key, []);
        for (const orientation of orientations) {
            variantsByKey.get(key).push({ tile, orientation, exits: orientMask(toMask(tile.exits), orientation) });
        }
    }

    const variants = (role, slot) => variantsByKey.get(variantKey(role, slot)) ?? [];

    // Every cell asks this question, but there are only 81 possible (required, forbidden) pairs per role.
    /** @type {Map<string, Variant[][]>} */
    const candidateCache = new Map();
    const candidates = (role, required, forbidden, slot) => {
        const key = `${variantKey(role, slot)}|${required}|${forbidden}`;
        if (!candidateCache.has(key)) {
            /** @type {Map<string, Variant[]>} */
            const byTile = new Map();
            for (const variant of variants(role, slot)) {
                if ((variant.exits & required) !== required || (variant.exits & forbidden) !== 0) continue;
                if (!byTile.has(variant.tile.id)) byTile.set(variant.tile.id, []);
                byTile.get(variant.tile.id).push(variant);
            }
            candidateCache.set(key, [...byTile.values()]);
        }
        return candidateCache.get(key);
    };

    return { ...data, tilesById, walkMasks, warnings, variants, candidates };
}

/**
 * Checks a tileset's data. Errors make it unusable; warnings point at data that probably needs attention, such as
 * tiles that haven't been given a walk map yet, or moves that only work in one direction.
 * @param {TilesetData} data
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateTileset(data) {
    const errors = [];
    const warnings = [];
    const sub = data.subGrid;

    if (!Number.isInteger(sub) || sub < 1) errors.push('subGrid must be a positive whole number');
    if (!(data.referenceSize > 0)) errors.push('referenceSize must be a positive number');
    if (!data.resolutions || Object.keys(data.resolutions).length === 0) {
        errors.push('resolutions must list at least one tile size');
    }
    if (!Array.isArray(data.tiles) || data.tiles.length === 0) {
        errors.push('tiles must be a non-empty list');
        return { errors, warnings };
    }

    const ids = new Set();
    for (const tile of data.tiles) {
        const where = `tile "${tile.id}"`;
        if (!tile.id) {
            errors.push('a tile has no id');
            continue;
        }
        if (ids.has(tile.id)) errors.push(`${where}: duplicate id`);
        ids.add(tile.id);

        if (!tile.image) errors.push(`${where}: no image`);
        if (!ROLES.includes(tile.role)) errors.push(`${where}: role must be one of ${ROLES.join(', ')}`);
        if (!Array.isArray(tile.exits) || !tile.exits.every((side) => CARDINALS.includes(side))) {
            errors.push(`${where}: exits must be a list of n, e, s, w`);
        }
        if (!Array.isArray(tile.tags)) errors.push(`${where}: tags must be a list`);
        if (tile.role === 'room' && !ROOM_SLOTS.includes(tile.roomSlot)) {
            errors.push(`${where}: room pieces need a roomSlot (${ROOM_SLOTS.join(', ')})`);
        }
        if (tile.spawn !== undefined && !tile.walk?.[tile.spawn]) {
            errors.push(`${where}: spawn "${tile.spawn}" is not a walkable cell`);
        }
        if (!tile.walk) {
            warnings.push(`${where}: no walk map yet, so it can't be entered`);
            continue;
        }

        for (const [key, moves] of Object.entries(tile.walk)) {
            if (!parseCellKey(key, sub)) errors.push(`${where}: walk cell "${key}" is not "row,col" inside the grid`);
            if (!Array.isArray(moves) || !moves.every((move) => DIRECTIONS.includes(move))) {
                errors.push(`${where}: walk cell "${key}" has an unknown direction`);
            }
        }
        warnings.push(...oneWayMoves(tile, sub).map((move) => `${where}: ${move}`));
    }

    if (!data.tiles.some((tile) => tile.role === 'start')) errors.push('there must be a tile with role "start"');

    for (const room of data.rooms ?? []) {
        const where = `room "${room.id}"`;
        if (!Number.isInteger(room.width) || !Number.isInteger(room.height) || room.width < 2 || room.height < 2) {
            errors.push(`${where}: width and height must be whole numbers of at least 2`);
            continue;
        }
        if (room.slots && (room.slots.length !== room.height || room.slots.some((row) => row.length !== room.width))) {
            errors.push(`${where}: slots must have ${room.height} rows of ${room.width}`);
            continue;
        }
        const needed = new Set();
        for (let row = 0; row < room.height; row++) {
            for (let col = 0; col < room.width; col++) needed.add(slotAt(room, row, col));
        }
        for (const slot of needed) {
            if (!data.tiles.some((tile) => tile.role === 'room' && tile.roomSlot === slot)) {
                errors.push(`${where}: no room piece for slot "${slot}"`);
            }
        }
    }

    for (const overlay of data.overlays ?? []) {
        const where = `overlay "${overlay.id}"`;
        if (!overlay.id || !overlay.image) errors.push(`${where}: needs an id and an image`);
        if (!Array.isArray(overlay.offset) || overlay.offset.length !== 2) errors.push(`${where}: offset must be [x, y]`);
        if (!Array.isArray(overlay.onTags)) errors.push(`${where}: onTags must be a list`);
        if (overlay.onExits && !overlay.onExits.every((side) => CARDINALS.includes(side))) {
            errors.push(`${where}: onExits must be a list of n, e, s, w`);
        }
    }

    if (errors.length === 0) {
        const missing = missingExitCombinations(data.tiles);
        if (missing.length) {
            warnings.push(`no corridor tile has exactly these exits, even mirrored: ${missing.join('; ')}`);
        }
    }

    return { errors, warnings };
}

/**
 * Which slot a cell of a room template uses: its explicit slot, or one inferred from its position.
 * @param {RoomTemplate} template
 * @param {number} row
 * @param {number} col
 * @returns {RoomSlot}
 */
export function slotAt(template, row, col) {
    if (template.slots) return template.slots[row][col];
    const vertical = row === 0 ? 'n' : row === template.height - 1 ? 's' : '';
    const horizontal = col === 0 ? 'w' : col === template.width - 1 ? 'e' : '';
    return /** @type {RoomSlot} */ (vertical + horizontal || 'c');
}

/**
 * @param {string} key  "row,col"
 * @param {number} size Sub-grid size.
 * @returns {{row: number, col: number}|null}
 */
export function parseCellKey(key, size) {
    const match = /^(\d+),(\d+)$/.exec(key);
    if (!match) return null;
    const row = Number(match[1]);
    const col = Number(match[2]);
    return row < size && col < size ? { row, col } : null;
}

function variantKey(role, slot) {
    return role === 'room' ? `room:${slot}` : role;
}

/**
 * @param {TileDef} tile
 * @param {number} size
 * @returns {Uint16Array} One entry per sub-cell (row * size + col): WALKABLE plus direction bits, or 0.
 */
function compileWalk(tile, size) {
    const mask = new Uint16Array(size * size);
    for (const [key, moves] of Object.entries(tile.walk ?? {})) {
        const { row, col } = parseCellKey(key, size);
        mask[row * size + col] = WALKABLE | toMask(moves);
    }
    return mask;
}

/** Moves inside a tile whose target cell is unmapped or doesn't allow the move back. */
function oneWayMoves(tile, size) {
    const problems = [];
    for (const [key, moves] of Object.entries(tile.walk)) {
        const cell = parseCellKey(key, size);
        if (!cell || !Array.isArray(moves)) continue;
        for (const move of moves.filter((m) => STEP[m])) {
            const row = cell.row + STEP[move].dy;
            const col = cell.col + STEP[move].dx;
            if (row < 0 || col < 0 || row >= size || col >= size) continue; // leaves the tile
            const target = tile.walk[`${row},${col}`];
            if (!target) problems.push(`"${key}" moves ${move} into unmapped cell "${row},${col}"`);
            else if (!target.includes(OPPOSITE[move])) problems.push(`"${key}" moves ${move} but "${row},${col}" can't move back`);
        }
    }
    return problems;
}

function missingExitCombinations(tiles) {
    const available = new Set();
    for (const tile of tiles.filter((t) => t.role === 'corridor')) {
        const orientations = tile.fixedOrientation ? [IDENTITY] : ORIENTATIONS;
        for (const orientation of orientations) available.add(orientMask(toMask(tile.exits), orientation));
    }
    const missing = [];
    for (let mask = 1; mask <= ALL_EXITS; mask++) {
        if ((mask & ALL_EXITS) !== mask || available.has(mask)) continue;
        missing.push(CARDINALS.filter((side) => mask & BIT[side]).join(''));
    }
    return missing;
}
