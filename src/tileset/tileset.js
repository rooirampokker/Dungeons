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
 * @property {number} [weight]              How often the generator picks this tile compared with others that fit
 *                                          (default 1). Below 1 makes it rarer.
 * @property {string} [spawn]               Start tile: "row,col" sub-cell where the hero appears.
 * @property {Object<string, Direction[]>} [walk]  "row,col" sub-cell → directions you can move from it.
 *                                          Tiles without a walk map can't be entered yet.
 * @property {SpotDef[]} [spots]            Places on the tile where overlays can go. Tiles without spots take at
 *                                          most one overlay, at the overlay's own offset.
 *
 * @typedef {'n'|'e'|'s'|'w'|'nw'|'ne'|'sw'|'se'} Facing
 *
 * @typedef {object} SpotDef                A place on a tile where a decoration can go.
 * @property {string} kind                  Free-form, matched against OverlayDef.spots, e.g. 'floor', 'corner'.
 * @property {[number, number, number, number]} rect  [x, y, width, height] in pixels at referenceSize, as drawn.
 * @property {Facing} [facing]              The wall or corner the spot is against. Overlays are drawn against the
 *                                          north wall (or the west wall, or the north-west corner); facing says
 *                                          how to mirror them to suit this spot, and which edge to keep them to.
 * @property {boolean} [canBlock]           Blocking overlays may go here without cutting the tile in two.
 * @property {number} [chance]              Chance (0-1) the spot gets a decoration. Default: overlayChance.
 *
 * @typedef {object} RoomTemplate
 * @property {string} id
 * @property {number} width                 In tiles, at least 2.
 * @property {number} height                In tiles, at least 2.
 * @property {RoomSlot[][]} [slots]         Slot for each cell, row by row. Inferred from position when omitted:
 *                                          corners, edges ('n', 'e', 's', 'w') and centre ('c').
 *
 * @typedef {object} OverlayDef             A decoration drawn on top of a tile. Either fixed in place (`offset`) or
 *                                          placed on tile spots (`spots`).
 * @property {string} id
 * @property {string} image
 * @property {[number, number]} [offset]    Fixed overlays: [x, y] in pixels at referenceSize. Drawn unmirrored.
 * @property {string[]} [spots]             Spot overlays: the spot kinds this overlay suits.
 * @property {[number, number]} [size]      Spot overlays: footprint [width, height] in pixels at referenceSize.
 *                                          It must fit inside the spot. The image is centred on the footprint and
 *                                          may be larger, e.g. to include a glow.
 * @property {boolean} [blocks]             Spot overlays: the hero can't walk through it. Only placed on spots
 *                                          marked canBlock.
 * @property {string[]} [onTags]            Only placed on tiles that have every one of these tags.
 * @property {Cardinal[]} [onExits]         Fixed overlays: only placed on tiles with exactly these exits. Preferred
 *                                          over overlays without onExits whenever one fits.
 *
 * @typedef {object} TilesetData            The JSON file's shape.
 * @property {string} id
 * @property {string} name
 * @property {string} [credits]
 * @property {number} referenceSize         Pixel size that overlay offsets and sprite sizes are measured in.
 * @property {number} subGrid               Walk cells per tile side.
 * @property {Object<string, string>} resolutions  Tile pixel size → image folder, relative to index.html.
 * @property {number} overlayChance         Chance (0-1) that a tile, or a spot, with matching overlays gets one.
 * @property {Object<string, string>} [sprites]  Sprite id → image, relative to index.html, replacing the game's
 *                                          default sprite while this tileset is in use (e.g. a different hero).
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
    if (data.sprites !== undefined && (typeof data.sprites !== 'object' || !Object.values(data.sprites).every((url) => typeof url === 'string'))) {
        errors.push('sprites must map sprite ids to image paths');
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
        if (tile.weight !== undefined && !(tile.weight > 0)) errors.push(`${where}: weight must be a positive number`);
        if (tile.role === 'room' && !ROOM_SLOTS.includes(tile.roomSlot)) {
            errors.push(`${where}: room pieces need a roomSlot (${ROOM_SLOTS.join(', ')})`);
        }
        if (tile.spawn !== undefined && !tile.walk?.[tile.spawn]) {
            errors.push(`${where}: spawn "${tile.spawn}" is not a walkable cell`);
        }
        for (const [index, spot] of (tile.spots ?? []).entries()) {
            errors.push(...spotErrors(spot, data.referenceSize).map((problem) => `${where}: spot ${index + 1} ${problem}`));
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

    const spotKinds = new Set(data.tiles.flatMap((tile) => (tile.spots ?? []).map((spot) => spot.kind)));
    for (const overlay of data.overlays ?? []) {
        const where = `overlay "${overlay.id}"`;
        if (!overlay.id || !overlay.image) errors.push(`${where}: needs an id and an image`);
        if (overlay.onTags !== undefined && !Array.isArray(overlay.onTags)) errors.push(`${where}: onTags must be a list`);
        if (overlay.onExits && !overlay.onExits.every((side) => CARDINALS.includes(side))) {
            errors.push(`${where}: onExits must be a list of n, e, s, w`);
        }
        if (Array.isArray(overlay.spots)) {
            if (!isPair(overlay.size)) errors.push(`${where}: spot overlays need a size [width, height]`);
            if (!overlay.spots.some((kind) => spotKinds.has(kind))) {
                warnings.push(`${where}: no tile has a spot of kind ${overlay.spots.join(' or ')}`);
            }
        } else if (!isPair(overlay.offset)) {
            errors.push(`${where}: needs either an offset [x, y] or a list of spots`);
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

const FACINGS = ['n', 'e', 's', 'w', 'nw', 'ne', 'sw', 'se'];

/** @param {SpotDef} spot */
function spotErrors(spot, size) {
    const problems = [];
    if (typeof spot.kind !== 'string' || !spot.kind) problems.push('needs a kind');
    const [x, y, width, height] = Array.isArray(spot.rect) ? spot.rect : [];
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
        problems.push('rect must be [x, y, width, height]');
    } else if (x < -0.01 || y < -0.01 || x + width > size + 0.01 || y + height > size + 0.01) {
        problems.push('rect must lie inside the tile');
    }
    if (spot.facing !== undefined && !FACINGS.includes(spot.facing)) problems.push(`facing must be one of ${FACINGS.join(', ')}`);
    if (spot.chance !== undefined && !(spot.chance >= 0 && spot.chance <= 1)) problems.push('chance must be between 0 and 1');
    return problems;
}

function isPair(value) {
    return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
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
