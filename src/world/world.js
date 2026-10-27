import { STEP } from '../core/directions.js';
import { parseCellKey } from '../tileset/tileset.js';
import { Fog } from './fog.js';
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
 * @property {Fog} fog          What the hero sees now and has seen so far.
 */

/** How far the hero sees unless told otherwise, in tiles. */
export const DEFAULT_SIGHT = 2;

/**
 * @param {Dungeon} dungeon
 * @param {Tileset} tileset
 * @param {{sight?: number}} [options]  sight: how far the hero sees, in walk cells. Default DEFAULT_SIGHT tiles.
 * @returns {World}
 */
export function createWorld(dungeon, tileset, { sight = DEFAULT_SIGHT * tileset.subGrid } = {}) {
    const walk = buildWalkGrid(dungeon, tileset);
    const hero = { id: 'hero', kind: 'hero', sprite: 'hero', ...spawnPoint(dungeon, tileset, walk) };
    const fog = new Fog(walk.width, walk.height, sight);
    fog.look(hero.x, hero.y);
    return { dungeon, tileset, walk, entities: [hero], hero, fog };
}

/**
 * Moves an entity one walk cell if the walk grid allows it. The hero looks around from wherever they end up.
 * @param {World} world
 * @param {Entity} entity
 * @param {Direction} direction
 * @returns {boolean} Whether it moved.
 */
export function moveEntity(world, entity, direction) {
    if (!world.walk.canMove(entity.x, entity.y, direction)) return false;
    entity.x += STEP[direction].dx;
    entity.y += STEP[direction].dy;
    if (entity === world.hero) world.fog.look(entity.x, entity.y);
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
