import $ from 'jquery';
import sprites from './data/sprites.json';
import tilesetData from './data/tilesets/dundjinni.json';
import { generateDungeon } from './generation/generator.js';
import { loadImages } from './render/images.js';
import { Renderer } from './render/renderer.js';
import { createTileset } from './tileset/tileset.js';
import { readSettings, setUpTileSizes, showDebugLegend, showSummary } from './ui/controls.js';
import { onDirectionKey } from './ui/keyboard.js';
import { createWorld, moveEntity } from './world/world.js';

/**
 * Entry point: connects the page's controls to generation, the game world and the renderer.
 *
 * @typedef {import('./world/world.js').World} World
 * @typedef {import('./tileset/tileset.js').Tileset} Tileset
 */

$(() => {
    const tileset = createTileset(tilesetData);
    if (tileset.warnings.length) {
        console.info(`Tileset "${tileset.name}" has ${tileset.warnings.length} warnings:\n${tileset.warnings.join('\n')}`);
    }

    const $viewport = $('#viewport');
    const renderer = new Renderer($viewport[0]);
    /** @type {World|null} */
    let world = null;
    let showRequest = 0;

    async function generate() {
        const settings = readSettings();
        const dungeon = generateDungeon(tileset, {
            cols: settings.cols,
            rows: settings.rows,
            seed: settings.seed,
            rooms: { enabled: settings.rooms },
        });
        world = createWorld(dungeon, tileset);
        if (process.env.NODE_ENV !== 'production') {
            window.game = { world, renderer, tileset }; // for poking around in the browser console
        }
        showSummary(dungeon);
        await show();
        renderer.follow(world.hero, { centre: true });
        $viewport.trigger('focus');
    }

    /** Draws the current world at the selected tile size, once its images have loaded. */
    async function show() {
        const request = ++showRequest;
        const { tileSize } = readSettings();
        const images = await loadSceneImages(tileset, tileSize, world);
        if (request !== showRequest) return; // a newer request has started
        const { debug } = readSettings(); // may have been toggled while the images loaded
        renderer.show({ world, images: images.tiles, sprites: images.sprites, tileSize, debug });
        showDebugLegend(debug);
    }

    $('#settings').on('submit', (event) => {
        event.preventDefault();
        generate();
    });
    $('#tileSize').on('change', async () => {
        await show();
        renderer.follow(world.hero, { centre: true });
    });
    $('#debug').on('change', () => {
        const { debug } = readSettings();
        renderer.setDebug(debug);
        showDebugLegend(debug);
    });

    onDirectionKey((direction) => {
        if (!world || renderer.isAnimating(world.hero)) return;
        const from = { x: world.hero.x, y: world.hero.y };
        if (moveEntity(world, world.hero, direction)) {
            renderer.animateMove(world.hero, from);
            renderer.follow(world.hero);
        } else {
            renderer.animateBump(world.hero, direction);
        }
    });

    setUpTileSizes(tileset);
    generate();
});

/**
 * @param {Tileset} tileset
 * @param {number} tileSize
 * @param {World} world
 */
async function loadSceneImages(tileset, tileSize, world) {
    const folder = tileset.resolutions[tileSize];
    const files = new Set();
    for (const cell of world.dungeon) {
        files.add(cell.tile.image);
        if (cell.overlay) files.add(cell.overlay.image);
    }
    const tileUrls = Object.fromEntries([...files].map((file) => [file, folder + file]));
    const [tiles, spriteImages] = await Promise.all([loadImages(tileUrls), loadImages(sprites)]);
    return { tiles, sprites: spriteImages };
}
