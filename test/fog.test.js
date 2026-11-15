import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateDungeon } from '../src/generation/generator.js';
import { EDGE, Fog, sightAt } from '../src/world/fog.js';
import { DEFAULT_SIGHT, createWorld, moveEntity } from '../src/world/world.js';
import { shippedTileset } from './support.js';

describe('sight', () => {
    it('is clear well inside the radius and fades to nothing at it', () => {
        assert.equal(sightAt(0, 12), 1);
        assert.equal(sightAt(12 - EDGE, 12), 1);
        assert.equal(sightAt(12 - EDGE / 2, 12), 0.5);
        assert.equal(sightAt(12, 12), 0);
        assert.equal(sightAt(30, 12), 0);
    });
});

describe('Fog', () => {
    it('starts with nothing seen', () => {
        const fog = new Fog(30, 20, 6);
        assert.ok(fog.seen.every((value) => value === 0));
        assert.equal(fog.isVisible(0, 0), false);
    });

    it('explores the circle around where the hero looks from, and no further', () => {
        const fog = new Fog(30, 20, 6);
        fog.look(10, 10);
        assert.ok(fog.isExplored(10, 10) && fog.isExplored(14, 10) && fog.isExplored(10, 5));
        assert.equal(fog.isExplored(16, 10), false);
        assert.equal(fog.isExplored(15, 15), false);
        assert.equal(fog.seen[10 * 30 + 10], 255);
    });

    it('keeps what has been seen, but only what is in sight now is visible', () => {
        const fog = new Fog(40, 20, 6);
        fog.look(5, 10);
        fog.look(25, 10);
        assert.ok(fog.isExplored(5, 10));
        assert.equal(fog.isVisible(5, 10), false);
        assert.ok(fog.isVisible(25, 10));
    });

    it('uses one circle for both: whatever is visible ends up explored, and nothing else does', () => {
        const fog = new Fog(40, 30, 7.5);
        fog.look(20, 15);
        for (let y = 0; y < 30; y++) {
            for (let x = 0; x < 40; x++) assert.equal(fog.isExplored(x, y), fog.isVisible(x, y), `${x},${y}`);
        }
    });

    it('never makes a cell less seen than it was', () => {
        const fog = new Fog(30, 20, 6);
        fog.look(10, 10);
        const before = fog.seen[10 * 30 + 13];
        fog.look(17, 10);
        assert.ok(fog.seen[10 * 30 + 13] >= before);
    });

    it('looks again from the same place when the radius changes', () => {
        const fog = new Fog(40, 30, 4);
        fog.look(20, 15);
        assert.equal(fog.isExplored(28, 15), false);
        fog.setRadius(10);
        assert.ok(fog.isExplored(28, 15) && fog.isVisible(28, 15));
    });

    it('stays inside the map at its edges', () => {
        const fog = new Fog(10, 10, 6);
        fog.look(0, 0);
        assert.ok(fog.isExplored(0, 0));
        assert.equal(fog.isExplored(-1, 0), false);
        assert.equal(fog.seen.length, 100);
    });
});

describe('fog in the world', () => {
    const tileset = shippedTileset('manor');
    const dungeon = () => generateDungeon(tileset, { cols: 20, rows: 9, seed: 'fog' });

    it('lets the hero see around the start, as far as the default sight', () => {
        const world = createWorld(dungeon(), tileset);
        const { hero, fog } = world;
        assert.equal(fog.radius, DEFAULT_SIGHT * tileset.subGrid);
        assert.ok(fog.isVisible(hero.x, hero.y) && fog.isExplored(hero.x, hero.y));
        assert.equal(fog.isExplored(hero.x, hero.y + fog.radius + 1), false);
    });

    it('takes the sight radius it is given', () => {
        const world = createWorld(dungeon(), tileset, { sight: 3 });
        assert.equal(world.fog.radius, 3);
    });

    it('uncovers the map as the hero walks, leaving behind what they saw', () => {
        const world = createWorld(dungeon(), tileset, { sight: 6 });
        const { hero, fog } = world;
        const start = { x: hero.x, y: hero.y };
        const explored = () => fog.seen.reduce((sum, value) => sum + (value >= 128), 0);
        const before = explored();
        let steps = 0;
        while (steps < 12 && moveEntity(world, hero, 's')) steps++;
        assert.ok(steps > 0, 'expected the hero to walk in from the front door');
        assert.ok(explored() > before);
        assert.ok(fog.isExplored(start.x, start.y));
        assert.ok(fog.isVisible(hero.x, hero.y));
        if (Math.hypot(hero.x - start.x, hero.y - start.y) > fog.radius) assert.equal(fog.isVisible(start.x, start.y), false);
    });

    it('only follows the hero, not other things that move', () => {
        const world = createWorld(dungeon(), tileset, { sight: 6 });
        const { hero, fog } = world;
        const rat = { id: 'rat', kind: 'creature', sprite: 'rat', x: hero.x, y: hero.y };
        world.entities.push(rat);
        const seen = fog.seen.slice();
        for (const direction of ['s', 's', 's', 'e', 'w']) moveEntity(world, rat, direction);
        assert.deepEqual(fog.seen, seen);
    });
});
