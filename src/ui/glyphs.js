/**
 * Simple icons for items and equipment slots, as inline SVG drawn in the current text colour, so an item can be
 * shown before it has a picture of its own. Each is drawn on a 24 × 24 grid.
 *
 * @typedef {import('../character/items.js').ItemDef} ItemDef
 * @typedef {import('../character/items.js').SlotDef} SlotDef
 */

const PATHS = {
    ring: '<circle cx="12" cy="14.5" r="6" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 2.5l3 3.3-3 3.2-3-3.2z"/>',
    neck: '<path d="M4.5 3c1.2 5.5 4 8.5 7.5 8.5s6.3-3 7.5-8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="16" r="5"/>',
    helmet: '<path d="M3 17c0-6 4-11 9-11s9 5 9 11v2h-6.5v-5h-5v5H3z"/>',
    crown: '<path d="M3 19 4 7l4.5 5L12 4l3.5 8L20 7l1 12z"/>',
    body: '<path d="M8 3h8l5 4.5-2.8 3.8-1.7-1.3v11H7.5V10l-1.7 1.3L3 7.5z"/>',
    hands: '<path d="M8 21v-6L5 11.5a1.5 1.5 0 0 1 2.3-2L9 11V4.5a1.5 1.5 0 0 1 3 0V10 3.5a1.5 1.5 0 0 1 3 0V10 5a1.5 1.5 0 0 1 3 0v10.5L16.5 21z"/>',
    feet: '<path d="M7 2h6.5v10l5.6 2.8a2.6 2.6 0 0 1 1.4 2.2v4H5v-6.5z"/>',
    sword: '<path d="M20.5 2H22v1.5L11 14.5 9.5 13z"/><path d="M5 12.5l6.5 6.5-1.6 1.6-2-2-3.4 3.4H3v-1.5l3.4-3.4-2-2z"/>',
    staff: '<rect x="10.9" y="8" width="2.2" height="14" rx="1.1"/><circle cx="12" cy="5.5" r="3.6"/>',
    shield: '<path d="M12 2l8 3v6c0 5.2-3.4 9.2-8 11-4.6-1.8-8-5.8-8-11V5z"/>',
    lantern: '<path d="M9 2h6v2H9z"/><path d="M7 5h10l-1 2v10l1 2H7l1-2V7z"/><circle cx="12" cy="12" r="2.4" fill="#fff8" />',
    potion: '<path d="M10 2h4v2h-.8v4.3a7 7 0 1 1-2.4 0V4H10z"/>',
    item: '<path d="M9 3h6l-1.5 3.5h-3z"/><path d="M8 8h8c2.2 2.6 3.5 5.6 3.5 8.5A4.5 4.5 0 0 1 15 21H9a4.5 4.5 0 0 1-4.5-4.5C4.5 13.6 5.8 10.6 8 8z"/>',
};

/** The icon each item type gets unless the item names its own. */
const TYPE_ICONS = {
    ring: 'ring', neck: 'neck', head: 'helmet', body: 'body', hands: 'hands', feet: 'feet',
    weapon: 'sword', offhand: 'shield', potion: 'potion',
};

function svg(name, className) {
    return `<svg class="${className}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${PATHS[name] ?? PATHS.item}</svg>`;
}

/** @param {ItemDef} item */
export function itemIcon(item) {
    return svg(item.icon ?? TYPE_ICONS[item.type] ?? 'item', 'glyph');
}

/** A faint outline of what goes in an empty slot. @param {SlotDef} slot */
export function slotIcon(slot) {
    return svg(TYPE_ICONS[slot.accepts[0]] ?? 'item', 'glyph placeholder');
}

/** The figure behind the paper doll's slots. */
export const SILHOUETTE = '<svg class="silhouette" viewBox="0 0 100 170" fill="currentColor" aria-hidden="true">'
    + '<circle cx="50" cy="20" r="13"/>'
    + '<path d="M30 38h40c6 0 9 3 10 9l7 38-9 2-8-30v43l5 61H62l-8-50h-8l-8 50H25l5-61V57l-8 30-9-2 7-38c1-6 4-9 10-9z"/>'
    + '</svg>';
