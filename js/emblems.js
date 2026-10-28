/**
 * emblems.js — one animated wireframe emblem per project, rendered to texture.
 *
 * Each emblem is a tiny Three.js scene drawn with additive lines on black into
 * one shared 1024² multisampled buffer and resolved into its own plain texture.
 * crystal.js maps that texture onto one octahedron face.
 *
 * Framing contract (must match FACE_UV in crystal.js): the triangle's incircle is
 * centred at EMBLEM_Y in this scene's world units and has radius ≈ 0.89, so every
 * emblem is authored at radius ≤ 1.4 and scaled by EMBLEM_SCALE.
 *
 * Emblem builders return { root, update(t, k) } where k carries pointer influence
 * (k.px, k.py in −1..1) so a few emblems can react to the cursor.
 */

import * as THREE from 'three';
import { MOBILE } from './crystal.js';

const RTT_SIZE   = MOBILE ? 512 : 1024;   // (a phone's face is a few hundred pixels across: 1024² targets are memory it lacks)
const TAU        = Math.PI * 2;
export const EMBLEM_Y     = -0.445;   // incircle centre in this scene's world units
const K                   = 0.893;    // world units per wall unit (incircle radius)
const NODE_CY             = 0.2;      // emblem disc centre, wall units (see wall.js ROOT)
const NODE_R              = 0.62;     // emblem disc radius, wall units
export const EMBLEM_SCALE = NODE_R * K / 1.4;   // authored radius 1.4 → NODE_R

// ── tiny drawing kit ───────────────────────────────────────────────────────

/** The crystal is white light: hue is folded into brightness so each emblem keeps its tonal structure. */
const gray = (hex) => {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const l = 0.35 + 0.65 * Math.min(1, 0.3 * r + 0.59 * g + 0.11 * b + 0.12);
  const v = Math.round(Math.min(1, l) * 255);
  return (v << 16) | (v << 8) | v;
};

const mat = (color, opacity = 1) => new THREE.LineBasicMaterial({
  color: gray(color), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending,
});

function segs(arr, color, opacity = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.LineSegments(g, mat(color, opacity));
}

function polyline(pts, color, opacity = 1, closed = false) {
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  return closed ? new THREE.LineLoop(g, mat(color, opacity)) : new THREE.Line(g, mat(color, opacity));
}

function circle(r, color, opacity = 1, n = 72) {
  const p = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  return polyline(p, color, opacity, true);
}

function arc(r, a0, a1, color, opacity = 1, n = 32, cx = 0, cy = 0) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0)); }
  return polyline(p, color, opacity, false);
}

function box(w, h, d, color, opacity = 1) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mat(color, opacity));
}

function sphereWire(r, lat, lon, color, opacity = 1) {
  const a = [];
  const N = 40;
  for (let i = 1; i <= lat; i++) {            // parallels
    const phi = -Math.PI / 2 + Math.PI * i / (lat + 1);
    const y = Math.sin(phi) * r, rr = Math.cos(phi) * r;
    for (let j = 0; j < N; j++) {
      const t0 = j / N * TAU, t1 = (j + 1) / N * TAU;
      a.push(Math.cos(t0) * rr, y, Math.sin(t0) * rr, Math.cos(t1) * rr, y, Math.sin(t1) * rr);
    }
  }
  for (let i = 0; i < lon; i++) {             // meridians
    const th = i / lon * TAU;
    for (let j = 0; j < N; j++) {
      const p0 = -Math.PI / 2 + Math.PI * j / N, p1 = -Math.PI / 2 + Math.PI * (j + 1) / N;
      a.push(Math.cos(p0) * Math.cos(th) * r, Math.sin(p0) * r, Math.cos(p0) * Math.sin(th) * r,
             Math.cos(p1) * Math.cos(th) * r, Math.sin(p1) * r, Math.cos(p1) * Math.sin(th) * r);
    }
  }
  return segs(a, color, opacity);
}

/** A line set whose segments are rewritten each frame. */
function dyn(maxSegs, color, opacity = 1) {
  const arr = new Float32Array(maxSegs * 6);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0);
  const obj = new THREE.LineSegments(g, mat(color, opacity));
  obj.frustumCulled = false;
  let n = 0;
  return {
    obj,
    begin() { n = 0; },
    add(ax, ay, az, bx, by, bz) {
      if (n >= maxSegs) return;
      const o = n * 6;
      arr[o] = ax; arr[o + 1] = ay; arr[o + 2] = az; arr[o + 3] = bx; arr[o + 4] = by; arr[o + 5] = bz;
      n++;
    },
    end() { g.setDrawRange(0, n * 2); g.attributes.position.needsUpdate = true; },
  };
}

const frac = (x) => x - Math.floor(x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 0 · ARACHNIA — a spider on a web whose spokes carry data pulses
// ═══════════════════════════════════════════════════════════════════════════
function arachnia() {
  const L = 0x9be000, B = 0xe2ff7a, D = 0x4a7000;
  const root = new THREE.Group();
  const SP = 8, radii = [0.34, 0.6, 0.88, 1.14, 1.4];

  const web = [];
  for (let s = 0; s < SP; s++) { const a = s / SP * TAU; web.push(0, 0, 0, Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0); }
  for (const r of radii) {
    for (let s = 0; s < SP; s++) {
      const a0 = s / SP * TAU, a1 = (s + 1) / SP * TAU, am = (a0 + a1) / 2, rm = r * 0.9;
      web.push(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(am) * rm, Math.sin(am) * rm, 0,
               Math.cos(am) * rm, Math.sin(am) * rm, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
    }
  }
  root.add(segs(web, L, 0.5));
  root.add(circle(1.48, D, 0.9));

  const pulses = dyn(SP * 2, B);
  root.add(pulses.obj);

  const spider = new THREE.Group();
  spider.add(sphereWire(0.1, 3, 6, B, 0.9));
  const abd = sphereWire(0.15, 3, 8, L, 0.9);
  abd.position.y = -0.2; abd.scale.set(0.85, 1.25, 0.85);
  spider.add(abd);
  const legs = dyn(16, L);
  legs.obj.material.opacity = 1;
  spider.add(legs.obj);
  root.add(spider);

  return {
    root,
    update(t, k) {
      pulses.begin();
      for (let s = 0; s < SP; s++) {
        let u = frac(t * 0.33 + s * 0.137);
        if (s % 2) u = 1 - u;
        const r0 = 0.34 + u * 1.04, r1 = r0 + 0.12, a = s / SP * TAU;
        pulses.add(Math.cos(a) * r0, Math.sin(a) * r0, 0.01, Math.cos(a) * r1, Math.sin(a) * r1, 0.01);
      }
      pulses.end();

      const ang = [0.5, 1.08, 1.75, 2.45];
      legs.begin();
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? 1 : -1, j = i % 4;
        const swing = Math.sin(t * 4.2 + j * 1.7 + (side < 0 ? Math.PI : 0)) * 0.16;
        const da = ang[j] + swing;
        const hx = side * 0.06, hy = 0.12 - j * 0.07;
        const kx = hx + side * Math.sin(da) * 0.4, ky = hy + Math.cos(da) * 0.4;
        const fx = kx + side * Math.sin(da + 0.55) * 0.38, fy = ky + Math.cos(da + 0.55) * 0.38 - 0.1;
        legs.add(hx, hy, 0, kx, ky, 0.08);
        legs.add(kx, ky, 0.08, fx, fy, -0.04);
      }
      legs.end();

      spider.position.set(Math.sin(t * 0.7) * 0.18 + k.px * 0.1, Math.cos(t * 0.5) * 0.14 + k.py * 0.1, 0);
      spider.rotation.z = Math.sin(t * 0.6) * 0.25;
      spider.scale.setScalar(1.1 + Math.sin(t * 2.2) * 0.03);
      root.rotation.z = Math.sin(t * 0.1) * 0.08;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 · OPENRUBIXMACHINA — a 3×3×3 of typed tiles that legally rearrange
// ═══════════════════════════════════════════════════════════════════════════
function tessera() {
  const root = new THREE.Group();
  const cubeGroup = new THREE.Group();
  root.add(cubeGroup);
  const step = 0.52, size = 0.43;
  const edge = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
  const palette = [0x6fa8ff, 0xc4dcff, 0x4fd0c0];
  const cubes = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const centre = x === 0 && y === 0 && z === 0;
    const c = new THREE.LineSegments(edge, mat(centre ? 0xffffff : palette[(x + y + z + 3) % 3], centre ? 0.9 : 0.95));
    c.position.set(x * step, y * step, z * step);
    cubeGroup.add(c);
    cubes.push(c);
  }
  root.add(box(3 * step + 0.14, 3 * step + 0.14, 3 * step + 0.14, 0x2a4f94, 0.9));

  const AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const rnd = mulberry32(11);
  const PERIOD = 1.3, MOVE = 0.85;
  const q = new THREE.Quaternion(), p = new THREE.Vector3();
  let cur = -1, move = null;

  const apply = (angle) => {
    q.setFromAxisAngle(AX[move.axis], angle);
    for (const m of move.members) {
      m.position.copy(m.userData.p0).applyQuaternion(q);
      m.quaternion.copy(q).multiply(m.userData.q0);
    }
  };
  const commit = () => {
    if (!move) return;
    apply(move.dir * Math.PI / 2);
    for (const m of move.members) {
      m.position.set(Math.round(m.position.x / step) * step, Math.round(m.position.y / step) * step, Math.round(m.position.z / step) * step);
    }
    move = null;
  };
  const start = () => {
    const axis = Math.floor(rnd() * 3), layer = Math.floor(rnd() * 3) - 1, dir = rnd() < 0.5 ? -1 : 1;
    const members = cubes.filter((c) => Math.round(c.position.getComponent(axis) / step) === layer);
    for (const m of members) { m.userData.p0 = m.position.clone(); m.userData.q0 = m.quaternion.clone(); }
    move = { axis, dir, members };
  };

  return {
    root,
    update(t, k) {
      const idx = Math.floor(t / PERIOD);
      if (idx - cur > 3) cur = idx - 1;
      while (cur < idx) { commit(); cur++; start(); }
      const local = clamp01((t - idx * PERIOD) / MOVE);
      if (move) apply(move.dir * Math.PI / 2 * easeIO(local));
      cubeGroup.rotation.y = t * 0.3;
      cubeGroup.rotation.x = 0.55 + Math.sin(t * 0.21) * 0.18;
      root.rotation.y = 0; root.rotation.x = 0;
      root.children[1].rotation.copy(cubeGroup.rotation);
      p.set(k.px, k.py, 0);
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 · THOUGHTSLAYER — the Mind of its world: a head, eyes closed, listening; its
//     third eye opening; brainwaves ringing out from the temples; and round it the
//     verdict ring, friend · unknown · foe, a needle weighing between them
// ═══════════════════════════════════════════════════════════════════════════

/** The world's head (worlds/thoughtslayer.js tsHead), as a distance in the same units. */
function tsHead(x, y) {
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const ell = (px, py, cx, cy, rx, ry) => (Math.hypot((px - cx) / rx, (py - cy) / ry) - 1) * Math.min(rx, ry);
  const cran = ell(x, y, 0, 0.17, 0.37, 0.45), jaw = ell(x, y, 0, -0.08, 0.27, 0.34);
  const ear = ell(Math.abs(x), y, 0.36, 0.06, 0.045, 0.09);
  const nx = Math.abs(x) - 0.11, ny = Math.abs(y + 0.46) - 0.14;
  const neck = Math.hypot(Math.max(nx, 0), Math.max(ny, 0)) + Math.min(Math.max(nx, ny), 0);
  const body = ell(x, y, 0, -0.86, 0.72, 0.3);
  return smin(smin(smin(smin(cran, jaw, 0.1), ear, 0.03), neck, 0.08), body, 0.12);
}

function thoughtslayer() {
  const RED = 0xff3347, AMBER = 0xffd27a, TEAL = 0x2aa7b8, BONE = 0xe8eef5, DIM = 0x52607a;
  const root = new THREE.Group();
  // (the head in the world's own units, larger by HS about its third eye, which stays where the first plate's is, so
  // the two meet on the approach)
  const HS = 1.5;
  const head = new THREE.Group();
  head.scale.setScalar(HS); head.position.y = 0.36 * (1 - HS);
  root.add(head);

  // the outline: from the brow round, each ray from the face's middle out to where the head ends (cut at the disc)
  const outline = [];
  for (let i = 0; i <= 220; i++) {
    const a = i / 220 * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let lo = 0, hi = 1.6;
    for (let j = 0; j < 26; j++) { const m = (lo + hi) / 2; if (tsHead(dx * m, 0.05 + dy * m) < 0) lo = m; else hi = m; }
    const x = dx * lo, y = 0.05 + dy * lo;
    if (Math.hypot(x, y * HS + 0.36 * (1 - HS)) < 1.36 / HS && y > -0.8) outline.push(new THREE.Vector3(x, y, 0)); else if (outline.length) { head.add(polyline(outline.splice(0), BONE, 0.95)); }
  }
  if (outline.length) head.add(polyline(outline, BONE, 0.95));
  // its contours inside, along its own outline (as engraved), fading toward the shoulders
  for (const d of [0.04, 0.08, 0.12, 0.16]) {
    const p = [];
    for (let i = 0; i <= 160; i++) {
      const a = i / 160 * TAU, dx = Math.cos(a), dy = Math.sin(a);
      let lo = 0, hi = 1.6;
      for (let j = 0; j < 24; j++) { const m = (lo + hi) / 2; if (tsHead(dx * m, 0.05 + dy * m) < -d) lo = m; else hi = m; }
      const y = 0.05 + dy * lo;
      if (y > -0.5) p.push(new THREE.Vector3(dx * lo, y, 0)); else if (p.length > 1) { head.add(polyline(p.splice(0), DIM, 0.6)); }
    }
    if (p.length > 1) head.add(polyline(p, DIM, 0.6));
  }
  // the face: brows, closed eyes and their lashes, the nose, the mouth (the world's strokes)
  const face = [];
  const parab = (x0, y0, k, hw, sx = 1, n = 16) => {
    for (let i = 0; i < n; i++) {
      const u0 = -hw + 2 * hw * i / n, u1 = -hw + 2 * hw * (i + 1) / n;
      face.push(sx * (x0 + u0), y0 - k * u0 * u0, 0, sx * (x0 + u1), y0 - k * u1 * u1, 0);
    }
  };
  for (const s of [-1, 1]) {
    parab(0.15, 0.17, 2.2, 0.085, s);
    parab(0.14, 0.06, -2.4, 0.075, s);
    for (let i = -3; i <= 3; i++) { const x = 0.14 + i * 0.018, y = 0.06 + 2.4 * (i * 0.018) ** 2; face.push(s * x, y, 0, s * x, y - 0.025, 0); }
  }
  face.push(0, 0.06, 0, 0.024, -0.075, 0);
  parab(0.03, -0.085, -6, 0.03, 1, 6); parab(0.03, -0.085, -6, 0.03, -1, 6);
  parab(0, -0.2, -3, 0.075);
  head.add(segs(face, BONE, 0.85));

  // the third eye: a vesica that opens and closes slowly; its iris turns
  const E = [0, 0.36];
  const lids = dyn(48, BONE, 1);
  head.add(lids.obj);
  const iris = new THREE.Group();
  iris.add(circle(0.045, AMBER, 1, 28));
  const fib = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; fib.push(Math.cos(a) * 0.018, Math.sin(a) * 0.018, 0, Math.cos(a) * 0.043, Math.sin(a) * 0.043, 0); }
  iris.add(segs(fib, AMBER, 0.8));
  iris.position.set(E[0], E[1], 0.01);
  head.add(iris);
  head.add(circle(0.135, BONE, 0.8, 48).translateY(E[1]));
  const rays = [];
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, r1 = 0.16 + (i % 2 ? 0.03 : 0.07); rays.push(Math.cos(a) * 0.16, E[1] + Math.sin(a) * 0.16, 0, Math.cos(a) * r1, E[1] + Math.sin(a) * r1, 0); }
  head.add(segs(rays, BONE, 0.5));

  // brainwaves out of both temples, turned outward
  const waves = [];
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const w = arc(1, side > 0 ? -0.7 : Math.PI - 0.7, side > 0 ? 0.7 : Math.PI + 0.7, TEAL, 0, 22);
    w.position.set(side * 0.3 * HS, 0.16 * HS + 0.36 * (1 - HS), 0);
    root.add(w); waves.push({ w, i });
  }

  // the verdict ring: over the top, friend · unknown · foe (left to right), each its own stroke; below, ticks
  const ring = new THREE.Group();
  const RR = 1.3;
  const sector = (a0, a1, color, dash) => {
    const a = [];
    const n = 36;
    for (let i = 0; i < n; i++) {
      if (dash && i % 2) continue;
      const u0 = a0 + (a1 - a0) * i / n, u1 = a0 + (a1 - a0) * (i + 1) / n;
      a.push(Math.cos(u0) * RR, Math.sin(u0) * RR, 0, Math.cos(u1) * RR, Math.sin(u1) * RR, 0);
      a.push(Math.cos(u0) * (RR + 0.05), Math.sin(u0) * (RR + 0.05), 0, Math.cos(u1) * (RR + 0.05), Math.sin(u1) * (RR + 0.05), 0);
    }
    ring.add(segs(a, color, 0.9));
  };
  sector(Math.PI - 0.12, Math.PI * 2 / 3 + 0.04, TEAL, false);
  sector(Math.PI * 2 / 3 - 0.04, Math.PI / 3 + 0.04, AMBER, true);
  sector(Math.PI / 3 - 0.04, 0.12, RED, false);
  const ticks = [];
  for (let i = 0; i <= 36; i++) {
    const a = Math.PI + i / 36 * Math.PI, r1 = RR + (i % 6 === 0 ? 0.09 : 0.04);
    ticks.push(Math.cos(a) * RR, Math.sin(a) * RR, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
  }
  ring.add(segs(ticks, DIM, 0.8));
  root.add(ring);
  const needle = segs([0, RR - 0.12, 0, 0, RR + 0.12, 0], BONE, 1);
  root.add(needle);

  return {
    root,
    update(t, k) {
      // the third eye opens and rests open, then closes a while
      const open = clamp01(Math.sin(t * 0.45) * 1.6 + 0.4);
      lids.begin();
      for (const s of [1, -1]) {
        for (let i = 0; i < 24; i++) {
          const x0 = -0.11 + 0.22 * i / 24, x1 = -0.11 + 0.22 * (i + 1) / 24;
          const y0 = s * open * 0.055 * (1 - (x0 / 0.11) ** 2), y1 = s * open * 0.055 * (1 - (x1 / 0.11) ** 2);
          lids.add(E[0] + x0, E[1] + y0, 0.01, E[0] + x1, E[1] + y1, 0.01);
        }
      }
      lids.end();
      iris.scale.set(1, Math.max(0.02, open), 1);
      iris.rotation.z = t * 0.5;
      waves.forEach(({ w, i }) => {
        const u = frac(t * 0.32 + i / 4);
        w.scale.setScalar(0.15 + u * 0.62);
        w.material.opacity = Math.sin(u * Math.PI) * 0.75;
      });
      // the needle weighs: mostly friend, now and then unknown, rarely foe
      const na = Math.PI / 2 + 1.25 * Math.sin(t * 0.3) * Math.abs(Math.sin(t * 0.11));
      needle.rotation.z = na - Math.PI / 2;
      head.rotation.y = Math.sin(t * 0.25) * 0.12 + k.px * 0.08;
      head.rotation.x = k.py * -0.06;
      ring.rotation.z = Math.sin(t * 0.17) * 0.03;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 · CHOIR OF SOULS — the Great Window, a tempo gauge and the 12-type ring
// ═══════════════════════════════════════════════════════════════════════════
function choir() {
  const G = 0xffc24a, P = 0xfff0b4, D = 0x8a6414, A = 0x9fd4ff;
  const root = new THREE.Group();

  // lancet-arch window
  const win = new THREE.Group();
  const a = 0.6, wallBot = -0.95, spring = 0.2;
  const lancet = (aa, y0, color, op) => {
    const apexRise = Math.sqrt(3) * aa;
    const left = arc(2 * aa, Math.PI, Math.PI - Math.PI / 3, color, op, 24, aa, y0);   // centre (+a)
    const right = arc(2 * aa, Math.PI / 3, 0, color, op, 24, -aa, y0);                  // centre (−a)
    const sides = segs([-aa, wallBot, 0, -aa, y0, 0, aa, wallBot, 0, aa, y0, 0, -aa, wallBot, 0, aa, wallBot, 0], color, op);
    return { left, right, sides, apexY: y0 + apexRise };
  };
  const outer = lancet(a, spring, G, 1);
  const inner = lancet(a * 0.76, spring, P, 0.8);
  win.add(outer.left, outer.right, outer.sides, inner.left, inner.right, inner.sides);
  win.add(segs([0, wallBot, 0, 0, spring + 0.6, 0], D, 0.9));            // mullion
  const rose = circle(0.2, P, 0.95, 40); rose.position.y = spring + 0.4; win.add(rose);
  const roseSpokes = [];
  for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; roseSpokes.push(Math.cos(an) * 0.05, Math.sin(an) * 0.05, 0, Math.cos(an) * 0.2, Math.sin(an) * 0.2, 0); }
  const rs = segs(roseSpokes, G, 0.9); rs.position.y = spring + 0.4; win.add(rs);
  win.scale.setScalar(0.8); win.position.y = 0.02;
  root.add(win);

  // 12-type ring chart
  const ring = new THREE.Group();
  const nodes = [];
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; nodes.push([Math.cos(an) * 1.14, Math.sin(an) * 1.14]); }
  const chords = [];
  for (let i = 0; i < 12; i++) {
    const j = (i + 5) % 12, m = nodes[i], n = nodes[j];
    chords.push(m[0], m[1], 0, n[0], n[1], 0);
  }
  ring.add(segs(chords, D, 0.45));
  for (const [x, y] of nodes) { const d = circle(0.045, A, 0.95, 12); d.position.set(x, y, 0); ring.add(d); }
  root.add(ring);

  // tempo gauge ring + ticks
  const gaugeTicks = [];
  for (let i = 0; i < 60; i++) {
    const an = i / 60 * TAU, r0 = 1.34, r1 = r0 + (i % 5 === 0 ? 0.1 : 0.045);
    gaugeTicks.push(Math.cos(an) * r0, Math.sin(an) * r0, 0, Math.cos(an) * r1, Math.sin(an) * r1, 0);
  }
  root.add(segs(gaugeTicks, G, 0.8));
  root.add(circle(1.34, G, 0.9, 96));
  const needle = segs([0, 0, 0, 1.46, 0, 0], P, 1);
  root.add(needle);
  const fill = dyn(40, G, 0.9);
  root.add(fill.obj);

  // rising souls
  const souls = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.05, 0)), mat(A, 0.95));
    s.userData = { ph: i * 0.143, x: (i - 3) * 0.14, sw: 0.5 + i * 0.13 };
    root.add(s); souls.push(s);
  }

  return {
    root,
    update(t, k) {
      const ang = (t * 0.9) % TAU;
      needle.rotation.z = Math.PI / 2 - ang;
      fill.begin();
      const n = 36;
      for (let i = 0; i < n; i++) {
        const f0 = i / n, f1 = (i + 1) / n;
        const a0 = Math.PI / 2 - ang * f0, a1 = Math.PI / 2 - ang * f1, r = 1.27;
        fill.add(Math.cos(a0) * r, Math.sin(a0) * r, 0, Math.cos(a1) * r, Math.sin(a1) * r, 0);
      }
      fill.end();
      ring.rotation.z = t * 0.12;

      const brk = Math.exp(-((ang < 0.5 ? ang : 99)) * 3.0);   // flash after the needle passes 12 o'clock
      root.scale.setScalar(1 + brk * 0.025);

      for (const s of souls) {
        const u = frac(t * 0.11 + s.userData.ph);
        s.position.set(s.userData.x + Math.sin(t * s.userData.sw + s.userData.ph * 9) * 0.07, -0.85 + u * 1.7, 0.02);
        s.rotation.y = t * 1.5; s.rotation.x = t * 0.9;
        s.material.opacity = Math.sin(u * Math.PI);
      }
      root.rotation.y = Math.sin(t * 0.4) * 0.28 + k.px * 0.1;
      root.rotation.x = k.py * -0.08;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 · OPENSHADOWMAN — a round creature hopping between real-looking windows
// ═══════════════════════════════════════════════════════════════════════════
function shadowman() {
  const P = 0xff6fb5, L = 0xffc6e2, D = 0x8f2a5f, W = 0xffffff;
  const root = new THREE.Group();

  const wins = [
    { x: -0.7, y: -0.62, w: 1.0, h: 0.62 },
    { x: 0.58, y: -0.04, w: 0.95, h: 0.58 },
    { x: -0.3, y: 0.78, w: 0.9, h: 0.52 },
  ];
  for (const w of wins) {
    const g = new THREE.Group();
    const x0 = w.x - w.w / 2, x1 = w.x + w.w / 2, y0 = w.y - w.h / 2, y1 = w.y + w.h / 2, yb = y1 - 0.11;
    g.add(segs([x0, y0, 0, x1, y0, 0, x1, y0, 0, x1, y1, 0, x1, y1, 0, x0, y1, 0, x0, y1, 0, x0, y0, 0, x0, yb, 0, x1, yb, 0], D, 1));
    for (let i = 0; i < 3; i++) { const d = circle(0.02, L, 0.9, 10); d.position.set(x0 + 0.08 + i * 0.07, (yb + y1) / 2, 0); g.add(d); }
    const lines = [];
    for (let i = 0; i < 3; i++) { const yy = yb - 0.09 - i * 0.09; lines.push(x0 + 0.08, yy, 0, x0 + 0.08 + (0.5 - i * 0.12) * w.w, yy, 0); }
    g.add(segs(lines, D, 0.6));
    root.add(g);
  }

  const blob = new THREE.Group();
  blob.add(circle(0.2, W, 1, 48));
  blob.add(circle(0.17, L, 0.35, 48));
  const eyeL = circle(0.034, W, 1, 16), eyeR = circle(0.034, W, 1, 16);
  eyeL.position.set(-0.075, 0.03, 0); eyeR.position.set(0.075, 0.03, 0);
  blob.add(eyeL, eyeR);
  const pupils = new THREE.Group();
  const pl = circle(0.015, P, 1, 10), pr = circle(0.015, P, 1, 10);
  pl.position.set(-0.075, 0.03, 0); pr.position.set(0.075, 0.03, 0);
  pupils.add(pl, pr);
  blob.add(pupils);
  const blush = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) blush.push(sx * (0.115 + i * 0.015), -0.04 - i * 0.0, 0, sx * (0.14 + i * 0.015), -0.075, 0);
  blob.add(segs(blush, P, 0.95));
  for (const sx of [-1, 1]) { const nub = arc(0.035, 0, Math.PI, W, 1, 10, sx * 0.1, 0.17); blob.add(nub); }
  root.add(blob);

  const sparks = dyn(10, L, 0.95);
  root.add(sparks.obj);

  const DWELL = 0.9, HOP = 0.8, LEG = DWELL + HOP;
  const S = 1.6;                                     // blob is drawn at 0.2 radius; S makes him readable
  const stand = wins.map((w) => ({ x: w.x - 0.08 + (w.x < 0 ? 0.2 : 0), y: w.y + w.h / 2 + 0.2 * S }));
  let lastLand = { x: stand[0].x, y: stand[0].y, t: -9 };

  return {
    root,
    update(t, k) {
      const total = LEG * wins.length;
      const tt = ((t % total) + total) % total, leg = Math.min(wins.length - 1, Math.floor(tt / LEG)), lt = tt - leg * LEG;
      const a = stand[leg], b = stand[(leg + 1) % wins.length];
      let x = a.x, y = a.y, sy = 1, sx = 1;
      if (lt < DWELL) {
        sy = 1 + Math.sin(t * 5) * 0.035;
        sx = 1 / sy;
        const sinceLand = lt;
        if (sinceLand < 0.18) { const s = 1 - sinceLand / 0.18; sy *= 1 - 0.28 * s; sx *= 1 + 0.2 * s; }
        lastLand = { x: a.x, y: a.y - 0.2 * S, t: t - lt };
      } else {
        const u = (lt - DWELL) / HOP;
        x = a.x + (b.x - a.x) * u;
        y = a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * 0.42;
        const st = Math.sin(u * Math.PI) * 0.16;
        sy = 1 + st; sx = 1 - st * 0.7;
      }
      blob.position.set(x, y, 0.05);
      blob.scale.set(sx * S, sy * S, 1);

      pupils.position.set(k.px * 0.018 + Math.sin(t * 0.7) * 0.01, k.py * 0.014, 0);

      sparks.begin();
      const since = t - lastLand.t;
      if (since < 0.3 && lt < DWELL) {
        const f = since / 0.3;
        for (let i = 0; i < 5; i++) {
          const an = Math.PI * (0.15 + i * 0.175);
          const r0 = 0.1 + f * 0.18, r1 = r0 + 0.07 * (1 - f);
          sparks.add(lastLand.x + Math.cos(an) * r0, lastLand.y + 0.02 + Math.sin(an) * r0, 0.06, lastLand.x + Math.cos(an) * r1, lastLand.y + 0.02 + Math.sin(an) * r1, 0.06);
        }
      }
      sparks.end();
      root.rotation.y = k.px * 0.12; root.rotation.x = k.py * -0.08;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 · LIGHTIFY — a radial equaliser around a play mark, rings on the beat
// ═══════════════════════════════════════════════════════════════════════════
function lightify() {
  const M = 0x2fd49a, L = 0x9dffd6, D = 0x137a58;
  const root = new THREE.Group();
  const BARS = 64;
  const bars = dyn(BARS * 2, M, 1);
  root.add(bars.obj);
  root.add(circle(0.5, L, 0.9, 64));
  const outer = new THREE.Group();
  const dash = [];
  for (let i = 0; i < 72; i++) { const a0 = i / 72 * TAU, a1 = a0 + 0.55 / 72 * TAU; dash.push(Math.cos(a0) * 1.46, Math.sin(a0) * 1.46, 0, Math.cos(a1) * 1.46, Math.sin(a1) * 1.46, 0); }
  outer.add(segs(dash, M, 0.9));
  root.add(outer);
  const play = polyline([new THREE.Vector3(-0.12, -0.17, 0), new THREE.Vector3(-0.12, 0.17, 0), new THREE.Vector3(0.2, 0, 0)], L, 1, true);
  root.add(play);
  const ripples = [0, 1, 2].map(() => { const c = circle(1, L, 0, 64); root.add(c); return c; });

  return {
    root,
    update(t, k) {
      const beat = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6);
      bars.begin();
      for (let i = 0; i < BARS; i++) {
        const a = i / BARS * TAU;
        const bin = Math.abs(i - BARS / 2) / (BARS / 2);                   // 0 centre-bottom … 1
        const amp = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 0.47) * Math.sin(t * 1.3 + i * 0.19);
        const len = 0.06 + (Math.abs(amp) * 0.52 + beat * 0.3 * (1 - bin)) * (0.55 + 0.45 * (1 - bin * 0.6));
        const c = Math.cos(a), s = Math.sin(a);
        bars.add(c * 0.6, s * 0.6, 0, c * (0.6 + len), s * (0.6 + len), 0);
        bars.add(c * 0.6, s * 0.6, 0, c * (0.6 - len * 0.22), s * (0.6 - len * 0.22), 0);
      }
      bars.end();
      outer.rotation.z = -t * 0.18;
      const sc = 1 + beat * 0.12;
      play.scale.setScalar(sc);
      ripples.forEach((r, i) => {
        const u = frac(t * 0.42 - i / 3);
        r.scale.setScalar(0.52 + u * 0.9);
        r.material.opacity = (1 - u) * 0.65 * (u < 0.05 ? u / 0.05 : 1);
      });
      root.rotation.x = k.py * -0.1; root.rotation.y = k.px * 0.12;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 · DOPPELSTREAM — screens inside screens, receding forever, as its world does
//     (the desk's monitor → the streamer's screen → the viewer's screen → the wire);
//     a LIVE dot blinks and a latency stamp ticks
// ═══════════════════════════════════════════════════════════════════════════

/** A 16:9 screen of half width w about (0, 0): its bezel and, a little inside it, the glass. */
function screenRect(w, out, z = 0) {
  const h = w * 9 / 16, b = w * 0.06;
  for (const [x, y] of [[w, h], [w - b, h - b]]) {
    out.push(-x, -y, z, x, -y, z, x, -y, z, x, y, z, x, y, z, -x, y, z, -x, y, z, -x, -y, z);
  }
}

/** Seven-segment digits (a stamp's figures), left to right from x, centred on y, h tall. */
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function digits(lines, s, x, y, h) {
  const w = h * 0.5, gap = h * 0.22;
  for (const ch of s) {
    if (ch === '.') { lines.add(x + 0.02 * h, y - h / 2, 0, x + 0.06 * h, y - h / 2, 0); x += gap; continue; }
    const on = SEG7[ch] || '';
    const P = { a: [0, 1, 1, 1], b: [1, 1, 1, 0], c: [1, 0, 1, -1], d: [0, -1, 1, -1], e: [0, 0, 0, -1], f: [0, 1, 0, 0], g: [0, 0, 1, 0] };
    for (const sg of on) { const [x0, y0, x1, y1] = P[sg]; lines.add(x + x0 * w, y + y0 * h / 2, 0, x + x1 * w, y + y1 * h / 2, 0); }
    x += w + gap;
  }
}

function doppelstream() {
  const O = 0xff6a2b, L = 0xffc29a, D = 0x8f3410, R = 0xe5252a;
  const root = new THREE.Group();
  const W0 = 1.2, CY = -0.1;                                   // the desk's monitor: half width, centre

  // the desk's monitor on its stand, and the desk's edge
  const desk = [];
  screenRect(W0, desk);
  const H0 = W0 * 9 / 16;
  desk.push(-0.08, -H0, 0, -0.12, -H0 - 0.32, 0, 0.08, -H0, 0, 0.12, -H0 - 0.32, 0);           // the neck
  desk.push(-0.42, -H0 - 0.34, 0, 0.42, -H0 - 0.34, 0, -0.42, -H0 - 0.34, 0, -0.36, -H0 - 0.3, 0, 0.42, -H0 - 0.34, 0, 0.36, -H0 - 0.3, 0);
  desk.push(-1.3, -H0 - 0.36, 0, 1.3, -H0 - 0.36, 0);                                           // the desk
  const monitor = segs(desk, L, 0.95);
  monitor.position.y = CY;
  root.add(monitor);

  // inside it, screens within screens: each the next one's frame, all drifting inward forever
  const NEST = 6, SHRINK = 0.62;
  const nest = [];
  for (let i = 0; i < NEST; i++) {
    const a = [];
    screenRect(1, a);
    const s = segs(a, i % 2 ? O : L, 0.9);
    s.position.y = CY;
    root.add(s); nest.push(s);
  }
  // the scanline the innermost screens are refreshed by
  const scan = dyn(NEST, D, 0.9);
  root.add(scan.obj);

  // the wire: a cable from the monitor's back out to the edge, packets running in along it
  const cable = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    cable.push(new THREE.Vector3(W0 + 0.02 + u * 0.18, CY - 0.1 - Math.sin(u * Math.PI) * 0.28 - u * 0.62, 0));
  }
  root.add(polyline(cable, D, 0.95));
  const packets = dyn(8, O, 1);
  root.add(packets.obj);

  // LIVE: a dot and its halo, top left of the glass; the stamp's figures, bottom right
  const live = new THREE.Group();
  live.add(circle(0.035, R, 1, 16));
  const halo = circle(0.06, R, 1, 24);
  live.add(halo);
  live.position.set(-W0 * 0.8, CY + H0 * 0.78, 0.01);
  root.add(live);
  const stamp = dyn(64, L, 1);
  root.add(stamp.obj);
  let shown = '', next = 0;

  return {
    root,
    update(t, k) {
      // each screen is the next one's frame; over one period every screen grows into its parent's place
      const u = frac(t * 0.11);
      nest.forEach((s, i) => {
        const w = W0 * 0.9 * Math.pow(SHRINK, i + 1 - u);
        s.scale.set(w, w, 1);
        s.material.opacity = 0.9 * clamp01((i + 1 - u) * 1.4) * clamp01((NEST - i - 0.2 + u) / 1.5);
      });
      scan.begin();
      for (let i = 0; i < NEST; i++) {
        const w = W0 * 0.9 * Math.pow(SHRINK, i + 1 - u), h = w * 9 / 16 * 0.88, y = CY + h - frac(t * 0.6 + i * 0.37) * 2 * h;
        if (w > 0.06) scan.add(-w * 0.88, y, 0, w * 0.88, y, 0);
      }
      scan.end();
      // packets along the cable, toward the screen
      packets.begin();
      for (let i = 0; i < 4; i++) {
        const v = 1 - frac(t * 0.45 + i / 4), j = Math.floor(v * 39), p = cable[j], q = cable[Math.min(40, j + 1)];
        packets.add(p.x, p.y, 0.01, q.x, q.y, 0.01);
        const p2 = cable[Math.min(40, j + 2)]; packets.add(q.x, q.y, 0.01, p2.x, p2.y, 0.01);
      }
      packets.end();
      // LIVE blinks once a second; the stamp ticks a few times a second, about its 10.3 ms
      const on = frac(t) < 0.62;
      live.children[0].material.opacity = on ? 1 : 0.2;
      halo.scale.setScalar(1 + frac(t) * 0.8); halo.material.opacity = on ? (1 - frac(t)) * 0.8 : 0;
      if (t >= next || !shown) {
        next = t + 0.35;
        shown = (10.3 + Math.round((Math.sin(t * 7.3) + Math.sin(t * 3.1)) * 2) / 10).toFixed(1);
        stamp.begin(); digits(stamp, shown, W0 * 0.42, CY - H0 * 0.74, 0.11); stamp.end();
      }
      root.rotation.y = Math.sin(t * 0.2) * 0.22 + k.px * 0.1;
      root.rotation.x = Math.sin(t * 0.13) * 0.08 + k.py * -0.08;
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 · ISOLINE — a living distance field drawn as its own contour lines
// ═══════════════════════════════════════════════════════════════════════════
function isoline() {
  const W = 0xffffff, L = 0xcdb0ff, D = 0x4a2290;
  const root = new THREE.Group();

  // the field's frame: a ring with one tick per contour level
  root.add(circle(1.4, D, 0.9, 96));
  const ticks = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * TAU, r1 = 1.4 + (i % 4 === 0 ? 0.09 : 0.04);
    ticks.push(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
  }
  root.add(segs(ticks, D, 0.8));

  // marching squares over a grid, re-contoured every frame
  const N = 56, H = 1.36, STEP = (2 * H) / N, LEVELS = 6, SPACING = 0.13;
  const val = new Float32Array((N + 1) * (N + 1));
  const zero = dyn(900, W, 1);
  const rings = dyn(5200, L, 0.5);
  root.add(zero.obj, rings.obj);

  // drag to solve: a grabbed point on the surface and its normal
  const grip = circle(0.05, W, 1, 16);
  const pull = dyn(8, W, 0.8);
  root.add(grip, pull.obj);

  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  let blobs = [];
  const field = (x, y) => {
    let d = 9;
    for (const b of blobs) d = smin(d, Math.hypot(x - b[0], y - b[1]) - b[2], 0.42);
    return d;
  };

  const contour = (iso, out) => {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x0 = -H + i * STEP, y0 = -H + j * STEP;
      if (Math.hypot(x0 + STEP / 2, y0 + STEP / 2) > 1.32) continue;
      const a = val[j * (N + 1) + i] - iso, b = val[j * (N + 1) + i + 1] - iso;
      const c = val[(j + 1) * (N + 1) + i + 1] - iso, d = val[(j + 1) * (N + 1) + i] - iso;
      const m = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
      if (m === 0 || m === 15) continue;
      // edge crossings: bottom (a-b), right (b-c), top (d-c), left (a-d)
      const e = [
        [x0 + STEP * a / (a - b), y0], [x0 + STEP, y0 + STEP * b / (b - c)],
        [x0 + STEP * d / (d - c), y0 + STEP], [x0, y0 + STEP * a / (a - d)],
      ];
      const seg = (p, q) => out.add(e[p][0], e[p][1], 0, e[q][0], e[q][1], 0);
      switch (m) {
        case 1: case 14: seg(3, 0); break;
        case 2: case 13: seg(0, 1); break;
        case 3: case 12: seg(3, 1); break;
        case 4: case 11: seg(1, 2); break;
        case 6: case 9:  seg(0, 2); break;
        case 7: case 8:  seg(3, 2); break;
        case 5:  seg(3, 0); seg(1, 2); break;
        case 10: seg(0, 1); seg(2, 3); break;
      }
    }
  };

  return {
    root,
    update(t, k) {
      blobs = [
        [Math.cos(t * 0.31) * 0.34, Math.sin(t * 0.43) * 0.22 + 0.08, 0.36],
        [Math.cos(t * 0.52 + 2.1) * 0.58, Math.sin(t * 0.37 + 1.3) * 0.5, 0.24],
        [Math.cos(-t * 0.41 + 4.0) * 0.52, Math.sin(-t * 0.29 + 0.4) * 0.56, 0.2],
        [0.3 * Math.sin(t * 0.23), -0.55 + 0.1 * Math.cos(t * 0.6), 0.16],
      ];
      for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) val[j * (N + 1) + i] = field(-H + i * STEP, -H + j * STEP);
      zero.begin(); contour(0, zero); zero.end();
      rings.begin();
      for (let l = 1; l <= LEVELS; l++) { contour(l * SPACING, rings); if (l <= 2) contour(-l * SPACING * 0.6, rings); }
      rings.end();

      // the grip rides the surface of the big blob, pulled out and in along its normal
      const b = blobs[0], ga = t * 0.35 + 0.6;
      let gx = b[0] + Math.cos(ga) * b[2], gy = b[1] + Math.sin(ga) * b[2];
      const e = 1e-3, f0 = field(gx, gy);
      let nx = field(gx + e, gy) - field(gx - e, gy), ny = field(gx, gy + e) - field(gx, gy - e);
      const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      gx -= nx * f0; gy -= ny * f0;                          // project onto the zero line
      grip.position.set(gx, gy, 0.01);
      const reach = 0.12 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.3));
      pull.begin();
      for (let i = 0; i < 4; i++) {                          // dashed normal
        const s0 = 0.06 + i * reach / 4, s1 = s0 + reach / 8;
        pull.add(gx + nx * s0, gy + ny * s0, 0.01, gx + nx * s1, gy + ny * s1, 0.01);
      }
      pull.end();

      root.rotation.y = Math.sin(t * 0.3) * 0.22 + k.px * 0.1;
      root.rotation.x = Math.sin(t * 0.22) * 0.08 + k.py * -0.08;
    },
  };
}

const BUILDERS = [arachnia, tessera, thoughtslayer, choir, shadowman, lightify, doppelstream, isoline];

// ─── FaceRenderer ───────────────────────────────────────────────────────────

export class FaceRenderer {
  constructor(renderer) {
    this.renderer = renderer;
    // one multisampled buffer for all eight (a 4× buffer each was most of the scene's memory): an emblem is drawn
    // there, and the resolve, the same blit three would make into a target of its own, goes into its own texture
    this.msaa = this._target(4);
    this.faces = BUILDERS.map((build) => this._make(build));
  }

  _target(samples) {
    const target = new THREE.WebGLRenderTarget(RTT_SIZE, RTT_SIZE, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, samples, depthBuffer: false,             // (nothing in an emblem writes depth)
    });
    target.texture.colorSpace = THREE.SRGBColorSpace;
    return target;
  }

  /** The shared buffer's last drawing, resolved, into target (a blit of the same size: the texture three's own resolve would give). */
  _resolve(target) {
    const r = this.renderer, gl = r.getContext(), P = r.properties;
    if (!P.get(target).__webglFramebuffer) r.initRenderTarget(target);
    r.state.bindFramebuffer(gl.READ_FRAMEBUFFER, P.get(this.msaa).__webglFramebuffer);
    r.state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, P.get(target).__webglFramebuffer);
    gl.blitFramebuffer(0, 0, RTT_SIZE, RTT_SIZE, 0, 0, RTT_SIZE, RTT_SIZE, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    r.state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);             // (as three leaves its own resolve)
    r.state.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }

  _make(build) {
    const target = this._target(0);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    // holder places the emblem on the triangle's incircle; inner takes user spin.
    const holder = new THREE.Group();
    holder.position.set(0, EMBLEM_Y + NODE_CY * K, 0);
    holder.scale.setScalar(EMBLEM_SCALE);
    const inner = new THREE.Group();
    const { root, update } = build();
    inner.add(root);
    holder.add(inner);
    scene.add(holder);

    return {
      scene, camera, target, inner, holder, update,
      yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, px: 0, py: 0, drag: false, pulse: 0,
      s: 1, wx: 0, wy: 0,
    };
  }

  get textures() { return this.faces.map((f) => f.target.texture); }

  /** Compile every emblem's programs up front, each for its own target (so for its colour space): one promise per face. */
  prepare() {
    const r = this.renderer, saved = r.getRenderTarget();
    const done = this.faces.map((f) => { r.setRenderTarget(this.msaa); return r.compileAsync(f.scene, f.camera).catch(() => {}); });
    r.setRenderTarget(saved);
    return done;
  }

  /** Pointer in −1..1 screen space for the focused face (parallax + eye tracking). */
  setPointer(i, px, py) { const f = this.faces[i]; f.px = px; f.py = py; }

  /** Follow the wall's zoom/pan so the emblem stays glued to its disc in the picture. */
  setView(i, s, wx, wy) { const f = this.faces[i]; f.s = s; f.wx = wx; f.wy = wy; }

  /** Drag rotation applied to the focused emblem. */
  spin(i, dyaw, dpitch) {
    const f = this.faces[i];
    f.yaw += dyaw; f.pitch = THREE.MathUtils.clamp(f.pitch + dpitch, -1.0, 1.0);
    f.vyaw = dyaw * 60; f.vpitch = dpitch * 60;
    f.drag = true;
  }

  release(i) { this.faces[i].drag = false; }
  pulse(i) { this.faces[i].pulse = 1; }

  render(t, dt, visible, focused, focusedOn = true) {
    const r = this.renderer;
    const savedTarget = r.getRenderTarget();
    const savedClear = r.autoClear;
    r.autoClear = true;

    // Orbit: each visible emblem redraws every 2nd frame; behind a focused face, every 3rd.
    // Emblem time still advances smoothly (update takes absolute t), so this is invisible.
    this._n = (this._n || 0) + 1;
    const stride = focused >= 0 ? 3 : 2;

    for (let i = 0; i < this.faces.length; i++) {
      if (!visible[i] && i !== focused) continue;
      if (i === focused && !focusedOn) continue;          // zoomed so far in the emblem has faded out
      if (i !== focused && (this._n + i) % stride !== 0 && this.faces[i].drawn) continue;
      const f = this.faces[i];
      f.drawn = true;
      if (!f.drag) {
        f.yaw += f.vyaw * dt; f.pitch += f.vpitch * dt;
        const damp = Math.exp(-dt * 3);
        f.vyaw *= damp; f.vpitch *= damp;
        // ease the user rotation home so the authored motion always returns
        const home = Math.exp(-dt * 0.9);
        f.yaw *= home; f.pitch *= home;
      }
      f.pulse = Math.max(0, f.pulse - dt * 1.6);
      const k = { px: i === focused ? f.px : 0, py: i === focused ? f.py : 0, pulse: f.pulse };
      f.holder.position.set((0 - f.wx) * f.s * K, EMBLEM_Y + (NODE_CY - f.wy) * f.s * K, 0);
      f.holder.scale.setScalar(EMBLEM_SCALE * f.s);
      f.inner.rotation.set(f.pitch, f.yaw, 0, 'XYZ');
      const s = 1 + Math.sin(f.pulse * Math.PI) * 0.06;
      f.inner.scale.setScalar(s);
      f.update(t, k);
      r.setRenderTarget(this.msaa);
      r.render(f.scene, f.camera);
      this._resolve(f.target);
    }

    r.setRenderTarget(savedTarget);
    r.autoClear = savedClear;
  }
}
