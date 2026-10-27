import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IDENTITY } from '../src/core/directions.js';
import { createRng } from '../src/core/rng.js';
import { Dungeon } from '../src/generation/dungeon.js';
import { decorate } from '../src/generation/overlays.js';
import { createTileset, validateTileset, WALKABLE } from '../src/tileset/tileset.js';
import { buildWalkGrid } from '../src/world/walkGrid.js';
import { tinyTilesetData } from './support.js';

/**
 * The tiny test tileset is 10 pixels a side with a 2 × 2 walk grid, so each walk cell is 5 pixels. Its 'cross'
 * tile gets spots here; the spot overlays below are the only ones that can go on spots.
 */
function spotTileset({ spots, overlays }) {
    const data = tinyTilesetData();
    data.tiles.find((tile) => tile.id === 'cross').spots = spots;
    data.overlays.push(...overlays);
    return createTileset(data);
}

const web = { id: 'web', image: 'web.png', spots: ['corner'], size: [2, 2] };
const crate = { id: 'crate', image: 'crate.png', spots: ['floor'], size: [4, 4], blocks: true };
const rat = { id: 'rat', image: 'rat.png', spots: ['floor'], size: [2, 1] };

function decorated(tileset, orientation = IDENTITY, seed = 'spots') {
    const tile = tileset.tilesById.get('cross');
    return decorate(tileset, { tile, orientation, exits: 0 }, createRng(seed));
}

describe('decorating tile spots', () => {
    it('keeps an overlay against its spot\'s corner and mirrors it to suit', () => {
        const tileset = spotTileset({ spots: [{ kind: 'corner', facing: 'ne', rect: [6, 0, 4, 4], chance: 1 }], overlays: [web] });
        const [decoration] = decorated(tileset);
        assert.deepEqual({ x: decoration.x, y: decoration.y }, { x: 8, y: 0 });
        assert.deepEqual(decoration.orientation, { flipH: true, flipV: false });
    });

    it('moves and mirrors decorations along with a mirrored tile', () => {
        const tileset = spotTileset({ spots: [{ kind: 'corner', facing: 'ne', rect: [6, 0, 4, 4], chance: 1 }], overlays: [web] });
        const [decoration] = decorated(tileset, { flipH: true, flipV: false });
        // The north-east corner is now the north-west one, which is how the overlay was drawn.
        assert.deepEqual({ x: decoration.x, y: decoration.y }, { x: 0, y: 0 });
        assert.deepEqual(decoration.orientation, IDENTITY);
    });

    it('centres floor decorations in their spot', () => {
        const tileset = spotTileset({ spots: [{ kind: 'floor', rect: [2, 2, 6, 6], chance: 1 }], overlays: [rat] });
        const [decoration] = decorated(tileset);
        assert.deepEqual({ x: decoration.x, y: decoration.y, width: decoration.width, height: decoration.height }, { x: 4, y: 4.5, width: 2, height: 1 });
    });

    it('only puts blocking overlays on spots that allow it', () => {
        const spots = [{ kind: 'floor', rect: [0, 0, 5, 5], chance: 1 }];
        assert.deepEqual(decorated(spotTileset({ spots, overlays: [crate] })), []);
        const allowed = decorated(spotTileset({ spots: [{ ...spots[0], canBlock: true }], overlays: [crate] }));
        assert.equal(allowed[0].overlay.id, 'crate');
    });

    it('skips overlays too big for the spot', () => {
        const tileset = spotTileset({ spots: [{ kind: 'floor', rect: [0, 0, 3, 3], chance: 1, canBlock: true }], overlays: [crate, rat] });
        for (let i = 0; i < 20; i++) assert.equal(decorated(tileset, IDENTITY, `small-${i}`)[0].overlay.id, 'rat');
    });

    it('rolls each spot\'s chance separately and avoids repeating an overlay on one tile', () => {
        const spots = [
            { kind: 'floor', rect: [0, 0, 5, 5], chance: 1, canBlock: true },
            { kind: 'floor', rect: [5, 5, 5, 5], chance: 1, canBlock: true },
            { kind: 'floor', rect: [0, 5, 5, 5], chance: 0 },
        ];
        const decorations = decorated(spotTileset({ spots, overlays: [crate, rat] }));
        assert.equal(decorations.length, 2);
        assert.notEqual(decorations[0].overlay.id, decorations[1].overlay.id);
    });
});

describe('limits and weights', () => {
    const spots = [0, 2, 4, 6].map((x) => ({ kind: 'floor', rect: [x, 0, 2, 2], chance: 1 }));
    const hearth = { id: 'hearth', image: 'hearth.png', spots: ['floor'], size: [1, 1], perRoom: 1, group: 'fire' };
    const hearthTurned = { ...hearth, id: 'hearth-v', image: 'hearth-v.png' };

    it('keeps an overlay to its perRoom limit across the room, counting its group together', () => {
        const tileset = spotTileset({ spots, overlays: [hearth, hearthTurned, rat] });
        const tile = tileset.tilesById.get('cross');
        for (let i = 0; i < 20; i++) {
            const rng = createRng(`limit-${i}`);
            const counts = new Map();
            const room = { id: 'hall#1' };
            const placed = [0, 1, 2].flatMap(() => decorate(tileset, { tile, orientation: IDENTITY, exits: 0, room }, rng, counts));
            assert.ok(placed.filter((d) => d.overlay.id.startsWith('hearth')).length <= 1);
        }
    });

    it('doesn\'t limit overlays outside rooms', () => {
        const tileset = spotTileset({ spots, overlays: [hearth] });
        assert.equal(decorated(tileset).length, 4);
    });

    it('picks overlays in proportion to their weight', () => {
        const tileset = spotTileset({ spots: [spots[0]], overlays: [{ ...rat, weight: 9 }, { ...rat, id: 'mouse', image: 'mouse.png' }] });
        let rats = 0;
        for (let i = 0; i < 400; i++) if (decorated(tileset, IDENTITY, `weight-${i}`)[0].overlay.id === 'rat') rats++;
        assert.ok(rats > 320 && rats < 390, `${rats} rats`);
    });
});

describe('blocking decorations', () => {
    it('close the walk cells they cover', () => {
        const tileset = spotTileset({ spots: [{ kind: 'floor', rect: [0, 0, 5, 5], chance: 1, canBlock: true }], overlays: [crate] });
        const dungeon = new Dungeon(1, 1);
        const cell = dungeon.place(0, 0, tileset.variants('corridor').find((v) => v.tile.id === 'cross'));
        cell.decorations = decorated(tileset);
        const walk = buildWalkGrid(dungeon, tileset);
        // 'cross' maps only cell "0,0"; the crate covers it.
        assert.equal(walk.get(0, 0), 0);

        cell.decorations = [];
        assert.ok(buildWalkGrid(dungeon, tileset).get(0, 0) & WALKABLE);
    });
});

describe('validating spots', () => {
    const errorsFor = (change) => {
        const data = tinyTilesetData();
        change(data);
        return validateTileset(data).errors.join('\n');
    };

    it('needs spots inside the tile', () => {
        assert.match(errorsFor((data) => { data.tiles[1].spots = [{ kind: 'floor', rect: [8, 8, 4, 4] }]; }), /inside the tile/);
    });

    it('needs a known facing', () => {
        assert.match(errorsFor((data) => { data.tiles[1].spots = [{ kind: 'wall', rect: [0, 0, 4, 2], facing: 'up' }]; }), /facing/);
    });

    it('needs weights to be positive and perRoom a whole number', () => {
        assert.match(errorsFor((data) => data.overlays.push({ ...rat, weight: 0 })), /weight must be a positive/);
        assert.match(errorsFor((data) => data.overlays.push({ ...rat, perRoom: 1.5 })), /perRoom must be a whole number/);
    });

    it('needs spot overlays to have a size, and other overlays an offset', () => {
        assert.match(errorsFor((data) => data.overlays.push({ id: 'x', image: 'x.png', spots: ['floor'] })), /need a size/);
        assert.match(errorsFor((data) => data.overlays.push({ id: 'y', image: 'y.png' })), /offset \[x, y\] or a list of spots/);
    });
});
