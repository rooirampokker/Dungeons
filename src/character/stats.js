/**
 * The hero's numbers: pools that go up and down in play (health, mana), and stats that only change with what the
 * hero wears. Items raise either through their `bonuses`, keyed by the ids below; a bonus to a pool raises its
 * maximum.
 *
 * @typedef {import('./character.js').Character} Character
 *
 * @typedef {object} StatDef
 * @property {string} id
 * @property {string} label
 * @property {string} description
 *
 * @typedef {object} StatTotal
 * @property {number} base
 * @property {number} bonus    From equipped items.
 * @property {number} total
 */

/** @type {StatDef[]} Shown as bars, in this order. */
export const POOLS = [
    { id: 'health', label: 'Health', description: 'How much harm the hero can take.' },
    { id: 'mana', label: 'Mana', description: 'What the hero spends to cast spells.' },
];

/** @type {StatDef[]} Shown as a list, in this order. */
export const STATS = [
    { id: 'strength', label: 'Strength', description: 'Hits harder in close combat and carries more.' },
    { id: 'dexterity', label: 'Dexterity', description: 'Hits more often, and with ranged weapons.' },
    { id: 'intelligence', label: 'Intelligence', description: 'Casts stronger spells.' },
    { id: 'speed', label: 'Speed', description: 'Acts sooner and more often.' },
    { id: 'armour', label: 'Armour', description: 'Turns blows aside.' },
];

/** Everything an item can give a bonus to. */
export const BONUS_IDS = [...POOLS, ...STATS].map((stat) => stat.id);

/**
 * Each stat and pool maximum: the hero's own value plus bonuses from everything they wear. Carried items give nothing.
 * @param {Character} character
 * @returns {Object<string, StatTotal>}
 */
export function statTotals(character) {
    const totals = {};
    for (const id of BONUS_IDS) {
        let bonus = 0;
        for (const item of Object.values(character.equipment)) bonus += item?.bonuses?.[id] ?? 0;
        const base = character.base[id] ?? 0;
        totals[id] = { base, bonus, total: base + bonus };
    }
    return totals;
}
