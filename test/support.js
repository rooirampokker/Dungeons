import { readFileSync } from 'node:fs';
import { createTileset } from '../src/tileset/tileset.js';

export const PUBLIC_DIR = new URL('../public/', import.meta.url);

/** Ids of the tilesets the game ships with. */
export const SHIPPED = ['dundjinni', 'gormenghast', 'starbase', 'fairywood'];

/** The shipped tilesets that are drawn in code, so every tile is fully mapped. */
export const DRAWN = ['gormenghast', 'starbase', 'fairywood'];

/** A shipped tileset's data, as plain JSON. */
export function shippedTilesetData(id = 'dundjinni') {
    return JSON.parse(readFileSync(new URL(`../src/data/tilesets/${id}.json`, import.meta.url), 'utf8'));
}

export function shippedTileset(id = 'dundjinni') {
    return createTileset(shippedTilesetData(id));
}

/**
 * A small tileset with a 2×2 walk grid, for tests that need to know every tile.
 * Corridor shapes cover every exit combination once mirroring is included.
 */
export function tinyTilesetData() {
    const open = { '0,0': ['e', 's'], '0,1': ['w', 's'], '1,0': ['n', 'e'], '1,1': ['n', 'w'] };
    const corridor = (id, exits, walk = open) => ({ id, image: `${id}.png`, role: 'corridor', exits, tags: [], walk });
    return {
        id: 'tiny',
        name: 'Tiny',
        referenceSize: 10,
        subGrid: 2,
        resolutions: { 10: 'tiny/' },
        overlayChance: 1,
        rooms: [{ id: 'hall', width: 3, height: 3 }],
        tiles: [
            { id: 'start', image: 'start.png', role: 'start', exits: ['s'], tags: [], spawn: '0,0', walk: { '0,0': ['e'], '0,1': ['w', 's'], '1,1': ['n', 's'] } },
            corridor('dead-end', ['s']),
            corridor('straight', ['n', 's']),
            corridor('corner', ['e', 's']),
            corridor('tee', ['e', 's', 'w']),
            corridor('tee-side', ['n', 'e', 's']),
            corridor('cross', ['n', 'e', 's', 'w'], { '0,0': ['e', 'se', 's'] }),
            corridor('side-end', ['e']),
            corridor('hallway', ['e', 'w'], null), // not mapped yet
            { id: 'rock', image: 'rock.png', role: 'filler', exits: [], tags: [] },
            ...[['nw', 'es'], ['n', 'nesw'], ['ne', 'sw'], ['w', 'nesw'], ['c', 'nesw'], ['e', 'nesw'], ['sw', 'ne'], ['s', 'nesw'], ['se', 'nw']]
                .map(([slot, exits]) => ({
                    id: `room-${slot}`, image: `room-${slot}.png`, role: 'room', roomSlot: slot, exits: exits.split(''), tags: ['empty'], walk: open,
                })),
        ],
        overlays: [
            { id: 'rug', image: 'rug.png', offset: [1, 1], onTags: ['empty'] },
            { id: 'statue', image: 'statue.png', offset: [2, 2], onTags: ['empty'], onExits: ['n', 'w'] },
        ],
    };
}
