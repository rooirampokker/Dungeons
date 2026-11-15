import { SLOTS, SLOTS_BY_ID, fitsSlot } from './items.js';
import { POOLS, STATS, statTotals } from './stats.js';

/**
 * The hero as a character: their own stats, how full their pools are, what they wear and what they carry. It's
 * separate from the dungeon, so the hero keeps their things from one dungeon to the next.
 *
 * Every change of place is one move from a place to another: an inventory cell or an equipment slot. A move
 * swaps whatever is in the two places, and is allowed only when both items fit where they end up.
 *
 * @typedef {import('./items.js').ItemDef} ItemDef
 *
 * @typedef {object} CharacterData              src/data/character.json
 * @property {string} name
 * @property {Object<string, number>} pools     Each pool's own maximum, e.g. { "health": 50 }.
 * @property {Object<string, number>} stats     Each stat's own value.
 * @property {number} inventorySize
 * @property {Object<string, string>} [equipment]  Slot id → item id, worn from the start.
 * @property {string[]} [inventory]             Item ids carried from the start, filling the first cells.
 *
 * @typedef {object} Character
 * @property {string} name
 * @property {Object<string, number>} base      The hero's own stats and pool maxima, before bonuses.
 * @property {Object<string, number>} pools     How much of each pool is left.
 * @property {Object<string, ItemDef|null>} equipment  Slot id → item worn there.
 * @property {(ItemDef|null)[]} inventory       One entry per cell.
 *
 * @typedef {{kind: 'inventory', index: number}|{kind: 'equipment', slot: string}} Place
 */

/**
 * @param {CharacterData} data
 * @param {Map<string, ItemDef>} catalogue
 * @returns {Character}
 */
export function createCharacter(data, catalogue) {
    const item = (id) => {
        if (!catalogue.has(id)) throw new Error(`Character "${data.name}": no item called "${id}"`);
        return catalogue.get(id);
    };
    const base = {};
    for (const pool of POOLS) base[pool.id] = data.pools?.[pool.id] ?? 0;
    for (const stat of STATS) base[stat.id] = data.stats?.[stat.id] ?? 0;

    const equipment = Object.fromEntries(SLOTS.map((slot) => [slot.id, null]));
    for (const [slot, id] of Object.entries(data.equipment ?? {})) {
        if (!SLOTS_BY_ID.has(slot)) throw new Error(`Character "${data.name}": no equipment slot called "${slot}"`);
        if (!fitsSlot(item(id), slot)) throw new Error(`Character "${data.name}": "${id}" can't be worn on the ${slot}`);
        equipment[slot] = item(id);
    }
    const carried = (data.inventory ?? []).map(item);
    if (carried.length > data.inventorySize) throw new Error(`Character "${data.name}": carries more than fits`);
    const inventory = Array.from({ length: data.inventorySize }, (_, index) => carried[index] ?? null);

    const character = { name: data.name, base, pools: {}, equipment, inventory };
    // Start with every pool full.
    const totals = statTotals(character);
    for (const pool of POOLS) character.pools[pool.id] = totals[pool.id].total;
    return character;
}

/**
 * @param {Character} character
 * @param {Place} place
 * @returns {ItemDef|null|undefined} Undefined if there's no such place.
 */
export function itemAt(character, place) {
    if (place.kind === 'inventory') {
        return place.index >= 0 && place.index < character.inventory.length ? character.inventory[place.index] : undefined;
    }
    return SLOTS_BY_ID.has(place.slot) ? character.equipment[place.slot] : undefined;
}

/**
 * Whether an item can go in a place: any inventory cell takes anything; a slot only takes items it fits.
 * @param {ItemDef} item
 * @param {Place} place
 */
export function canPlace(item, place) {
    return place.kind === 'inventory' || fitsSlot(item, place.slot);
}

/**
 * Whether moving the item at `from` to `to` is allowed: there's an item to move, and it fits `to`, and whatever is
 * at `to` fits `from`, since the two swap.
 * @param {Character} character
 * @param {Place} from
 * @param {Place} to
 */
export function canMove(character, from, to) {
    const item = itemAt(character, from);
    const other = itemAt(character, to);
    if (!item || other === undefined || samePlace(from, to)) return false;
    return canPlace(item, to) && (other === null || canPlace(other, from));
}

/**
 * Moves the item at `from` to `to`, swapping it with anything already there. Pools follow any change to their
 * maximum: a bigger maximum adds the difference, a smaller one takes it away, never going below 0.
 * @param {Character} character
 * @param {Place} from
 * @param {Place} to
 * @returns {boolean} Whether it moved.
 */
export function moveItem(character, from, to) {
    if (!canMove(character, from, to)) return false;
    const before = statTotals(character);
    const item = itemAt(character, from);
    const other = itemAt(character, to);
    put(character, to, item);
    put(character, from, other);
    const after = statTotals(character);
    for (const pool of POOLS) {
        const change = after[pool.id].total - before[pool.id].total;
        character.pools[pool.id] = Math.max(0, Math.min(after[pool.id].total, character.pools[pool.id] + change));
    }
    return true;
}

/**
 * Puts on a carried item: into an empty slot that takes it if there is one, otherwise in place of what's worn in
 * the first slot that takes it.
 * @param {Character} character
 * @param {number} index  Inventory cell.
 * @returns {boolean} Whether it was put on.
 */
export function equip(character, index) {
    const item = character.inventory[index];
    if (!item) return false;
    const slots = SLOTS.filter((slot) => fitsSlot(item, slot.id));
    const slot = slots.find((candidate) => !character.equipment[candidate.id]) ?? slots[0];
    return Boolean(slot) && moveItem(character, { kind: 'inventory', index }, { kind: 'equipment', slot: slot.id });
}

/**
 * Takes off a worn item into the first empty inventory cell.
 * @param {Character} character
 * @param {string} slot
 * @returns {boolean} Whether it was taken off; false if nothing is worn there or there's no room to carry it.
 */
export function unequip(character, slot) {
    const index = character.inventory.indexOf(null);
    return index >= 0 && moveItem(character, { kind: 'equipment', slot }, { kind: 'inventory', index });
}

function put(character, place, item) {
    if (place.kind === 'inventory') character.inventory[place.index] = item;
    else character.equipment[place.slot] = item;
}

function samePlace(a, b) {
    return a.kind === b.kind && (a.kind === 'inventory' ? a.index === b.index : a.slot === b.slot);
}
