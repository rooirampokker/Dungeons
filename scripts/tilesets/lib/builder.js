import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIRECTIONS, STEP } from '../../../src/core/directions.js';
import { createRng } from '../../../src/core/rng.js';
import { generateDungeon } from '../../../src/generation/generator.js';
import { createTileset } from '../../../src/tileset/tileset.js';
import { coveredCells } from '../../../src/world/walkGrid.js';
import { CELL, MARGIN, SUB_GRID, TILE } from './layout.js';
import { encodePng } from './png.js';
import { Canvas, union } from './raster.js';

/**
 * Builds a code-drawn tileset. Draws every tile and overlay, works out each tile's walk map from its floor outline
 * and furnishings, checks that every tile can be walked as intended, and writes the images to
 * public/images/tiles/<id>/140/ and the data to src/data/tilesets/<id>.json.
 *
 * A tileset script calls buildTileset() with its look and its catalogue. Command-line options:
 *
 *   --sheet file.png    also save every tile and overlay side by side, for reviewing the art
 *   --dungeon file.png  also generate a dungeon from the new tiles and save it as one image; the SEED, COLS and
 *                       ROWS environment variables choose which (default "preview", 12 × 8)
 *
 * @typedef {object} TileSpec               One catalogue entry; see gormenghast/tiles.js for examples.
 * @property {string} id
 * @property {string} [role]                Default 'corridor'.
 * @property {string[]} exits
 * @property {string[]} tags
 * @property {import('./raster.js').Shape} floor  The walkable surface, carried on past the edge at exits.
 * @property {(p: object) => void} [decorate]     Paints furnishings; calls p.block(shape) for anything in the way.
 *
 * @typedef {object} OverlaySpec
 * @property {string} id
 * @property {string[]} spots               Spot kinds; 'wall' makes a north-wall version and a turned copy.
 * @property {[number, number]} size        Footprint.
 * @property {[number, number]} [image]     Image size, centred on the footprint. Default: the footprint.
 * @property {boolean} [blocks]
 * @property {(p: object) => void} paint
 *
 * @typedef {object} SpriteSpec
 * @property {string} id                    Sprite id the game uses, e.g. 'hero'.
 * @property {string} file                  File name in public/images/sprites/.
 * @property {[number, number]} size
 * @property {(p: object) => void} paint
 *
 * @param {object} set
 * @param {string} set.id
 * @param {string} set.name
 * @param {string} set.credits
 * @param {(cv: Canvas, spec: TileSpec, seed: number) => object} set.paintStructure  Paints floor, walls and ground.
 * @param {TileSpec[]} set.tiles
 * @param {OverlaySpec[]} set.overlays
 * @param {object[]} set.rooms              Room templates.
 * @param {number} set.overlayChance
 * @param {SpriteSpec[]} [set.sprites]      Sprites this tileset uses instead of the defaults.
 */
export function buildTileset(set) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    const imageFolder = `images/tiles/${set.id}/${TILE}/`;
    const imageDir = path.join(root, 'public', imageFolder);
    mkdirSync(imageDir, { recursive: true });
    for (const file of readdirSync(imageDir)) {
        if (file.endsWith('.png')) rmSync(path.join(imageDir, file));
    }

    const problems = [];
    const sheet = [];

    const tiles = set.tiles.map((spec) => {
        const seed = seedOf(spec.id);
        const cv = new Canvas({ width: TILE, scale: 3, margin: MARGIN, background: [0, 0, 0] });
        const obstacles = [];
        const structure = set.paintStructure(cv, spec, seed);
        spec.decorate?.({ cv, seed, rng: createRng(spec.id), block: (area) => obstacles.push(area), ...structure });
        const rgba = cv.toRGBA();
        writeFileSync(path.join(imageDir, `${spec.id}.png`), encodePng(TILE, TILE, rgba));
        sheet.push({ rgba, width: TILE, height: TILE });

        const walk = deriveWalk(spec.floor, obstacles, spec.exits);
        problems.push(...checkTile(spec, walk));
        for (const spot of spec.spots ?? []) {
            if (!spot.canBlock) continue;
            const blocked = coveredCells({ x: spot.rect[0], y: spot.rect[1], width: spot.rect[2], height: spot.rect[3] }, CELL, SUB_GRID);
            problems.push(...checkTile(spec, withoutCells(walk, blocked)).map((problem) => `${problem} when its ${spot.kind} spot is blocked`));
        }
        return {
            id: spec.id,
            image: `${spec.id}.png`,
            role: spec.role ?? 'corridor',
            ...(spec.roomSlot && { roomSlot: spec.roomSlot }),
            exits: spec.exits,
            tags: spec.tags,
            ...(spec.weight && { weight: spec.weight }),
            ...(spec.spawn && { spawn: spec.spawn }),
            ...(spec.spots && { spots: spec.spots.map(roundSpot) }),
            walk,
        };
    });

    const overlays = set.overlays.flatMap((spec) => {
        const [width, height] = spec.image ?? spec.size;
        const cv = new Canvas({ width, height, scale: 3 });
        spec.paint({ cv, seed: seedOf(spec.id), rng: createRng(spec.id), block: () => {} });
        const rgba = cv.toRGBA();

        // Wall overlays are drawn for a north wall; a turned copy goes on east and west walls.
        const versions = spec.spots.includes('wall')
            ? [
                { suffix: '', spots: ['wall-h'], rgba, width, height, size: spec.size },
                { suffix: '-v', spots: ['wall-v'], rgba: transpose(rgba, width, height), width: height, height: width, size: [spec.size[1], spec.size[0]] },
            ]
            : [{ suffix: '', spots: spec.spots, rgba, width, height, size: spec.size }];

        return versions.map((version) => {
            const image = `overlay-${spec.id}${version.suffix}.png`;
            writeFileSync(path.join(imageDir, image), encodePng(version.width, version.height, version.rgba));
            sheet.push({ rgba: version.rgba, width: version.width, height: version.height });
            return {
                id: `${spec.id}${version.suffix}`,
                image,
                spots: version.spots,
                size: version.size,
                ...(spec.blocks && { blocks: true }),
            };
        });
    });

    // Every spot should have something that can go on it.
    for (const spec of set.tiles) {
        for (const spot of spec.spots ?? []) {
            const fits = overlays.some((overlay) => overlay.spots.includes(spot.kind)
                && overlay.size[0] <= spot.rect[2] && overlay.size[1] <= spot.rect[3]);
            if (!fits) problems.push(`${spec.id}: no overlay fits its ${spot.kind} spot at ${spot.rect.map(Math.round)}`);
        }
    }

    const sprites = Object.fromEntries((set.sprites ?? []).map((spec) => {
        const cv = new Canvas({ width: spec.size[0], height: spec.size[1], scale: 3 });
        spec.paint({ cv, seed: seedOf(spec.id), rng: createRng(spec.id), block: () => {} });
        mkdirSync(path.join(root, 'public/images/sprites'), { recursive: true });
        writeFileSync(path.join(root, 'public/images/sprites', spec.file), encodePng(spec.size[0], spec.size[1], cv.toRGBA()));
        return [spec.id, `images/sprites/${spec.file}`];
    }));

    const tileset = {
        id: set.id,
        name: set.name,
        credits: set.credits,
        referenceSize: TILE,
        subGrid: SUB_GRID,
        resolutions: { [TILE]: imageFolder },
        overlayChance: set.overlayChance,
        ...(set.sprites && { sprites }),
        rooms: set.rooms,
        tiles,
        overlays,
    };

    // Pretty-print, but keep short lists (exits, tags, each walk cell) on one line.
    const json = JSON.stringify(tileset, null, 2).replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner) => `[${inner.split(/,\s+/).join(', ')}]`);
    writeFileSync(path.join(root, `src/data/tilesets/${set.id}.json`), `${json}\n`);

    const argv = process.argv;
    const sheetIndex = argv.indexOf('--sheet');
    if (sheetIndex > 0) writeSheet(argv[sheetIndex + 1], sheet);
    const dungeonIndex = argv.indexOf('--dungeon');
    if (dungeonIndex > 0) writeDungeon(argv[dungeonIndex + 1], tileset, sheet);

    console.log(`Drew ${tiles.length} tiles and ${overlays.length} overlays.`);
    if (problems.length) {
        console.error(`\n${problems.length} problems:\n  ${problems.join('\n  ')}`);
        process.exitCode = 1;
    }
}

/**
 * Works out the walk map from the floor outline and whatever blocks it. A walk cell can be stood on when at least
 * half of it is floor and less than a quarter is blocked. Diagonal moves need both cells beside them to be open, so
 * nobody squeezes between two obstacles. Moves can leave the tile only through its exits.
 */
function deriveWalk(floor, obstacles, exits) {
    const blocked = obstacles.length ? union(...obstacles) : null;
    const open = Array.from({ length: SUB_GRID }, (_, row) => Array.from({ length: SUB_GRID }, (__, col) =>
        coverage(floor, row, col) >= 0.5 && (!blocked || coverage(blocked, row, col) < 0.25)));

    const isOpen = (row, col) => {
        const rowInside = row >= 0 && row < SUB_GRID;
        const colInside = col >= 0 && col < SUB_GRID;
        if (rowInside && colInside) return open[row][col];
        if (!rowInside && !colInside) return false;
        const side = row < 0 ? 'n' : row >= SUB_GRID ? 's' : col < 0 ? 'w' : 'e';
        return exits.includes(side) && open[Math.min(SUB_GRID - 1, Math.max(0, row))][Math.min(SUB_GRID - 1, Math.max(0, col))];
    };

    const walk = {};
    for (let row = 0; row < SUB_GRID; row++) {
        for (let col = 0; col < SUB_GRID; col++) {
            if (!open[row][col]) continue;
            walk[`${row},${col}`] = DIRECTIONS.filter((direction) => {
                const { dx, dy } = STEP[direction];
                if (!isOpen(row + dy, col + dx)) return false;
                return !(dx && dy) || (isOpen(row + dy, col) && isOpen(row, col + dx));
            });
        }
    }
    return walk;
}

function coverage(area, row, col) {
    const samples = 6;
    let hits = 0;
    for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
            if (area((col + (sx + 0.5) / samples) * CELL, (row + (sy + 0.5) / samples) * CELL)) hits++;
        }
    }
    return hits / (samples * samples);
}

/** Every exit must be walkable, and unless the tile is a dead end they must all join up inside it. */
function checkTile(spec, walk) {
    const found = [];
    const leaving = (side) => Object.entries(walk).filter(([, moves]) => moves.includes(side)).map(([key]) => key);

    const reached = new Set();
    const queue = spec.exits.flatMap(leaving);
    if (spec.spawn) queue.push(spec.spawn);
    const start = queue[0];
    if (start) {
        reached.add(start);
        const stack = [start];
        while (stack.length) {
            const [row, col] = stack.pop().split(',').map(Number);
            for (const move of walk[`${row},${col}`]) {
                const next = `${row + STEP[move].dy},${col + STEP[move].dx}`;
                if (walk[next] && !reached.has(next)) {
                    reached.add(next);
                    stack.push(next);
                }
            }
        }
    }

    for (const side of spec.exits) {
        const cells = leaving(side);
        if (cells.length === 0) found.push(`${spec.id}: can't leave through exit ${side}`);
        else if (!spec.tags.includes('deadend') && !cells.some((key) => reached.has(key))) {
            found.push(`${spec.id}: exit ${side} doesn't connect to the rest of the tile`);
        }
    }
    if (spec.spawn && !walk[spec.spawn]) found.push(`${spec.id}: spawn ${spec.spawn} isn't walkable`);

    const stranded = Object.keys(walk).filter((key) => !reached.has(key));
    if (stranded.length && !spec.tags.includes('deadend') && spec.exits.length) {
        found.push(`${spec.id}: cells ${stranded.join(' ')} can't be reached from an exit`);
    }
    return found;
}

/** A walk map with some cells closed off, as a blocking overlay would. */
function withoutCells(walk, cells) {
    const closed = new Set(cells.map(({ row, col }) => `${row},${col}`));
    return Object.fromEntries(Object.entries(walk)
        .filter(([key]) => !closed.has(key))
        .map(([key, moves]) => {
            const [row, col] = key.split(',').map(Number);
            return [key, moves.filter((move) => !closed.has(`${row + STEP[move].dy},${col + STEP[move].dx}`))];
        }));
}

function roundSpot(spot) {
    return { ...spot, rect: spot.rect.map((value) => Math.round(value * 10) / 10) };
}

/** Mirrors an image across its top-left to bottom-right diagonal: a north-wall overlay becomes a west-wall one. */
function transpose(rgba, width, height) {
    const out = new Uint8Array(rgba.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) out.set(rgba.subarray((y * width + x) * 4, (y * width + x) * 4 + 4), (x * height + y) * 4);
    }
    return out;
}

function seedOf(text) {
    return Math.floor(createRng(text).next() * 2 ** 31);
}

/** Generates a dungeon from the freshly drawn tiles and pastes them together, mirrored as the game would. */
function writeDungeon(file, data, images) {
    const byImage = new Map([...data.tiles, ...data.overlays].map((entry, index) => [entry.image, images[index]]));
    const { SEED = 'preview', COLS = '12', ROWS = '8' } = process.env;
    const dungeon = generateDungeon(createTileset(data), { cols: Number(COLS), rows: Number(ROWS), seed: SEED });
    const width = dungeon.cols * TILE;
    const height = dungeon.rows * TILE;
    const out = new Uint8Array(width * height * 4);
    const paste = ({ rgba, width: w, height: h }, left, top, { flipH = false, flipV = false } = {}) => {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (left + x < 0 || top + y < 0 || left + x >= width || top + y >= height) continue;
                const s = ((flipV ? h - 1 - y : y) * w + (flipH ? w - 1 - x : x)) * 4;
                const d = ((top + y) * width + left + x) * 4;
                const a = rgba[s + 3] / 255;
                for (let c = 0; c < 3; c++) out[d + c] = Math.round(rgba[s + c] * a + out[d + c] * (1 - a));
                out[d + 3] = 255;
            }
        }
    };
    for (const cell of dungeon) paste(byImage.get(cell.tile.image), cell.col * TILE, cell.row * TILE, cell.orientation);
    // Decorations go on top of every tile, since glows spill onto neighbours. Centred on their footprint, as in the game.
    for (const cell of dungeon) {
        for (const decoration of cell.decorations) {
            const image = byImage.get(decoration.overlay.image);
            const left = decoration.x + decoration.width / 2 - image.width / 2;
            const top = decoration.y + decoration.height / 2 - image.height / 2;
            paste(image, Math.round(cell.col * TILE + left), Math.round(cell.row * TILE + top), decoration.orientation);
        }
    }
    writeFileSync(file, encodePng(width, height, out));
    console.log(`Wrote preview dungeon ${file} (${dungeon.rooms.length} halls, ${Math.round(dungeon.stats.reachableRatio * 100)}% reachable)`);
}

function writeSheet(file, images) {
    const columns = 8;
    const gap = 6;
    const cellSize = TILE + gap;
    const rows = Math.ceil(images.length / columns);
    const width = columns * cellSize + gap;
    const height = rows * cellSize + gap;
    const out = new Uint8Array(width * height * 4);
    for (let i = 0; i < out.length; i += 4) out.set([48, 48, 52, 255], i);
    images.forEach(({ rgba, width: w, height: h }, index) => {
        const ox = gap + (index % columns) * cellSize;
        const oy = gap + Math.floor(index / columns) * cellSize;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const s = (y * w + x) * 4;
                const d = ((oy + y) * width + ox + x) * 4;
                const a = rgba[s + 3] / 255;
                for (let c = 0; c < 3; c++) out[d + c] = Math.round(rgba[s + c] * a + out[d + c] * (1 - a));
            }
        }
    });
    writeFileSync(file, encodePng(width, height, out));
    console.log(`Wrote preview sheet ${file}`);
}
