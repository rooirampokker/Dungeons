import $ from 'jquery';
import sprites from './data/sprites.json';
import dundjinni from './data/tilesets/dundjinni.json';
import fairywood from './data/tilesets/fairywood.json';
import gormenghast from './data/tilesets/gormenghast.json';
import manor from './data/tilesets/manor.json';
import starbase from './data/tilesets/starbase.json';
import { generateDungeon } from './generation/generator.js';
import { loadImages } from './render/images.js';
import { Renderer } from './render/renderer.js';
import { createTileset } from './tileset/tileset.js';
import { readSettings, setUpTileSizes, setUpTilesets, showDebugLegend, showSummary } from './ui/controls.js';
import { onDirectionKey } from './ui/keyboard.js';
import { createWorld, moveEntity } from './world/world.js';

/**
 * Entry point: connects the page's controls to generation, the game world and the renderer.
 *
 * @typedef {import('./world/world.js').World} World
 * @typedef {import('./tileset/tileset.js').Tileset} Tileset
 */

/** Tilesets in the order the picker lists them; the first is the default. */
const TILESET_DATA = [dundjinni, gormenghast, starbase, fairywood, manor];

$(() => {
    const tilesets = TILESET_DATA.map(createTileset);
    for (const tileset of tilesets) {
        if (tileset.warnings.length) {
            console.info(`Tileset "${tileset.name}" has ${tileset.warnings.length} warnings:\n${tileset.warnings.join('\n')}`);
        }
    }
    const selectedTileset = () => tilesets.find((tileset) => tileset.id === readSettings().tileset) ?? tilesets[0];

    const $viewport = $('#viewport');
    const renderer = new Renderer($viewport[0]);
    /** @type {World|null} */
    let world = null;
    let showRequest = 0;

    async function generate() {
        const settings = readSettings();
        const tileset = selectedTileset();
        const dungeon = generateDungeon(tileset, {
            cols: settings.cols,
            rows: settings.rows,
            seed: settings.seed,
            rooms: { enabled: settings.rooms },
        });
        world = createWorld(dungeon, tileset, { sight: settings.sight * tileset.subGrid });
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
        const images = await loadSceneImages(world.tileset, tileSize, world);
        if (request !== showRequest) return; // a newer request has started
        const { debug, fog } = readSettings(); // may have been toggled while the images loaded
        renderer.show({ world, images: images.tiles, sprites: images.sprites, tileSize, debug, fog });
        showDebugLegend(debug);
    }

    $('#settings').on('submit', (event) => {
        event.preventDefault();
        generate();
    });
    $('#tileset').on('change', () => {
        setUpTileSizes(selectedTileset());
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
    $('#fog').on('change', () => renderer.setFog(readSettings().fog));
    $('#sight').on('change', () => {
        if (!world) return;
        world.fog.setRadius(readSettings().sight * world.tileset.subGrid);
        renderer.requestRender();
        $viewport.trigger('focus'); // so the arrow keys move the hero rather than change the setting
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

    setUpTilesets(tilesets);
    setUpTileSizes(tilesets[0]);
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
        for (const decoration of cell.decorations) files.add(decoration.overlay.image);
    }
    const tileUrls = Object.fromEntries([...files].map((file) => [file, folder + file]));
    // A tileset can bring its own sprites, such as a hero who suits it.
    const [tiles, spriteImages] = await Promise.all([loadImages(tileUrls), loadImages({ ...sprites, ...tileset.sprites })]);
    return { tiles, sprites: spriteImages };
}
