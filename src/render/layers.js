import { EDGE } from '../world/fog.js';

/**
 * Drawing layers, painted bottom to top every frame. Each layer only draws what's visible. New layers, such as
 * creature health bars, slot into the list in renderer.js.
 *
 * @typedef {import('../world/world.js').World} World
 * @typedef {import('../world/world.js').Entity} Entity
 * @typedef {import('../generation/dungeon.js').Cell} Cell
 * @typedef {import('../core/directions.js').Orientation} Orientation
 *
 * @typedef {object} Scene
 * @property {World} world
 * @property {Map<string, HTMLImageElement|null>} images   Tile and overlay images by file name.
 * @property {Map<string, HTMLImageElement|null>} sprites  Sprite images by sprite id.
 * @property {number} tileSize                             Tile size on screen, in CSS pixels.
 * @property {boolean} debug
 * @property {boolean} fog                                 Draw the fog of war.
 *
 * @typedef {{x: number, y: number, width: number, height: number}} Box
 *
 * @typedef {object} View                  What is visible in this frame.
 * @property {number} tileSize
 * @property {number} cellSize             Walk cell size in CSS pixels.
 * @property {number} pixelRatio           Canvas pixels per CSS pixel.
 * @property {number} firstCol             Visible tile range, inclusive.
 * @property {number} lastCol
 * @property {number} firstRow
 * @property {number} lastRow
 * @property {(x: number, y: number, width: number, height: number) => Box} rect
 *           Converts a box in map pixels to canvas pixels, rounded so neighbouring tiles meet without seams.
 * @property {(entity: Entity) => {x: number, y: number}} entityPosition  Animated position, in walk cells.
 *
 * @typedef {(ctx: CanvasRenderingContext2D, view: View, scene: Scene) => void} Layer
 */

const MISSING_IMAGE = '#3a2f3a';
const DEBUG_UNMAPPED = 'rgba(255, 0, 0, 0.5)';
const DEBUG_UNREACHABLE = 'rgba(0, 0, 30, 0.55)';
const DEBUG_CONFLICT = '#ff9800';
const DEBUG_GRID = 'rgba(255, 255, 255, 0.15)';
const DEBUG_WALKABLE = 'rgba(120, 255, 120, 0.8)';
/** Over places the hero has seen but can't see now. */
const FOG_DIM = 'rgba(6, 8, 18, 0.62)';
const FOG_CLEAR = 'rgba(6, 8, 18, 0)';

/** @type {Layer} */
export function drawTiles(ctx, view, scene) {
    forEachVisibleCell(view, scene.world, (cell) => {
        const box = tileBox(view, cell);
        const image = scene.images.get(cell.tile.image);
        if (image) {
            drawMirrored(ctx, image, box, cell.orientation);
        } else {
            ctx.fillStyle = MISSING_IMAGE;
            ctx.fillRect(box.x, box.y, box.width, box.height);
        }
    });
}

/** @type {Layer} */
export function drawOverlays(ctx, view, scene) {
    // Decoration positions and overlay image sizes are measured at the tileset's reference size.
    const scale = view.tileSize / scene.world.tileset.referenceSize;
    forEachVisibleCell(view, scene.world, (cell) => {
        for (const decoration of cell.decorations) {
            const image = scene.images.get(decoration.overlay.image);
            if (!image) continue;
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            // Spot overlays are centred on their footprint, since the image may be larger (a glow, say).
            // Fixed overlays are drawn from their offset.
            const left = decoration.width === null
                ? decoration.x * scale
                : (decoration.x + decoration.width / 2) * scale - width / 2;
            const top = decoration.height === null
                ? decoration.y * scale
                : (decoration.y + decoration.height / 2) * scale - height / 2;
            const box = view.rect(cell.col * view.tileSize + left, cell.row * view.tileSize + top, width, height);
            drawMirrored(ctx, image, box, decoration.orientation);
        }
    });
}

/**
 * Red: tile has no walk map yet. Dark: not reachable from the start tile. Orange outline: tile doesn't fit its
 * neighbours. Green dots: walkable cells.
 * @type {Layer}
 */
export function drawDebug(ctx, view, scene) {
    if (!scene.debug) return;
    const { dungeon, tileset, walk } = scene.world;
    const line = Math.max(1, Math.round(view.pixelRatio));

    forEachVisibleCell(view, scene.world, (cell) => {
        const box = tileBox(view, cell);
        if (!cell.tile.walk) {
            ctx.fillStyle = DEBUG_UNMAPPED;
            ctx.fillRect(box.x, box.y, box.width, box.height);
        } else if (!dungeon.isReachable(cell.row, cell.col)) {
            ctx.fillStyle = DEBUG_UNREACHABLE;
            ctx.fillRect(box.x, box.y, box.width, box.height);
        }
        ctx.lineWidth = cell.conflict ? 3 * line : line;
        ctx.strokeStyle = cell.conflict ? DEBUG_CONFLICT : DEBUG_GRID;
        ctx.strokeRect(box.x + ctx.lineWidth / 2, box.y + ctx.lineWidth / 2, box.width - ctx.lineWidth, box.height - ctx.lineWidth);
    });

    const size = tileset.subGrid;
    const cell = view.cellSize;
    ctx.fillStyle = DEBUG_WALKABLE;
    for (let y = view.firstRow * size; y < (view.lastRow + 1) * size; y++) {
        for (let x = view.firstCol * size; x < (view.lastCol + 1) * size; x++) {
            if (!walk.isWalkable(x, y)) continue;
            const dot = view.rect((x + 0.4) * cell, (y + 0.4) * cell, cell * 0.2, cell * 0.2);
            ctx.fillRect(dot.x, dot.y, dot.width, dot.height);
        }
    }
}

/** @type {Layer} */
export function drawEntities(ctx, view, scene) {
    const cell = view.cellSize;
    for (const entity of scene.world.entities) {
        const { x, y } = view.entityPosition(entity);
        const sprite = scene.sprites.get(entity.sprite);
        if (!sprite) {
            const box = view.rect(x * cell, y * cell, cell, cell);
            ctx.fillStyle = '#fff';
            ctx.fillRect(box.x, box.y, box.width, box.height);
            continue;
        }
        // Sprites are scaled to fit one walk cell.
        const scale = Math.min(cell / sprite.naturalWidth, cell / sprite.naturalHeight);
        const width = sprite.naturalWidth * scale;
        const height = sprite.naturalHeight * scale;
        const box = view.rect(x * cell + (cell - width) / 2, y * cell + (cell - height) / 2, width, height);
        ctx.drawImage(sprite, box.x, box.y, box.width, box.height);
    }
}

/**
 * The lower fog layer: dims everything outside the hero's sight, so what they can see from where they stand stands
 * out. Places they have never seen are covered by the shroud on top.
 * @type {Layer}
 */
export function drawSight(ctx, view, scene) {
    if (!scene.fog) return;
    const { fog, hero } = scene.world;
    const { x, y } = view.entityPosition(hero);
    const centre = view.rect((x + 0.5) * view.cellSize, (y + 0.5) * view.cellSize, 0, 0);
    const toCanvas = view.cellSize * view.pixelRatio;
    // Clear inside the radius less EDGE, fading to dim at the radius: the same fade as the shroud's edge.
    const gradient = ctx.createRadialGradient(centre.x, centre.y, (fog.radius - EDGE) * toCanvas, centre.x, centre.y, fog.radius * toCanvas);
    gradient.addColorStop(0, FOG_CLEAR);
    gradient.addColorStop(1, FOG_DIM);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** One pixel per walk cell, reused from frame to frame. */
let shroudCanvas = null;

/**
 * The upper fog layer: black over everything the hero has never seen, lifting for good as they explore. The fog's
 * walk-cell map is drawn one pixel per cell and scaled up smoothly, so the shroud's edge is soft.
 * @type {Layer}
 */
export function drawShroud(ctx, view, scene) {
    if (!scene.fog) return;
    const { fog, tileset } = scene.world;
    const size = tileset.subGrid;
    // The visible tiles plus a cell all round, so the smoothing at the edges matches the cells beyond.
    const left = view.firstCol * size - 1;
    const top = view.firstRow * size - 1;
    const width = (view.lastCol - view.firstCol + 1) * size + 2;
    const height = (view.lastRow - view.firstRow + 1) * size + 2;

    shroudCanvas ??= document.createElement('canvas');
    if (shroudCanvas.width !== width || shroudCanvas.height !== height) {
        shroudCanvas.width = width;
        shroudCanvas.height = height;
    }
    const shroud = shroudCanvas.getContext('2d');
    const image = shroud.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        // Beyond the map, repeat the edge cells so the map's own edge isn't darkened.
        const row = Math.min(fog.height - 1, Math.max(0, top + y)) * fog.width;
        for (let x = 0; x < width; x++) {
            const col = Math.min(fog.width - 1, Math.max(0, left + x));
            image.data[(y * width + x) * 4 + 3] = 255 - fog.seen[row + col];
        }
    }
    shroud.putImageData(image, 0, 0);

    const box = view.rect(left * view.cellSize, top * view.cellSize, width * view.cellSize, height * view.cellSize);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(shroudCanvas, box.x, box.y, box.width, box.height);
    ctx.restore();
}

/**
 * @param {View} view
 * @param {World} world
 * @param {(cell: Cell) => void} draw
 */
function forEachVisibleCell(view, world, draw) {
    for (let row = view.firstRow; row <= view.lastRow; row++) {
        for (let col = view.firstCol; col <= view.lastCol; col++) {
            const cell = world.dungeon.get(row, col);
            if (cell) draw(cell);
        }
    }
}

/** @returns {Box} */
function tileBox(view, cell) {
    return view.rect(cell.col * view.tileSize, cell.row * view.tileSize, view.tileSize, view.tileSize);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} image
 * @param {Box} box
 * @param {Orientation} orientation
 */
function drawMirrored(ctx, image, box, { flipH, flipV }) {
    if (!flipH && !flipV) {
        ctx.drawImage(image, box.x, box.y, box.width, box.height);
        return;
    }
    ctx.save();
    ctx.translate(box.x + (flipH ? box.width : 0), box.y + (flipV ? box.height : 0));
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(image, 0, 0, box.width, box.height);
    ctx.restore();
}
