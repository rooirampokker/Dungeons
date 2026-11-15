import $ from 'jquery';
import { canMove, equip, itemAt, moveItem, unequip } from '../character/character.js';
import { SLOTS, isWearable } from '../character/items.js';
import { POOLS, STATS, statTotals } from '../character/stats.js';
import { SILHOUETTE, itemIcon, slotIcon } from './glyphs.js';

/**
 * The hero sidebar: health and mana, the paper doll, stats and the inventory. It slides out from the right-hand edge
 * and back. The map shrinks to make room rather than going behind it, except on narrow screens.
 *
 * Items are dragged between the inventory and the paper doll, or double-clicked to put on or take off. The rules
 * all live in character/; this file only draws the character and turns drags and clicks into moves.
 *
 * @typedef {import('../character/character.js').Character} Character
 * @typedef {import('../character/character.js').Place} Place
 * @typedef {import('../character/items.js').ItemDef} ItemDef
 *
 * @typedef {object} Sidebar
 * @property {(open?: boolean) => void} toggle  Opens or closes it; with no argument, whichever it isn't.
 * @property {() => boolean} isOpen
 * @property {() => void} render                Redraws everything, e.g. after the character changes elsewhere.
 */

/** Remembers whether the sidebar was left open, in this browser only. */
const STORAGE_KEY = 'dungeons.sidebar.open';

/**
 * Builds the sidebar inside `element` and keeps it up to date.
 * @param {HTMLElement} element
 * @param {Character} character
 * @param {{onToggle?: (open: boolean) => void}} [options]  onToggle: called once the sidebar has finished sliding.
 * @returns {Sidebar}
 */
export function setUpSidebar(element, character, { onToggle } = {}) {
    const $sidebar = $(element);
    const $tab = $('<button type="button" class="sidebar-tab" aria-controls="sidebarPanel" title="Hero (I)">')
        .append('<span>Hero</span>')
        .appendTo($sidebar);
    const $panel = $('<div class="sidebar-panel" id="sidebarPanel">').appendTo($sidebar);
    const $content = $('<div class="sidebar-content">').appendTo($panel);

    const $header = $('<header class="sheet-header">').appendTo($content);
    $('<h2>').text(character.name).appendTo($header);
    $('<button type="button" class="sidebar-close" aria-label="Close" title="Close (I)">&times;</button>').appendTo($header);
    const $pools = $('<section class="pools" aria-label="Health and mana">').appendTo($content);
    const $doll = $('<section class="doll" aria-label="Worn">').appendTo($content);
    const $stats = section($content, 'stats', 'Stats');
    const $inventory = section($content, 'inventory', 'Inventory');
    $('<p class="hint">Drag things onto the hero to wear them, or double-click them.</p>').appendTo($content);

    function render() {
        renderPools($pools, character);
        renderDoll($doll, character);
        renderStats($stats, character);
        renderInventory($inventory, character);
    }

    function isOpen() {
        return $sidebar.hasClass('open');
    }

    function toggle(open = !isOpen()) {
        $sidebar.toggleClass('open', open);
        $tab.attr('aria-expanded', String(open));
        $panel.prop('inert', !open);
        try {
            localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
        } catch {
            // Storage can be unavailable (private windows, blocked site data); the sidebar just won't be remembered.
        }
    }

    $tab.on('click', () => toggle());
    $header.on('click', '.sidebar-close', () => toggle(false));
    $panel.on('transitionend', (event) => {
        if (event.target === $panel[0] && event.originalEvent.propertyName === 'width') onToggle?.(isOpen());
    });
    handleDragging($content, character, render);

    let remembered = false;
    try {
        remembered = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        // As above.
    }
    render();
    toggle(remembered);
    return { toggle, isOpen, render };
}

// ---------------------------------------------------------------- drawing

function section($parent, className, title) {
    const $section = $('<section>').addClass(className).attr('aria-label', title).appendTo($parent);
    $('<h3>').text(title).appendTo($section);
    return $('<div class="section-body">').appendTo($section);
}

/** A bar for each pool, with how much is left under it. */
function renderPools($pools, character) {
    const totals = statTotals(character);
    $pools.empty();
    for (const pool of POOLS) {
        const max = totals[pool.id].total;
        const current = character.pools[pool.id];
        const $pool = $('<div class="pool">').addClass(`pool-${pool.id}`).attr('title', pool.description).appendTo($pools);
        $('<div class="pool-label">').text(pool.label).appendTo($pool);
        const $bar = $('<div class="bar" role="meter">')
            .attr({ 'aria-label': pool.label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': current })
            .appendTo($pool);
        $('<div class="fill">').css('width', `${max > 0 ? (100 * current) / max : 0}%`).appendTo($bar);
        $('<div class="pool-value">').text(`${current} / ${max}`).appendTo($pool);
    }
}

/** The figure, with a slot for each place something can be worn. */
function renderDoll($doll, character) {
    $doll.empty().append(SILHOUETTE);
    for (const slot of SLOTS) {
        const item = character.equipment[slot.id];
        const $slot = $('<div class="slot">')
            .attr({ 'data-drop': placeKey({ kind: 'equipment', slot: slot.id }), title: item ? '' : slot.label })
            .css('grid-area', slot.id)
            .appendTo($doll);
        if (item) $slot.append(itemElement(item, { kind: 'equipment', slot: slot.id }));
        else $slot.append(slotIcon(slot));
    }
}

/** Every stat, with what worn items add to it. */
function renderStats($stats, character) {
    const totals = statTotals(character);
    const $list = $('<dl>');
    for (const stat of STATS) {
        const { total, bonus } = totals[stat.id];
        $('<dt>').text(stat.label).attr('title', stat.description).appendTo($list);
        const $value = $('<dd>').text(total).appendTo($list);
        if (bonus) $('<span class="bonus">').toggleClass('negative', bonus < 0).text(signed(bonus)).appendTo($value);
    }
    $stats.empty().append($list);
}

function renderInventory($inventory, character) {
    const $cells = $('<div class="cells">');
    character.inventory.forEach((item, index) => {
        const $cell = $('<div class="cell">').attr('data-drop', placeKey({ kind: 'inventory', index })).appendTo($cells);
        if (item) $cell.append(itemElement(item, { kind: 'inventory', index }));
    });
    $inventory.empty().append($cells);
}

/**
 * @param {ItemDef} item
 * @param {Place} place
 */
function itemElement(item, place) {
    const $item = $('<div class="item" draggable="true">')
        .attr({ 'data-place': placeKey(place), title: describe(item) })
        .css('--item-colour', item.colour ?? '');
    if (item.image) $('<img alt="">').attr('src', item.image).appendTo($item);
    else $item.html(itemIcon(item));
    return $item;
}

/** The item's name, what it gives, and its description, one per line, for its tooltip. */
function describe(item) {
    const label = (id) => [...POOLS, ...STATS].find((stat) => stat.id === id)?.label ?? id;
    const bonuses = Object.entries(item.bonuses ?? {}).map(([id, amount]) => `${signed(amount)} ${label(id)}`);
    return [item.name, ...bonuses, item.description, isWearable(item) ? null : 'Can only be carried'].filter(Boolean).join('\n');
}

function signed(value) {
    return value > 0 ? `+${value}` : String(value);
}

// ---------------------------------------------------------------- moving things

/** Places are written into the page as "inventory:3" or "equipment:head". */
function placeKey(place) {
    return place.kind === 'inventory' ? `inventory:${place.index}` : `equipment:${place.slot}`;
}

/** @returns {Place} */
function parsePlace(key) {
    const [kind, where] = key.split(':');
    return kind === 'inventory' ? { kind, index: Number(where) } : { kind: 'equipment', slot: where };
}

/**
 * Drag an item onto any slot or cell it can go to; those light up while it's dragged. A double-click puts a
 * carried item on, or takes a worn one off.
 */
function handleDragging($content, character, render) {
    /** @type {Place|null} */
    let dragging = null;
    const targets = () => $content.find('[data-drop]');
    const finish = () => {
        dragging = null;
        $content.removeClass('dragging');
        targets().removeClass('can-drop drop-over');
    };

    $content.on('dragstart', '.item', (event) => {
        dragging = parsePlace(event.currentTarget.dataset.place);
        const transfer = event.originalEvent.dataTransfer;
        transfer.effectAllowed = 'move';
        transfer.setData('text/plain', event.currentTarget.dataset.place);
        $content.addClass('dragging');
        targets().each((_, target) => {
            $(target).toggleClass('can-drop', canMove(character, dragging, parsePlace(target.dataset.drop)));
        });
    });
    $content.on('dragover', '[data-drop]', (event) => {
        if (!dragging || !$(event.currentTarget).hasClass('can-drop')) return;
        event.preventDefault(); // allows the drop
        event.originalEvent.dataTransfer.dropEffect = 'move';
        $(event.currentTarget).addClass('drop-over');
    });
    $content.on('dragleave', '[data-drop]', (event) => {
        if (!event.currentTarget.contains(event.originalEvent.relatedTarget)) $(event.currentTarget).removeClass('drop-over');
    });
    $content.on('drop', '[data-drop]', (event) => {
        event.preventDefault();
        const from = dragging;
        finish();
        if (from && moveItem(character, from, parsePlace(event.currentTarget.dataset.drop))) render();
    });
    $content.on('dragend', finish);

    $content.on('dblclick', '.item', (event) => {
        const place = parsePlace(event.currentTarget.dataset.place);
        const item = itemAt(character, place);
        if (!item) return;
        const changed = place.kind === 'inventory' ? isWearable(item) && equip(character, place.index) : unequip(character, place.slot);
        if (changed) render();
    });
}
