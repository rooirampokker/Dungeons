import $ from 'jquery';
import { DEFAULT_OPTIONS } from '../generation/generator.js';
import { DEFAULT_SIGHT } from '../world/world.js';

/**
 * The settings form and the summary line. Everything that reads or writes the page's controls lives here.
 *
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../generation/dungeon.js').Dungeon} Dungeon
 *
 * @typedef {object} Settings
 * @property {string} tileset   Tileset id.
 * @property {number} cols
 * @property {number} rows
 * @property {string|null} seed
 * @property {boolean} rooms
 * @property {number} tileSize
 * @property {boolean} fog
 * @property {number} sight     How far the hero sees, in tiles.
 * @property {boolean} debug
 */

const MAX_SIZE = 200;

/**
 * Fills the tileset picker, first one selected.
 * @param {Tileset[]} tilesets
 */
export function setUpTilesets(tilesets) {
    const $select = $('#tileset').empty();
    for (const tileset of tilesets) {
        $('<option>').val(tileset.id).text(tileset.name).appendTo($select);
    }
    $select.val(tilesets[0].id);
}

/**
 * Fills the tile size picker from the tileset, keeping the current size if the tileset has it and otherwise
 * selecting the largest.
 * @param {Tileset} tileset
 */
export function setUpTileSizes(tileset) {
    const sizes = Object.keys(tileset.resolutions).map(Number).sort((a, b) => a - b);
    const $select = $('#tileSize');
    const current = Number($select.val());
    $select.empty();
    for (const size of sizes) {
        $('<option>').val(size).text(`${size} × ${size}`).appendTo($select);
    }
    $select.val(String(sizes.includes(current) ? current : sizes[sizes.length - 1]));
}

/** @returns {Settings} */
export function readSettings() {
    return {
        tileset: String($('#tileset').val()),
        cols: readSize('#cols', DEFAULT_OPTIONS.cols),
        rows: readSize('#rows', DEFAULT_OPTIONS.rows),
        seed: String($('#seed').val()).trim() || null,
        rooms: $('#rooms').is(':checked'),
        tileSize: Number($('#tileSize').val()),
        fog: $('#fog').is(':checked'),
        sight: Number($('#sight').val()) || DEFAULT_SIGHT,
        debug: $('#debug').is(':checked'),
    };
}

/** @param {Dungeon} dungeon */
export function showSummary(dungeon) {
    const chambers = dungeon.rooms.length === 1 ? '1 large chamber' : `${dungeon.rooms.length} large chambers`;
    const reachable = Math.round(dungeon.stats.reachableRatio * 100);
    $('#summary').text(`Seed ${dungeon.seed} · ${dungeon.cols} × ${dungeon.rows} tiles · ${chambers} · ${reachable}% reachable`);
}

/** @param {boolean} debug */
export function showDebugLegend(debug) {
    $('#debugLegend').prop('hidden', !debug);
}

function readSize(selector, fallback) {
    const value = Math.round(Number($(selector).val()));
    const size = Number.isFinite(value) && value >= 2 ? Math.min(value, MAX_SIZE) : fallback;
    $(selector).val(size);
    return size;
}
