import { ALL_EXITS, BIT, CARDINALS, OPPOSITE, STEP } from '../core/directions.js';
import { chooseVariant } from './selection.js';

/**
 * @typedef {import('./dungeon.js').Dungeon} Dungeon
 * @typedef {import('./dungeon.js').Cell} Cell
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../core/rng.js').Rng} Rng
 */

/**
 * Finds every tile you can walk to from `from` through matching exits.
 *
 * Corridor tiles tagged 'deadend' have openings that don't all join up inside the tile, so they can be entered but
 * not walked through.
 *
 * @param {Dungeon} dungeon
 * @param {{row: number, col: number}} from
 * @returns {Uint8Array} 1 for each reachable tile, row-major.
 */
export function findReachable(dungeon, from) {
    const reachable = new Uint8Array(dungeon.cols * dungeon.rows);
    reachable[from.row * dungeon.cols + from.col] = 1;
    spread(dungeon, reachable, dungeon.get(from.row, from.col), from);
    return reachable;
}

/**
 * Opens the way into every part of the map that can't be reached from the start, where it can: picks a closed side
 * between a reachable tile and an unreachable one and swaps both tiles for variants that open onto each other but
 * are otherwise the same (a corridor with one more exit, a room's wall piece for its door piece). Repeats until
 * everything is reachable or nothing else can be opened. Solid filler is left alone.
 *
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @param {Rng} rng
 */
export function connectAll(dungeon, tileset, rng) {
    const reachable = findReachable(dungeon, dungeon.start);
    /** @type {{cell: Cell, side: string}[]} Closed sides between a reachable tile and one that isn't. */
    const frontier = [];
    const addFrontier = (cell) => {
        for (const side of CARDINALS) {
            const next = dungeon.get(cell.row + STEP[side].dy, cell.col + STEP[side].dx);
            if (next && !reachable[index(dungeon, next)] && next.tile.role !== 'filler') frontier.push({ cell, side });
        }
    };
    for (const cell of dungeon) {
        if (reachable[index(dungeon, cell)] && !isDeadEnd(cell, dungeon.start)) addFrontier(cell);
    }

    while (frontier.length) {
        const pick = rng.int(0, frontier.length - 1);
        const { cell: { row, col }, side } = frontier[pick];
        frontier[pick] = frontier[frontier.length - 1];
        frontier.pop();

        const from = dungeon.get(row, col);
        const to = dungeon.get(row + STEP[side].dy, col + STEP[side].dx);
        if (reachable[index(dungeon, to)]) continue;
        const opened = withExit(tileset, from, side, rng);
        const entered = opened && withExit(tileset, to, OPPOSITE[side], rng);
        if (!entered) continue;

        dungeon.place(from.row, from.col, opened, { room: from.room });
        const placed = dungeon.place(to.row, to.col, entered, { room: to.room });
        reachable[index(dungeon, placed)] = 1;
        for (const added of [placed, ...spread(dungeon, reachable, placed, dungeon.start)]) {
            if (!isDeadEnd(added, dungeon.start)) addFrontier(added);
        }
    }
}

/**
 * A variant of the cell's tile, or another of the same kind, with every exit it has now plus `side`.
 * @returns {import('../tileset/tileset.js').Variant|null}
 */
function withExit(tileset, cell, side, rng) {
    if (cell.exits & BIT[side]) return null;
    const exits = cell.exits | BIT[side];
    const constraints = { required: exits, forbidden: ALL_EXITS & ~exits };
    const { role, roomSlot, theme } = cell.tile;
    return chooseVariant(tileset, role, constraints, rng, roomSlot, role === 'room' ? theme ?? null : undefined);
}

/**
 * Marks everything newly reachable from `cell`, which must already be marked.
 * @returns {Cell[]} The cells it marked.
 */
function spread(dungeon, reachable, cell, origin) {
    const added = [];
    const stack = [cell];
    while (stack.length) {
        const current = stack.pop();
        if (isDeadEnd(current, origin)) continue;

        for (const side of CARDINALS) {
            if (!(current.exits & BIT[side])) continue;
            const next = dungeon.get(current.row + STEP[side].dy, current.col + STEP[side].dx);
            if (!next || !(next.exits & BIT[OPPOSITE[side]])) continue;
            const at = index(dungeon, next);
            if (reachable[at]) continue;
            reachable[at] = 1;
            added.push(next);
            stack.push(next);
        }
    }
    return added;
}

/** A dead end can be entered but not walked through, unless you start there. */
function isDeadEnd(cell, origin) {
    return cell.tile.role === 'corridor' && cell.tile.tags.includes('deadend') && !(cell.row === origin.row && cell.col === origin.col);
}

function index(dungeon, cell) {
    return cell.row * dungeon.cols + cell.col;
}
