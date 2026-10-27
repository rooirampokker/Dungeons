import { buildTileset } from '../lib/builder.js';
import { OVERLAYS } from './overlays.js';
import { paintStructure } from './style.js';
import { TILES } from './tiles.js';

/**
 * Draws the Manor tileset into public/images/tiles/manor/140/ and src/data/tilesets/manor.json.
 *
 *   node scripts/tilesets/manor/build.js [--sheet tiles.png] [--dungeon dungeon.png]
 *
 * See scripts/tilesets/lib/builder.js for the options.
 *
 * The map is packed with rooms, one hallway apart, so a dungeon comes out as the plan of an inn or a great house.
 * Small shapes can be any everyday room. Big ones are taprooms, dormitories and the grand rooms; only halls and
 * ballrooms get the biggest.
 */
const EVERYDAY = ['bedchamber', 'kitchen', 'library', 'taproom'];
const BIG = ['taproom', 'bedchamber', 'great-hall', 'ballroom', 'library'];

buildTileset({
    id: 'manor',
    name: 'Manor House',
    credits: 'Drawn in code by scripts/tilesets/manor: an inn or a great house, laid out like a floor plan',
    paintStructure,
    tiles: TILES,
    overlays: OVERLAYS,
    overlayChance: 0.6,
    rooms: [
        { id: 'chamber', width: 2, height: 2, themes: ['bedchamber', 'kitchen', 'library'] },
        { id: 'wide-room', width: 3, height: 2, themes: EVERYDAY },
        { id: 'deep-room', width: 2, height: 3, themes: EVERYDAY },
        { id: 'square-room', width: 3, height: 3, themes: [...EVERYDAY, 'great-hall', 'ballroom'] },
        { id: 'hall', width: 4, height: 3, themes: BIG },
        { id: 'long-hall', width: 3, height: 4, themes: BIG },
        { id: 'great-room', width: 4, height: 4, themes: ['taproom', 'great-hall', 'ballroom'] },
    ],
    generation: { connect: true, rooms: { packed: true, margin: 0, spacing: 1, adjoin: 0.3, minDoors: 1 } },
});
