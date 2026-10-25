import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIT, CARDINALS, OPPOSITE, STEP } from '../src/core/directions.js';
import { generateDungeon } from '../src/generation/generator.js';
import { createTileset, slotAt } from '../src/tileset/tileset.js';
import { shippedTileset, tinyTilesetData } from './support.js';

const tileset = shippedTileset();
const SIZES = [[2, 2], [5, 3], [20, 9], [37, 23]];
const SEEDS = Array.from({ length: 15 }, (_, i) => `test-${i}`);

function* dungeons() {
    for (const [cols, rows] of SIZES) {
        for (const seed of SEEDS) yield generateDungeon(tileset, { cols, rows, seed });
    }
}

const fingerprint = (dungeon) => dungeon.cells
    .map((cell) => `${cell.tile.id}:${+cell.orientation.flipH}${+cell.orientation.flipV}:${cell.overlay?.id ?? ''}`)
    .join('|');

describe('generateDungeon', () => {
    it('fills every cell of the requested size', () => {
        for (const dungeon of dungeons()) {
            assert.equal(dungeon.cells.length, dungeon.cols * dungeon.rows);
            assert.ok(dungeon.cells.every(Boolean));
        }
    });

    it('makes every tile fit its neighbours and keeps the outer edge closed', () => {
        for (const dungeon of dungeons()) {
            assert.equal(dungeon.stats.conflicts, 0, `seed ${dungeon.seed}`);
            for (const cell of dungeon) {
                for (const side of CARDINALS) {
                    const open = (cell.exits & BIT[side]) !== 0;
                    const row = cell.row + STEP[side].dy;
                    const col = cell.col + STEP[side].dx;
                    if (!dungeon.inBounds(row, col)) {
                        assert.equal(open, false, `${dungeon.seed}: ${cell.tile.id} at ${cell.row},${cell.col} opens ${side} off the map`);
                        continue;
                    }
                    const neighbourOpen = (dungeon.get(row, col).exits & BIT[OPPOSITE[side]]) !== 0;
                    assert.equal(open, neighbourOpen, `${dungeon.seed}: ${cell.row},${cell.col} and ${row},${col} disagree`);
                }
            }
        }
    });

    it('puts exactly one start tile on the top row', () => {
        for (const dungeon of dungeons()) {
            const starts = dungeon.cells.filter((cell) => cell.tile.role === 'start');
            assert.equal(starts.length, 1);
            assert.equal(starts[0].row, 0);
            assert.deepEqual(dungeon.start, { row: starts[0].row, col: starts[0].col });
        }
    });

    it('builds rooms from the right pieces, away from the edge', () => {
        let roomCount = 0;
        for (const dungeon of dungeons()) {
            for (const room of dungeon.rooms) {
                roomCount++;
                const { template } = room;
                assert.ok(room.row >= 1 && room.col >= 1);
                assert.ok(room.row + template.height < dungeon.rows && room.col + template.width < dungeon.cols);
                for (let r = 0; r < template.height; r++) {
                    for (let c = 0; c < template.width; c++) {
                        const cell = dungeon.get(room.row + r, room.col + c);
                        assert.equal(cell.room, room);
                        assert.equal(cell.tile.roomSlot, slotAt(template, r, c));
                    }
                }
            }
            const roomCells = dungeon.cells.filter((cell) => cell.room).length;
            assert.equal(roomCells, dungeon.rooms.reduce((sum, room) => sum + room.template.width * room.template.height, 0));
        }
        assert.ok(roomCount > 0, 'expected some rooms across all test dungeons');
    });

    it('places no rooms when they are turned off', () => {
        const dungeon = generateDungeon(tileset, { cols: 30, rows: 20, seed: 'no-rooms', rooms: { enabled: false } });
        assert.equal(dungeon.rooms.length, 0);
        assert.ok(dungeon.cells.every((cell) => cell.tile.role !== 'room'));
    });

    it('gives the same dungeon for the same seed and a different one for another seed', () => {
        const options = { cols: 20, rows: 9 };
        const a = generateDungeon(tileset, { ...options, seed: 'same' });
        const b = generateDungeon(tileset, { ...options, seed: 'same' });
        const c = generateDungeon(tileset, { ...options, seed: 'other' });
        assert.equal(fingerprint(a), fingerprint(b));
        assert.notEqual(fingerprint(a), fingerprint(c));
    });

    it('chooses a random seed when none is given', () => {
        const dungeon = generateDungeon(tileset, { cols: 5, rows: 5 });
        assert.match(dungeon.seed, /^[0-9a-z]+$/);
    });

    it('retries until enough of the map is reachable', () => {
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(tileset, { cols: 20, rows: 9, seed, minReachable: 0.6, maxAttempts: 50 });
            assert.ok(dungeon.stats.reachableRatio >= 0.6, `seed ${seed}: ${dungeon.stats.reachableRatio}`);
            assert.ok(dungeon.isReachable(dungeon.start.row, dungeon.start.col));
        }
    });

    it('rejects sizes below 2 × 2', () => {
        assert.throws(() => generateDungeon(tileset, { cols: 1, rows: 5 }), RangeError);
        assert.throws(() => generateDungeon(tileset, { cols: 5, rows: 2.5 }), RangeError);
    });

    it('builds rooms from any template size the tileset defines', () => {
        const data = tinyTilesetData();
        data.rooms = [{ id: 'long-hall', width: 4, height: 3 }];
        const tiny = createTileset(data);
        const dungeon = generateDungeon(tiny, { cols: 12, rows: 10, seed: 'long', rooms: { max: 2 } });
        assert.ok(dungeon.rooms.length > 0);
        for (const room of dungeon.rooms) {
            assert.equal(dungeon.cells.filter((cell) => cell.room === room).length, 12);
        }
    });

    it('puts exit-specific overlays only on tiles with exactly those exits', () => {
        const tiny = createTileset(tinyTilesetData());
        const dungeon = generateDungeon(tiny, { cols: 15, rows: 12, seed: 'overlays', rooms: { max: 4 } });
        const decorated = dungeon.cells.filter((cell) => cell.overlay);
        assert.ok(decorated.length > 0);
        for (const cell of decorated) {
            assert.ok(cell.tile.tags.includes('empty'));
            const expected = cell.exits === (BIT.n | BIT.w) ? 'statue' : 'rug';
            assert.equal(cell.overlay.id, expected);
        }
    });
});
