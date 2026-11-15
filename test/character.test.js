import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { canMove, createCharacter, equip, itemAt, moveItem, unequip } from '../src/character/character.js';
import { SLOTS, createItemCatalogue, fitsSlot, isWearable } from '../src/character/items.js';
import { BONUS_IDS, statTotals } from '../src/character/stats.js';

const json = (file) => JSON.parse(readFileSync(new URL(`../src/data/${file}`, import.meta.url), 'utf8'));

/** A small catalogue, and a hero with a sword in hand and five things in a six-cell pack. */
const catalogue = createItemCatalogue([
    { id: 'ring', name: 'Ring', type: 'ring', bonuses: { strength: 1 } },
    { id: 'gem-ring', name: 'Gem ring', type: 'ring', bonuses: { intelligence: 2 } },
    { id: 'cap', name: 'Cap', type: 'head', bonuses: { armour: 1, health: 10 } },
    { id: 'crown', name: 'Crown', type: 'head', bonuses: { intelligence: 3 } },
    { id: 'sword', name: 'Sword', type: 'weapon', bonuses: { strength: 2 } },
    { id: 'potion', name: 'Potion', type: 'potion' },
]);

function hero() {
    return createCharacter({
        name: 'Test',
        pools: { health: 50, mana: 20 },
        stats: { strength: 5, intelligence: 4 },
        inventorySize: 6,
        equipment: { mainHand: 'sword' },
        inventory: ['ring', 'gem-ring', 'cap', 'crown', 'potion'],
    }, catalogue);
}

const cell = (index) => ({ kind: 'inventory', index });
const slot = (id) => ({ kind: 'equipment', slot: id });

describe('items', () => {
    it('fit only the slots that take their type', () => {
        const ring = catalogue.get('ring');
        assert.ok(fitsSlot(ring, 'ring1') && fitsSlot(ring, 'ring2'));
        assert.equal(fitsSlot(ring, 'head'), false);
        assert.equal(isWearable(catalogue.get('potion')), false);
    });

    it('reports catalogue mistakes', () => {
        assert.throws(() => createItemCatalogue([{ id: 'a', name: 'A', type: 'ring' }, { id: 'a', name: 'B', type: 'ring' }]), /duplicate id/);
        assert.throws(() => createItemCatalogue([{ id: 'a', name: 'A' }]), /needs an id, a name and a type/);
        assert.throws(() => createItemCatalogue([{ id: 'a', name: 'A', type: 'ring', bonuses: { luck: 1 } }]), /no stat called "luck"/);
    });
});

describe('a new character', () => {
    it('wears and carries what it starts with, with full pools', () => {
        const character = hero();
        assert.equal(character.equipment.mainHand.id, 'sword');
        assert.equal(character.equipment.head, null);
        assert.deepEqual(character.inventory.map((item) => item?.id ?? null), ['ring', 'gem-ring', 'cap', 'crown', 'potion', null]);
        assert.deepEqual(character.pools, { health: 50, mana: 20 });
    });

    it('counts only what is worn towards its stats', () => {
        const totals = statTotals(hero());
        assert.deepEqual(totals.strength, { base: 5, bonus: 2, total: 7 });
        assert.deepEqual(totals.intelligence, { base: 4, bonus: 0, total: 4 });
        assert.deepEqual(totals.speed, { base: 0, bonus: 0, total: 0 });
    });

    it('refuses starting kit that does not exist or does not fit', () => {
        const data = { name: 'X', pools: {}, stats: {}, inventorySize: 2 };
        assert.throws(() => createCharacter({ ...data, inventory: ['nothing'] }, catalogue), /no item called "nothing"/);
        assert.throws(() => createCharacter({ ...data, equipment: { head: 'ring' } }, catalogue), /can't be worn on the head/);
        assert.throws(() => createCharacter({ ...data, inventory: ['ring', 'ring', 'ring'] }, catalogue), /carries more than fits/);
    });
});

describe('moving items', () => {
    it('puts an item on by moving it to a slot that takes it', () => {
        const character = hero();
        assert.ok(moveItem(character, cell(0), slot('ring2')));
        assert.equal(character.equipment.ring2.id, 'ring');
        assert.equal(character.inventory[0], null);
        assert.equal(statTotals(character).strength.total, 8);
    });

    it('refuses slots that do not take the item, and anything that is not there', () => {
        const character = hero();
        assert.equal(moveItem(character, cell(4), slot('head')), false); // a potion
        assert.equal(moveItem(character, cell(0), slot('head')), false); // a ring
        assert.equal(moveItem(character, cell(5), slot('ring1')), false); // an empty cell
        assert.equal(moveItem(character, cell(0), cell(0)), false);
        assert.equal(moveItem(character, cell(0), cell(99)), false);
        assert.equal(character.inventory[0].id, 'ring');
    });

    it('swaps with whatever is already there', () => {
        const character = hero();
        moveItem(character, cell(2), slot('head')); // the cap
        assert.ok(moveItem(character, cell(3), slot('head'))); // the crown
        assert.equal(character.equipment.head.id, 'crown');
        assert.equal(character.inventory[3].id, 'cap');
        assert.ok(moveItem(character, cell(0), cell(5)));
        assert.equal(character.inventory[5].id, 'ring');
        assert.equal(character.inventory[0], null);
    });

    it('swaps between slots only when both items fit', () => {
        const character = hero();
        moveItem(character, cell(0), slot('ring1'));
        moveItem(character, cell(1), slot('ring2'));
        assert.ok(moveItem(character, slot('ring1'), slot('ring2')));
        assert.equal(character.equipment.ring1.id, 'gem-ring');
        assert.equal(canMove(character, slot('ring1'), slot('head')), false);
    });

    it('won\'t take something off into a cell whose item can\'t go in its place', () => {
        const character = hero();
        // The sword can't swap with the potion, since a potion can't be held as a weapon.
        assert.equal(moveItem(character, slot('mainHand'), cell(4)), false);
        assert.ok(moveItem(character, slot('mainHand'), cell(5)));
        assert.equal(itemAt(character, slot('mainHand')), null);
    });

    it('raises and lowers pools with their maximum, never below nothing', () => {
        const character = hero();
        character.pools.health = 30;
        moveItem(character, cell(2), slot('head')); // the cap: +10 health
        assert.equal(statTotals(character).health.total, 60);
        assert.equal(character.pools.health, 40);
        character.pools.health = 5;
        moveItem(character, slot('head'), cell(2));
        assert.equal(character.pools.health, 0);
    });
});

describe('equip and unequip', () => {
    it('fill an empty slot first, then swap with the first one that takes the item', () => {
        const character = hero();
        assert.ok(equip(character, 0));
        assert.ok(equip(character, 1));
        assert.deepEqual([character.equipment.ring1.id, character.equipment.ring2.id], ['ring', 'gem-ring']);
        moveItem(character, cell(3), cell(0)); // the crown, to the first cell
        assert.ok(equip(character, 2));
        assert.ok(equip(character, 0));
        assert.equal(character.equipment.head.id, 'crown');
        assert.equal(character.inventory[0].id, 'cap');
    });

    it('won\'t put on what can only be carried', () => {
        assert.equal(equip(hero(), 4), false);
    });

    it('take things off into the first empty cell, unless the pack is full', () => {
        const character = hero();
        assert.ok(unequip(character, 'mainHand'));
        assert.equal(character.inventory[5].id, 'sword');
        assert.ok(equip(character, 5));
        moveItem(character, cell(0), cell(5)); // the pack is now full again
        character.inventory[0] = catalogue.get('potion');
        assert.equal(unequip(character, 'mainHand'), false);
        assert.equal(unequip(character, 'head'), false); // nothing worn there
    });
});

describe('the shipped hero and items', () => {
    it('load without errors, every bonus naming a stat', () => {
        const items = createItemCatalogue(json('items.json'));
        for (const item of items.values()) {
            for (const id of Object.keys(item.bonuses ?? {})) assert.ok(BONUS_IDS.includes(id), `${item.id}: ${id}`);
        }
        const character = createCharacter(json('character.json'), items);
        assert.ok(character.inventory.some(Boolean));
        assert.ok(SLOTS.every((s) => s.id in character.equipment));
    });

    it('include something for every slot, so the whole paper doll can be tried out', () => {
        const items = [...createItemCatalogue(json('items.json')).values()];
        for (const s of SLOTS) assert.ok(items.some((item) => fitsSlot(item, s.id)), s.id);
    });
});
