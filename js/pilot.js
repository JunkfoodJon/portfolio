/**
 * pilot.js — camera, input, and the single depth value that ties it together.
 *
 * Everything follows one continuous number, D:
 *
 *   D 0 ─────────── 1 ───── 1.5 ──────────────▶ D_MAX
 *   free orbit   face centred   camera close      zooming INTO the wall
 *   (crystal far)  (fits view)   (incircle fills)  (scale s = 2^((D−1.5)·4.5))
 *
 * Scrolling moves D smoothly in both directions, so there is no snap, no
 * teleport and no separate "enter" animation: the nearest face simply turns to
 * the camera as you come in and turns back as you leave. D is never set, only
 * given a target: a critically damped spring carries it there, so every move
 * (wheel, click, key) starts gently, ends gently and can be interrupted by any
 * other without a jolt. Nothing completes itself once you stop scrolling.
 *
 * Rotation is a quaternion trackball about WORLD axes. Pitch therefore always
 * means "front goes down when you drag down", whatever the yaw.
 *
 * A face with a world (worlds/world.js) has no disc tree: past D_CLOSE the view
 * rides the world's zoom path, plus a hand-panned offset u (wall-screen units)
 * that relaxes as you zoom. Its depth has no floor: when the view lies inside
 * the loop's last plate, D drops by one loop and `loops` counts it, and climbing
 * back out restores it, so every zoom still reverses exactly.
 */

import * as THREE from 'three';
import { PROJECTS } from './content.js';
import { WALL, S_MAX } from './wall.js';
import { INRADIUS, OCTA_Y } from './crystal.js';

const ORBIT_Z     = 9.4;
const AUTO        = 0.17;       // rad/s about world Y when idle
const SENS        = 0.0068;     // rad per px of drag
const FRICTION    = 0.7;        // 1/s — long, free coast after a flick
const FADE        = 5;          // 1/s — what is left of a coast once a face is being approached
const MAX_SPIN    = 10;         // rad/s
const D_CLOSE     = 1.5;
const D_HOLD      = 0.5;        // a side not yet prepared is held here, just short of its plates showing (infoOn)
const OCT         = 4.5;        // D units per... 1/OCT D = one doubling of s
const D_MAX       = D_CLOSE + Math.log2(S_MAX) / OCT;
const TAP_PX      = 6, TAP_MS = 450;
const TAP_TOUCH   = 12;         // a fingertip wanders further than a mouse during a tap
const WHEEL_GAIN  = 0.00085;    // D per wheel pixel (a 100px notch ≈ 0.085 of the way to a centred face)
const WHEEL_CAP   = 240;        // ignore wheel spikes beyond this per event
const T_WHEEL     = 0.32;       // spring smoothing times, seconds (≈ time to arrive)
const T_ENTER     = 0.8;
const T_NODE      = 0.55;
const T_LEAVE     = 0.8;
const T_HOP_OUT   = 0.5;

/** Critically damped spring step (same family as "smooth damp"). Returns [value, velocity]. */
function damp(cur, target, vel, smoothTime, dt) {
  const st = Math.max(1e-4, smoothTime), om = 2 / st, x = om * dt;
  const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const ch = cur - target;
  const tmp = (vel + om * ch) * dt;
  let v = (vel - om * tmp) * ex;
  let out = target + (ch + tmp) * ex;
  if ((target - cur > 0) === (out > target)) { out = target; v = 0; }
  return [out, v];
}

const sFromD = (D) => (D <= D_CLOSE ? 1 : Math.pow(2, (D - D_CLOSE) * OCT));
const dFromS = (s) => D_CLOSE + Math.log2(Math.max(1, s)) / OCT;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Esc's rewind curve, 0 → 1: speed eases up over the first fifth, cruises, and eases down over the
 * last two fifths, so it leaves briskly and glides into the whole face. (Integrated once into a table.)
 */
let _rewindLUT = null;
function rewindEase() {
  if (!_rewindLUT) {
    const N = 256, v = (x) => smooth(0, 0.2, x) * (1 - smooth(0.6, 1, x));
    _rewindLUT = new Float32Array(N + 1);
    for (let i = 1; i <= N; i++) _rewindLUT[i] = _rewindLUT[i - 1] + v((i - 0.5) / N);
    for (let i = 1; i <= N; i++) _rewindLUT[i] /= _rewindLUT[N];
  }
  const L = _rewindLUT, N = L.length - 1;
  return (x) => { const f = Math.min(1, Math.max(0, x)) * N, i = Math.min(N - 1, Math.floor(f)); return L[i] + (L[i + 1] - L[i]) * (f - i); };
}

/** Slerp a → b by t the way b's sign says, long or short (three's slerp always takes the shorter way: see the pose in update). */
function arc(out, a, b, t) {
  const th = Math.acos(Math.min(1, Math.max(-1, a.dot(b)))), s = Math.sin(th);
  if (s < 1e-6) return out.copy(b);
  const ka = Math.sin((1 - t) * th) / s, kb = Math.sin(t * th) / s;
  return out.set(a.x * ka + b.x * kb, a.y * ka + b.y * kb, a.z * ka + b.z * kb, a.w * ka + b.w * kb).normalize();
}

const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);

export class Pilot {
  constructor({ crystal, faces, wall, texture, world, plates, ready = () => true, onLabel = () => {}, onAnnounce = () => {} }) {
    this.crystal = crystal; this.faces = faces; this.wall = wall; this.texture = texture;
    this.world = world; this.plates = plates;
    this.ready = ready;                 // (face) → is its side prepared (main.js's warm-up)
    this.onLabel = onLabel; this.onAnnounce = onAnnounce;
    this.canvas = crystal.canvas;

    // pose
    this.qBase = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, 0.6, 0, 'XYZ'));
    this.qFocus = new THREE.Quaternion();
    this.qAim = new THREE.Quaternion();  // qFocus, signed for the way the turn to it goes
    this.w0 = 0;                         // how far the approach was when its face was taken (see _lockFace)
    this.spin = { x: 0, y: AUTO };
    this.idle = 9;

    // depth + wall view
    this.D = 0; this.Dt = 0; this.Dv = 0;
    this.pv = { x: 0, y: 0 };           // pan spring velocity
    this.smoothT = T_WHEEL;
    this.goal = null;                   // { D1, view, done } while a click/key move is in progress
    this.face = -1;
    this.view = { s: 1, px: 0, py: 0 };
    this.anchor = null;
    this.lastWheel = -9;
    this._drawn = { s: -1, px: 0, py: 0, hover: null, on: -1, project: -2 };

    // world faces
    this.worldOn = false;
    this.u = { x: 0, y: 0 }; this.uv = { x: 0, y: 0 }; this.uT = null;
    this.loops = 0;
    this.levels = [];
    this.plateK = -1;
    this.worldHover = false;
    this.infoOn = 0;
    this._lastD = 0;
    this.leaving = false;
    this.rewind = null;                  // Esc's timed reverse zoom while it runs
    this.wantD = null;                   // where a held approach was going (see D_HOLD)
    this.holding = -1;                   // the face whose held approach has come to its stop, or −1
    this.aimFresh = true;                // the cursor has moved since a wheel last chose a face
    this.respin = false;                 // spun by hand part way in: re-aim at the face in front once it settles

    this.pointer = { x: 0, y: 0 };
    this.fingerAt = null;                // a finger's place (−1..1) the pointer eases to; null: no finger, back to the centre
    this.touch = false;                  // the last pointer was a finger
    this.hoverAt = null;                // the cursor's last place over the canvas (null: off it)
    this.art = { x: 0, y: 0, vx: 0, vy: 0, on: 0 };   // where a world's art feels the pointer (see _artPointer)
    this._picked = { q: new THREE.Quaternion(), D: -1 };   // the pose it was last picked at
    this.drag = null;
    this.samples = [];
    this.pointers = new Map();
    this.pinch0 = 0;
    this.mid = null;                     // two fingers: their midpoint (moving it pans)
    this.panT = -1;                      // when two fingers last panned
    this.downAt = -1;                    // when the first finger of a gesture came down
    this.twoTap = null;                  // two fingers down together and still: lifting them soon is Esc's rewind

    this.paused = false;                 // the contact panel is open: no input reaches the crystal (see pause)

    this.introT = 0;
    this._introStart = null;
    this.introDur = 3.2;
    this.emblemAlpha = 1;

    this._tmp = new THREE.Quaternion();
    this._bind();
  }

  startIntro() { if (this._introStart == null) this._introStart = performance.now(); }

  /** The contact panel opens (true) or closes: input stops reaching the crystal, and any hover or drag lets go. */
  pause(on) {
    this.paused = on;
    if (!on) return;
    this.drag = null; this.pointers.clear(); this.twoTap = null; this.fingerAt = null;
    this.hoverAt = null; this.crystal.setHover(-1); this.wall.hover = null; this.onLabel(-1);
  }

  get focused() { return this.face; }
  get emblemOn() { return this.emblemAlpha > 0.01; }
  /** How far in, counting every loop a world has wound: 0 orbit, 1 face centred, D_CLOSE the first plate. */
  get depth() { return this.D + (this.worldOn ? this.loops * Math.log2(this.world.loopS) / OCT : 0); }

  // ── geometry helpers ──────────────────────────────────────────────────────

  _orbitZ() {
    const a = this.crystal.camera.aspect || 1;
    return Math.max(ORBIT_Z, 5.4 / (0.9326 * a));
  }

  _camZ(D) {
    const { fitZ, closeZ } = this.crystal.framing();
    const orbit = this._orbitZ();
    // distance changes by a constant *ratio* per unit of D (zoom feels even), with a light ease at the ends
    const mix = (u) => 0.6 * u + 0.4 * (u * u * (3 - 2 * u));
    const lerpLog = (a, b, u) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * u);
    if (D <= 1) return lerpLog(orbit, fitZ, mix(Math.max(0, D)));
    return lerpLog(fitZ, closeZ, mix(Math.min(1, (D - 1) / 0.5)));
  }

  /** The screen's half extents in wall units once the incircle fills the view (see Crystal.framing). */
  _extent() {
    const W = window.innerWidth, H = window.innerHeight, px = Math.min(0.42 * H, 0.46 * W);
    return { x: W / 2 / px, y: H / 2 / px, d: Math.hypot(W / 2, H / 2) / px };
  }

  /** Where the camera looks: lifted to centre the whole triangle while it is framed, the incircle once close. */
  _lookY(D) {
    const closeness = smooth(0, 1, (D - 1) / 0.5);
    const wFit = smooth(0.25, 1, Math.min(D, 1));
    return OCTA_Y + (2.449 / 6) * wFit * (1 - closeness);
  }

  /**
   * A world's face grows in its own plane as the camera closes in from the framed face (D 1 → D_CLOSE),
   * its border and bevel with it, until all three edges are off screen; past D_CLOSE it stays so. The
   * others fade as it starts to grow (it would pass in front of their edges). It is a function of depth
   * alone, so zooming out shrinks it exactly. Its plate is drawn into the square of face uv that holds
   * what of the grown triangle is on screen (plates, words and face all share it).
   */
  _grow() {
    const on = this.face >= 0 && this.worldOn, hd = this._extent(), M = 0.15;     // (M: wall units to spare, for parallax)
    // an edge lies E wall units from the centre: E past the screen's farthest corner along each edge's normal
    const full = Math.max(hd.y, 0.866 * hd.x + 0.5 * hd.y) + 0.25;
    const t = (this.D - 1) / (D_CLOSE - 1);
    const E = on ? 1 + (full - 1) * smooth(0, 1, t) : 1;
    this.grow = E;
    this.hide = on ? smooth(0, 0.12, t) : 0;
    // the grown triangle's box, cut to the screen's
    let x0 = -Math.sqrt(3) * E, x1 = -x0, y0 = -E, y1 = 2 * E;
    if (this.D > 1) {
      const wpp = this.crystal.worldPerPx(this._camZ(this.D)) / INRADIUS, ly = (this._lookY(this.D) - OCTA_Y) / INRADIUS;
      const hx = wpp * window.innerWidth / 2, hy = wpp * window.innerHeight / 2;
      x0 = Math.max(x0, -hx); x1 = Math.min(x1, hx); y0 = Math.max(y0, ly - hy); y1 = Math.min(y1, ly + hy);
    }
    const h = Math.max(x1 - x0, y1 - y0) / 2 + M, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const m = this.map;
    const x0u = WALL.cu + WALL.ru * (cx - h), y0u = WALL.cv + WALL.ru * (cy - h), span = 2 * h * WALL.ru;
    if (!m || Math.abs(m.x0 - x0u) + Math.abs(m.y0 - y0u) + Math.abs(m.span - span) > 1e-7) {
      this.map = { x0: x0u, y0: y0u, span, v: (m ? m.v : 0) + 1 };
      this.plates.setRegion(this.map); this.world.setRegion(this.map);
    }
    // the target is sized for the square it covers once close (the screen's, plus the margin)
    this.plates.setReach(Math.max(1, Math.round(2 * (Math.max(hd.x, hd.y) + M) * WALL.ru * 20) / 20));
  }

  _dMax() { return this.worldOn ? dFromS(this.world.homeS(this.world.N + 2)) : D_MAX; }

  /** Wall-screen coords (incircle-relative) of a face hit. */
  _wallXY(hit) { return [(hit.u - WALL.cu) / WALL.ru, (hit.v - WALL.cv) / WALL.ru]; }

  // ── depth control ─────────────────────────────────────────────────────────

  _lockFace(face) {
    if (face === this.face) return;
    this.face = face;
    this.qFocus.copy(this.crystal.focusQuaternion(face));
    // the turn to it starts from the pose the crystal has now, over what is left of the approach (w0), so a
    // face taken part way in (a wheel aimed at another, a hop) carries on from there without a jump
    this.qBase.copy(this.crystal.quaternion);
    this.w0 = smooth(0.06, 0.96, Math.min(this.D, 1));
    this._aimShort();
    this.worldOn = this.world.has(face);
    this.wall.setProject(this.worldOn ? -1 : face);
    this.world.setProject(this.worldOn ? face : -1);
    this.u = { x: 0, y: 0 }; this.uv = { x: 0, y: 0 }; this.uT = null;
    this.loops = 0; this.plateK = -1; this._uSeen = null; this.wantD = null;
    this._drawn.project = -2;
    this.view = { s: 1, px: 0, py: 0 };
    this.anchor = null;
    this.onAnnounce(`${PROJECTS[face].name}. ${PROJECTS[face].tagline}`);
  }

  /** Aim the spring at a depth (and, optionally, a wall view); `done` fires once it has settled. */
  _goto(D1, { view = null, smooth = T_ENTER, done = null } = {}) {
    this.Dt = Math.min(this._dMax(), Math.max(0, D1));
    this.smoothT = smooth;
    this.goal = { D1: this.Dt, view, done };
    this.anchor = null;
    this.leaving = this.Dt < 1;                          // a world does not unwind its loops on the way out
  }

  /** Enter a face from orbit. */
  enter(face) {
    if (this.goal && this.face === face && this.goal.D1 >= 1) return;
    this._lockFace(face);
    this._goto(1, { smooth: T_ENTER });
  }

  /**
   * Change the face being approached without a jolt: the turn to the new face starts from where the
   * crystal is now (see _lockFace). Nearly framed there is too little approach left to turn in, so it
   * hops out and back in.
   */
  _switchFace(face) {
    const w = smooth(0.06, 0.96, Math.min(this.D, 1));
    if (w > 0.8) { this.hop(face); return; }
    this._lockFace(face);
    this.crystal.setHover(face);
  }

  /** Hop to another face while staying at depth. */
  hop(face) {
    if (face === this.face) return;
    if (this.D < 0.05 || this.face < 0) { this.enter(face); return; }
    this._goto(0.32, {
      smooth: T_HOP_OUT,
      done: () => { this._lockFace(face); this._goto(1, { smooth: T_ENTER }); },
    });
  }

  step(dir) {
    if (this.face < 0) return;
    this.hop((this.face + dir + PROJECTS.length) % PROJECTS.length);
  }

  zoomToNode(node) {
    const v = this.wall.viewFor(node);
    this._goto(dFromS(v.s), { view: v, smooth: T_NODE });
    this.onAnnounce(node.text ? `${node.label}. ${node.text}` : node.value ? `${node.label}: ${node.value}` : node.label);
  }

  /** World faces: fly to the next plate's home view (from the approach, first to the window itself). */
  worldNext() {
    const w = this.world;
    this.uT = { x: 0, y: 0 };
    if (this.D < D_CLOSE - 0.05) { this._goto(D_CLOSE, { smooth: T_ENTER }); this.uT = null; return; }
    const s = sFromD(this.D), k = w.index(s);
    // (short of the first home, as a phone's nearer one may be, that home is next)
    this._goto(dFromS(w.homeS(s < w.homeS(k) * 0.97 ? k : k + 1)), { smooth: T_NODE * 2.2 });
  }

  /** World faces: back to this plate's home, else the previous plate's, else out of the face. */
  _worldOut() {
    const w = this.world, s = sFromD(this.D), k = w.index(s);
    this.uT = { x: 0, y: 0 };
    if (this.D < D_CLOSE - 0.05 && this.loops === 0) { this._goto(0, { smooth: T_LEAVE }); return; }
    if (s > w.homeS(k) * 1.06) { this._goto(dFromS(w.homeS(k)), { smooth: T_NODE * 1.6 }); return; }
    if (k > 0) { this._goto(dFromS(w.homeS(k - 1)), { smooth: T_NODE * 2.2 }); return; }
    if (this.loops > 0) {
      // the previous loop's last plate: below D_CLOSE in this loop's units; the unwrap lifts it on the way
      this._goto(0, { smooth: T_NODE * 2.2 });
      this.Dt = D_CLOSE + Math.log2(w.homeS(w.N - 1) / w.loopS) / OCT;
      this.goal = null; this.leaving = false;
      return;
    }
    this._goto(0, { smooth: T_LEAVE });
  }

  /**
   * Esc / Backspace: the easy way out of a long zoom. From anywhere inside a world, one timed,
   * eased reverse zoom all the way back to the whole face, unwinding every loop on the way (see the
   * rewind in update); from the whole face, out. Any wheel, key or press takes over at once.
   */
  back() {
    if (!(this.worldOn && this.face >= 0)) { this.out(); return; }
    if (this.loops === 0 && this.D <= 1.03) { this._goto(0, { smooth: T_LEAVE }); return; }
    const w = this.world, shift = Math.log2(w.loopS) / OCT;
    const from = this.D + this.loops * shift;                          // the absolute depth
    this.goal = null; this.anchor = null; this.leaving = false;
    this.uT = { x: 0, y: 0 }; this.smoothT = T_ENTER;
    // longer the deeper (about seven doublings a second at cruise), but never a wait
    const T = Math.min(6.5, 1.3 + 0.6 * (from - 1));
    this.rewind = { from, to: 1, t0: performance.now(), T, ease: rewindEase() };
  }

  /** One level back; at the top level, leave the face. */
  out() {
    if (this.worldOn && this.face >= 0) { this._worldOut(); return; }
    if (this.D < 0.97) { this._goto(0, { smooth: T_LEAVE }); return; }
    const node = this.wall.current(this.view);
    if (node && node.parent) {
      const p = node.parent;
      const v = p.kind === 'project' ? { s: 1, px: 0, py: 0 } : this.wall.viewFor(p);
      this._goto(dFromS(v.s), { view: v, smooth: T_NODE });
    } else {
      this._goto(0, { smooth: T_LEAVE });
    }
  }

  // ── frame ─────────────────────────────────────────────────────────────────

  update(dt, t) {
    const cr = this.crystal;
    if (this._introStart != null && this.introT < 1) {
      this.introT = Math.min(1, (performance.now() - this._introStart) / 1000 / this.introDur);
    }
    const ie = 1 - Math.pow(1 - this.introT, 3);
    cr.setIntro(this.introT);
    this.idle += dt;

    // depth: a spring toward the target; nothing else ever moves D (except Esc's timed rewind)
    {
      if (this.rewind && !this.worldOn) this.rewind = null;              // the face it was unwinding is gone
      if (this.rewind) {
        // the absolute depth (D plus the loops already wound) eases to the whole face; an unwrap
        // lifts D by a loop as it drops one, so D follows that same curve in every loop's units
        const R = this.rewind, shift = Math.log2(this.world.loopS) / OCT;
        const x = Math.min(1, (performance.now() - R.t0) / 1000 / R.T);
        const e = R.ease(x);
        this.D = this.Dt = R.from + (R.to - R.from) * e - this.loops * shift;
        this.Dv = 0;
        if (x >= 1 || !this.worldOn) this.rewind = null;
      }
      // a side still being prepared: the approach eases to a stop short of it, its face breathing, and
      // goes on (no further than the whole face) once it is ready, instead of freezing on its first frame
      const held = this.face >= 0 && this.worldOn && !this.ready(this.face);
      if (held && this.Dt > D_HOLD) { this.wantD = Math.min(1, Math.max(this.wantD ?? 0, this.Dt)); this.Dt = D_HOLD; }
      else if (!held && this.wantD != null) { if (this.face >= 0 && this.Dt >= D_HOLD - 1e-3) this.Dt = Math.max(this.Dt, this.wantD); this.wantD = null; }
      else if (held && this.Dt < D_HOLD - 1e-3) this.wantD = null;
      cr.setWaiting(held && this.D > 0.05 ? this.face : -1);
      this.holding = held && this.wantD != null && this.D > D_HOLD - 0.02 ? this.face : -1;
      const [d, v] = damp(this.D, this.Dt, this.Dv, this.smoothT, dt);
      this.D = d; this.Dv = v;
      let panSettled = true;
      if (this.goal && this.goal.view) {
        const g = this.goal.view;
        const [px, vx] = damp(this.view.px, g.px, this.pv.x, this.smoothT, dt);
        const [py, vy] = damp(this.view.py, g.py, this.pv.y, this.smoothT, dt);
        this.view.px = px; this.view.py = py; this.pv.x = vx; this.pv.y = vy;
        panSettled = Math.hypot(px - g.px, py - g.py) < 0.003 && Math.hypot(vx, vy) < 0.02;
      }
      const depthSettled = Math.abs(this.Dt - this.D) < 0.0015 && Math.abs(this.Dv) < 0.01;
      cr.setWarp(Math.min(0.045, Math.abs(this.Dv) * 0.03));
      // chained moves (hop out → hop in) continue as soon as the depth is visually there; the
      // spring keeps its velocity, so the hand-over is seamless
      if (this.goal && !this.goal.view && Math.abs(this.Dt - this.D) < 0.03 && Math.abs(this.Dv) < 0.2) {
        const g = this.goal; this.goal = null; g.done?.();
      }
      if (depthSettled) {
        this.D = this.Dt; this.Dv = 0;
        if (this.goal && panSettled) {
          const g = this.goal; this.goal = null;
          if (g.view) { this.view.px = g.view.px; this.view.py = g.view.py; this.pv.x = this.pv.y = 0; }
          g.done?.();
        }
      }
    }
    this.D = Math.min(this._dMax(), Math.max(0, this.D));

    // choose a face as soon as we start coming in; release it once fully out
    if (this.D > 0.004 && this.face < 0) {
      this._lockFace(cr.hover >= 0 ? cr.hover : cr.frontFace(this.qBase));
    } else if (this.D <= 0.002 && this.face >= 0 && !this.goal) {
      this.face = -1; this.wall.setProject(-1); this.world.setProject(-1);
      this.worldOn = false; this.loops = 0;
      this.onAnnounce('');
    }

    // wall scale + anchored pan (a world face rides its zoom path instead)
    this._grow();
    if (this.worldOn) this._worldView(dt);
    const s = this.worldOn ? this.view.s : sFromD(this.D);
    this.view.s = s;
    if (this.worldOn) { /* placed by _worldView */ } else if (!(this.goal && this.goal.view)) {
      if (this.anchor) {
        this.view.px = this.anchor.wx - this.anchor.ax / s;
        this.view.py = this.anchor.wy - this.anchor.ay / s;
      } else if (s < 1.15) {
        const k = Math.exp(-dt * 6);
        this.view.px *= k; this.view.py *= k;
      }
    }
    const pr = Math.hypot(this.view.px, this.view.py - 0.2);
    if (!this.worldOn && pr > 0.66) { const k = 0.66 / pr; this.view.px *= k; this.view.py = 0.2 + (this.view.py - 0.2) * k; }
    if (this.anchor && performance.now() - this.lastWheel > 500) this.anchor = null;

    // pose
    const w = smooth(0.06, 0.96, Math.min(this.D, 1));
    const wf = this.w0 < 1 ? Math.max(0, (w - this.w0) / (1 - this.w0)) : 1;     // how far the turn to the face is
    if (this.D >= 0.999) { this.qBase.copy(this.qAim); this.w0 = 0; }
    const free = 1 - wf;
    if (!(this.drag && this.drag.rotate)) {
      if (this.idle > 2.2 && this.D < 0.02) {
        const k = 1 - Math.exp(-dt * 0.6);
        this.spin.y += (AUTO - this.spin.y) * k; this.spin.x += (0 - this.spin.x) * k;
      } else {
        // a coast goes on freely in orbit; once a face is being approached it blends out instead of fighting the turn
        const f = Math.exp(-dt * (this.face >= 0 ? FADE : FRICTION));
        this.spin.x *= f; this.spin.y *= f;
      }
      const k = free * this._slow();
      this._rotate(this.spin.y * dt * k, this.spin.x * dt * k);
      // spun by hand part way in: once it has settled, the approach goes on to whichever face is now in front
      if (this.respin && Math.hypot(this.spin.x, this.spin.y) < 0.05) {
        this.respin = false;
        if (this.face >= 0 && this.D > 0.004 && this.D < 0.97) { const f = cr.frontFace(this.qBase); if (f !== this.face) this._lockFace(f); }
      }
    }
    // the turn takes the shorter way round, chosen while it has not begun (where both ways look the same);
    // once under way it keeps that way, so what is left of a coast can never flip it to the other side mid-turn
    if (wf < 1e-4) this._aimShort();
    if (this.face >= 0 && this.D > 0.004) arc(cr.quaternion, this.qBase, this.qAim, wf);
    else cr.quaternion.copy(this.qBase);

    // a finger has no resting place to follow: the pointer eases toward it while it touches, home once lifted
    if (this.touch) {
      const f = this.fingerAt || { x: 0, y: 0 }, k = 1 - Math.exp(-dt * 3);
      this.pointer.x += (f.x - this.pointer.x) * k; this.pointer.y += (f.y - this.pointer.y) * k;
    }

    this._artPointer(dt);

    // camera
    const z = this._camZ(this.D);
    const oy = this._lookY(this.D);
    const pw = 0.5 * (1 - w) + 0.07 * w;
    const cam = cr.camera;
    cam.position.set(this.pointer.x * pw, oy + this.pointer.y * pw * 0.6, z + (1 - ie) * 16);
    cam.lookAt(0, oy, 0);
    cr.group.scale.setScalar(0.55 + 0.45 * ie);

    // what the face shows
    const rho0 = 0.62 * s;
    const infoOn = smooth(0.5, 0.95, Math.min(this.D, 1));
    this.infoOn = infoOn;
    // a world's first plate replaces the emblem outright; the wall's discs grow out of it
    this.emblemAlpha = this.face < 0 ? 1 : this.worldOn ? 1 - infoOn : 1 - smooth(0.8, 1.25, rho0);
    cr.setFocus(this.face, Math.min(this.D, 1), this.emblemAlpha, infoOn, this.worldOn ? this.plates.texture : this.texture, this.grow, this.hide, this.worldOn ? this.map : null);
    if (this.face >= 0) {
      if (this.worldOn) this.faces.setView(this.face, 1, 0, 0);
      else this.faces.setView(this.face, this.view.s, this.view.px, this.view.py);
      this.faces.setPointer(this.face, this.D > 0.5 ? this.pointer.x : 0, this.D > 0.5 ? this.pointer.y : 0);
    }

    // the crystal turning under a resting cursor (the idle turn, a coast, the approach) changes the face it
    // points at: pick again whenever the pose has moved, while a label is shown (or hides as the view leaves
    // orbit). Not while a wheel's choice waits for its face to be taken
    const pk = this._picked;
    if (this.hoverAt && this.pointers.size < 2 && (this.D < 0.5 || pk.D < 0.5) && !(this.face < 0 && this.Dt > 0)
        && (pk.D !== this.D || 1 - Math.abs(pk.q.dot(cr.quaternion)) > 1e-10)) {
      pk.q.copy(cr.quaternion); pk.D = this.D;
      this._hover(this.hoverAt.x, this.hoverAt.y);
    }

    this._redrawWall(infoOn);
    this._cursor();
  }

  /**
   * World faces: the path's own vertical offset (screen units) at scale s. Closing in on the face it
   * tilts up just enough to keep a portal near the apex, and a little of what crowns it, on screen
   * (the incircle framing would crop it); through the first plate it eases back to nothing. It is a
   * function of depth alone, so however fast the zoom, the view only ever closes in, never doubles back.
   */
  _lift(s, hd) {
    if (this.loops > 0) return 0;
    const w = this.world, P = w.def.plates[0].portal;
    const lift = Math.max(0, P[1] + P[2] + 0.22 - hd.y);
    if (lift === 0) return 0;
    if (this.D < D_CLOSE) return lift * smooth(0, 1, (this.D - 1) / (D_CLOSE - 1));
    // (it is gone by the first home; on a phone, whose first home is nearer than the window, by that)
    const near = w.homeS(0) > 1.0001, z0 = near ? 0 : Math.log(w.homeS(0)), z1 = Math.log(w.homeS(near ? 0 : 1));
    const t = Math.min(1, Math.max(0, (Math.log(s) - z0) / (z1 - z0)));
    return lift * (1 - (0.6 * t + 0.4 * t * t * (3 - 2 * t)));
  }

  /** World faces: depth → scale, the loop's wrap, the path and the hand offset → view and levels. */
  _worldView(dt) {
    const w = this.world, hd = this._extent();
    // a phone turned (its words laid out again, its resting views with them): resting in a plate, go to its new one
    if (this._laidSeen !== w.laidV) {
      if (this._laidSeen != null && this.D >= D_CLOSE && !this.goal && !this.rewind) {
        const s = sFromD(this.D), k = w.index(s), near = k + 1 < w.homes.length && Math.log(w.homeS(k + 1) / s) < Math.log(s / w.homeS(k)) ? k + 1 : k;
        this._goto(dFromS(w.homeS(near)), { smooth: T_NODE });
        this.uT = { x: 0, y: 0 };
      }
      this._laidSeen = w.laidV;
    }
    const dD = Math.abs(this.D - this._lastD);
    const panning = !!(this.drag && this.drag.pan) || (this.pointers.size === 2 && performance.now() - this.panT < 120);
    if (this.uT) {
      const [ux, vx] = damp(this.u.x, this.uT.x, this.uv.x, this.smoothT, dt);
      const [uy, vy] = damp(this.u.y, this.uT.y, this.uv.y, this.smoothT, dt);
      this.u.x = ux; this.u.y = uy; this.uv.x = vx; this.uv.y = vy;
      if (Math.hypot(ux - this.uT.x, uy - this.uT.y) < 1e-3) this.uT = null;
    } else if (!panning && !this.anchor) {
      const k = Math.exp(-dD * 5);                       // zooming (keys, clicks) draws you back onto the path
      this.u.x *= k; this.u.y *= k;
    }

    let s = sFromD(this.D);
    // the view: the zoom path, its own lift (a function of depth alone), and the hand's offset u
    const at = () => { const c = w.center(s); return [c[0] + this.u.x / s, c[1] + (this._lift(s, hd) + this.u.y) / s]; };
    const lo = (v, a, b) => Math.min(Math.max(v, a), b);
    // a wheel zoom leans toward where the cursor points: the further this gesture has zoomed, the
    // nearer the view draws to the cursor's place (never all the way). A cursor at the centre adds
    // nothing, so the path's own motion is never fought.
    const pin = () => {
      if (!this.anchor || this.D < D_CLOSE) return;
      const A = this.anchor;
      if (!A.u0) A.u0 = { x: this.u.x, y: this.u.y };
      const f = 0.85 * (1 - Math.pow(Math.min(1, (A.sA || s) / s), 0.5));
      this.u.x = A.u0.x + (A.ax - A.u0.x) * f; this.u.y = A.u0.y + (A.ay - A.u0.y) * f;
    };
    pin();
    // while the zoom moves, the hand's offset is drawn toward keeping the next portal near the middle
    // of the screen, only as fast as the zoom itself goes, so it can never jump; at rest it is free
    const keep = () => {
      if (this.D < D_CLOSE || panning || dD < 1e-6) return;
      const k = w.index(s), t = w.T[k], P = w.def.plates[t.id].portal;
      const px = t.O[0] + P[0] / t.S, py = t.O[1] + P[1] / t.S, [vx, vy] = at();
      const ex = 0.7 * hd.x / s, ey = 0.7 * hd.y / s, f = 1 - Math.exp(-dD * 8);
      this.u.x += (lo(vx, px - ex, px + ex) - vx) * s * f;
      this.u.y += (lo(vy, py - ey, py + ey) - vy) * s * f;
    };
    keep();
    // however far the hand takes it, the view's centre stays on the plate it is looking at (inside
    // that plate's face triangle: apex at y 2, base at y −1), so there is always something to read
    const roam = () => {
      const t = w.T[w.index(s)], [vx, vy] = at(), m = 0.92;
      const qy = lo((vy - t.O[1]) * t.S, -m, 2 * m), xm = (2 * m - qy) / Math.sqrt(3);
      const qx = lo((vx - t.O[0]) * t.S, -xm, xm);
      this.u.x += (t.O[0] + qx / t.S - vx) * s; this.u.y += (t.O[1] + qy / t.S - vy) * s;
    };
    roam();
    // the rules above set where the hand's offset should be; the offset itself glides there, so a
    // rule that changes its mind (a new plate's portal, a released anchor) never jolts the view
    const glide = () => {
      if (this._uSeen && !panning) {
        const k = 1 - Math.exp(-dt * 14);
        this.u.x = this._uSeen.x + (this.u.x - this._uSeen.x) * k;
        this.u.y = this._uSeen.y + (this.u.y - this._uSeen.y) * k;
      }
      this._uSeen = { x: this.u.x, y: this.u.y };
    };
    glide();
    const shift = Math.log2(w.loopS) / OCT;
    // the anchor's point is in global units too: it moves with a wrap
    const moveAnchor = (f, k) => {
      if (!this.anchor) return;
      const [x, y] = f(this.anchor.wx, this.anchor.wy);
      this.anchor.wx = x; this.anchor.wy = y;
      if (this.anchor.sA) this.anchor.sA *= k;
    };
    const O = w.loopO, S = w.loopS;
    if (s >= w.homeS(w.N) && w.covers(w.N, at(), s, hd, 0.97)) {
      this.D -= shift; this.Dt -= shift; this.loops++;
      s = sFromD(this.D);
      moveAnchor((x, y) => [(x - O[0]) * S, (y - O[1]) * S], 1 / S);
      this.u.x = this._uSeen.x; this.u.y = this._uSeen.y;                  // u is screen-space: a wrap leaves it be
    } else if (this.loops > 0 && this.leaving && this.D < D_CLOSE) {
      this.loops = 0;                                    // leaving: plate 0 is simply the window again
    } else if (this.loops > 0 && !this.leaving && (s < 1.0001 || !w.covers(0, at(), s, hd))) {
      this.D += shift; this.Dt += shift; this.loops--;
      s = sFromD(this.D);
      moveAnchor((x, y) => [O[0] + x / S, O[1] + y / S], S);
      this.u.x = this._uSeen.x; this.u.y = this._uSeen.y;
    }
    this._lastD = this.D;

    const c = at();
    this.view.s = s; this.view.px = c[0]; this.view.py = c[1];
    w.loops = this.loops;
    w.approach = Math.min(1, this.D);                    // the first plate's text effects play by the approach
    this.levels = w.computeLevels(c, s, hd, this.plates.pxPerUnit);

    const k = this.D >= D_CLOSE - 0.02 ? w.index(s) % w.N : -1;
    if (k !== this.plateK) {
      this.plateK = k;
      if (k >= 0 && (k > 0 || this.loops > 0)) this.onAnnounce(w.announce(k));
    }
  }

  _redrawWall(infoOn) {
    if (this.face < 0 || infoOn < 0.01) return;
    const d = this._drawn, v = this.view, h = this.wall.hover;
    if (this.worldOn) {
      // (words still arriving — typing, counting — redraw every frame until they have; drawn roughly while
      // the view moved, once more when it rests)
      if (this.world.animating || this.world.rough || d.project !== this.face || d.laid !== this.world.laidV || d.approach !== this.world.approach || d.map !== this.map.v || Math.abs(d.s / v.s - 1) > 1e-5 || Math.abs(d.px - v.px) * v.s > 1e-5 || Math.abs(d.py - v.py) * v.s > 1e-5) {
        this.world.draw(this.levels);
        this.texture.needsUpdate = true;
        d.s = v.s; d.px = v.px; d.py = v.py; d.project = this.face; d.approach = this.world.approach; d.map = this.map.v; d.laid = this.world.laidV;
      }
      return;
    }
    if (d.project !== this.face || Math.abs(d.s - v.s) > 1e-4 || Math.abs(d.px - v.px) > 1e-5 || Math.abs(d.py - v.py) > 1e-5 || d.hover !== h) {
      this.wall.draw(v);
      this.texture.needsUpdate = true;
      d.s = v.s; d.px = v.px; d.py = v.py; d.hover = h; d.project = this.face;
    }
  }

  _cursor() {
    const c = this.canvas;
    let cur = '';
    if (this.drag && this.drag.moved) cur = 'grabbing';
    else if (this.D < 0.9 && this.crystal.hover >= 0) cur = 'pointer';
    else if (this.D >= 0.9 && (this.worldOn ? this.worldHover : this.wall.hover)) cur = 'pointer';
    else cur = 'grab';
    if (c.style.cursor !== cur) c.style.cursor = cur;
  }

  /** qAim: qFocus signed for the shorter way round from qBase. */
  _aimShort() {
    const a = this.qAim.copy(this.qFocus);
    if (a.dot(this.qBase) < 0) a.set(-a.x, -a.y, -a.z, -a.w);
  }

  /** How much of a spin the crystal takes: all of it in orbit, less as a face is approached (always the hand's way). */
  _slow() { return this.face >= 0 ? 1 - 0.85 * smooth(0.06, 0.96, Math.min(this.D, 1)) : 1; }

  _rotate(yaw, pitch) {
    if (yaw) { this._tmp.setFromAxisAngle(AY, yaw); this.qBase.premultiply(this._tmp); }
    if (pitch) { this._tmp.setFromAxisAngle(AX, pitch); this.qBase.premultiply(this._tmp); }
    this.qBase.normalize();
  }

  // ── input ─────────────────────────────────────────────────────────────────

  _bind() {
    const c = this.canvas;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => this._down(e));
    c.addEventListener('pointermove', (e) => this._move(e));
    c.addEventListener('pointerup', (e) => this._up(e));
    c.addEventListener('pointercancel', (e) => this._up(e, true));
    c.addEventListener('pointerleave', () => { if (!this.drag) { this.hoverAt = null; this.crystal.setHover(-1); this.wall.hover = null; this.onLabel(-1); } });
    c.addEventListener('wheel', (e) => { if (this.paused) e.preventDefault(); else this._wheel(e); }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());   // (Safari's own pinch: the page never zooms)
    // (Enter or Space on a focused control — the contact glyph — presses it, not the crystal)
    window.addEventListener('keydown', (e) => {
      if (this.paused || ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('button'))) return;
      this._key(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (this.paused) return;
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2) this.aimFresh = true;
      const x = (e.clientX / window.innerWidth) * 2 - 1, y = -((e.clientY / window.innerHeight) * 2 - 1);
      this.touch = e.pointerType === 'touch';
      if (this.touch) this.fingerAt = { x, y }; else { this.pointer.x = x; this.pointer.y = y; }
    }, { passive: true });
    const lift = (e) => { if (e.pointerType === 'touch' && this.pointers.size === 0) this.fingerAt = null; };
    window.addEventListener('pointerup', lift); window.addEventListener('pointercancel', lift);
  }

  _down(e) {
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    if (this.pointers.size === 1) this.downAt = performance.now();
    if (this.pointers.size > 2) this.twoTap = null;
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
      this.mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.twoTap = performance.now() - this.downAt < TAP_MS ? { t0: this.downAt } : null;
      this.drag = null;
      // like a wheel, a pinch from afar comes in on the face between the fingers
      if (this.D < 0.97) {
        const hit = this.crystal.pick(this.mid.x, this.mid.y);
        if (hit && this.face < 0) this.crystal.setHover(hit.face);
        else if (hit && hit.face !== this.face) this._switchFace(hit.face);
      }
      return;
    }
    const now = performance.now();
    this.drag = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t0: now, moved: false, rotate: false, pan: false, tap: e.pointerType === 'touch' ? TAP_TOUCH : TAP_PX };
    this.samples = [{ t: now, x: e.clientX, y: e.clientY }];
    this.idle = 0;
    this.spin.x = 0; this.spin.y = 0;                    // grab to stop
    this.rewind = null;
  }

  _move(e) {
    const pt = this.pointers.get(e.pointerId);
    if (pt) {
      pt.x = e.clientX; pt.y = e.clientY;
      if (this.twoTap && Math.hypot(pt.x - pt.x0, pt.y - pt.y0) > TAP_TOUCH) this.twoTap = null;   // (a pinch or a pan, not a tap)
    }
    this.hoverAt = { x: e.clientX, y: e.clientY };

    if (this.pointers.size === 2) {                      // pinch = scroll; the fingers moving together pan a world
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (this.pinch0 > 0) {
        this.goal = null; this.smoothT = T_WHEEL;
        this.Dt = Math.min(this._dMax(), Math.max(0, this.Dt + Math.log(d / this.pinch0) * 0.55));
        this.uT = null; this.leaving = false; this.rewind = null;
        this.lastWheel = performance.now();
        this.pinch0 = d;
        if (this.D >= 0.97 && this.mid && (mx !== this.mid.x || my !== this.mid.y)) { this._pan(mx - this.mid.x, my - this.mid.y); this.panT = performance.now(); }
        this.idle = 0;
      }
      this.mid = { x: mx, y: my };
      return;
    }

    if (!this.drag) { this._hover(e.clientX, e.clientY); return; }
    const d = this.drag;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > d.tap) {
      d.moved = true;
      if (this.D < 0.97) d.rotate = true; else d.pan = true;
      // part way in, the hand takes the crystal from the turn to its face: it spins as it is shown, as in orbit
      // (the turn starts again from here; see _lockFace)
      if (d.rotate && this.face >= 0) { this.qBase.copy(this.crystal.quaternion); this.w0 = smooth(0.06, 0.96, Math.min(this.D, 1)); }
    }
    if (!d.moved) return;

    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.x = e.clientX; d.y = e.clientY;
    const now = performance.now();
    this.samples.push({ t: now, x: e.clientX, y: e.clientY });
    while (this.samples.length > 2 && now - this.samples[0].t > 110) this.samples.shift();
    this.idle = 0;

    if (d.rotate) {
      const k = this._slow();
      this._rotate(dx * SENS * k, dy * SENS * k);
      this.goal = null; this.Dt = this.D;
    } else if (d.pan && this.face >= 0) {
      this._pan(dx, dy);
      this.goal = null; this.Dt = this.D;
    }
  }

  /** Move the view with the hand by (dx, dy) screen px: a world's hand offset, else the wall's pan. */
  _pan(dx, dy) {
    if (this.face < 0) return;
    const wpp = this.crystal.worldPerPx(this._camZ(this.D)) / 0.8165;   // wall units per px at s = 1
    if (this.worldOn) {
      this.u.x -= dx * wpp; this.u.y += dy * wpp;          // the offset is in screen terms: it survives the zoom
      this.uT = null;
    } else {
      this.view.px -= (dx * wpp) / this.view.s;
      this.view.py += (dy * wpp) / this.view.s;
      this.goal = null; this.anchor = null;
    }
  }

  _up(e, cancelled = false) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) { this.pinch0 = 0; this.mid = null; }
    if (this.pointers.size > 0 && this.pointers.size !== 1) this.twoTap = null;          // (a third finger: not a two-finger tap)
    // a two-finger tap: both fingers down and up again quickly, barely moved: Esc's rewind
    if (this.pointers.size === 0 && this.twoTap) {
      const ok = !cancelled && performance.now() - this.twoTap.t0 < TAP_MS;
      this.twoTap = null;
      if (ok && (this.D > 0.02 || this.goal)) { this.back(); return; }
    }
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    const now = performance.now();

    if (d.rotate) {
      // flick: velocity over the last ~100 ms; a pause before release means no throw
      const s = this.samples;
      const last = s[s.length - 1], first = s[0];
      if (last && first && now - last.t < 90 && last.t - first.t > 8) {
        const dtS = (last.t - first.t) / 1000;
        const clamp = (v) => Math.max(-MAX_SPIN, Math.min(MAX_SPIN, v));
        this.spin.y = clamp(((last.x - first.x) / dtS) * SENS);
        this.spin.x = clamp(((last.y - first.y) / dtS) * SENS);
      }
      this.idle = 0;
      this.respin = this.face >= 0;                       // (once it settles, the face in front is the one approached)
      return;
    }
    if (d.moved || cancelled || now - d.t0 > TAP_MS) return;

    // tap
    const hit = this.crystal.pick(e.clientX, e.clientY);
    if (this.D < 0.5) {
      if (hit) this.enter(hit.face);
    } else {
      if (hit && hit.face === this.face && this.worldOn) this.worldNext();
      else if (hit && hit.face === this.face) {
        const [ax, ay] = this._wallXY(hit);
        const node = this.wall.hit(ax, ay, this.view);
        if (node) this.zoomToNode(node); else this.out();
      } else if (hit) this.hop(hit.face);
      else this.out();
    }
  }

  /**
   * World faces: the point of the face under the cursor, or under a finger while it touches (passively, through
   * the touches and drags there already are), in wall units, eased, with its velocity; `on` fades out once it is
   * off the face or the finger lifts. The art reacts to it alone: a click or a tap stays "next plate".
   */
  _artPointer(dt) {
    const A = this.art;
    let hit = null;
    if (this.worldOn && this.face >= 0 && this.hoverAt && !(this.touch && this.pointers.size === 0)) {
      hit = this.crystal.pick(this.hoverAt.x, this.hoverAt.y);
      if (hit && hit.face !== this.face) hit = null;
    }
    const k = 1 - Math.exp(-dt * 8);
    if (hit) {
      const [ax, ay] = this._wallXY(hit);
      if (A.on < 0.01) { A.x = ax; A.y = ay; }
      const x0 = A.x, y0 = A.y;
      A.x += (ax - A.x) * k; A.y += (ay - A.y) * k;
      const s = 1 / Math.max(dt, 1e-3);
      A.vx += ((A.x - x0) * s - A.vx) * k; A.vy += ((A.y - y0) * s - A.vy) * k;
    } else { A.vx *= 1 - k; A.vy *= 1 - k; }
    A.on += ((hit ? 1 : 0) - A.on) * (1 - Math.exp(-dt * 4));
  }

  _hover(x, y) {
    const hit = this.crystal.pick(x, y);
    if (this.D < 0.5) {
      const f = hit ? hit.face : -1;
      this.crystal.setHover(f);
      this.onLabel(f, x, y);
    } else {
      this.crystal.setHover(-1); this.onLabel(-1);
      this.worldHover = !!(hit && hit.face === this.face);
      if (this.worldOn) this.wall.hover = null;
      else if (hit && hit.face === this.face) {
        const [ax, ay] = this._wallXY(hit);
        this.wall.hover = this.wall.hit(ax, ay, this.view);
      } else this.wall.hover = null;
    }
  }

  _wheel(e) {
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    const now = performance.now();
    this.goal = null; this.smoothT = T_WHEEL;
    this.lastWheel = now;
    this.idle = 0;
    this.uT = null; this.leaving = false; this.rewind = null;

    // zoom around the cursor once we are in the face: the wall pins the point under it; a world
    // pins it too, while its path still draws you on toward the next plate
    if (this.D >= 1.0 && this.face >= 0 && !this.anchor) {
      const hit = this.crystal.pick(e.clientX, e.clientY);
      if (hit && hit.face === this.face) {
        const [ax, ay] = this._wallXY(hit);
        const s = this.view.s;
        this.anchor = { ax, ay, wx: this.view.px + ax / s, wy: this.view.py + ay / s, sA: Math.max(1, s) };
      }
    }
    // the face under the cursor wins over the one in front, and over the last one entered: until
    // a face is framed, scrolling in over another face turns the crystal to that one instead
    // (aim is read once per gesture: the crystal turns under a resting cursor, and the face that
    // slides under it is not the one that was chosen)
    if (dy < 0 && this.D < 0.97 && this.aimFresh) {
      const hit = this.crystal.pick(e.clientX, e.clientY);
      if (hit && this.face < 0) this.crystal.setHover(hit.face);
      else if (hit && hit.face !== this.face) this._switchFace(hit.face);
      if (hit) this.aimFresh = false;
    }
    const d = Math.max(-WHEEL_CAP, Math.min(WHEEL_CAP, dy));
    this.Dt = Math.min(this._dMax(), Math.max(0, this.Dt - d * WHEEL_GAIN));
  }

  _key(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k !== 'Escape' && k !== 'Backspace') this.rewind = null;
    if (k === 'Escape' || k === 'Backspace') { if (this.D > 0.02 || this.goal) { e.preventDefault(); this.back(); } return; }
    if (/^[1-8]$/.test(k)) { e.preventDefault(); this.hop(Number(k) - 1); return; }
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      const dir = k === 'ArrowRight' ? 1 : -1;
      if (this.D >= 0.9) this.step(dir);
      else { this.spin.y += dir * 1.2; this.idle = 0; }
      return;
    }
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      this.goal = null; this.smoothT = T_WHEEL; this.lastWheel = performance.now(); this.leaving = false;
      this.Dt = Math.min(this._dMax(), Math.max(0, this.Dt + (k === 'ArrowUp' ? 0.07 : -0.07)));
      return;
    }
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      if (this.D < 0.5) this.enter(this.crystal.hover >= 0 ? this.crystal.hover : this.crystal.frontFace(this.qBase));
    }
  }

  onResize() { /* depth → camera mapping is recomputed each frame */ }
}
