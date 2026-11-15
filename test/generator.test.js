import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIT, CARDINALS, OPPOSITE, STEP } from '../src/core/directions.js';
import { createRng } from '../src/core/rng.js';
import { DEFAULT_OPTIONS, generateDungeon } from '../src/generation/generator.js';
import { chooseVariant } from '../src/generation/selection.js';
import { createTileset, slotAt } from '../src/tileset/tileset.js';
import { DRAWN, SHIPPED, shippedTileset, tinyTilesetData } from './support.js';

const tileset = shippedTileset();
const allTilesets = SHIPPED.map((id) => shippedTileset(id));
const SIZES = [[2, 2], [5, 3], [20, 9], [37, 23]];
const SEEDS = Array.from({ length: 15 }, (_, i) => `test-${i}`);

/** Dungeons of every test size and seed, from every shipped tileset (or just the ones given). */
function* dungeons(sets = allTilesets) {
    for (const set of sets) {
        for (const [cols, rows] of SIZES) {
            for (const seed of SEEDS) yield generateDungeon(set, { cols, rows, seed });
        }
    }
}

/** The tiny tileset with every room piece in two themes, 'red' and 'blue', and the hall able to be either. */
function themedTinyTileset() {
    const data = tinyTilesetData();
    const pieces = data.tiles.filter((tile) => tile.role === 'room');
    data.tiles = [
        ...data.tiles.filter((tile) => tile.role !== 'room'),
        ...['red', 'blue'].flatMap((theme) => pieces.map((piece) => ({ ...piece, id: `${theme}-${piece.id}`, theme }))),
    ];
    data.rooms = [{ id: 'hall', width: 2, height: 2, themes: ['red', 'blue'] }, { id: 'long', width: 3, height: 2, themes: ['red'] }];
    return createTileset(data);
}

/** Exits from a room's pieces to outside it. */
function doorsOf(dungeon, room) {
    let doors = 0;
    for (const cell of dungeon.cells.filter((c) => c.room === room)) {
        for (const side of CARDINALS) {
            const neighbour = dungeon.get(cell.row + STEP[side].dy, cell.col + STEP[side].dx);
            if ((cell.exits & BIT[side]) && neighbour?.room !== room) doors++;
        }
    }
    return doors;
}

const fingerprint = (dungeon) => dungeon.cells
    .map((cell) => `${cell.tile.id}:${+cell.orientation.flipH}${+cell.orientation.flipV}:${cell.decorations.map((d) => d.overlay.id)}`)
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

    it('builds rooms from the right pieces, keeping the margin from the edge', () => {
        let roomCount = 0;
        for (const set of allTilesets) {
            const margin = set.generation?.rooms?.margin ?? DEFAULT_OPTIONS.rooms.margin;
            for (const dungeon of dungeons([set])) {
                for (const room of dungeon.rooms) {
                    roomCount++;
                    const { template } = room;
                    assert.ok(room.row >= margin && room.col >= margin);
                    assert.ok(room.row + template.height <= dungeon.rows - margin && room.col + template.width <= dungeon.cols - margin);
                    for (let r = 0; r < template.height; r++) {
                        for (let c = 0; c < template.width; c++) {
                            const cell = dungeon.get(room.row + r, room.col + c);
                            assert.equal(cell.room, room);
                            assert.equal(cell.tile.roomSlot, slotAt(template, r, c));
                            assert.equal(cell.tile.theme, room.theme ?? undefined);
                        }
                    }
                }
                const roomCells = dungeon.cells.filter((cell) => cell.room).length;
                assert.equal(roomCells, dungeon.rooms.reduce((sum, room) => sum + room.template.width * room.template.height, 0));
            }
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
        for (const set of allTilesets) {
            for (const seed of SEEDS) {
                const dungeon = generateDungeon(set, { cols: 20, rows: 9, seed, minReachable: 0.6, maxAttempts: 50 });
                assert.ok(dungeon.stats.reachableRatio >= 0.6, `${set.id} seed ${seed}: ${dungeon.stats.reachableRatio}`);
                assert.ok(dungeon.isReachable(dungeon.start.row, dungeon.start.col));
            }
        }
    });

    it('picks tiles in proportion to their weight', () => {
        const pickStraight = (weight) => {
            const data = tinyTilesetData();
            data.tiles.find((tile) => tile.id === 'straight').weight = weight;
            const tiny = createTileset(data);
            const rng = createRng('weights');
            let count = 0;
            for (let i = 0; i < 1000; i++) {
                // Six corridor tiles can open north with the other sides free.
                if (chooseVariant(tiny, 'corridor', { required: BIT.n, forbidden: 0 }, rng).tile.id === 'straight') count++;
            }
            return count;
        };
        assert.ok(pickStraight(1) < 250, 'one in six with equal weights');
        assert.ok(pickStraight(50) > 850, 'fifty in fifty-five when weighted up');
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

    it('puts exit-specific fixed overlays only on tiles with exactly those exits', () => {
        const tiny = createTileset(tinyTilesetData());
        const dungeon = generateDungeon(tiny, { cols: 15, rows: 12, seed: 'overlays', rooms: { max: 4 } });
        const decorated = dungeon.cells.filter((cell) => cell.decorations.length);
        assert.ok(decorated.length > 0);
        for (const cell of decorated) {
            assert.equal(cell.decorations.length, 1);
            assert.ok(cell.tile.tags.includes('empty'));
            const expected = cell.exits === (BIT.n | BIT.w) ? 'statue' : 'rug';
            assert.equal(cell.decorations[0].overlay.id, expected);
        }
    });

    it('packs the map with rooms, each at least `spacing` from the next', () => {
        const tiny = createTileset(tinyTilesetData());
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(tiny, { cols: 20, rows: 14, seed, rooms: { packed: true, margin: 0, spacing: 1 } });
            assert.ok(dungeon.rooms.length >= 6, `${seed}: only ${dungeon.rooms.length} rooms`);
            for (const a of dungeon.rooms) {
                for (const b of dungeon.rooms.filter((room) => room !== a)) {
                    const apart = Math.max(
                        b.row - (a.row + a.template.height), a.row - (b.row + b.template.height),
                        b.col - (a.col + a.template.width), a.col - (b.col + b.template.width),
                    );
                    assert.ok(apart >= 1, `${seed}: ${a.id} and ${b.id} are too close`);
                }
            }
        }
    });

    it('lets packed rooms adjoin, with doors that meet', () => {
        const tiny = createTileset(tinyTilesetData());
        let touching = 0;
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(tiny, { cols: 20, rows: 14, seed, rooms: { packed: true, margin: 0, adjoin: 1 } });
            assert.equal(dungeon.stats.conflicts, 0);
            touching += dungeon.cells.filter((cell) => cell.room && CARDINALS.some((side) => {
                const next = dungeon.get(cell.row + STEP[side].dy, cell.col + STEP[side].dx);
                return next?.room && next.room !== cell.room;
            })).length;
        }
        assert.ok(touching > 0, 'expected some rooms side by side');
    });

    it('builds each room from one theme, and tries every theme before repeating one', () => {
        const themed = themedTinyTileset();
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(themed, { cols: 16, rows: 12, seed, rooms: { packed: true, templates: ['hall'], margin: 0 } });
            assert.ok(dungeon.rooms.length >= 2);
            assert.notEqual(dungeon.rooms[0].theme, dungeon.rooms[1].theme);
            for (const cell of dungeon.cells.filter((c) => c.room)) assert.equal(cell.tile.theme, cell.room.theme);
        }
    });

    it('leaves out rooms that can\'t have enough doors', () => {
        // The tiny tileset's corner pieces have no doors, so its 2 × 2 halls never do; the 3 × 2 halls always do.
        const themed = themedTinyTileset();
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(themed, { cols: 16, rows: 12, seed, rooms: { packed: true, margin: 0, minDoors: 1 } });
            assert.ok(dungeon.rooms.length > 0);
            for (const room of dungeon.rooms) {
                assert.equal(room.template.id, 'long');
                assert.ok(doorsOf(dungeon, room) >= 1);
            }
        }
    });

    it('opens the way into every part of the map when asked to connect it', () => {
        const tiny = createTileset(tinyTilesetData());
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(tiny, { cols: 20, rows: 12, seed, connect: true });
            const stranded = dungeon.cells.filter((cell) => cell.tile.role !== 'filler' && !dungeon.isReachable(cell.row, cell.col));
            assert.deepEqual(stranded.map((cell) => `${cell.row},${cell.col}`), [], seed);
            assert.equal(dungeon.stats.conflicts, 0);
        }
    });

    it('lays the manor out as rooms, nearly all reachable', () => {
        const manor = shippedTileset('manor');
        for (const seed of SEEDS) {
            const dungeon = generateDungeon(manor, { cols: 20, rows: 9, seed });
            const roomTiles = dungeon.cells.filter((cell) => cell.room).length;
            assert.ok(roomTiles >= dungeon.cells.length / 2, `${seed}: only ${roomTiles} room tiles`);
            assert.ok(dungeon.rooms.every((room) => dungeon.isReachable(room.row, room.col)), `${seed}: a room can't be reached`);
            assert.ok(dungeon.rooms.every((room) => doorsOf(dungeon, room) >= 1));
        }
    });

    for (const id of DRAWN) {
        it(`decorates ${id} tiles through their spots`, () => {
            const dungeon = generateDungeon(shippedTileset(id), { cols: 20, rows: 9, seed: 'spots' });
            const decorations = dungeon.cells.flatMap((cell) => cell.decorations.map((decoration) => ({ cell, decoration })));
            assert.ok(decorations.length > dungeon.cells.length / 2);
            for (const { cell, decoration } of decorations) {
                const { x, y, width, height } = decoration;
                assert.ok(x >= -0.01 && y >= -0.01 && x + width <= 140.01 && y + height <= 140.01, `${cell.tile.id}: ${decoration.overlay.id} leaves the tile`);
            }
        });
    }
});
