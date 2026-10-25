import $ from 'jquery';
import { Animator } from './animator.js';
import { drawDebug, drawEntities, drawOverlays, drawTiles } from './layers.js';

/**
 * Draws a scene on a canvas the size of the visible area, so map size doesn't affect memory or drawing time.
 * The viewport scrolls natively over a "stage" element as large as the whole map; the canvas sticks to the
 * viewport's top-left corner and redraws whatever the scroll position reveals.
 *
 * @typedef {import('./layers.js').Scene} Scene
 * @typedef {import('./layers.js').Layer} Layer
 * @typedef {import('./layers.js').View} View
 * @typedef {import('../world/world.js').Entity} Entity
 * @typedef {import('../core/directions.js').Direction} Direction
 */

/** @type {Layer[]} */
export const DEFAULT_LAYERS = [drawTiles, drawOverlays, drawDebug, drawEntities];

export class Renderer {
    /**
     * @param {HTMLElement} viewport  A scrollable element; the renderer fills it.
     * @param {Layer[]} [layers]       Bottom to top.
     */
    constructor(viewport, layers = DEFAULT_LAYERS) {
        this.$viewport = $(viewport);
        this.$stage = $('<div class="stage">').appendTo(viewport);
        /** @type {HTMLCanvasElement} */
        this.canvas = $('<canvas>').appendTo(this.$stage)[0];
        this.ctx = this.canvas.getContext('2d');
        this.layers = [...layers];
        this.animator = new Animator();
        /** @type {Scene|null} */
        this.scene = null;
        this.pixelRatio = 1;
        this.frame = 0;

        this.$viewport.on('scroll', () => this.requestRender());
        new ResizeObserver(() => this.resize()).observe(viewport);
    }

    /** @param {Scene} scene */
    show(scene) {
        this.scene = scene;
        this.animator.clear();
        const { cols, rows } = scene.world.dungeon;
        this.$stage.css({ width: cols * scene.tileSize, height: rows * scene.tileSize });
        this.resize();
    }

    /** @param {boolean} debug */
    setDebug(debug) {
        if (!this.scene) return;
        this.scene.debug = debug;
        this.requestRender();
    }

    /**
     * @param {Entity} entity
     * @param {{x: number, y: number}} from  Position before the move.
     */
    animateMove(entity, from) {
        this.animator.move(entity, from);
        this.requestRender();
    }

    /**
     * @param {Entity} entity
     * @param {Direction} direction
     */
    animateBump(entity, direction) {
        this.animator.bump(entity, direction);
        this.requestRender();
    }

    /** @param {Entity} entity */
    isAnimating(entity) {
        return this.animator.isBusy(entity);
    }

    /**
     * Scrolls so the entity stays well inside the visible area.
     * @param {Entity} entity
     * @param {{centre?: boolean}} [options]  Centre on the entity right away instead of only when it nears an edge.
     */
    follow(entity, { centre = false } = {}) {
        if (!this.scene) return;
        const viewport = this.$viewport[0];
        const cellSize = this.scene.tileSize / this.scene.world.tileset.subGrid;
        const x = (entity.x + 0.5) * cellSize;
        const y = (entity.y + 0.5) * cellSize;
        const marginX = Math.min(viewport.clientWidth / 4, this.scene.tileSize * 2);
        const marginY = Math.min(viewport.clientHeight / 4, this.scene.tileSize * 2);

        let left = viewport.scrollLeft;
        let top = viewport.scrollTop;
        if (centre || x < left + marginX || x > left + viewport.clientWidth - marginX) left = x - viewport.clientWidth / 2;
        if (centre || y < top + marginY || y > top + viewport.clientHeight - marginY) top = y - viewport.clientHeight / 2;
        viewport.scrollTo({ left, top, behavior: centre ? 'auto' : 'smooth' });
    }

    resize() {
        if (!this.scene) return;
        const viewport = this.$viewport[0];
        const width = Math.min(viewport.clientWidth, this.$stage.width());
        const height = Math.min(viewport.clientHeight, this.$stage.height());
        this.pixelRatio = window.devicePixelRatio || 1;
        $(this.canvas).css({ width, height });
        this.canvas.width = Math.round(width * this.pixelRatio);
        this.canvas.height = Math.round(height * this.pixelRatio);
        this.requestRender();
    }

    requestRender() {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.draw();
        });
    }

    draw() {
        if (!this.scene) return;
        const view = this.createView(performance.now());
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (const layer of this.layers) layer(this.ctx, view, this.scene);
        if (this.animator.hasActiveTracks()) this.requestRender();
    }

    /**
     * @param {number} now
     * @returns {View}
     */
    createView(now) {
        const { tileSize, world } = this.scene;
        const viewport = this.$viewport[0];
        const left = viewport.scrollLeft;
        const top = viewport.scrollTop;
        const width = this.canvas.width / this.pixelRatio;
        const height = this.canvas.height / this.pixelRatio;
        const ratio = this.pixelRatio;
        const toX = (x) => Math.round((x - left) * ratio);
        const toY = (y) => Math.round((y - top) * ratio);

        return {
            tileSize,
            cellSize: tileSize / world.tileset.subGrid,
            pixelRatio: ratio,
            firstCol: Math.max(0, Math.floor(left / tileSize)),
            lastCol: Math.min(world.dungeon.cols - 1, Math.floor((left + width) / tileSize)),
            firstRow: Math.max(0, Math.floor(top / tileSize)),
            lastRow: Math.min(world.dungeon.rows - 1, Math.floor((top + height) / tileSize)),
            rect: (x, y, w, h) => {
                const x0 = toX(x);
                const y0 = toY(y);
                return { x: x0, y: y0, width: toX(x + w) - x0, height: toY(y + h) - y0 };
            },
            entityPosition: (entity) => this.animator.positionOf(entity, now),
        };
    }
}
