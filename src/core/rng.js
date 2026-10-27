/**
 * Seedable random number generator (mulberry32). Every random choice during generation goes through one of these,
 * so the same seed always produces the same dungeon: useful for sharing maps, reproducing bugs and saving games.
 *
 * @typedef {object} Rng
 * @property {() => number} next              Float in [0, 1).
 * @property {(min: number, max: number) => number} int   Integer in [min, max], both inclusive.
 * @property {(probability: number) => boolean} chance
 * @property {<T>(items: T[]) => T} pick      Undefined when `items` is empty.
 */

/**
 * @param {string|number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
    let state = hashSeed(seed);

    const next = () => {
        state = (state + 0x6d2b79f5) | 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    return {
        next,
        int: (min, max) => min + Math.floor(next() * (max - min + 1)),
        chance: (probability) => next() < probability,
        pick: (items) => items[Math.floor(next() * items.length)],
    };
}

/** A short random seed for when the user doesn't supply one. */
export function randomSeed() {
    return Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0');
}

/**
 * FNV-1a hash, so any string (or number) can be used as a seed.
 * @param {string|number} seed
 * @returns {number}
 */
function hashSeed(seed) {
    const text = String(seed);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
