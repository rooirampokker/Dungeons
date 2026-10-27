import { writeFileSync } from 'node:fs';
import { encodePng } from './png.js';

/**
 * A tiny software rasteriser for drawing tiles in code: shapes are plain (x, y) => boolean tests in tile units,
 * a Canvas supersamples them for smooth edges, and the result is saved as a PNG. No dependencies.
 */

// ---------------------------------------------------------------- colour

/** @typedef {[number, number, number]} Colour  Components 0-1. */

/** @returns {Colour} */
export function hex(value) {
    const n = parseInt(value.replace('#', ''), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** @returns {Colour} */
export function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** @returns {Colour} */
export function shade(colour, factor) {
    return [colour[0] * factor, colour[1] * factor, colour[2] * factor];
}

// ---------------------------------------------------------------- noise

export function hash(seed, x, y) {
    let h = (seed | 0) ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1). */
export function noise(seed, x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const top = hash(seed, xi, yi) + (hash(seed, xi + 1, yi) - hash(seed, xi, yi)) * u;
    const bottom = hash(seed, xi, yi + 1) + (hash(seed, xi + 1, yi + 1) - hash(seed, xi, yi + 1)) * u;
    return top + (bottom - top) * v;
}

/** Fractal noise: several octaves of value noise, in [0, 1). */
export function fbm(seed, x, y, octaves = 4) {
    let sum = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let total = 0;
    for (let octave = 0; octave < octaves; octave++) {
        sum += amplitude * noise(seed + octave * 1013, x * frequency, y * frequency);
        total += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }
    return sum / total;
}

// ---------------------------------------------------------------- shapes

/**
 * @typedef {((x: number, y: number) => boolean) & {box: number[]}} Shape
 * A point test in tile units, with a bounding box [x0, y0, x1, y1] so painting can skip everything outside it.
 */

const EVERYWHERE = [-Infinity, -Infinity, Infinity, Infinity];

/**
 * Wraps a point test as a Shape.
 * @param {(x: number, y: number) => boolean} test
 * @param {number[]} box  [x0, y0, x1, y1]
 * @returns {Shape}
 */
export function shape(test, box) {
    test.box = box;
    return test;
}

export const rect = (x0, y0, x1, y1) =>
    shape((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, [x0, y0, x1, y1]);

export const circle = (cx, cy, r) =>
    shape((x, y) => (x - cx) ** 2 + (y - cy) ** 2 < r * r, [cx - r, cy - r, cx + r, cy + r]);

export const ring = (cx, cy, inner, outer) => shape((x, y) => {
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    return d >= inner * inner && d < outer * outer;
}, [cx - outer, cy - outer, cx + outer, cy + outer]);

export function ellipse(cx, cy, rx, ry, angle = 0) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const r = Math.max(rx, ry);
    return shape((x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const u = (dx * cos + dy * sin) / rx;
        const v = (-dx * sin + dy * cos) / ry;
        return u * u + v * v < 1;
    }, [cx - r, cy - r, cx + r, cy + r]);
}

export function roundRect(x0, y0, x1, y1, radius) {
    return shape((x, y) => {
        if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
        const dx = Math.max(x0 + radius - x, 0, x - (x1 - radius));
        const dy = Math.max(y0 + radius - y, 0, y - (y1 - radius));
        return dx * dx + dy * dy <= radius * radius;
    }, [x0, y0, x1, y1]);
}

/** @param {number[][]} points */
export function polygon(points) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    return shape((x, y) => {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const [xi, yi] = points[i];
            const [xj, yj] = points[j];
            if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
    }, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
}

/** A line from (x0, y0) to (x1, y1) with round ends. */
export function segment(x0, y0, x1, y1, width) {
    const half = width / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const lengthSq = dx * dx + dy * dy || 1;
    return shape((x, y) => {
        const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / lengthSq));
        return (x - x0 - t * dx) ** 2 + (y - y0 - t * dy) ** 2 < half * half;
    }, [Math.min(x0, x1) - half, Math.min(y0, y1) - half, Math.max(x0, x1) + half, Math.max(y0, y1) + half]);
}

/** A slice of a ring between two angles (radians, clockwise from east). */
export function wedge(cx, cy, inner, outer, from, to) {
    const span = ((to - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    return shape((x, y) => {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < inner * inner || d >= outer * outer) return false;
        const angle = ((Math.atan2(y - cy, x - cx) - from) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        return angle < span;
    }, [cx - outer, cy - outer, cx + outer, cy + outer]);
}

/** @param {...Shape} shapes */
export function union(...shapes) {
    const parts = shapes.filter(Boolean);
    const box = parts.reduce((b, s) => [
        Math.min(b[0], s.box[0]), Math.min(b[1], s.box[1]), Math.max(b[2], s.box[2]), Math.max(b[3], s.box[3]),
    ], [Infinity, Infinity, -Infinity, -Infinity]);
    return shape((x, y) => {
        for (const part of parts) if (part(x, y)) return true;
        return false;
    }, box);
}

/** Everything in `base` that isn't in any of `cuts`. */
export function subtract(base, ...cuts) {
    const parts = cuts.filter(Boolean);
    return shape((x, y) => {
        if (!base(x, y)) return false;
        for (const cut of parts) if (cut(x, y)) return false;
        return true;
    }, base.box);
}

export function intersect(a, b) {
    return shape((x, y) => a(x, y) && b(x, y), [
        Math.max(a.box[0], b.box[0]), Math.max(a.box[1], b.box[1]), Math.min(a.box[2], b.box[2]), Math.min(a.box[3], b.box[3]),
    ]);
}

export const everywhere = shape(() => true, EVERYWHERE);

// ---------------------------------------------------------------- canvas

export class Canvas {
    /**
     * @param {object} options
     * @param {number} options.width            In output pixels (tile units).
     * @param {number} [options.height]
     * @param {number} [options.scale]           Supersampling factor.
     * @param {number} [options.margin]          Extra border, in tile units, that masks and distances cover so that
     *                                           shapes continuing past the edge (corridors) are treated as open.
     * @param {Colour|null} [options.background] Null for a transparent canvas.
     */
    constructor({ width, height = width, scale = 3, margin = 0, background = null }) {
        Object.assign(this, { width, height, scale, margin });
        this.cols = Math.round((width + 2 * margin) * scale);
        this.rows = Math.round((height + 2 * margin) * scale);
        this.left = Math.round(margin * scale);
        this.top = Math.round(margin * scale);
        this.innerCols = Math.round(width * scale);
        this.innerRows = Math.round(height * scale);
        this.xs = Float32Array.from({ length: this.cols }, (_, i) => (i + 0.5) / scale - margin);
        this.ys = Float32Array.from({ length: this.rows }, (_, j) => (j + 0.5) / scale - margin);

        const size = this.cols * this.rows;
        this.r = new Float32Array(size);
        this.g = new Float32Array(size);
        this.b = new Float32Array(size);
        this.a = new Float32Array(size);
        if (background) {
            this.r.fill(background[0]);
            this.g.fill(background[1]);
            this.b.fill(background[2]);
            this.a.fill(1);
        }
    }

    /** Pixel index ranges [i0, i1, j0, j1) of the visible area that a box covers. */
    range(box = EVERYWHERE) {
        const { scale, margin } = this;
        return [
            Math.max(this.left, Math.floor((box[0] + margin) * scale)),
            Math.min(this.left + this.innerCols, Math.ceil((box[2] + margin) * scale)),
            Math.max(this.top, Math.floor((box[1] + margin) * scale)),
            Math.min(this.top + this.innerRows, Math.ceil((box[3] + margin) * scale)),
        ];
    }

    /** Evaluates a shape over the whole grid, margin included. @returns {Uint8Array} */
    mask(test) {
        const mask = new Uint8Array(this.cols * this.rows);
        for (let j = 0; j < this.rows; j++) {
            for (let i = 0; i < this.cols; i++) {
                if (test(this.xs[i], this.ys[j])) mask[j * this.cols + i] = 1;
            }
        }
        return mask;
    }

    /** Approximate distance, in tile units, from every pixel to the nearest set pixel of `mask`. */
    distance(mask) {
        const { cols, rows } = this;
        const d = new Float32Array(cols * rows);
        for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : 1e9;
        const diagonal = Math.SQRT2;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                let v = d[i];
                if (v === 0) continue;
                if (x > 0) v = Math.min(v, d[i - 1] + 1);
                if (y > 0) {
                    v = Math.min(v, d[i - cols] + 1);
                    if (x > 0) v = Math.min(v, d[i - cols - 1] + diagonal);
                    if (x < cols - 1) v = Math.min(v, d[i - cols + 1] + diagonal);
                }
                d[i] = v;
            }
        }
        for (let y = rows - 1; y >= 0; y--) {
            for (let x = cols - 1; x >= 0; x--) {
                const i = y * cols + x;
                let v = d[i];
                if (v === 0) continue;
                if (x < cols - 1) v = Math.min(v, d[i + 1] + 1);
                if (y < rows - 1) {
                    v = Math.min(v, d[i + cols] + 1);
                    if (x < cols - 1) v = Math.min(v, d[i + cols + 1] + diagonal);
                    if (x > 0) v = Math.min(v, d[i + cols - 1] + diagonal);
                }
                d[i] = v;
            }
        }
        for (let i = 0; i < d.length; i++) d[i] /= this.scale;
        return d;
    }

    /**
     * Visits every visible pixel inside an area.
     * @param {Shape|Uint8Array|null} area
     * @param {(x: number, y: number, index: number) => void} visit
     */
    each(area, visit) {
        const isMask = area instanceof Uint8Array;
        const [i0, i1, j0, j1] = this.range(isMask || !area ? undefined : area.box);
        for (let j = j0; j < j1; j++) {
            const y = this.ys[j];
            for (let i = i0; i < i1; i++) {
                const index = j * this.cols + i;
                const x = this.xs[i];
                if (area && (isMask ? !area[index] : !area(x, y))) continue;
                visit(x, y, index);
            }
        }
    }

    /**
     * Paints over an area. Colour and alpha may be values or functions of (x, y, index).
     * @param {Shape|Uint8Array|null} area
     * @param {Colour|((x: number, y: number, index: number) => Colour|null)} colour
     * @param {number|((x: number, y: number, index: number) => number)} [alpha]
     */
    paint(area, colour, alpha = 1) {
        this.each(area, (x, y, index) => {
            const c = typeof colour === 'function' ? colour(x, y, index) : colour;
            if (!c) return;
            const a = typeof alpha === 'function' ? alpha(x, y, index) : alpha;
            if (a > 0) this.over(index, c, Math.min(1, a));
        });
    }

    /** Composites a colour over one pixel. */
    over(index, colour, alpha) {
        const below = this.a[index];
        const out = alpha + below * (1 - alpha);
        if (out <= 0) return;
        const keep = (below * (1 - alpha)) / out;
        const add = alpha / out;
        this.r[index] = colour[0] * add + this.r[index] * keep;
        this.g[index] = colour[1] * add + this.g[index] * keep;
        this.b[index] = colour[2] * add + this.b[index] * keep;
        this.a[index] = out;
    }

    /** Darkens a pixel; on transparent pixels it adds a translucent shadow instead. */
    dim(index, amount) {
        if (amount <= 0) return;
        if (this.a[index] > 0.999) {
            const keep = 1 - Math.min(1, amount);
            this.r[index] *= keep;
            this.g[index] *= keep;
            this.b[index] *= keep;
        } else {
            this.over(index, [0, 0, 0], Math.min(1, amount));
        }
    }

    /** Warm light spilling from a point, e.g. a candle or brazier. */
    glow(cx, cy, radius, colour, intensity) {
        this.each(circle(cx, cy, radius), (x, y, index) => {
            const t = 1 - Math.hypot(x - cx, y - cy) / radius;
            const k = intensity * t * t;
            if (this.a[index] > 0.999) {
                this.r[index] += colour[0] * k;
                this.g[index] += colour[1] * k;
                this.b[index] += colour[2] * k;
            } else {
                this.over(index, colour, k * 0.8);
            }
        });
    }

    /** Soft, direction-free shadow around a circle, so mirrored tiles still look right. */
    shadowCircle(cx, cy, r, spread, strength) {
        this.each(circle(cx, cy, r + spread), (x, y, index) => {
            const d = Math.max(0, Math.hypot(x - cx, y - cy) - r);
            this.dim(index, strength * (1 - d / spread) ** 2);
        });
    }

    /** Soft, direction-free shadow around a rectangle. */
    shadowRect(x0, y0, x1, y1, spread, strength) {
        this.each(rect(x0 - spread, y0 - spread, x1 + spread, y1 + spread), (x, y, index) => {
            const dx = Math.max(x0 - x, 0, x - x1);
            const dy = Math.max(y0 - y, 0, y - y1);
            const d = Math.hypot(dx, dy);
            if (d < spread) this.dim(index, strength * (1 - d / spread) ** 2);
        });
    }

    /** Averages the supersampled pixels into 8-bit RGBA. @returns {Uint8Array} */
    toRGBA() {
        const { width, height, scale } = this;
        const out = new Uint8Array(width * height * 4);
        const samples = scale * scale;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0;
                let g = 0;
                let b = 0;
                let a = 0;
                for (let sy = 0; sy < scale; sy++) {
                    for (let sx = 0; sx < scale; sx++) {
                        const index = (this.top + y * scale + sy) * this.cols + this.left + x * scale + sx;
                        const alpha = this.a[index];
                        r += clamp(this.r[index]) * alpha;
                        g += clamp(this.g[index]) * alpha;
                        b += clamp(this.b[index]) * alpha;
                        a += alpha;
                    }
                }
                const o = (y * width + x) * 4;
                out[o] = a ? Math.round((r / a) * 255) : 0;
                out[o + 1] = a ? Math.round((g / a) * 255) : 0;
                out[o + 2] = a ? Math.round((b / a) * 255) : 0;
                out[o + 3] = Math.round((a / samples) * 255);
            }
        }
        return out;
    }

    save(path) {
        writeFileSync(path, encodePng(this.width, this.height, this.toRGBA()));
    }
}

function clamp(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}
