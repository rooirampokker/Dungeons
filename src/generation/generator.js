import { createRng, randomSeed } from '../core/rng.js';
import { connectAll, findReachable } from './connectivity.js';
import { Dungeon } from './dungeon.js';
import { decorate } from './overlays.js';
import { placeRooms } from './rooms.js';
import { chooseVariant, closestVariant, constraintsAt } from './selection.js';

/**
 * Builds a dungeon in stages:
 *   1. the start tile, somewhere on the top row;
 *   2. big rooms, stamped from the tileset's room templates;
 *   3. corridors, filled in row by row so every tile fits the neighbours already placed;
 *   4. if `connect` is on, doors and openings wherever they join up parts of the map that can't be reached;
 *   5. overlays (decorations).
 * A layout where too little of the map can be reached from the start is thrown away and another is tried.
 *
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('./rooms.js').RoomOptions} RoomOptions
 * @typedef {import('../core/rng.js').Rng} Rng
 *
 * @typedef {object} GeneratorOptions
 * @property {number} cols
 * @property {number} rows
 * @property {string|number|null} seed  The same seed always gives the same dungeon. Random when null.
 * @property {RoomOptions} rooms
 * @property {boolean} connect          Open up the way into every part of the map that can be reached no other way.
 * @property {number} minReachable      Share of tiles (0-1) that must be reachable from the start tile.
 * @property {number} maxAttempts       Layouts to try before settling for the best one.
 */

/** @type {GeneratorOptions} */
export const DEFAULT_OPTIONS = Object.freeze({
    cols: 20,
    rows: 9,
    seed: null,
    rooms: Object.freeze({
        enabled: true, max: null, templates: null, margin: 1, spacing: 1, attempts: null,
        packed: false, adjoin: 0, minDoors: 0,
    }),
    connect: false,
    minReachable: 0.5,
    maxAttempts: 30,
});

/**
 * @param {Tileset} tileset
 * @param {Partial<Omit<GeneratorOptions, 'rooms'>> & {rooms?: Partial<RoomOptions>}} [options]  These win over the
 *        tileset's own `generation` options, which win over DEFAULT_OPTIONS.
 * @returns {Dungeon}
 */
export function generateDungeon(tileset, options = {}) {
    const own = tileset.generation ?? {};
    const settings = {
        ...DEFAULT_OPTIONS,
        ...own,
        ...options,
        rooms: { ...DEFAULT_OPTIONS.rooms, ...own.rooms, ...options.rooms },
    };
    for (const key of ['cols', 'rows']) {
        if (!Number.isInteger(settings[key]) || settings[key] < 2) {
            throw new RangeError(`${key} must be a whole number of at least 2`);
        }
    }

    const seed = String(settings.seed ?? randomSeed());
    let best = null;
    let attempts = 0;
    while (attempts < settings.maxAttempts) {
        attempts++;
        const dungeon = buildLayout(tileset, settings, createRng(`${seed}/${attempts}`));
        if (!best || dungeon.stats.reachableRatio > best.stats.reachableRatio) best = dungeon;
        if (dungeon.stats.reachableRatio >= settings.minReachable) break;
    }

    best.seed = seed;
    best.stats.attempts = attempts;
    return best;
}

/**
 * @param {Tileset} tileset
 * @param {GeneratorOptions} settings
 * @param {Rng} rng
 * @returns {Dungeon}
 */
function buildLayout(tileset, settings, rng) {
    const dungeon = new Dungeon(settings.cols, settings.rows);
    placeStart(dungeon, tileset, rng);
    placeRooms(dungeon, tileset, settings.rooms, rng);
    fillCorridors(dungeon, tileset, rng);
    if (settings.connect) connectAll(dungeon, tileset, rng);

    const roomCounts = new Map();
    for (const cell of dungeon) cell.decorations = decorate(tileset, cell, rng, roomCounts);

    dungeon.reachable = findReachable(dungeon, dungeon.start);
    const reachableCount = dungeon.reachable.reduce((sum, value) => sum + value, 0);
    dungeon.stats = {
        attempts: 0,
        reachableRatio: reachableCount / (dungeon.cols * dungeon.rows),
        conflicts: dungeon.cells.filter((cell) => cell.conflict).length,
    };
    return dungeon;
}

function placeStart(dungeon, tileset, rng) {
    const col = dungeon.cols > 2 ? rng.int(1, dungeon.cols - 2) : 0;
    const constraints = constraintsAt(dungeon, 0, col);
    const variant = chooseVariant(tileset, 'start', constraints, rng) ?? closestVariant(tileset, 'start', constraints, rng);
    dungeon.place(0, col, variant);
    dungeon.start = { row: 0, col };
}

function fillCorridors(dungeon, tileset, rng) {
    for (let row = 0; row < dungeon.rows; row++) {
        for (let col = 0; col < dungeon.cols; col++) {
            if (dungeon.get(row, col)) continue;

            const constraints = constraintsAt(dungeon, row, col);
            // Filler (solid rock) only fits when every side has to be closed.
            const variant = chooseVariant(tileset, 'corridor', constraints, rng)
                ?? chooseVariant(tileset, 'filler', constraints, rng);
            if (variant) {
                dungeon.place(row, col, variant);
            } else {
                dungeon.place(row, col, closestVariant(tileset, 'corridor', constraints, rng), { conflict: true });
            }
        }
    }
}
