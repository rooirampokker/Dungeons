import { STEP } from '../core/directions.js';
import { parseCellKey } from '../tileset/tileset.js';
import { buildWalkGrid } from './walkGrid.js';

/**
 * Game state for one dungeon: the map, its walk grid and everything that moves around in it. Positions are in walk
 * cells, never pixels; the renderer works out where to draw things.
 *
 * @typedef {import('../generation/dungeon.js').Dungeon} Dungeon
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../core/directions.js').Direction} Direction
 * @typedef {import('./walkGrid.js').WalkGrid} WalkGrid
 *
 * @typedef {object} Entity
 * @property {string} id
 * @property {string} kind      'hero' for now; creatures will add more.
 * @property {string} sprite    Sprite id, mapped to an image by the renderer.
 * @property {number} x         Walk-cell column.
 * @property {number} y         Walk-cell row.
 *
 * @typedef {object} World
 * @property {Dungeon} dungeon
 * @property {Tileset} tileset
 * @property {WalkGrid} walk
 * @property {Entity[]} entities
 * @property {Entity} hero
 */

/**
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @returns {World}
 */
export function createWorld(dungeon, tileset) {
    const walk = buildWalkGrid(dungeon, tileset);
    const hero = { id: 'hero', kind: 'hero', sprite: 'hero', ...spawnPoint(dungeon, tileset, walk) };
    return { dungeon, tileset, walk, entities: [hero], hero };
}

/**
 * Moves an entity one walk cell if the walk grid allows it.
 * @param {World} world
 * @param {Entity} entity
 * @param {Direction} direction
 * @returns {boolean} Whether it moved.
 */
export function moveEntity(world, entity, direction) {
    if (!world.walk.canMove(entity.x, entity.y, direction)) return false;
    entity.x += STEP[direction].dx;
    entity.y += STEP[direction].dy;
    return true;
}

/**
 * The start tile's spawn cell, mirrored like the tile; otherwise its first walkable cell, otherwise its centre.
 * @returns {{x: number, y: number}}
 */
function spawnPoint(dungeon, tileset, walk) {
    const size = tileset.subGrid;
    const start = dungeon.get(dungeon.start.row, dungeon.start.col);
    const originX = start.col * size;
    const originY = start.row * size;

    const spawn = start.tile.spawn && parseCellKey(start.tile.spawn, size);
    if (spawn) {
        return {
            x: originX + (start.orientation.flipH ? size - 1 - spawn.col : spawn.col),
            y: originY + (start.orientation.flipV ? size - 1 - spawn.row : spawn.row),
        };
    }
    for (let y = originY; y < originY + size; y++) {
        for (let x = originX; x < originX + size; x++) {
            if (walk.isWalkable(x, y)) return { x, y };
        }
    }
    return { x: originX + Math.floor(size / 2), y: originY + Math.floor(size / 2) };
}
