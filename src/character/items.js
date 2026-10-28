import { BONUS_IDS } from './stats.js';

/**
 * Things the hero can carry, and the places on the body they can be worn. Items are plain JSON
 * (src/data/items.json); an item's `type` decides which equipment slots take it. Types no slot takes, such as
 * potions, can only be carried.
 *
 * @typedef {object} ItemDef
 * @property {string} id
 * @property {string} name
 * @property {string} type                      e.g. 'ring', 'head', 'weapon', 'offhand', 'potion'.
 * @property {Object<string, number>} [bonuses] Stat or pool id → amount added while worn, e.g. { "mana": 10 }.
 * @property {string} [description]
 * @property {string} [icon]                    Which drawn icon to show (see ui/glyphs.js). Default: the type's.
 * @property {string} [colour]                  CSS colour for the icon.
 * @property {string} [image]                   A picture to show instead of the icon, relative to index.html.
 *
 * @typedef {object} SlotDef                    A place on the paper doll.
 * @property {string} id
 * @property {string} label
 * @property {string[]} accepts                 Item types it takes.
 */

/** @type {SlotDef[]} Where they sit on the paper doll is up to the page's CSS (grid areas named after the ids). */
export const SLOTS = [
    { id: 'head', label: 'Head', accepts: ['head'] },
    { id: 'neck', label: 'Neck', accepts: ['neck'] },
    { id: 'body', label: 'Body', accepts: ['body'] },
    { id: 'mainHand', label: 'Main hand', accepts: ['weapon'] },
    { id: 'offHand', label: 'Off hand', accepts: ['offhand'] },
    { id: 'hands', label: 'Hands', accepts: ['hands'] },
    { id: 'ring1', label: 'Ring', accepts: ['ring'] },
    { id: 'ring2', label: 'Ring', accepts: ['ring'] },
    { id: 'feet', label: 'Feet', accepts: ['feet'] },
];

export const SLOTS_BY_ID = new Map(SLOTS.map((slot) => [slot.id, slot]));

/**
 * Checks the item list and indexes it by id. Throws if it has errors.
 * @param {ItemDef[]} data
 * @returns {Map<string, ItemDef>}
 */
export function createItemCatalogue(data) {
    const errors = [];
    const catalogue = new Map();
    for (const item of data) {
        const where = `item "${item.id}"`;
        if (!item.id || !item.name || !item.type) errors.push(`${where}: needs an id, a name and a type`);
        if (catalogue.has(item.id)) errors.push(`${where}: duplicate id`);
        for (const [stat, amount] of Object.entries(item.bonuses ?? {})) {
            if (!BONUS_IDS.includes(stat)) errors.push(`${where}: no stat called "${stat}"`);
            if (!Number.isFinite(amount)) errors.push(`${where}: the ${stat} bonus must be a number`);
        }
        catalogue.set(item.id, Object.freeze({ ...item }));
    }
    if (errors.length) throw new Error(`The item list is invalid:\n  ${errors.join('\n  ')}`);
    return catalogue;
}

/**
 * @param {ItemDef} item
 * @param {string} slotId
 */
export function fitsSlot(item, slotId) {
    return Boolean(SLOTS_BY_ID.get(slotId)?.accepts.includes(item.type));
}

/** Whether any equipment slot takes the item. */
export function isWearable(item) {
    return SLOTS.some((slot) => slot.accepts.includes(item.type));
}
