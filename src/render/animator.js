import { STEP } from '../core/directions.js';

/**
 * Smooths movement on screen. Game state changes instantly; the animator only works out where to draw each entity
 * while it glides from its old position, or bumps against a wall and back.
 *
 * @typedef {import('../world/world.js').Entity} Entity
 * @typedef {import('../core/directions.js').Direction} Direction
 *
 * @typedef {object} Track
 * @property {number} start            performance.now() timestamp.
 * @property {number} duration         Milliseconds.
 * @property {(progress: number) => {x: number, y: number}} offset  Offset from the entity's position, in walk cells.
 */

const MOVE_MS = 150;
const BUMP_MS = 200;
/** How far a blocked move nudges towards the wall, in walk cells. */
const BUMP_DISTANCE = 0.25;

// jQuery's default "swing" easing, which the old movement code used.
const swing = (progress) => 0.5 - Math.cos(progress * Math.PI) / 2;

export class Animator {
    constructor() {
        /** @type {Map<string, Track>} By entity id. */
        this.tracks = new Map();
    }

    /**
     * Glide from the entity's previous position to its current one.
     * @param {Entity} entity
     * @param {{x: number, y: number}} from
     */
    move(entity, from) {
        const dx = from.x - entity.x;
        const dy = from.y - entity.y;
        this.tracks.set(entity.id, {
            start: performance.now(),
            duration: MOVE_MS,
            offset: (progress) => ({ x: dx * (1 - swing(progress)), y: dy * (1 - swing(progress)) }),
        });
    }

    /**
     * Nudge towards a direction and back, for a move that was blocked.
     * @param {Entity} entity
     * @param {Direction} direction
     */
    bump(entity, direction) {
        const { dx, dy } = STEP[direction];
        this.tracks.set(entity.id, {
            start: performance.now(),
            duration: BUMP_MS,
            offset: (progress) => {
                const reach = BUMP_DISTANCE * Math.sin(progress * Math.PI);
                return { x: dx * reach, y: dy * reach };
            },
        });
    }

    /**
     * Where to draw the entity right now, in walk cells.
     * @param {Entity} entity
     * @param {number} now
     */
    positionOf(entity, now) {
        const track = this.tracks.get(entity.id);
        if (!track) return { x: entity.x, y: entity.y };
        const progress = Math.min(1, (now - track.start) / track.duration);
        if (progress >= 1) this.tracks.delete(entity.id);
        const offset = track.offset(progress);
        return { x: entity.x + offset.x, y: entity.y + offset.y };
    }

    /** @param {Entity} entity */
    isBusy(entity, now = performance.now()) {
        const track = this.tracks.get(entity.id);
        return Boolean(track) && now - track.start < track.duration;
    }

    hasActiveTracks() {
        return this.tracks.size > 0;
    }

    clear() {
        this.tracks.clear();
    }
}
