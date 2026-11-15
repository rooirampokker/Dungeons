/**
 * Fog of war: what the hero can see right now, and everything they've seen so far, at walk-cell resolution.
 *
 * Sight is a circle of `radius` walk cells around the hero's cell; walls don't block it. Its edge fades over EDGE
 * cells, so both fog layers can be drawn soft and line up exactly: what's in sight now and what gets uncovered for
 * good use the same circle.
 *
 * Contains no drawing code, so it can be tested, saved, or used by creatures that need to know what the hero saw.
 */

/** How many walk cells the edge of sight fades over. */
export const EDGE = 2;

export class Fog {
    /**
     * @param {number} width   In walk cells.
     * @param {number} height
     * @param {number} radius  Sight radius in walk cells, at least EDGE.
     */
    constructor(width, height, radius) {
        this.width = width;
        this.height = height;
        this.radius = Math.max(EDGE, radius);
        /** @type {Uint8Array} How clearly each cell has been seen, from 0 (never) to 255 (well inside sight). */
        this.seen = new Uint8Array(width * height);
        /** @type {{x: number, y: number}|null} The cell the hero last looked from. */
        this.centre = null;
    }

    /**
     * Looks around from a cell: marks everything in sight as seen.
     * @param {number} x  Walk-cell column.
     * @param {number} y  Walk-cell row.
     */
    look(x, y) {
        this.centre = { x, y };
        const reach = Math.ceil(this.radius);
        for (let cy = Math.max(0, y - reach); cy <= Math.min(this.height - 1, y + reach); cy++) {
            for (let cx = Math.max(0, x - reach); cx <= Math.min(this.width - 1, x + reach); cx++) {
                const clarity = Math.round(sightAt(Math.hypot(cx - x, cy - y), this.radius) * 255);
                const index = cy * this.width + cx;
                if (clarity > this.seen[index]) this.seen[index] = clarity;
            }
        }
    }

    /**
     * Changes how far the hero sees and looks around again from where they are.
     * @param {number} radius  In walk cells.
     */
    setRadius(radius) {
        this.radius = Math.max(EDGE, radius);
        if (this.centre) this.look(this.centre.x, this.centre.y);
    }

    /** Whether a cell has ever been at least half in sight. */
    isExplored(x, y) {
        return x >= 0 && y >= 0 && x < this.width && y < this.height && this.seen[y * this.width + x] >= 128;
    }

    /** Whether a cell is at least half in sight from where the hero is now. */
    isVisible(x, y) {
        return this.centre !== null && sightAt(Math.hypot(x - this.centre.x, y - this.centre.y), this.radius) >= 0.5;
    }
}

/**
 * How clearly something `distance` walk cells away is seen: 1 well inside the radius, fading to 0 at the radius.
 * @param {number} distance
 * @param {number} radius
 */
export function sightAt(distance, radius) {
    return Math.max(0, Math.min(1, (radius - distance) / EDGE));
}
