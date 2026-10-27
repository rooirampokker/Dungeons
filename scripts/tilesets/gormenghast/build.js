import { buildTileset } from '../lib/builder.js';
import { OVERLAYS } from './overlays.js';
import { paintStructure } from './style.js';
import { TILES } from './tiles.js';

/**
 * Draws the Gormenghast tileset into public/images/tiles/gormenghast/140/ and src/data/tilesets/gormenghast.json.
 *
 *   node scripts/tilesets/gormenghast/build.js [--sheet tiles.png] [--dungeon dungeon.png]
 *
 * See scripts/tilesets/lib/builder.js for the options.
 */
buildTileset({
    id: 'gormenghast',
    name: 'Gormenghast',
    credits: 'Drawn in code by scripts/tilesets/gormenghast, after the castle in Mervyn Peake\'s Gormenghast novels',
    paintStructure,
    tiles: TILES,
    overlays: OVERLAYS,
    overlayChance: 0.6,
    rooms: [
        { id: 'great-hall', width: 3, height: 3 },
        { id: 'long-gallery', width: 4, height: 3 },
    ],
});
