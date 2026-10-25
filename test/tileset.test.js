import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import { BIT } from '../src/core/directions.js';
import { createTileset, slotAt, validateTileset } from '../src/tileset/tileset.js';
import { PUBLIC_DIR, shippedTilesetData, tinyTilesetData } from './support.js';

describe('the shipped tileset', () => {
    const data = shippedTilesetData();

    it('has no errors', () => {
        assert.deepEqual(validateTileset(data).errors, []);
    });

    it('has an image for every tile and overlay at every size', () => {
        const files = [...data.tiles, ...data.overlays].map((entry) => entry.image);
        const missing = Object.values(data.resolutions).flatMap((folder) => files
            .filter((file) => !existsSync(new URL(folder + file, PUBLIC_DIR)))
            .map((file) => folder + file));
        assert.deepEqual(missing, []);
    });

    it('can fill a cell whatever exits its neighbours demand', () => {
        const warnings = validateTileset(data).warnings;
        assert.ok(!warnings.some((warning) => warning.startsWith('no corridor tile')), warnings.join('\n'));
    });
});

describe('validateTileset', () => {
    const errorsFor = (change) => {
        const data = tinyTilesetData();
        change(data);
        return validateTileset(data).errors;
    };

    it('accepts the test tileset', () => {
        assert.deepEqual(errorsFor(() => {}), []);
    });

    it('reports duplicate ids', () => {
        assert.match(errorsFor((data) => data.tiles.push({ ...data.tiles[1] })).join(), /duplicate id/);
    });

    it('reports unknown directions in walk maps', () => {
        assert.match(errorsFor((data) => { data.tiles[1].walk['0,0'] = ['dd']; }).join(), /unknown direction/);
    });

    it('reports walk cells outside the grid', () => {
        assert.match(errorsFor((data) => { data.tiles[1].walk['2,0'] = ['n']; }).join(), /inside the grid/);
    });

    it('reports room pieces without a slot', () => {
        assert.match(errorsFor((data) => { delete data.tiles.find((t) => t.role === 'room').roomSlot; }).join(), /roomSlot/);
    });

    it('reports room templates that need a missing slot', () => {
        assert.match(errorsFor((data) => {
            data.tiles = data.tiles.filter((t) => t.roomSlot !== 'c');
        }).join(), /no room piece for slot "c"/);
    });

    it('reports a missing start tile', () => {
        assert.match(errorsFor((data) => { data.tiles = data.tiles.filter((t) => t.role !== 'start'); }).join(), /role "start"/);
    });

    it('warns about unmapped tiles and one-way moves', () => {
        const { warnings } = validateTileset(tinyTilesetData());
        assert.ok(warnings.some((w) => w.includes('"hallway": no walk map')));
        assert.ok(warnings.some((w) => w.includes('"cross": "0,0" moves e into unmapped cell "0,1"')));
    });

    it('makes createTileset throw on errors', () => {
        const data = tinyTilesetData();
        data.tiles[1].exits = ['up'];
        assert.throws(() => createTileset(data), /exits must be a list/);
    });
});

describe('createTileset', () => {
    const tileset = createTileset(tinyTilesetData());

    it('lists every orientation of corridor tiles but only one of room pieces', () => {
        assert.equal(tileset.variants('corridor').filter((v) => v.tile.id === 'corner').length, 4);
        assert.equal(tileset.variants('room', 'nw').length, 1);
    });

    it('finds the variants that satisfy exit constraints, grouped by tile', () => {
        const groups = tileset.candidates('corridor', BIT.n | BIT.w, BIT.e | BIT.s);
        assert.deepEqual(groups.map((group) => group[0].tile.id), ['corner']);
        assert.deepEqual(groups[0].map((v) => v.orientation), [{ flipH: true, flipV: true }]);
    });

    it('returns nothing when no tile fits', () => {
        assert.deepEqual(tileset.candidates('corridor', 0, BIT.n | BIT.e | BIT.s | BIT.w), []);
    });
});

describe('slotAt', () => {
    it('infers corners, edges and centre from position', () => {
        const template = { id: 'wide', width: 4, height: 3 };
        const slots = [0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => slotAt(template, row, col)));
        assert.deepEqual(slots, [
            ['nw', 'n', 'n', 'ne'],
            ['w', 'c', 'c', 'e'],
            ['sw', 's', 's', 'se'],
        ]);
    });

    it('uses explicit slots when given', () => {
        assert.equal(slotAt({ id: 'x', width: 2, height: 2, slots: [['c', 'c'], ['c', 'c']] }, 0, 0), 'c');
    });
});
