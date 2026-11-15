import { buildTileset } from '../lib/builder.js';
import { OVERLAYS, SPRITES } from './overlays.js';
import { paintStructure } from './style.js';
import { TILES } from './tiles.js';

/**
 * Draws the Fairy Wood tileset into public/images/tiles/fairywood/140/ and src/data/tilesets/fairywood.json, and
 * its hero sprite into public/images/sprites/.
 *
 *   node scripts/tilesets/fairywood/build.js [--sheet tiles.png] [--dungeon dungeon.png]
 *
 * See scripts/tilesets/lib/builder.js for the options.
 */
buildTileset({
    id: 'fairywood',
    name: 'Fairy Wood',
    credits: 'Drawn in code by scripts/tilesets/fairywood: winding paths through an enchanted forest',
    paintStructure,
    tiles: TILES,
    overlays: OVERLAYS,
    sprites: SPRITES,
    overlayChance: 0.6,
    rooms: [
        { id: 'clearing', width: 3, height: 3 },
        { id: 'meadow', width: 4, height: 3 },
    ],
});
