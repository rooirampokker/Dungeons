import { circle, ellipse, fbm, hash, mix, noise, polygon, rect, ring, roundRect, segment, shade, shape, wedge } from '../lib/raster.js';
import { P } from './style.js';

/**
 * Starbase furnishings. Every function takes a painter `p` ({cv, rng, seed, block}) and coordinates in tile
 * pixels. Anything that should stop the hero calls p.block(shape); the walk map is worked out from those.
 *
 * Shadows are soft and spread evenly in every direction, and lights glow evenly too, so mirrored tiles look right.
 */

// ---------------------------------------------------------------- light and machinery

/** A small glowing light. */
export function lamp(p, x, y, colour = P.glow, reach = 18, strength = 0.3) {
    p.cv.glow(x, y, reach, colour, strength);
    p.cv.paint(circle(x, y, 1.3), mix(colour, P.white, 0.6));
}

/** A wall-mounted light panel on top of a bulkhead. */
export function lightPanel(p, x0, y0, x1, y1) {
    const { cv } = p;
    cv.paint(rect(x0, y0, x1, y1), P.bulkheadDark);
    cv.paint(rect(x0 + 0.8, y0 + 0.8, x1 - 0.8, y1 - 0.8), mix(P.trim, P.white, 0.4));
    cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) + 10, P.glow, 0.22);
}

/** A control console: a dark body with glowing readouts and buttons. */
export function controlConsole(p, x0, y0, x1, y1) {
    const { cv, rng } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.6);
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        return shade(P.gunmetal, edge < 0.9 ? 0.6 : 1.05);
    });
    const lengthwise = x1 - x0 >= y1 - y0;
    const [a0, a1] = lengthwise ? [x0 + 1.5, x1 - 1.5] : [y0 + 1.5, y1 - 1.5];
    const [b0, b1] = lengthwise ? [y0 + 1.5, y1 - 1.5] : [x0 + 1.5, x1 - 1.5];
    for (let at = a0; at < a1 - 2;) {
        const width = Math.min(a1 - at, 2.5 + rng.next() * 4);
        const colour = [P.green, P.holo, P.amber, P.red][Math.floor(rng.next() * 4)];
        const screen = rng.next() < 0.55;
        const box = screen
            ? (lengthwise ? rect(at, b0, at + width - 0.6, (b0 + b1) / 2) : rect(b0, at, (b0 + b1) / 2, at + width - 0.6))
            : (lengthwise ? circle(at + width / 2, (b0 + b1) / 2 + (b1 - b0) * 0.2, 0.8) : circle((b0 + b1) / 2 + (b1 - b0) * 0.2, at + width / 2, 0.8));
        cv.paint(box, screen ? mix(colour, P.soot, 0.35) : colour);
        if (screen) {
            const [sx0, sy0, sx1, sy1] = box.box;
            for (let k = 0; k < 3; k++) {
                const line = lengthwise
                    ? rect(sx0 + 0.5, sy0 + 0.6 + k * 1.1, sx0 + 0.5 + (sx1 - sx0 - 1) * rng.next(), sy0 + 1 + k * 1.1)
                    : rect(sx0 + 0.6 + k * 1.1, sy0 + 0.5, sx0 + 1 + k * 1.1, sy0 + 0.5 + (sy1 - sy0 - 1) * rng.next());
                cv.paint(line, colour, 0.9);
            }
        }
        at += width;
    }
    cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.6 + 6, P.holo, 0.12);
    p.block(rect(x0, y0, x1, y1));
}

/** A round holo-table, projecting a glowing wireframe planet. */
export function holoTable(p, x, y, r) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 5, 0.6);
    cv.paint(circle(x, y, r), P.gunmetal);
    cv.paint(ring(x, y, r - 1.5, r), shade(P.metal, 0.8));
    cv.paint(circle(x, y, r * 0.55), mix(P.soot, P.holo, 0.15));
    cv.glow(x, y, r * 2.4, P.holo, 0.32);
    cv.paint(ring(x, y, r * 0.5, r * 0.55), P.holo, 0.9);
    for (const squash of [0.2, 0.55]) cv.paint(ellipseRing(x, y, r * 0.5, r * 0.5 * squash, 0.5), P.holo, 0.6);
    cv.paint(segment(x, y - r * 0.5, x, y + r * 0.5, 0.4), P.holo, 0.5);
    p.block(circle(x, y, r));
}

/** A reactor core: rings of shielding round a white-hot heart. */
export function reactor(p, x, y, r) {
    const { cv, seed } = p;
    cv.glow(x, y, r * 2.6, P.amber, 0.35);
    cv.shadowCircle(x, y, r, 4, 0.5);
    cv.paint(circle(x, y, r), P.gunmetal);
    for (let k = 0; k < 8; k++) {
        const angle = (k / 8) * Math.PI * 2;
        cv.paint(segment(x + Math.cos(angle) * r * 0.55, y + Math.sin(angle) * r * 0.55, x + Math.cos(angle) * r, y + Math.sin(angle) * r, 1.8), P.metalDark);
    }
    cv.paint(ring(x, y, r * 0.78, r * 0.86), P.metal);
    cv.paint(circle(x, y, r * 0.55), (cx, cy) => {
        const d = Math.hypot(cx - x, cy - y) / (r * 0.55);
        const flicker = noise(seed + 501, cx * 0.5, cy * 0.5) * 0.2;
        return mix(P.white, P.amber, Math.min(1, d * 0.9 + flicker));
    });
    cv.glow(x, y, r * 0.8, P.white, 0.4);
    p.block(circle(x, y, r));
}

/** An open blast door: the two heavy halves drawn back into the walls, with hazard stripes across the floor. */
export function blastDoor(p, x0, y0, x1, y1, across) {
    const { cv } = p;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => (Math.floor((across ? x : y) / 3 + (across ? y : x) / 3) % 2 ? P.hazard : P.soot), 0.85);
    const depth = 5;
    const halves = across
        ? [rect(x0 - depth, y0 - 1, x0 + 1.2, y1 + 1), rect(x1 - 1.2, y0 - 1, x1 + depth, y1 + 1)]
        : [rect(x0 - 1, y0 - depth, x1 + 1, y0 + 1.2), rect(x0 - 1, y1 - 1.2, x1 + 1, y1 + depth)];
    for (const half of halves) cv.paint(half, (x, y) => shade(P.gunmetal, 1 + noise(503, x, y) * 0.2));
}

/** A floor grating with something hot glowing below. */
export function grating(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        if (edge < 1) return P.metalDark;
        const hole = Math.min(((x - x0) % 2.4 + 2.4) % 2.4, ((y - y0) % 2.4 + 2.4) % 2.4) < 1.1;
        return hole ? mix(P.soot, P.glow, 0.06 + noise(seed + 505, x * 0.2, y * 0.2) * 0.14) : shade(P.metal, 0.62);
    });
    cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.6, P.glow, 0.06);
}

/** Pipes running along the floor beside a wall. Pipes are low: they don't block. */
export function pipes(p, x0, y0, x1, y1, count = 2) {
    const { cv } = p;
    const lengthwise = x1 - x0 >= y1 - y0;
    const width = (lengthwise ? y1 - y0 : x1 - x0) / count;
    for (let k = 0; k < count; k++) {
        const area = lengthwise ? rect(x0, y0 + k * width, x1, y0 + (k + 1) * width - 0.4) : rect(x0 + k * width, y0, x0 + (k + 1) * width - 0.4, y1);
        const centre = lengthwise ? y0 + (k + 0.5) * width : x0 + (k + 0.5) * width;
        cv.paint(area, (x, y) => {
            const off = Math.abs((lengthwise ? y : x) - centre) / (width / 2);
            const band = Math.floor((lengthwise ? x : y) / 12) % 3 === 0 && (((lengthwise ? x : y) % 12) + 12) % 12 < 1.4;
            return shade(k % 2 ? P.metal : P.rust, (band ? 0.6 : 1.15) - off * 0.5);
        });
    }
}

/** A floor vent breathing out a little steam. */
export function vent(p, x, y, size) {
    const { cv, seed } = p;
    const half = size / 2;
    cv.paint(rect(x - half, y - half, x + half, y + half), P.metalDark);
    for (let k = 1; k < 5; k++) cv.paint(rect(x - half + 1, y - half + (k * size) / 5 - 0.5, x + half - 1, y - half + (k * size) / 5 + 0.5), P.soot);
    cv.paint(circle(x, y, size), P.white, (cx, cy) =>
        Math.max(0, 0.35 * (1 - Math.hypot(cx - x, cy - y) / size) * (fbm(seed + 507, cx * 0.2, cy * 0.2, 3) * 1.5 - 0.3)));
}

/** A shimmering force field across an opening. */
export function forceField(p, x0, y0, x1, y1) {
    const { cv } = p;
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.paint(rect(x0, y0, x1, y1), P.holo, (x, y) => 0.3 + 0.3 * Math.abs(Math.sin((lengthwise ? x : y) * 1.4)));
    cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.7, P.holo, 0.2);
    for (const end of lengthwise ? [x0, x1] : [y0, y1]) {
        const post = lengthwise ? rect(end - 1.5, y0 - 1, end + 1.5, y1 + 1) : rect(x0 - 1, end - 1.5, x1 + 1, end + 1.5);
        cv.paint(post, P.gunmetal);
    }
    p.block(rect(x0, y0, x1, y1));
}

// ---------------------------------------------------------------- cargo

/** A cargo crate with ribs and a stencilled stripe. */
export function crate(p, x0, y0, x1, y1, colour = P.olive) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.paint(rect(x0, y0, x1, y1), (x, y) => {
        const edge = Math.min(x - x0, x1 - x, y - y0, y1 - y);
        const along = lengthwise ? x - x0 : y - y0;
        const rib = along % 4 < 0.6;
        return shade(colour, (edge < 1 ? 0.6 : rib ? 0.8 : 1) * (0.92 + noise(seed + 511, x, y) * 0.12));
    });
    const stripe = lengthwise ? rect(x0 + 1, (y0 + y1) / 2 - 0.8, x1 - 1, (y0 + y1) / 2 + 0.8) : rect((x0 + x1) / 2 - 0.8, y0 + 1, (x0 + x1) / 2 + 0.8, y1 - 1);
    cv.paint(stripe, P.hazard, 0.75);
    p.block(rect(x0, y0, x1, y1));
}

/** A fuel canister, seen from above. */
export function canister(p, x, y, r, colour = P.metal) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 3, 0.55);
    cv.paint(circle(x, y, r), (cx, cy) => shade(colour, 1.1 - 0.45 * (Math.hypot(cx - x, cy - y) / r) ** 2));
    cv.paint(ring(x, y, r * 0.62, r * 0.72), P.red, 0.85);
    cv.paint(circle(x, y, r * 0.28), P.metalDark);
    p.block(circle(x, y, r + 0.5));
}

/** A heap of scrap: plates, struts and cable ends. */
export function scrap(p, x, y, radius, count, blocks = true) {
    const { cv, rng } = p;
    cv.paint(circle(x, y, radius * 1.3), P.soot, (cx, cy) => 0.4 * (1 - Math.hypot(cx - x, cy - y) / (radius * 1.3)));
    for (let k = 0; k < count; k++) {
        const angle = rng.next() * Math.PI * 2;
        const distance = Math.sqrt(rng.next()) * radius;
        const px = x + Math.cos(angle) * distance;
        const py = y + Math.sin(angle) * distance;
        const length = 2 + rng.next() * 6;
        const spin = rng.next() * Math.PI;
        const colour = [P.metal, P.metalDark, P.rust, P.gunmetal, P.olive][Math.floor(rng.next() * 5)];
        cv.shadowCircle(px, py, length * 0.3, 2, 0.3);
        if (rng.next() < 0.5) {
            cv.paint(rotatedRect(px, py, length / 2, 1 + rng.next() * 2, spin), shade(colour, 0.8 + rng.next() * 0.4));
        } else {
            cv.paint(segment(px, py, px + Math.cos(spin) * length, py + Math.sin(spin) * length, 1), shade(colour, 0.9));
        }
    }
    if (blocks) p.block(circle(x, y, radius * 0.85));
}

/** A loose cable snaking across the floor. */
export function cable(p, x0, y0, x1, y1, colour = P.soot) {
    const { cv, seed } = p;
    let [x, y] = [x0, y0];
    for (let k = 1; k <= 16; k++) {
        const t = k / 16;
        const nx = x0 + (x1 - x0) * t + Math.sin(t * 7 + seed) * 3;
        const ny = y0 + (y1 - y0) * t + Math.cos(t * 5 + seed) * 3;
        cv.paint(segment(x, y, nx, ny, 1.1), colour);
        [x, y] = [nx, ny];
    }
}

// ---------------------------------------------------------------- crew

/** A bunk: metal frame, grey mattress and a pillow at the head (the x0 end). */
export function bunk(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.metalDark);
    cv.paint(rect(x0 + 1.2, y0 + 1.2, x1 - 1.2, y1 - 1.2), (x, y) => shade(P.bulkhead, 0.7 + noise(seed + 521, x * 0.3, y * 0.8) * 0.2));
    const lengthwise = x1 - x0 >= y1 - y0;
    cv.paint(lengthwise ? roundRect(x0 + 1.8, y0 + 1.8, x0 + 6, y1 - 1.8, 1) : roundRect(x0 + 1.8, y0 + 1.8, x1 - 1.8, y0 + 6, 1), P.white);
    p.block(rect(x0, y0, x1, y1));
}

/** A healing tank: a glass cylinder of blue-green fluid. */
export function healingTank(p, x, y, r) {
    const { cv, rng } = p;
    cv.glow(x, y, r * 2.2, P.green, 0.18);
    cv.shadowCircle(x, y, r, 4, 0.55);
    cv.paint(circle(x, y, r), P.metal);
    cv.paint(circle(x, y, r - 1.4), (cx, cy) => mix(mix(P.coolant, P.green, 0.35), P.white, 0.3 * (1 - Math.hypot(cx - x, cy - y) / r)));
    for (let k = 0; k < 6; k++) cv.paint(ring(x + (rng.next() - 0.5) * r, y + (rng.next() - 0.5) * r, 0.4, 0.8), P.white, 0.6);
    p.block(circle(x, y, r));
}

/** A table with stools round it, as in a spaceport cantina. */
export function cantinaTable(p, x, y, r) {
    const { cv } = p;
    for (let k = 0; k < 4; k++) {
        const angle = (k / 4) * Math.PI * 2 + 0.4;
        const sx = x + Math.cos(angle) * (r + 3.5);
        const sy = y + Math.sin(angle) * (r + 3.5);
        cv.shadowCircle(sx, sy, 1.8, 2, 0.45);
        cv.paint(circle(sx, sy, 2), P.metalDark);
    }
    cv.shadowCircle(x, y, r, 4, 0.55);
    cv.paint(circle(x, y, r), (cx, cy) => shade(P.metal, 1.05 - 0.3 * (Math.hypot(cx - x, cy - y) / r) ** 2));
    cv.paint(circle(x, y, 1.2), P.amber);
    p.block(circle(x, y, r + 1));
}

/** A bar counter, lit from below. */
export function barCounter(p, x0, y0, x1, y1) {
    const { cv, rng } = p;
    cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(x1 - x0, y1 - y0) * 0.55, P.amber, 0.2);
    cv.shadowRect(x0, y0, x1, y1, 4, 0.55);
    cv.paint(rect(x0, y0, x1, y1), P.gunmetal);
    cv.paint(rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1), (x, y) => shade(P.rust, 0.75 + noise(531, x * 0.4, y * 0.4) * 0.2));
    const lengthwise = x1 - x0 >= y1 - y0;
    for (let k = 0; k < 7; k++) {
        const t = 0.1 + rng.next() * 0.8;
        const [bx, by] = lengthwise ? [x0 + (x1 - x0) * t, (y0 + y1) / 2] : [(x0 + x1) / 2, y0 + (y1 - y0) * t];
        cv.paint(circle(bx, by, 0.8), [P.green, P.amber, P.holo, P.red][k % 4]);
    }
    p.block(rect(x0, y0, x1, y1));
}

/** A rack of equipment against a wall. */
export function rack(p, x0, y0, x1, y1) {
    const { cv, rng } = p;
    cv.shadowRect(x0, y0, x1, y1, 3, 0.5);
    cv.paint(rect(x0, y0, x1, y1), P.metalDark);
    const lengthwise = x1 - x0 >= y1 - y0;
    for (let at = (lengthwise ? x0 : y0) + 1.2; at < (lengthwise ? x1 : y1) - 1.5; at += 2.6) {
        const item = lengthwise ? rect(at, y0 + 1, at + 1.4, y1 - 1 - rng.next() * 2) : rect(x0 + 1, at, x1 - 1 - rng.next() * 2, at + 1.4);
        cv.paint(item, shade(P.soot, 1.6 + rng.next()));
    }
    p.block(rect(x0, y0, x1, y1));
}

/** A dome-headed maintenance droid. */
export function domeDroid(p, x, y, r, trim = P.red) {
    const { cv } = p;
    cv.shadowCircle(x, y, r, 3.5, 0.55);
    for (const side of [-1, 1]) cv.paint(rect(x + side * r - 1.4, y - r * 0.5, x + side * r + 1.4, y + r * 0.5), P.metal);
    cv.paint(circle(x, y, r), (cx, cy) => shade(P.white, 1.05 - 0.35 * (Math.hypot(cx - x, cy - y) / r) ** 2));
    cv.paint(wedge(x, y, r * 0.35, r * 0.75, -2.4, -0.7), trim);
    cv.paint(circle(x + r * 0.2, y - r * 0.15, r * 0.22), P.soot);
    cv.paint(circle(x + r * 0.2, y - r * 0.15, r * 0.1), P.red);
    p.block(circle(x, y, r + 1));
}

/** A boxy power droid on two stubby feet. */
export function boxDroid(p, x, y, size) {
    const { cv } = p;
    const half = size / 2;
    cv.shadowRect(x - half, y - half, x + half, y + half, 3, 0.55);
    for (const side of [-1, 1]) cv.paint(rect(x + side * half - 1.5, y - half * 0.6, x + side * half + 1.5, y + half * 0.6), P.metalDark);
    cv.paint(roundRect(x - half, y - half, x + half, y + half, 1.5), (cx, cy) => shade(P.olive, 1 + noise(541, cx, cy) * 0.15));
    cv.paint(rect(x - half + 1.5, y - 1, x + half - 1.5, y + 1), P.soot);
    cv.paint(circle(x - half + 2.5, y - half + 2.5, 0.8), P.green);
    p.block(rect(x - half - 1.5, y - half, x + half + 1.5, y + half));
}

/** A small shuttle parked on the deck, nose towards `angle`. */
export function shuttle(p, x, y, length, angle) {
    const { cv } = p;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    const at = (forward, side) => [x + cos * forward - sin * side, y + sin * forward + cos * side];
    const hull = polygon([at(length * 0.5, 0), at(length * 0.1, length * 0.16), at(-length * 0.25, length * 0.45), at(-length * 0.45, length * 0.42),
        at(-length * 0.4, length * 0.12), at(-length * 0.5, 0), at(-length * 0.4, -length * 0.12), at(-length * 0.45, -length * 0.42),
        at(-length * 0.25, -length * 0.45), at(length * 0.1, -length * 0.16)]);
    cv.shadowCircle(x, y, length * 0.3, 8, 0.6);
    cv.paint(hull, (cx, cy) => shade(P.bulkheadLight, 0.75 + noise(551, cx * 0.3, cy * 0.3) * 0.2));
    cv.paint(polygon([at(length * 0.38, 0), at(length * 0.18, length * 0.07), at(length * 0.18, -length * 0.07)]), mix(P.soot, P.holo, 0.3));
    cv.paint(segment(...at(length * 0.25, 0), ...at(-length * 0.35, 0), 1.2), P.metalDark);
    for (const side of [-1, 1]) {
        const [ex, ey] = at(-length * 0.47, side * length * 0.2);
        cv.glow(ex, ey, 9, P.glow, 0.4);
        cv.paint(circle(ex, ey, 1.6), P.white);
    }
    cv.paint(polygon([at(-length * 0.2, length * 0.3), at(-length * 0.35, length * 0.38), at(-length * 0.35, length * 0.3)]), P.red, 0.8);
    p.block(hull);
}

/** A support strut: a square pylon with a light on top. */
export function strut(p, x, y, size) {
    const { cv } = p;
    const half = size / 2;
    cv.shadowRect(x - half, y - half, x + half, y + half, 5, 0.6);
    cv.paint(rect(x - half, y - half, x + half, y + half), (cx, cy) => {
        const edge = Math.min(cx - (x - half), x + half - cx, cy - (y - half), y + half - cy);
        return shade(P.bulkhead, edge < 1 ? 0.5 : edge < 2.2 ? 1.2 : 0.85);
    });
    lamp(p, x, y, P.glow, 14, 0.25);
    p.block(rect(x - half, y - half, x + half, y + half));
}

/** A strip of window in the top of a wall, looking out on the stars. */
export function viewport(p, x0, y0, x1, y1) {
    const { cv, seed } = p;
    cv.paint(rect(x0, y0, x1, y1), P.bulkheadDark);
    cv.paint(rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1), (x, y) => {
        const star = hash(seed + 561, Math.floor(x * 1.5), Math.floor(y * 1.5));
        return star > 0.985 ? P.white : star > 0.975 ? P.holo : P.space;
    });
    for (let at = x1 - x0 >= y1 - y0 ? x0 + 12 : y0 + 12; at < (x1 - x0 >= y1 - y0 ? x1 : y1) - 4; at += 12) {
        cv.paint(x1 - x0 >= y1 - y0 ? rect(at - 0.6, y0, at + 0.6, y1) : rect(x0, at - 0.6, x1, at + 0.6), P.bulkheadDark);
    }
}

/** A round mat for meditation, with a few stones floating above it. */
export function meditationMat(p, x, y, r) {
    const { cv, rng } = p;
    cv.paint(circle(x, y, r), (cx, cy) => {
        const d = Math.hypot(cx - x, cy - y) / r;
        return shade(d > 0.85 || (d > 0.45 && d < 0.5) ? P.clothLight : P.cloth, 0.85 + noise(571, cx * 0.4, cy * 0.4) * 0.2);
    });
    for (let k = 0; k < 5; k++) {
        const angle = (k / 5) * Math.PI * 2 + rng.next() * 0.4;
        const sx = x + Math.cos(angle) * r * 0.65;
        const sy = y + Math.sin(angle) * r * 0.65;
        cv.shadowCircle(sx, sy, 1.5, 4, 0.35);
        cv.paint(circle(sx, sy, 1.4 + rng.next()), P.metal);
        cv.glow(sx, sy, 5, P.holo, 0.12);
    }
}

// ---------------------------------------------------------------- helpers

function ellipseRing(x, y, rx, ry, thickness) {
    const outer = ellipse(x, y, rx, ry);
    const inner = ellipse(x, y, Math.max(0.1, rx - thickness), Math.max(0.1, ry - thickness));
    return shape((px, py) => outer(px, py) && !inner(px, py), outer.box);
}

function rotatedRect(x, y, halfWidth, halfHeight, angle) {
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    return polygon([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [
        x + u * halfWidth * cos - v * halfHeight * sin,
        y + u * halfWidth * sin + v * halfHeight * cos,
    ]));
}