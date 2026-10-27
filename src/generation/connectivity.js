import { BIT, CARDINALS, OPPOSITE, STEP } from '../core/directions.js';

/**
 * @typedef {import('./dungeon.js').Dungeon} Dungeon
 * @typedef {import('./dungeon.js').Cell} Cell
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
    const stack = [dungeon.get(from.row, from.col)];

    while (stack.length) {
        const cell = stack.pop();
        if (isDeadEnd(cell) && !(cell.row === from.row && cell.col === from.col)) continue;

        for (const side of CARDINALS) {
            if (!(cell.exits & BIT[side])) continue;
            const next = dungeon.get(cell.row + STEP[side].dy, cell.col + STEP[side].dx);
            if (!next || !(next.exits & BIT[OPPOSITE[side]])) continue;
            const index = next.row * dungeon.cols + next.col;
            if (reachable[index]) continue;
            reachable[index] = 1;
            stack.push(next);
        }
    }
    return reachable;
}

/** @param {Cell} cell */
function isDeadEnd(cell) {
    return cell.tile.role === 'corridor' && cell.tile.tags.includes('deadend');
}
