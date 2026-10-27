import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIT, IDENTITY } from '../src/core/directions.js';
import { Dungeon } from '../src/generation/dungeon.js';
import { generateDungeon } from '../src/generation/generator.js';
import { createTileset, WALKABLE } from '../src/tileset/tileset.js';
import { buildWalkGrid } from '../src/world/walkGrid.js';
import { createWorld, moveEntity } from '../src/world/world.js';
import { shippedTileset, tinyTilesetData } from './support.js';

const tiny = createTileset(tinyTilesetData());
const variant = (id, orientation = IDENTITY) => tiny.variants(tiny.tilesById.get(id).role)
    .find((v) => v.tile.id === id && v.orientation.flipH === orientation.flipH && v.orientation.flipV === orientation.flipV);

/** A hand-built 2 × 2 dungeon: start top-left, then the tiles given. */
function smallDungeon(right, below, belowRight) {
    const dungeon = new Dungeon(2, 2);
    dungeon.place(0, 0, variant('start'));
    dungeon.place(0, 1, right);
    dungeon.place(1, 0, below);
    dungeon.place(1, 1, belowRight);
    dungeon.start = { row: 0, col: 0 };
    return dungeon;
}

describe('buildWalkGrid', () => {
    it('copies unmirrored walk maps into place', () => {
        const dungeon = smallDungeon(variant('rock'), variant('straight'), variant('rock'));
        const walk = buildWalkGrid(dungeon, tiny);
        assert.equal(walk.width, 4);
        assert.equal(walk.get(0, 0), WALKABLE | BIT.e);
        assert.equal(walk.get(1, 0), WALKABLE | BIT.w | BIT.s);
        assert.equal(walk.get(0, 1), 0);
    });

    it('mirrors walk maps and their directions with the tile', () => {
        const flipped = { flipH: true, flipV: true };
        const dungeon = smallDungeon(variant('rock'), variant('straight'), variant('cross', flipped));
        const walk = buildWalkGrid(dungeon, tiny);
        // 'cross' only maps "0,0" (moves e, se, s); turned half way round that becomes "1,1" moving w, nw, n.
        assert.equal(walk.get(3, 3), WALKABLE | BIT.w | BIT.nw | BIT.n);
        assert.equal(walk.get(2, 2), 0);
    });
});

describe('movement', () => {
    it('spawns the hero on the start tile\'s spawn cell', () => {
        const world = createWorld(smallDungeon(variant('rock'), variant('straight'), variant('rock')), tiny);
        assert.deepEqual({ x: world.hero.x, y: world.hero.y }, { x: 0, y: 0 });
    });

    it('moves where the walk map allows and nowhere else', () => {
        const world = createWorld(smallDungeon(variant('rock'), variant('straight'), variant('rock')), tiny);
        const { hero } = world;
        assert.equal(moveEntity(world, hero, 's'), false); // "0,0" only allows east
        assert.equal(moveEntity(world, hero, 'w'), false); // off the map
        assert.equal(moveEntity(world, hero, 'e'), true);
        assert.equal(moveEntity(world, hero, 's'), true);
        assert.equal(moveEntity(world, hero, 's'), true); // into the tile below
        assert.deepEqual({ x: hero.x, y: hero.y }, { x: 1, y: 2 });
    });

    it('does not walk into tiles without a walk map', () => {
        const world = createWorld(smallDungeon(variant('rock'), variant('hallway'), variant('rock')), tiny);
        const { hero } = world;
        moveEntity(world, hero, 'e');
        moveEntity(world, hero, 's');
        assert.equal(moveEntity(world, hero, 's'), false);
    });

    it('spawns on a walkable cell in generated dungeons', () => {
        const tileset = shippedTileset();
        for (let i = 0; i < 20; i++) {
            const dungeon = generateDungeon(tileset, { cols: 15, rows: 8, seed: `spawn-${i}` });
            const world = createWorld(dungeon, tileset);
            assert.ok(world.walk.isWalkable(world.hero.x, world.hero.y));
            assert.equal(Math.floor(world.hero.y / tileset.subGrid), dungeon.start.row);
            assert.equal(Math.floor(world.hero.x / tileset.subGrid), dungeon.start.col);
        }
    });
});
