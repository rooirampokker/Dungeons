import { toMask } from '../core/directions.js';

/**
 * @typedef {import('./dungeon.js').Cell} Cell
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../tileset/tileset.js').OverlayDef} OverlayDef
 * @typedef {import('../core/rng.js').Rng} Rng
 */

/**
 * Picks a decoration for a tile, or null. Overlays made for the tile's exact exits win over generic ones.
 * @param {Tileset} tileset
 * @param {Cell} cell
 * @param {Rng} rng
 * @returns {OverlayDef|null}
 */
export function chooseOverlay(tileset, cell, rng) {
    const fitting = (tileset.overlays ?? []).filter((overlay) => overlay.onTags.every((tag) => cell.tile.tags.includes(tag)));
    if (fitting.length === 0 || !rng.chance(tileset.overlayChance)) return null;

    const exact = fitting.filter((overlay) => overlay.onExits && toMask(overlay.onExits) === cell.exits);
    const pool = exact.length ? exact : fitting.filter((overlay) => !overlay.onExits);
    return rng.pick(pool) ?? null;
}
