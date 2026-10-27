import $ from 'jquery';
import { DEFAULT_OPTIONS } from '../generation/generator.js';

/**
 * The settings form and the summary line. Everything that reads or writes the page's controls lives here.
 *
 * @typedef {import('../tileset/tileset.js').Tileset} Tileset
 * @typedef {import('../generation/dungeon.js').Dungeon} Dungeon
 *
 * @typedef {object} Settings
 * @property {number} cols
 * @property {number} rows
 * @property {string|null} seed
 * @property {boolean} rooms
 * @property {number} tileSize
 * @property {boolean} debug
 */

const MAX_SIZE = 200;

/**
 * Fills the tile size picker from the tileset, largest selected.
 * @param {Tileset} tileset
 */
export function setUpTileSizes(tileset) {
    const sizes = Object.keys(tileset.resolutions).map(Number).sort((a, b) => a - b);
    const $select = $('#tileSize').empty();
    for (const size of sizes) {
        $('<option>').val(size).text(`${size} × ${size}`).appendTo($select);
    }
    $select.val(String(sizes[sizes.length - 1]));
}

/** @returns {Settings} */
export function readSettings() {
    return {
        cols: readSize('#cols', DEFAULT_OPTIONS.cols),
        rows: readSize('#rows', DEFAULT_OPTIONS.rows),
        seed: String($('#seed').val()).trim() || null,
        rooms: $('#rooms').is(':checked'),
        tileSize: Number($('#tileSize').val()),
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
