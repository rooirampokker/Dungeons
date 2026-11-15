import { buildTileset } from '../lib/builder.js';
import { OVERLAYS, SPRITES } from './overlays.js';
import { paintStructure } from './style.js';
import { TILES } from './tiles.js';

/**
 * Draws the Starbase tileset into public/images/tiles/starbase/140/ and src/data/tilesets/starbase.json, and its
 * hero sprite into public/images/sprites/.
 *
 *   node scripts/tilesets/starbase/build.js [--sheet tiles.png] [--dungeon dungeon.png]
 *
 * See scripts/tilesets/lib/builder.js for the options.
 */
buildTileset({
    id: 'starbase',
    name: 'Starbase',
    credits: 'Drawn in code by scripts/tilesets/starbase, in the style of the space stations of the Star Wars films. '
        + 'A fan tribute, not affiliated with Lucasfilm.',
    paintStructure,
    tiles: TILES,
    overlays: OVERLAYS,
    sprites: SPRITES,
    overlayChance: 0.6,
    rooms: [
        { id: 'hangar', width: 3, height: 3 },
        { id: 'command-deck', width: 4, height: 3 },
    ],
});
