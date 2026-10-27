import { BIT, CARDINALS, OPPOSITE, STEP } from '../core/directions.js';

/**
 * Picking a tile for one cell. A cell's constraints are two exit bitmasks: sides that must be open and sides that
 * must be closed. Sides facing cells that haven't been decided yet are free either way.
 *
 * @typedef {import('./dungeon.js').Dungeon} Dungeon
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../tileset/tileset.js').TileRole} TileRole
 * @typedef {import('../tileset/tileset.js').RoomSlot} RoomSlot
 * @typedef {import('../tileset/tileset.js').Variant} Variant
 * @typedef {import('../core/rng.js').Rng} Rng
 *
 * @typedef {{required: number, forbidden: number}} Constraints
 */

/**
 * @param {Dungeon} dungeon
 * @param {number} row
 * @param {number} col
 * @param {(row: number, col: number) => boolean} [mustConnect]  Undecided cells that this cell must open towards
 *                                                               (used for the inside of a room being placed).
 * @returns {Constraints}
 */
export function constraintsAt(dungeon, row, col, mustConnect = () => false) {
    let required = 0;
    let forbidden = 0;
    for (const side of CARDINALS) {
        const r = row + STEP[side].dy;
        const c = col + STEP[side].dx;
        if (!dungeon.inBounds(r, c)) {
            forbidden |= BIT[side];
            continue;
        }
        const neighbour = dungeon.get(r, c);
        if (neighbour) {
            if (neighbour.exits & BIT[OPPOSITE[side]]) required |= BIT[side];
            else forbidden |= BIT[side];
        } else if (mustConnect(r, c)) {
            required |= BIT[side];
        }
    }
    return { required, forbidden };
}

/**
 * A random variant that satisfies the constraints, or null if none does. Matching tiles are picked in proportion
 * to their weight (1 unless the tileset says otherwise), however many of their orientations match.
 * @param {Tileset} tileset
 * @param {TileRole} role
 * @param {Constraints} constraints
 * @param {Rng} rng
 * @param {RoomSlot} [slot]
 * @param {string|null} [theme]  Room pieces: the room's theme.
 * @returns {Variant|null}
 */
export function chooseVariant(tileset, role, { required, forbidden }, rng, slot, theme) {
    const byTile = tileset.candidates(role, required, forbidden, slot, theme);
    return byTile.length ? rng.pick(pickWeighted(byTile, rng)) : null;
}

/**
 * @param {Variant[][]} byTile  Variants grouped by tile.
 * @param {Rng} rng
 * @returns {Variant[]}
 */
function pickWeighted(byTile, rng) {
    const weightOf = (group) => group[0].tile.weight ?? 1;
    let roll = rng.next() * byTile.reduce((sum, group) => sum + weightOf(group), 0);
    for (const group of byTile) {
        roll -= weightOf(group);
        if (roll < 0) return group;
    }
    return byTile[byTile.length - 1];
}

/**
 * The variant that breaks the fewest constraints. For when nothing fits exactly.
 * @param {Tileset} tileset
 * @param {TileRole} role
 * @param {Constraints} constraints
 * @param {Rng} rng
 * @returns {Variant|null}
 */
export function closestVariant(tileset, role, { required, forbidden }, rng) {
    let best = [];
    let bestScore = Infinity;
    for (const variant of tileset.variants(role)) {
        const score = bitCount(required & ~variant.exits) + bitCount(forbidden & variant.exits);
        if (score < bestScore) {
            best = [variant];
            bestScore = score;
        } else if (score === bestScore) {
            best.push(variant);
        }
    }
    return best.length ? rng.pick(best) : null;
}

function bitCount(mask) {
    let count = 0;
    for (let bits = mask; bits; bits &= bits - 1) count++;
    return count;
}
