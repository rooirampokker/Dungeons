/**
 * Drawing layers, painted bottom to top every frame. Each layer only draws what's visible. New layers, such as
 * the two fog-of-war layers or creature health bars, slot into the list in renderer.js.
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
