import { BIT, STEP, orientMask } from '../core/directions.js';
import { WALKABLE } from '../tileset/tileset.js';

/**
 * Movement data for the whole dungeon at walk-cell resolution: each tile contributes subGrid × subGrid cells,
 * already mirrored to match how the tile is drawn. Movement uses this today; line of sight, fog of war and
 * creature pathfinding can use the same grid.
 *
 * @typedef {import('../generation/dungeon.js').Dungeon} Dungeon
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../core/directions.js').Direction} Direction
 */
export class WalkGrid {
    /**
     * @param {number} width   In walk cells.
     * @param {number} height
     */
    constructor(width, height) {
        this.width = width;
        this.height = height;
        /** @type {Uint16Array} WALKABLE plus one bit per direction you may move in; 0 = can't be stood on. */
        this.cells = new Uint16Array(width * height);
    }

    get(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height ? this.cells[y * this.width + x] : 0;
    }

    isWalkable(x, y) {
        return (this.get(x, y) & WALKABLE) !== 0;
    }

    /**
     * A move is allowed when the current cell permits that direction and the cell it leads to can be stood on.
     * @param {number} x
     * @param {number} y
     * @param {Direction} direction
     */
    canMove(x, y, direction) {
        const { dx, dy } = STEP[direction];
        return (this.get(x, y) & BIT[direction]) !== 0 && this.isWalkable(x + dx, y + dy);
    }
}

/** A blocking decoration closes every walk cell it covers at least this much of. */
export const BLOCKING_COVERAGE = 0.35;

/**
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @returns {WalkGrid}
 */
export function buildWalkGrid(dungeon, tileset) {
    const size = tileset.subGrid;
    const grid = new WalkGrid(dungeon.cols * size, dungeon.rows * size);

    for (const cell of dungeon) {
        const source = tileset.walkMasks.get(cell.tile.id);
        const { flipH, flipV } = cell.orientation;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const value = source[row * size + col];
                if (!value) continue;
                const x = cell.col * size + (flipH ? size - 1 - col : col);
                const y = cell.row * size + (flipV ? size - 1 - row : row);
                grid.cells[y * grid.width + x] = WALKABLE | orientMask(value & 0xff, cell.orientation);
            }
        }

        for (const decoration of cell.decorations) {
            if (!decoration.overlay.blocks) continue;
            for (const { row, col } of coveredCells(decoration, tileset.referenceSize / size, size)) {
                grid.cells[(cell.row * size + row) * grid.width + cell.col * size + col] = 0;
            }
        }
    }
    return grid;
}

/**
 * Walk cells (row, col within the tile) that a footprint covers enough of to block.
 * @param {{x: number, y: number, width: number, height: number}} footprint  In pixels at referenceSize.
 * @param {number} cellSize  Walk cell size in the same pixels.
 * @param {number} size      Walk cells per tile side.
 */
export function coveredCells({ x, y, width, height }, cellSize, size) {
    const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
    const covered = [];
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const area = overlap(x, x + width, col * cellSize, (col + 1) * cellSize)
                * overlap(y, y + height, row * cellSize, (row + 1) * cellSize);
            if (area >= BLOCKING_COVERAGE * cellSize * cellSize) covered.push({ row, col });
        }
    }
    return covered;
}
