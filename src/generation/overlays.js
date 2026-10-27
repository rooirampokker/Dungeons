import { IDENTITY, toMask } from '../core/directions.js';

/**
 * Decorations scattered over tiles. A tile with spots can take one decoration per spot; a tile without spots takes
 * at most one fixed overlay, at that overlay's own offset.
 *
 * @typedef {import('./dungeon.js').Cell} Cell
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../tileset/tileset.js').OverlayDef} OverlayDef
 * @typedef {import('../tileset/tileset.js').SpotDef} SpotDef
 * @typedef {import('../core/directions.js').Orientation} Orientation
 * @typedef {import('../core/rng.js').Rng} Rng
 *
 * @typedef {object} Decoration
 * @property {OverlayDef} overlay
 * @property {number} x                     Footprint within the tile as it appears on the map, in pixels at
 * @property {number} y                     referenceSize.
 * @property {number|null} width            Null for fixed overlays, which are drawn from (x, y) at natural size.
 * @property {number|null} height
 * @property {Orientation} orientation      How to mirror the overlay's image.
 */

/** Overlays are drawn against the north wall, the west wall or the north-west corner; other spots mirror them. */
const SPOT_MIRRORING = {
    n: IDENTITY,
    w: IDENTITY,
    nw: IDENTITY,
    s: { flipH: false, flipV: true },
    e: { flipH: true, flipV: false },
    ne: { flipH: true, flipV: false },
    sw: { flipH: false, flipV: true },
    se: { flipH: true, flipV: true },
};

/** Where in a spot an overlay sits, as fractions of the spare room: keep it against the spot's wall or corner. */
const ANCHOR = {
    n: [0.5, 0], s: [0.5, 1], w: [0, 0.5], e: [1, 0.5], nw: [0, 0], ne: [1, 0], sw: [0, 1], se: [1, 1],
};

/**
 * @param {Tileset} tileset
 * @param {Cell} cell
 * @param {Rng} rng
 * @returns {Decoration[]}
 */
export function decorate(tileset, cell, rng) {
    return cell.tile.spots ? decorateSpots(tileset, cell, rng) : decorateFixed(tileset, cell, rng);
}

/** At most one fixed overlay. Overlays made for the tile's exact exits win over generic ones. */
function decorateFixed(tileset, cell, rng) {
    const fitting = (tileset.overlays ?? []).filter((overlay) => overlay.offset && hasTags(overlay, cell));
    if (fitting.length === 0 || !rng.chance(tileset.overlayChance)) return [];

    const exact = fitting.filter((overlay) => overlay.onExits && toMask(overlay.onExits) === cell.exits);
    const overlay = rng.pick(exact.length ? exact : fitting.filter((overlay) => !overlay.onExits));
    if (!overlay) return [];
    return [{ overlay, x: overlay.offset[0], y: overlay.offset[1], width: null, height: null, orientation: IDENTITY }];
}

/** One roll per spot; a tile avoids repeating an overlay while others fit. */
function decorateSpots(tileset, cell, rng) {
    const decorations = [];
    const used = new Set();
    for (const spot of cell.tile.spots) {
        const fitting = (tileset.overlays ?? []).filter((overlay) => fits(overlay, spot) && hasTags(overlay, cell));
        if (fitting.length === 0 || !rng.chance(spot.chance ?? tileset.overlayChance)) continue;

        const fresh = fitting.filter((overlay) => !used.has(overlay.id));
        const overlay = rng.pick(fresh.length ? fresh : fitting);
        used.add(overlay.id);
        decorations.push(place(overlay, spot, cell, tileset.referenceSize));
    }
    return decorations;
}

/**
 * @param {OverlayDef} overlay
 * @param {SpotDef} spot
 */
function fits(overlay, spot) {
    return Boolean(overlay.spots?.includes(spot.kind))
        && overlay.size[0] <= spot.rect[2]
        && overlay.size[1] <= spot.rect[3]
        && (!overlay.blocks || Boolean(spot.canBlock));
}

function hasTags(overlay, cell) {
    return (overlay.onTags ?? []).every((tag) => cell.tile.tags.includes(tag));
}

/**
 * Positions an overlay in a spot, then mirrors the result along with the tile.
 * @returns {Decoration}
 */
function place(overlay, spot, cell, tileSize) {
    const [spotX, spotY, spotWidth, spotHeight] = spot.rect;
    const [width, height] = overlay.size;
    const [ax, ay] = ANCHOR[spot.facing] ?? [0.5, 0.5];
    let x = spotX + (spotWidth - width) * ax;
    let y = spotY + (spotHeight - height) * ay;

    const { flipH, flipV } = cell.orientation;
    if (flipH) x = tileSize - x - width;
    if (flipV) y = tileSize - y - height;
    const own = SPOT_MIRRORING[spot.facing] ?? IDENTITY;
    return { overlay, x, y, width, height, orientation: { flipH: flipH !== own.flipH, flipV: flipV !== own.flipV } };
}
