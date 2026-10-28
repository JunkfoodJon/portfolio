/**
 * world.js — a project face as a painting you fall into.
 *
 * A world is a chain of PLATES. Each plate is a picture in its own coordinates
 * with a PORTAL somewhere in it; the next plate's MEDALLION (its own frame) is
 * mapped onto that portal. Both are [x, y, r] circles, or [x, y, r, aspect]
 * rectangles r tall and r·aspect wide (half sizes) — a screen inside a screen. Zooming into the portal is zooming
 * into the next picture: nothing fades or cuts, the detail simply becomes the
 * whole. The last plate's portal leads back to the first, so the zoom never ends.
 *
 *   plate k ──portal──▶ plate k+1 ──portal──▶ … ──▶ plate N ≡ plate 0 (wrapped)
 *
 * The camera follows one path: between two plates' home views it zooms about
 * the one point that carries the first home exactly onto the second, so the
 * motion is a pure, even zoom. Pilot adds a small hand-panned offset on top.
 *
 * Coordinates: "global" = plate 0's wall units (incircle radius 1, centre 0,0;
 * see wall.js). Plate k sits at origin O_k with scale S_k: global = O_k + q / S_k.
 * View scale s is global; a plate is drawn at s / S_k. Depth is kept small by
 * wrapping: once the view lies wholly inside plate N's medallion it is moved to
 * the identical place in plate 0 (Pilot keeps the count, so it unwinds exactly).
 *
 * Drawing: PlateRenderer runs one fragment shader into a render target laid out
 * like the face texture. Per pixel it picks the deepest plate whose portal holds
 * it (at most three levels are ever on screen) and draws that plate's GLSL. The
 * words are set by World.draw on the wall's 2D canvas, clipped the same way, each
 * on a soft dark plaque that blots out the engraving so they always read. A world
 * with its own `fonts` paints its words instead: lettered in its title and body
 * faces, on a watercolour wash, brushed in along each line as the view comes in. When the
 * canvas redraws, a jump flood turns its letters into a distance field, so a world
 * may reshape its words (`textFx`, on top of the paint); the effect plays by how far the view has come
 * into the plate, never by time, and always ends as the plain text. An inscription's text
 * may be a function of n, how many plates deep it is counted from the first
 * window across every loop (Pilot keeps `loops` in step).
 *
 * Colour and life grow with depth. The surface is white light, as the crystal
 * is; each plate deeper takes on more of its world's palette ([deep, mid, light,
 * accent]: line brightness runs deep → mid → light, an accent drifts across
 * regions), in full by the end of the first loop. Every loop after that swaps
 * the palette's roles and moves the accent's regions, so the zoom never repeats
 * itself exactly. In the darkness of deeper plates, motes drift and glint —
 * denser the deeper, finer ones always arriving as you zoom — and from the
 * second loop on, faint threads join neighbours into constellations.
 */

import * as THREE from 'three';
import { PROJECTS } from '../content.js';
import { WALL } from '../wall.js';
import { ULTRA, PLATE_CAP } from '../crystal.js';
import { SDF_GLSL } from './sdf.js';
import { CHOIR } from './choir.js';
import { DOPPEL } from './doppel.js';
import { ARACHNIA } from './arachnia.js';
import { RUBIX } from './rubix.js';
import { THOUGHTSLAYER } from './thoughtslayer.js';
import { SHADOWMAN } from './shadowman.js';
import { LIGHTIFY } from './lightify.js';
import { ISOLINE } from './isoline.js';

const WORLDS = {
  [CHOIR.id]: CHOIR, [DOPPEL.id]: DOPPEL,
  [ARACHNIA.id]: ARACHNIA, [RUBIX.id]: RUBIX, [THOUGHTSLAYER.id]: THOUGHTSLAYER, [SHADOWMAN.id]: SHADOWMAN, [LIGHTIFY.id]: LIGHTIFY, [ISOLINE.id]: ISOLINE,
};
const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
// the faces a world may letter its words in (`fonts: { title: [family, weight], body: [family, weight] }`), all
// SIL OFL, vendored in vendor/fonts with their licences: [file, weight range]. The canvas is laid out only once
// they have loaded (main.js waits for them)
const FACES = {
  'Grenze Gotisch': [['GrenzeGotisch', '100 900']],
  'Alegreya': [['Alegreya', '400 900']],
  'Kaushan Script': [['KaushanScript-Regular', '400']],
  'Kalam': [['Kalam-Regular', '400'], ['Kalam-Bold', '700']],
  'Metamorphous': [['Metamorphous-Regular', '400']],
  'JetBrains Mono': [['JetBrainsMono', '100 800']],
  'Comfortaa': [['Comfortaa', '300 700']],
  'Architects Daughter': [['ArchitectsDaughter-Regular', '400']],
  'Big Shoulders Stencil': [['BigShouldersStencil', '100 900']],
  'Chakra Petch': [['ChakraPetch-Regular', '400'], ['ChakraPetch-SemiBold', '600']],
  'VT323': [['VT323-Regular', '400']],
  'Share Tech Mono': [['ShareTechMono-Regular', '400']],
  'Fredoka': [['Fredoka', '300 700']],
  'Pixelify Sans': [['PixelifySans', '400 700']],
  'Audiowide': [['Audiowide-Regular', '400']],
  'Exo 2': [['Exo2', '100 900']],
};
export const fontsReady = Promise.all(Object.entries(FACES).flatMap(([family, files]) => files.map(([file, weight]) =>
  new FontFace(family, `url(vendor/fonts/${file}.ttf)`, { weight }).load().then((f) => document.fonts.add(f))))).catch(() => {});
const MAX_LEVELS = 3;
const MAX_VERDICTS = 32;                    // judged words a drawing may carry to the shader (see _judged)
const MIN_BODY = 0.023;                     // plate units: the smallest wrapped text a plate may set
const MIN_LABEL = 0.018;                    // … and the smallest single line (labels, credits, arcs)
const MIN_PAINT = 0.026;                    // … painted (the brush's texture is lost on smaller letters)
const MIN_ALPHA = 0.85;                     // the faintest an inscription may be (an alpha of 0.5 maps here, 0.92 to full)
const READ_PX = 7;                          // an inscription starts arriving once its letters are this many px tall
const PLATE_SEEN = 0.3;                     // a plate's clock (uAge) starts once it is this large on screen
const GLYPHS = '01<>/\\#%*+=:;[]{}|~^';
const ATLAS = 2048;                         // px across the atlas arcs are set in while the view moves (see _arc)
// the canvas codes each letter by colour: red carries the ink over the black plaque each inscription sits
// on, green its kind and size (below half an accent word, a figure; above it body; within each half the
// letter's size, log 4–512 px) and blue its effect's progress (see the shader and FIELD_OUT)
const PLAQUE = '#000000';
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const quarter = (px) => Math.pow(2, Math.round(Math.log2(Math.max(px, 1)) * 4) / 4);   // px to the nearest quarter octave
const figure = (s, f) => (s.decimals ? (s.value * f).toFixed(s.decimals) : String(Math.round(s.value * f))) + s.suffix;

export class World {
  /** canvas: the wall's 2D canvas (shared: a face shows either the wall or a world). */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.SIZE = canvas.width;
    this.setRegion(null);
    this.project = -1;
    this.def = null;
    this.T = [];
    this.homes = [];
    this.levels = [];
    this.loops = 0;
    this._laid = new Map();                   // face → its chain and laid-out words (prelayout)
    this.shown = new Map();                   // plate depth n → (inscription → time it started arriving)
    this.seenAt = new Map();                  // plate depth n → time it came into view (the shader's uAge)
    this.animating = false;                   // words still arriving: draw every frame
    this.moving = false;                      // the view moved since the last drawing …
    this.rough = false;                       // … so it was drawn roughly (_arc, _width): draw again once it rests
    this._widths = new Map();                 // lines' widths (_width)
    this.approach = 1;                        // Pilot's approach to the face (0 orbit … 1 the whole face)
    this.caret = '';                          // the accent ink of the inscription being set
    this.fx = 1;                              // … and its effect's progress
    this.laidV = 0;                           // counted each time the words are laid out again
    this.drawScale = 1;                       // the zoom the canvas was last drawn at, over the true one (see draw)
    this.quantize = true;                     // … in eighths of an octave while moving (off: always exact, for comparing)
  }

  static defs() { return Object.values(WORLDS); }

  /**
   * The square of face uv the canvas covers ({ x0, y0, span }; null, the whole texture), as the plate
   * target does (see PlateRenderer.setRegion). A grown face covers more of the plate; sizes that stand
   * for what can be read (`px` below) are measured as if on the whole texture, so they do not shift with it.
   */
  setRegion(m) {
    const { x0 = 0, y0 = 0, span = 1 } = m || {};
    this.span = span;
    this.U = (WALL.ru / span) * this.SIZE;
    this.CX = ((WALL.cu - x0) / span) * this.SIZE;
    this.CY = (1 - (WALL.cv - y0) / span) * this.SIZE;
  }

  has(i) { return i >= 0 && !!WORLDS[PROJECTS[i].id]; }
  defOf(i) { return this.has(i) ? WORLDS[PROJECTS[i].id] : null; }

  setProject(i) {
    if (i === this.project) return;
    this.project = i;
    this.def = this.has(i) ? WORLDS[PROJECTS[i].id] : null;
    this.shown.clear(); this.seenAt.clear(); this.animating = false;
    if (this.def) ({ T: this.T, homes: this.homes, text: this.text } = this.prelayout(i));
  }

  /** Face i's chain and words, laid out once and kept (the loader lays out every world's while it waits). */
  prelayout(i) {
    let L = this._laid.get(i);
    if (!L) { L = this._chain(WORLDS[PROJECTS[i].id], i); this._laid.set(i, L); }
    return L;
  }

  get N() { return this.def.plates.length; }

  // ── the chain ─────────────────────────────────────────────────────────────

  _chain(def, project) {
    const P = def.plates, N = P.length;
    const T = [{ O: [0, 0], S: 1, id: 0 }];
    for (let k = 0; k < N + 2; k++) {
      const cur = T[k], [px, py, pr] = P[cur.id].portal;
      const id = (k + 1) % N, [mx, my, mr] = P[id].medal;
      const f = pr / mr;
      T.push({ O: [cur.O[0] + (px - mx * f) / cur.S, cur.O[1] + (py - my * f) / cur.S], S: cur.S / f, id });
    }
    const homes = T.map((t) => {
      const [hx, hy, hs] = P[t.id].home || [0, 0, 1];
      return { c: [t.O[0] + hx / t.S, t.O[1] + hy / t.S], s: t.S * hs };
    });
    const text = P.map((_, id) => []);
    for (const it of def.inscriptions(PROJECTS[project])) {
      text[it.plate].push(typeof it.text === 'function' ? { ...it, dyn: it.text, cache: new Map() } : this._layout(it, def));
    }
    return { T, homes, text };
  }

  /** A dynamic inscription laid out for depth n (a few kept: only three plates are ever on screen). */
  _dyn(it, n) {
    let l = it.cache.get(n);
    if (!l) {
      if (it.cache.size > 12) it.cache.clear();
      l = this._layout({ ...it, text: it.dyn(n) });
      it.cache.set(n, l);
    }
    return l;
  }

  /** Plate k of the chain whose home view is at or above scale s. */
  index(s) {
    const H = this.homes;
    let k = 0;
    while (k + 1 < H.length && s >= H[k + 1].s * 0.999) k++;
    return k;
  }

  homeS(k) { return this.homes[Math.min(k, this.homes.length - 1)].s; }

  /**
   * The zoom path: the view centre (global) for a scale. Each stretch between two homes is a pure
   * zoom about its own fixed point; where two stretches meet (at a home) their fixed points differ,
   * so the motion would turn a corner there. Near each home the two are blended in log-scale over a
   * window a third of the shorter stretch wide, so the path bends smoothly instead.
   */
  center(s) {
    const H = this.homes;
    if (s <= H[0].s) {
      if (H[0].s <= 1.0001) return H[0].c;
      // a phone's first home is nearer than the whole window: from the window (centred, s 1) a pure zoom onto it
      const f = (1 - 1 / Math.max(1, s)) / (1 - 1 / H[0].s);
      return [H[0].c[0] * f, H[0].c[1] * f];
    }
    const k = Math.min(this.index(s), H.length - 2);
    const z = Math.log(s);
    const zh = (j) => Math.log(H[j].s);
    const len = (j) => (j >= 0 && j < H.length - 1 ? zh(j + 1) - zh(j) : Infinity);
    const mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const ease = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    let c = this._stretch(k, s);
    const d1 = 0.33 * Math.min(len(k), len(k + 1));                     // the home ahead
    if (k + 1 < H.length - 1 && z > zh(k + 1) - d1) c = mix(c, this._stretch(k + 1, s), ease(zh(k + 1) - d1, zh(k + 1) + d1, z));
    const d0 = 0.33 * Math.min(len(k - 1), len(k));                     // the home behind
    if (k > 0 && z < zh(k) + d0) c = mix(this._stretch(k - 1, s), c, ease(zh(k) - d0, zh(k) + d0, z));
    return c;
  }

  /** Stretch k of the path (home k → home k+1, a zoom about one point), evaluated at any scale. */
  _stretch(k, s) {
    const a = this.homes[k], b = this.homes[k + 1];
    const r = a.s / b.s;
    const F = [(b.c[0] - a.c[0] * r) / (1 - r), (b.c[1] - a.c[1] * r) / (1 - r)];
    const u = a.s / s;
    return [F[0] + (a.c[0] - F[0]) * u, F[1] + (a.c[1] - F[1]) * u];
  }

  /** Does plate k's medallion hold the whole screen? ext: the screen's half extents {x, y, d}; margin < 1 asks for room to spare. */
  covers(k, c, s, ext, margin = 1) {
    const t = this.T[k], [mx, my, mr, ma] = this.def.plates[t.id].medal;
    const cx = t.O[0] + mx / t.S, cy = t.O[1] + my / t.S, R = (mr / t.S) * margin;
    if (ma) return Math.abs(c[0] - cx) + ext.x / s <= R * ma && Math.abs(c[1] - cy) + ext.y / s <= R;
    return Math.hypot(c[0] - cx, c[1] - cy) + ext.d / s <= R;
  }

  /** Scale of one whole loop (plate N in plate 0's units) — Pilot's wrap. */
  get loopS() { return this.T[this.N].S; }
  get loopO() { return this.T[this.N].O; }

  /** The plates on screen, outermost first: [{ id, cx, cy, s, portal }]. pxPerUnit: target px per wall unit. */
  computeLevels(c, s, ext, pxPerUnit) {
    const T = this.T, P = this.def.plates;
    let base = 0;
    for (let k = T.length - 2; k > 0; k--) if (this.covers(k, c, s, ext)) { base = k; break; }
    const out = [];
    for (let k = base; k < T.length && out.length < MAX_LEVELS; k++) {
      const t = T[k], sj = s / t.S;
      const portal = P[t.id].portal;
      out.push({ id: t.id, k, cx: (c[0] - t.O[0]) * t.S, cy: (c[1] - t.O[1]) * t.S, s: sj, portal });
      if (portal[2] * sj * pxPerUnit < 0.75) break;           // the next plate would be under a pixel
    }
    // each plate's clock runs from when it came into view; it restarts if the plate leaves the screen
    const now = performance.now() / 1000, seen = new Map();
    for (const L of out) {
      const n = this.loops * this.N + L.k;
      let t0 = this.seenAt.get(n);
      if (t0 == null && L.s >= PLATE_SEEN) t0 = now;
      if (t0 != null) seen.set(n, t0);
      L.age = t0 == null ? 0 : now - t0;
    }
    this.seenAt = seen;
    this.levels = out;
    return out;
  }

  // ── words ─────────────────────────────────────────────────────────────────

  /** Wrap once, in plate units, at a reference size (font metrics scale linearly). */
  _layout(it, def = this.def) {
    const F = def?.fonts, minB = F ? MIN_PAINT : MIN_BODY, minL = F ? MIN_LABEL + 0.003 : MIN_LABEL;
    if (it.w && !it.arc && it.size < minB) {                    // small body text grows, its column with it
      const k = minB / it.size;
      it = { ...it, size: minB, w: it.w * k };
    } else if (!it.w && it.size < minL) it = { ...it, size: minL };
    const c = this.ctx, REF = 100;
    let weight = Math.max(it.weight || 400, it.size >= 0.04 ? 300 : 400), track = it.track || 0;   // large figures may be lighter
    let family = FONT, title = false;
    if (F) {                                                    // painted: titles and figures in the title face, the rest in the body face
      title = it.face === 'title' || (it.face !== 'body' && (!!it.count || it.size >= 0.04));
      family = `"${(title ? F.title : F.body)[0]}", serif`;
      weight = title ? F.title[1] : (it.weight || 400) >= 600 ? Math.max(700, F.body[1]) : F.body[1];
      if (title) track = Math.min(track, 0.03);                 // (a lettered title is not set in spaced capitals)
    }
    const text = it.upper && !title ? it.text.toUpperCase() : it.text;
    c.font = `${weight} ${REF}px ${family}`;
    if ('letterSpacing' in c) c.letterSpacing = `${REF * track}px`;
    const unit = it.size / REF;                               // plate units per reference px
    let lines = [text];
    if (it.w && !it.arc) {
      lines = [];
      let line = '';
      for (const word of text.split(/\s+/)) {
        const t = line ? line + ' ' + word : word;
        if (line && c.measureText(t).width * unit > it.w) { lines.push(line); line = word; } else line = t;
      }
      if (line) lines.push(line);
    }
    const widths = [...text].map((ch) => c.measureText(ch).width * unit);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    const alpha = MIN_ALPHA + (1 - MIN_ALPHA) * smooth(0.5, 0.92, it.alpha ?? 0.92) ** 0.5;   // keeps the order, never faint
    return { ...it, text, family, weight, track, lines, widths, lh: it.lh || 1.38, alpha };
  }

  /**
   * How an inscription arrives, once its letters are big enough to read (each world picks a
   * `reveal`): 'type' sets it a letter at a time behind a caret, 'decode' resolves it out of
   * scrambled glyphs, 'rise' lifts it in line by line. Figures (`count`) run up to their value.
   * The words on a plate arrive one after another; leaving the plate's view lets them arrive again.
   */
  _timing(it) {
    const chars = it.lines.reduce((t, l) => t + l.length, 0);
    if (it.count) return 1.6;
    switch (this.def.reveal) {
      case 'type':   return Math.min(2.4, 0.3 + chars * 0.02);
      case 'decode': return 0.9 + Math.min(0.8, chars * 0.006);
      default:       return 0.7 + 0.18 * it.lines.length;
    }
  }

  /**
   * How far the view has come into plate L: 0 as it arrives, 1 at its home view, over three doublings
   * of zoom (the first plate of the first loop by the approach instead, from when the face first shows
   * its plate to the whole face framed, a view one rests at). The ease is gentle, nearly even, so the
   * change is not bunched mid-way. Text effects play by this, never by time, so zooming back out plays
   * them in reverse.
   */
  _depthIn(L) {
    const hs = this.def.plates[L.id].home?.[2] || 1;
    const gentle = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return 0.65 * t + 0.35 * t * t * (3 - 2 * t); };
    const d = gentle(-2.15, -0.03, Math.log(L.s / hs));
    return this.loops === 0 && L.k === 0 ? Math.min(d, gentle(0.5, 1.0, this.approach)) : d;
  }

  draw(levels) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.SIZE, this.SIZE);
    this.animating = false;
    this.vboxes = [];                                         // (where judged words are drawn: see _judged)
    // has the view moved since the last drawing? (then arcs are drawn roughly, see _arc)
    const at = `${this.CX} ${this.CY} ${this.U} ` + levels.map((L) => `${L.k} ${L.s} ${L.cx} ${L.cy}`).join(' ');
    this.moving = at !== this._at; this._at = at; this.rough = false;
    // while it moves, everything is drawn at the nearest eighth of an octave of the zoom, scaled about the view's centre
    // (CX, CY, where every plate's centre falls): the letters then take sizes the browser has already set from frame to
    // frame instead of new ones it would set anew, and the plate reads the canvas that much in (PlateRenderer, uWf).
    // At rest it is drawn exactly (rough asks for that drawing once the view stops)
    const s0 = levels[0]?.s || 1;
    this.drawScale = this.moving && this.quantize ? Math.pow(2, Math.round(Math.log2(s0) * 8) / 8) / s0 : 1;
    if (this.drawScale !== 1) this.rough = true;
    if (!this.def) return;
    c.textBaseline = 'middle';
    const now = performance.now() / 1000, live = new Set();
    levels.forEach((L, j) => {
      const n0 = this.loops * this.N + L.k;
      live.add(n0);
      let shown = this.shown.get(n0);
      if (!shown) this.shown.set(n0, (shown = new Map()));
      const P = this.def.plates[L.id];
      const k = L.s * this.U * this.drawScale;                // canvas px per plate unit (as drawn)
      const X = (x) => this.CX + (x - L.cx) * k;
      const Y = (y) => this.CY - (y - L.cy) * k;
      c.save();
      if (j > 0) {                                            // a nested plate shows only through its portal
        const [mx, my, mr, ma] = P.medal;
        c.beginPath();
        if (ma) c.rect(X(mx - mr * ma), Y(my + mr), 2 * mr * ma * k, 2 * mr * k);
        else c.arc(X(mx), Y(my), mr * k, 0, Math.PI * 2);
        c.clip();
      }
      const n = n0, todo = [], depth = this._depthIn(L), count = this.text[L.id].length;
      this.text[L.id].forEach((raw, idx) => {
        const it = raw.dyn ? this._dyn(raw, n) : raw;
        const px = it.size * k, seen = px * this.span;
        // its effect's progress (blue): the plate's depth, the words a little staggered down the list
        const f = Math.min(1, Math.max(0, (depth - 0.25 * (idx / count)) / 0.75)), fx = Math.round(255 * f);
        // while its effect still plays (drawn at a large word's size), it shows and arrives smaller: 3–4 px
        // early on, the usual 5–10 px (and READ_PX) once set, so the words at rest are as they were
        // (a plate seen through a portal shows its words a little later: a figure a few px tall there is a smudge on its art)
        const late = j > 0 ? 3 : 0;
        const vis = smooth(3 + late + 2 * f, 6 + late + 4 * f, seen) * (1 - smooth(260, 460, seen));
        if (vis < 0.01) return;
        // arriving: the clock starts when it can be read, a beat after the words before it
        let t0 = shown.get(idx);
        if (t0 == null) {
          if (seen < 4 + late + (READ_PX - 4) * f) return;
          t0 = now + Math.min(0.9, shown.size * 0.08);
          shown.set(idx, t0);
        }
        const p = Math.min(1, Math.max(0, (now - t0) / this._timing(it)));
        if (p < 1) this.animating = true;
        if (p <= 0) return;
        todo.push({ it, idx, px, vis, p, fx });
      });
      // every plaque first, so none covers the letters of another, then the words on them
      c.fillStyle = c.strokeStyle = PLAQUE;
      todo.forEach(({ it, px, vis, p }) => { c.globalAlpha = vis * smooth(0, 0.2, p); this._plaque(c, it, X, Y, k, px); });
      todo.forEach(({ it, idx, px, vis, p, fx }) => {
        let a = it.alpha * vis;
        const style = it.count ? 'count' : this.def.reveal || 'rise';
        const sz = Math.round(127 * Math.min(1, Math.max(0, Math.log2(px / 4) / 7)));   // letter size, 4–512 px
        this.caret = `rgb(255,${sz},${fx})`;
        this.fx = fx / 255;
        this.inkG = it.count || it.accent ? sz : 128 + sz;
        c.fillStyle = it.count || it.accent ? this.caret : `rgb(255,${128 + sz},${fx})`;
        c.font = `${it.weight} ${px}px ${it.family}`;
        if ('letterSpacing' in c) c.letterSpacing = `${px * it.track}px`;
        if (style === 'count') a *= smooth(0, 0.25, p);
        c.globalAlpha = a;
        if (it.arc) {
          this._arc(c, it, X(it.x), Y(it.y), it.arc.r * k, it.arc.a, k, p < 1 ? this._charVis(style, p, it.text.length, idx) : null);
          if (it.verdict != null) this._judged(c, it, X(it.x), Y(it.y), k, px);
          return;
        }
        const lh = px * it.lh, nl = it.lines.length;
        const y0 = Y(it.y) - (it.hang ? 0 : ((nl - 1) * lh) / 2);   // (a hung block's y is its first line's)
        if (y0 + nl * lh < -px || y0 - px > this.SIZE) return;
        this._lines(c, it, style, p, X(it.x), y0, lh, px, a, idx);
        if (it.verdict != null) this._judged(c, it, X(it.x), y0, k, px);
      });
      c.restore();
    });
    for (const n of this.shown.keys()) if (!live.has(n)) this.shown.delete(n);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = 1;
  }

  /**
   * Where a world that judges its words drew them: an inscription's `verdict` (0 friend, 1 unknown, 2 foe) for
   * all of it, or { word: verdict } for words of it. Each goes to `vboxes` as a box of canvas uv, padded by an em,
   * [x0, y0, x1, y1, verdict] (at most MAX_VERDICTS; the shader's uVBox). x, y: its first line's (or its arc's)
   * centre on the canvas.
   */
  _judged(c, it, x, y, k, px) {
    const S = this.SIZE, V = it.verdict, byWord = typeof V === 'object', e = px;
    const add = (x0, y0, x1, y1, v) => {
      if (v != null && this.vboxes.length < MAX_VERDICTS) this.vboxes.push([(x0 - e) / S, 1 - (y1 + e) / S, (x1 + e) / S, 1 - (y0 - e) / S, v]);
    };
    // the words of a run of letters (index → centre), each judged as its map says (or the whole as one)
    const words = (text, at) => {
      if (!byWord) { const a = at(0), b = at(text.length - 1); add(Math.min(a[0], b[0]) - px, Math.min(a[1], b[1]) - px, Math.max(a[0], b[0]) + px, Math.max(a[1], b[1]) + px, V); return; }
      for (const m of text.matchAll(/\S+/g)) {
        const v = V[m[0].toLowerCase()];
        if (v == null) continue;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = m.index; i < m.index + m[0].length; i++) { const [cx, cy] = at(i); x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy); }
        add(x0 - 0.5 * px, y0 - 0.6 * px, x1 + 0.5 * px, y1 + 0.6 * px, v);
      }
    };
    if (it.arc) {                                             // the letters' places, as _arc sets them
      const R = it.arc.r * k, ws = it.widths.map((w) => (w + it.size * it.track) * k), top = Math.sin(it.arc.a) >= 0;
      let th = it.arc.a + (top ? 1 : -1) * ws.reduce((s, w) => s + w, 0) / R / 2;
      const ms = ws.map((w) => { const m = top ? th - w / R / 2 : th + w / R / 2; th += (top ? -1 : 1) * w / R; return m; });
      words(it.text, (i) => [x + Math.cos(ms[i]) * R, y - Math.sin(ms[i]) * R]);
      return;
    }
    const lines = it.count ? [figure(it.count, 1)] : it.lines, lh = px * it.lh;
    lines.forEach((line, j) => {
      const W = this._width(c, it, line, px), left = x - W / 2, ly = y + j * lh;
      words(line, (i) => [left + (this._width(c, it, line.slice(0, i), px) + this._width(c, it, line.slice(0, i + 1), px)) / 2, ly]);
    });
  }

  /**
   * The dark plaque an inscription sits on, at its finished size: a rounded bar per line (a block's
   * bars overlap into one), or a band along an arc. The shader softens its edge and blots out the
   * engraving under it.
   */
  _plaque(c, it, X, Y, k, px) {
    if (it.arc) {
      const R = it.arc.r * k, half = (it.widths.reduce((t, w) => t + w + it.size * it.track, 0) * k) / R / 2;
      c.lineWidth = px * (this.def.fonts ? 2.6 : 2.1); c.lineCap = 'round';   // (a wash runs a little wider: art crowds curved text)
      c.beginPath(); c.arc(X(it.x), Y(it.y), R, -it.arc.a - half, -it.arc.a + half); c.stroke();
      return;
    }
    c.font = `${it.weight} ${px}px ${it.family}`;
    if ('letterSpacing' in c) c.letterSpacing = `${px * it.track}px`;
    const lines = it.count ? [figure(it.count, 1)] : it.lines, lh = px * it.lh, h = lh + px * 0.7, pad = px * 0.7;
    const y0 = Y(it.y) - (it.hang ? 0 : ((lines.length - 1) * lh) / 2);
    if (y0 + lines.length * lh < -h || y0 - h > this.SIZE) return;
    if (this.def.fonts) {                                     // a wash instead: overlapping blots along each line, laid unevenly
      const seed = it.x * 31.7 + it.y * 17.3;
      const hb = Math.max(h, 18);                             // (the shader reads the wash blurred: a fine line's would thin away)
      lines.forEach((line, i) => {
        const w = this._width(c, it, line, px) + 2 * pad, cy = y0 + i * lh, n = Math.max(2, Math.round(w / (1.6 * hb)));
        for (let j = 0; j < n; j++) {
          const s = seed + i * 5.1 + j * 1.7, u = n > 1 ? j / (n - 1) - 0.5 : 0;
          c.beginPath();
          c.ellipse(X(it.x) + u * Math.max(0, w - 1.6 * hb) + (hash(s, 1) - 0.5) * hb * 0.5, cy + (hash(s, 2) - 0.5) * hb * 0.25,
            hb * (1.05 + 0.5 * hash(s, 3)), hb * (0.55 + 0.14 * hash(s, 4)), (hash(s, 5) - 0.5) * 0.25, 0, Math.PI * 2);
          c.fill();
        }
      });
      return;
    }
    c.beginPath();
    lines.forEach((line, i) => {
      const w = this._width(c, it, line, px) + 2 * pad, x = X(it.x) - w / 2, y = y0 + i * lh - h / 2;
      if (c.roundRect) c.roundRect(x, y, w, h, h / 2); else c.rect(x, y, w, h);
    });
    c.fill();
  }

  /** Straight lines of an inscription, part-way (p) through arriving. */
  _lines(c, it, style, p, x, y0, lh, px, a, seed) {
    // painted words are brushed in along the reading direction as the view comes in, whatever their reveal (blue: see _wet)
    let wet = null, feather = 0;                               // (each line's wet front, see _put)
    if (this.def.fonts && style !== 'count') {
      const ws = it.lines.map((l) => this._width(c, it, l, px));
      feather = px * 3;
      let G = this.fx * (ws.reduce((t, w) => t + w, 0) + feather);
      wet = it.lines.map((_, i) => { const f = x - ws[i] / 2 + G; G -= ws[i]; return f; });
    }
    const put = (s, lx, y, i) => this._put(c, it, s, lx, y, px, wet ? wet[i] : null, feather);
    if (style === 'paint') {
      c.textAlign = 'left';
      it.lines.forEach((line, i) => put(line, x - this._width(c, it, line, px) / 2, y0 + i * lh, i));
      return;
    }
    if (p >= 1 || style === 'count') {
      c.textAlign = 'center';
      if (style === 'count') {
        const e = 1 - Math.pow(1 - p, 3);                     // fast, then settling onto the value
        let s = figure(it.count, e);
        // a world may have its figures flicker through wrong values until its effect has played (by scroll)
        if (this.def.flicker && this.fx < 1) s = s.replace(/\d/g, (d) => (Math.random() < (1 - this.fx) * 0.8 ? String((Math.random() * 10) | 0) : d));
        if (this.def.fonts) { const w = this._width(c, it, s, px), f = px * 3; this._put(c, it, s, x, y0, px, x - w / 2 + this.fx * (w + f), f); }
        else this._put(c, it, s, x, y0, px);
      } else it.lines.forEach((line, i) => put(line, x, y0 + i * lh, i));
      return;
    }
    // part-set lines keep the place their finished line will take, so nothing shifts as they fill
    c.textAlign = 'left';
    const left = (line) => x - this._width(c, it, line, px) / 2;
    if (style === 'type') {
      let rest = p * it.lines.reduce((t, l) => t + l.length, 0);
      for (let i = 0; i < it.lines.length && rest > 0; i++) {
        const line = it.lines[i], m = Math.min(line.length, Math.ceil(rest));
        const part = line.slice(0, m), lx = left(line), y = y0 + i * lh;
        put(part, lx, y, i);
        rest -= line.length;
        if (rest <= 0) {                                       // the caret, in the accent (a world may give it a shape)
          const cx = lx + this._width(c, it, part, px) + px * 0.08;
          c.save(); c.fillStyle = c.strokeStyle = this.caret; c.globalAlpha = a * 0.9;
          if (this.def.caret === 'spider') this._spider(c, cx + px * 0.3, y, px);
          else c.fillRect(cx, y - px * 0.42, Math.max(1, px * 0.09), px * 0.84);
          c.restore();
        }
      }
    } else if (style === 'decode') {
      it.lines.forEach((line, i) => {
        let out = '';
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          const at = 0.75 * hash(seed + i * 7.1, j) + 0.25 * (j / line.length);
          out += ch === ' ' || p >= at ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        put(out, left(line), y0 + i * lh, i);
      });
    } else {                                                    // rise
      const nl = it.lines.length;
      it.lines.forEach((line, i) => {
        const lp = smooth(0, 1, (p * (0.75 + 0.25 * nl) - 0.25 * i) / 0.75);
        if (lp <= 0) return;
        c.globalAlpha = a * lp;
        put(line, left(line), y0 + i * lh + (1 - lp) * 0.6 * lh, i);
      });
      c.globalAlpha = a;
    }
  }

  /**
   * Set one line, in paint whose wet front is at canvas x `front` (see _wet; null: in the fill as it is). While
   * the view moves (a `rough` drawing, see _arc) it is shaped at the nearest quarter-octave size, which the
   * canvas keeps from frame to frame, and scaled to px: shaping anew at every size is most of what drawing the
   * words costs while zooming. At rest it is set exactly.
   */
  _put(c, it, s, x, y, px, front = null, feather = 0) {
    if (!this.moving) {
      if (front != null) c.fillStyle = this._wet(c, front, feather);
      c.fillText(s, x, y);
      return;
    }
    this.rough = true;
    const b = quarter(px), k = px / b;
    c.save();
    c.translate(x, y); c.scale(k, k);
    c.font = `${it.weight} ${b}px ${it.family}`;
    if ('letterSpacing' in c) c.letterSpacing = `${b * it.track}px`;
    if (front != null) c.fillStyle = this._wet(c, (front - x) / k, feather / k);
    c.fillText(s, 0, 0);
    c.restore();
  }

  /**
   * A line's width at px, in the font the context is set to. Shaping text is costly, and while the view moves
   * every frame has new sizes: then (a `rough` drawing, see _arc) it is scaled from the width measured at the
   * nearest quarter-octave size (not from one size for all: a face with an optical-size axis changes its
   * proportions with size). At rest it is measured exactly, and kept for the frames that draw the same again.
   */
  _width(c, it, s, px) {
    const W = this._widths;
    if (W.size > 4000) W.clear();
    if (!this.moving) {
      const key = `${c.font}|${c.letterSpacing}|${s}`;
      let w = W.get(key);
      if (w == null) { w = c.measureText(s).width; W.set(key, w); }
      return w;
    }
    this.rough = true;
    const b = quarter(px), key = `${it.weight} ${b} ${it.family} ${it.track}|${s}`;
    let w = W.get(key);
    if (w == null) {
      const font = c.font, ls = c.letterSpacing;
      c.font = `${it.weight} ${b}px ${it.family}`;
      if ('letterSpacing' in c) c.letterSpacing = `${b * it.track}px`;
      w = c.measureText(s).width / b;
      W.set(key, w);
      c.font = font;
      if ('letterSpacing' in c) c.letterSpacing = ls;
    }
    return w * px;
  }

  /**
   * Paint's fill for a line whose wet front is at canvas x xf: blue is how long the paint there has had to
   * dry, 255 (dry) a `feather` behind the front falling to 10 at it, and 0 ahead (not painted yet). The
   * shader paints, feathers and dries the letters by it; red and green are the letter's marks as usual.
   */
  _wet(c, xf, feather) {
    const ink = (b) => `rgb(255,${this.inkG},${b})`;
    if (this.fx >= 1) return ink(255);
    const g = c.createLinearGradient(xf - feather, 0, xf + 1, 0);
    g.addColorStop(0, ink(255)); g.addColorStop(0.97, ink(10)); g.addColorStop(1, ink(0));
    return g;
  }

  /** A tiny spider for a caret: abdomen, head and eight legs that step as it walks along the line. */
  _spider(c, x, y, px) {
    const t = performance.now() / 1000;
    c.lineWidth = Math.max(1, px * 0.06); c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, j = i % 4, step = Math.sin(t * 14 + j * 1.7 + (side > 0 ? Math.PI : 0)) * 0.06;
      const a = (j - 1.5) * 0.5 + step;                         // splayed from front to back
      const kx = x + px * (0.05 + 0.22 * Math.sin(a + 0.2)), ky = y + side * px * 0.2;
      c.moveTo(x + px * 0.05 * (1.5 - j) * 0.3, y);
      c.lineTo(kx, ky);
      c.lineTo(kx + px * 0.16 * Math.sin(a), ky + side * px * 0.14);
    }
    c.stroke();
    c.beginPath(); c.ellipse(x - px * 0.16, y, px * 0.19, px * 0.15, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(x + px * 0.08, y, px * 0.09, 0, Math.PI * 2); c.fill();
  }

  /** For text on a circle: what letter i shows part-way through arriving, and how strongly (null = none yet). */
  _charVis(style, p, len, seed) {
    if (style === 'type') return (ch, i) => (i < p * len ? [ch, 1] : null);
    if (style === 'decode') return (ch, i) => (ch === ' ' || p >= 0.75 * hash(seed, i) + 0.25 * (i / len) ? [ch, 1] : [GLYPHS[(Math.random() * GLYPHS.length) | 0], 0.6]);
    return (ch, i) => { const q = smooth(0, 1, p * 1.6 - (i / len) * 0.6); return q > 0 ? [ch, q] : null; };
  }

  /**
   * Text on a circle: over the top it reads clockwise, under the bottom anticlockwise, upright either way.
   * Every letter is turned its own way, and a turned letter is costly to draw anew: at rest the canvas keeps
   * them, but while the view moves their sizes change every frame and an arc of a few hundred letters costs
   * tens of ms. So while it moves (`moving`, see draw) the letters are set upright in an atlas, in the same
   * fill, and placed from it turned: within about a pixel of the true letters, at a fraction of the cost.
   * Such a drawing is `rough`; once the view rests the canvas is drawn again exactly (Pilot).
   */
  _arc(c, it, cx, cy, R, a, k, vis = null) {
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.textAlign = 'center';
    const ws = it.widths.map((w) => (w + it.size * it.track) * k);
    const total = ws.reduce((x, y) => x + y, 0) / R;
    const top = Math.sin(a) >= 0;
    const alpha = c.globalAlpha;
    // the atlas: a cell per letter, its advance plus room for overhang (script faces reach well past theirs)
    const px = it.size * k, M = this.SIZE, S = ATLAS, pad = Math.ceil(px * 1.6), ch2 = Math.ceil(px * 2.6);
    const fast = this.moving && 2 * ch2 <= S;
    let A = null, ax = 0, ay = 0;
    const q = [];
    if (fast) {
      // (Safari before 16.4 has no 2D OffscreenCanvas: a detached canvas does the same)
      A = this._atlas || (this._atlas = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(S, S) : Object.assign(document.createElement('canvas'), { width: S, height: S })).getContext('2d'));
      A.font = c.font; A.textAlign = 'center'; A.textBaseline = 'middle';
      this.rough = true;
    }
    const place = () => {                                       // the letters set so far, from the atlas, turned
      for (const g of q) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.translate(g.x, g.y);
        c.rotate(g.r);
        c.globalAlpha = g.a;
        c.drawImage(A.canvas, g.sx, g.sy, g.w, ch2, -g.w / 2, -ch2 / 2, g.w, ch2);
      }
      q.length = 0; A.clearRect(0, 0, S, S); ax = ay = 0;
    };
    let th = top ? a + total / 2 : a - total / 2;
    [...it.text].forEach((ch, i) => {
      const step = ws[i] / R;
      const m = top ? th - step / 2 : th + step / 2;
      th = top ? th - step : th + step;
      const v = vis ? vis(ch, i) : null;
      if (vis && !v) return;
      const x = cx + Math.cos(m) * R, y = cy - Math.sin(m) * R;
      const r = top ? Math.atan2(Math.cos(m), Math.sin(m)) : Math.atan2(-Math.cos(m), -Math.sin(m));
      const fill = this.def.fonts ? `rgb(255,${this.inkG},${Math.round(255 * Math.min(1, Math.max(0, (this.fx * (it.text.length + 3) - i) / 3)))})` : null;   // (painted letter by letter, as _wet)
      if (!fast) {
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.translate(x, y);
        c.rotate(r);
        c.globalAlpha = alpha * (v ? v[1] : 1);
        if (fill) c.fillStyle = fill;
        c.fillText(v ? v[0] : ch, 0, 0);
        return;
      }
      if (x < -2 * px || x > M + 2 * px || y < -2 * px || y > M + 2 * px) return;   // (off the canvas)
      const w = Math.ceil(ws[i]) + pad;
      if (ax + w > S) { ax = 0; ay += ch2; }
      if (ay + ch2 > S) place();
      A.fillStyle = fill || c.fillStyle;
      A.fillText(v ? v[0] : ch, ax + w / 2, ay + ch2 / 2);
      q.push({ x, y, r, a: alpha * (v ? v[1] : 1), sx: ax, sy: ay, w });
      ax += w;
    });
    if (fast) place();
    c.globalAlpha = alpha;
    c.setTransform(1, 0, 0, 1, 0, 0);
  }

  /**
   * How much colour plate k of the chain has taken on: none on the first plate, rising through
   * the first loop (by how deep its home sits, in loops), full from then on.
   */
  depth(k) {
    const x = Math.log(this.homes[k].s / this.homes[0].s) / Math.log(this.loopS) + this.loops;   // (a phone's first home is nearer than 1)
    return Math.pow(Math.min(1, Math.max(0, x)), 0.6);
  }

  /** What a screen reader hears on arriving at plate k. */
  announce(k) {
    const P = this.def.plates[k % this.N];
    return P.note ? `${P.title}. ${P.note}` : P.title;
  }
}

// ─── PlateRenderer ──────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  in vec3 position; in vec2 uv;
  out vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// The words as shapes: a jump flood over the canvas's letters, run only when it redraws. Seeds are the
// texels on a letter's edge, each moved onto the edge itself (where the ink crosses half, along its
// gradient); each pass hands every texel the nearest seed its neighbours (at a halving step) know of;
// the last turns that into a signed distance, plus the nearest letter's marks.
const FIELD = 1024;                          // texels across the canvas
const REACH = 64;                            // how far (texels) the flood looks from a letter; beyond is "far"
// a texel's ink: the most of the four canvas pixels under it, so a stroke thinner than a texel never drops out
const INK_AT = /* glsl */ `
  float inkAt(vec2 uv) {
    float m = 0.0;
    for (int i = 0; i < 4; i++) { vec4 t = textureLod(uText, uv + (vec2(i & 1, i >> 1) - 0.5) * 0.5 * uTexel, 0.0); m = max(m, t.a * t.r); }
    return m;
  }
`;
const FIELD_SEED = /* glsl */ `
  precision highp float;
  uniform sampler2D uText; uniform float uTexel;
  in vec2 vUv; out vec4 o;
${INK_AT}
  void main() {
    float c = inkAt(vUv);
    float r = inkAt(vUv + vec2(uTexel, 0.0)), l = inkAt(vUv - vec2(uTexel, 0.0));
    float u = inkAt(vUv + vec2(0.0, uTexel)), d = inkAt(vUv - vec2(0.0, uTexel));
    bool in0 = c >= 0.5;
    if ((r >= 0.5) == in0 && (l >= 0.5) == in0 && (u >= 0.5) == in0 && (d >= 0.5) == in0) { o = vec4(-1.0); return; }
    vec2 g = vec2(r - l, u - d) / (2.0 * uTexel);                       // ink per uv
    vec2 off = g * (0.5 - c) / max(dot(g, g), 1e-6);
    o = vec4(vUv + off * min(1.0, uTexel / max(length(off), 1e-9)), 0.0, 1.0);
  }
`;
const FIELD_STEP = /* glsl */ `
  precision highp float;
  uniform sampler2D uSeed; uniform float uStep;
  in vec2 vUv; out vec4 o;
  void main() {
    vec2 best = vec2(-1.0); float bd = 1e9;
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
      vec2 s = texture(uSeed, vUv + vec2(i, j) * uStep).xy;
      float d = distance(s, vUv);
      if (s.x >= 0.0 && d < bd) { bd = d; best = s; }
    }
    o = vec4(best, 0.0, 1.0);
  }
`;
const FIELD_OUT = /* glsl */ `
  precision highp float;
  uniform sampler2D uSeed; uniform sampler2D uText; uniform float uTexel; uniform float uCanvas;
  in vec2 vUv; out vec4 o;
  float sat(float x) { return clamp(x, 0.0, 1.0); }
${INK_AT}
  void main() {
    vec2 s = texture(uSeed, vUv).xy;
    float ink = inkAt(vUv), px = uTexel * uCanvas;                   // canvas px per texel
    if (s.x < 0.0) { o = vec4((ink >= 0.5 ? -1.0 : 1.0) * ${REACH.toFixed(1)} * px, 1.0, 0.0, 0.0); return; }
    float sd = (ink >= 0.5 ? -1.0 : 1.0) * distance(s, vUv) * uCanvas;
    // the letter's marks, read a little blurred so a seed just outside its stroke still sees it (the plaque is all zero)
    vec4 n = textureLod(uText, s, 1.5);
    if (n.r < 0.01) { o = vec4(sd, 1.0, 0.0, 0.0); return; }
    float kind = n.g / n.r, acc = kind < 0.5 ? 1.0 : 0.0;
    float size = 4.0 * exp2(7.0 * sat(2.0 * (kind - 0.5 * (1.0 - acc))));
    o = vec4(sd, sat(n.b / n.r), acc, size);                         // distance, the letter's progress, accent mark, size (px)
  }
`;

// Painted words (a world with `fonts`; World._wet paints them in by scroll, and the field's y is how long the
// paint there has had to dry): the wet front feathers and bleeds a little past the letter, then dries back to it;
// a dry brush leaves streaks along the stroke; pigment pools darker at the stroke's edge and at the front. Small
// letters are painted calmer (too few pixels for a ragged front to read as paint). A world's textFx adds its
// own touch on top, reading the same paint age from paintAge()
const PAINT_GLSL = /* glsl */ `
  float paintAge(vec2 uv, vec4 w0) { vec4 T = texture(uText, uv); return T.r > 0.02 ? T.b / T.r : w0.y; }   // 0 not yet … 1 dry
  void paintWords(vec2 uv, inout float txt, inout vec3 tc) {
    vec4 w0 = words(uv);
    float em = max(w0.w, 8.0);
    if (w0.x > 0.5 * em + 2.0) return;                       // (no bleed reaches this far from a word)
    vec2 P = uv * uCanvas;
    float a = paintAge(uv, w0);
    float painted = smoothstep(0.0, 0.05, a);
    float calm = mix(0.35, 1.0, smoothstep(10.0, 24.0, em));
    float wet = (1.0 - smoothstep(0.05, 0.9, a)) * painted * calm;
    float big = smoothstep(16.0, 48.0, em);                  // (texture shows more on large letters)
    // dry brush: streaks running along the stroke, gaps where the bristles ran dry
    float streak = noise3(vec3(P.x / (0.9 * em), P.y / (0.06 * em + 0.5), 2.3));
    float dry = mix(1.0, smoothstep(0.12, 0.5, streak), mix(0.12, 0.42, big) * (1.0 - wet));
    // the wet edge: past the letter by a ragged margin, wide while wet, a hair once dry
    float j = noise3(vec3(P / (0.22 * em + 1.0), 7.0)) - 0.5;
    float bleedW = (0.04 + 0.12 * wet) * em + 0.6;
    float bleed = (1.0 - smoothstep(0.0, bleedW, w0.x + j * (0.06 + 0.14 * wet) * em)) * step(0.0, w0.x) * (0.1 + 0.26 * wet);
    // pooling: denser pigment at the stroke's edge, and in the band at the front
    float edge = smoothstep(-0.16 * em - 0.5, 0.0, w0.x) * (1.0 - smoothstep(0.0, 1.0, w0.x));
    float pool = max(edge * 0.55, wet * smoothstep(0.35, 0.05, a) * 0.6);
    txt = max(txt * dry, bleed) * painted;
    // the colour: the light ink, granulating a little (the world's colours deeper); pooled pigment deeper
    float gran = noise3(vec3(P / (0.5 * em + 2.0), 4.4));
    vec3 hue = mix(uPal[2], uPal[1], smoothstep(0.35, 0.75, gran));
    hue /= max(max(hue.r, hue.g), max(hue.b, 1e-3));
    tc *= mix(vec3(1.0), hue, 0.55 * gDepth) * (0.93 + 0.14 * gran);
    tc *= 1.0 - 0.3 * pool;
  }
`;

// The wash at rest: once the words it lies under are dry it keeps moving, a slow domain-warped drift through its
// edge, body and outer bleed, with translucent ripples that let the engraving glint through; never right behind
// the letters, where it stays as dark as ever. A world gives it its own character (`wash`, over these):
// scale (px) and speed of the drift, flow (px/s), warp, ripple (how clear a ripple runs), bands (ripples per unit
// of the drift), style (0 ripples along the drift's own contours, 1 bands rolling up the page, 2 pulses out from
// the words), sheen (an oil film's colours), music (it swells with the music)
const WASH = { scale: 60, speed: 0.05, flow: [0, 0], warp: 1.2, ripple: 0.2, bands: 3, style: 0, sheen: 0, music: 0 };
const washGlsl = (w) => {
  const W = { ...WASH, ...w }, f = (x) => Number(x).toFixed(4);
  return `const float WASH_SCALE = ${f(W.scale)}, WASH_SPEED = ${f(W.speed)}, WASH_WARP = ${f(W.warp)}, WASH_RIPPLE = ${f(W.ripple)};
  const float WASH_BANDS = ${f(W.bands)}, WASH_SHEEN = ${f(W.sheen)}, WASH_MUSIC = ${f(W.music)};
  const vec2 WASH_FLOW = vec2(${f(W.flow[0])}, ${f(W.flow[1])});
  const int WASH_STYLE = ${W.style | 0};`;
};

function fragment(def) {
  const ids = def.plates.map((_, i) => `  if (id == ${i}) return plate${i}(q, g);`).join('\n');
  return /* glsl */ `
  precision highp float; precision highp int;
  uniform sampler2D uText; uniform sampler2D uField; uniform float uCanvas;
  uniform float uMusic;        // how loud the world's music is now, 0–1, or −1 when none is playing (PlateRenderer.setMusic)
  uniform float uTime; uniform vec2 uPointer;
  uniform vec3 uArt; uniform vec2 uArtV; uniform float uArtT;   // the art's pointer (see PlateRenderer.render)
  uniform vec2 uTilt;                                         // a phone's tilt (−1..1; 0 elsewhere, see Pilot._tilt)
  uniform vec3 uWall; uniform float uPx; uniform float uBright;
  uniform int uLevels; uniform int uId[${MAX_LEVELS}]; uniform vec3 uView[${MAX_LEVELS}]; uniform vec4 uPortal[${MAX_LEVELS}];
  uniform float uDepth[${MAX_LEVELS}]; uniform float uLoop[${MAX_LEVELS}]; uniform float uAge[${MAX_LEVELS}]; uniform vec3 uPal[4];
  in vec2 vUv;
  // drawn straight onto the screen (uScreen, see PlateRenderer.render): a pixel's uv is where the face's own
  // perspective puts it (uH, from drawing-buffer pixels), so the plate is shaded once per pixel it shows
  uniform float uScreen; uniform mat3 uH;
  vec2 plateUv() { if (uScreen < 0.5) return vUv; vec3 h = uH * vec3(gl_FragCoord.xy, 1.0); return h.xy / h.z; }
  #define vUv gUv
  vec2 gUv;
  // where the words' canvas holds this pixel's words: while the view moves the canvas is drawn at the nearest eighth
  // of an octave of the zoom (World.draw: the letters keep sizes the browser has already set, which is most of what
  // drawing them costs), uWf times the true size about the view's centre uWc, so it is read that much in; 1 at rest
  uniform vec2 uWc; uniform float uWf;
  vec2 wUv;
  out vec4 outColor;
  float gAge;                  // seconds since the plate being drawn came into view (plates may animate in by it)
  int gPlate;                  // which plate is being drawn (a world's text effect may differ by plate)
  float gDepth;                // … and how much of its world's colour it has taken on (0 on the white surface)
  vec2 gPtr, gPtrV; float gPtrOn;   // the pointer on that plate (plate units), its velocity (units/s), how present (0–1)
${SDF_GLSL}
  // the words as shapes (the text field, see FIELD): x = signed distance to the nearest letter's edge in
  // canvas px (negative inside), y = that letter's progress (0 arriving … 1 at rest), z = its accent mark,
  // w = its size (canvas px; 0 far from any)
  vec4 words(vec2 uv) { return texture(uField, uv); }
  // how much of a plate's art may show here beside the words: bright line work right against letters (where a
  // wash is too fine to hold it back) steps back by s within k ems of them; 1 elsewhere. A plate calls it where it
  // lays bright lines under words
  float roomForWords(float k, float s) {
    vec4 w = words(wUv);
    if (w.w <= 0.0) return 1.0;
    return 1.0 - s * (1.0 - smoothstep(0.4, k, w.x / max(w.w, 4.0)));
  }
  // a letter size (w) held to half-octave steps, at least 14 px, for sizing a lattice: the size read from the
  // field wobbles a little across a word, and a lattice sized by it would shift cell to cell
  float latticeSize(float w) { return exp2(floor(log2(max(w, 14.0)) * 2.0 + 0.5) * 0.5); }
${def.fonts ? `#define PAINT\n${PAINT_GLSL}\n  ${washGlsl(def.wash)}` : ''}
${def.glsl}
${def.verdicts ? /* glsl */ `
  // the judgement on the words here (World._judged): 0 friend, 1 unknown, 2 foe; −1 where none is given
  uniform int uVN; uniform vec4 uVBox[${MAX_VERDICTS}]; uniform float uVId[${MAX_VERDICTS}];
  float verdictAt(vec2 uv) {
    for (int i = 0; i < ${MAX_VERDICTS}; i++) {
      if (i >= uVN) break;
      vec4 b = uVBox[i];
      if (uv.x > b.x && uv.y > b.y && uv.x < b.z && uv.y < b.w) return uVId[i];
    }
    return -1.0;
  }` : ''}
${def.textFx ? `#define TEXT_FX\n${def.textFx}` : ''}

  // ── colour and life with depth (see the header) ───────────────────────────
  vec3 fullTone(vec3 c) { return c / max(max(c.r, c.g), max(c.b, 1e-3)); }   // a colour at full brightness

  vec3 depthColour(float lum, vec2 q, float loopN) {
    bool odd = mod(loopN, 2.0) > 0.5;                                    // each loop swaps mid and accent
    vec3 mid = odd ? uPal[3] : uPal[1], acc = odd ? uPal[1] : uPal[3];
    vec3 ramp = lum < 0.5 ? mix(uPal[0], mid, lum * 2.0) : mix(mid, uPal[2], lum * 2.0 - 1.0);
    float field = noise3(vec3(q * 1.7, loopN * 3.71 + uTime * 0.025));    // where the accent gathers
    return mix(ramp, acc, smoothstep(0.56, 0.82, field) * 0.72);
  }

  // one mote in cell id of size c (plate units), or none; its place drifts slowly
  bool moteAt(vec2 id, float c, float amt, float seed, out vec2 at, out float h) {
    h = hash3(vec3(id, seed));
    if (h > amt * 0.3) return false;
    vec2 off = vec2(hash3(vec3(id, seed + 1.3)), hash3(vec3(id, seed + 2.7))) - 0.5;
    off = off * 0.6 + 0.12 * vec2(sin(uTime * 0.31 + h * 40.0), cos(uTime * 0.27 + h * 33.0));
    at = (id + 0.5 + off) * c;
    return true;
  }
  // motes in three octaves (finer ones fading in as you zoom, the largest fading out) → (glow, colour pick)
  vec2 motes(vec2 q, float g, float amt, float loopN) {
    float L = log2(g * 52.0), fl = floor(L), t = L - fl;
    float glow = 0.0, pick = 0.0;
    for (int o = 0; o < 3; o++) {
      float c = exp2(fl + float(o)), w = o == 0 ? 1.0 - t : o == 2 ? t : 1.0;
      float seed = 11.0 + loopN * 5.0 + (fl + float(o)) * 1.618;
      vec2 id = floor(q / c), at; float h;
      if (!moteAt(id, c, amt, seed, at, h)) continue;
      vec2 d = (q - at) / g;                                             // in pixels
      float tw = 0.55 + 0.45 * sin(uTime * (0.9 + h * 2.3) + h * 50.0);
      float core = exp(-dot(d, d) / 2.6);
      float spike = (exp(-abs(d.x) * 0.8 - d.y * d.y * 0.6) + exp(-abs(d.y) * 0.8 - d.x * d.x * 0.6)) * step(0.6, h / max(amt * 0.3, 1e-3));
      float m = (core + 0.4 * spike) * tw * w;
      if (m > glow) { glow = m; pick = h / max(amt * 0.3, 1e-3); }
    }
    return vec2(glow, pick);
  }
  // past the first loop, threads join a mote to its right and upper neighbours: constellations
  float threads(vec2 q, float g, float amt, float loopN) {
    float c = exp2(floor(log2(g * 52.0)) + 1.0);
    float seed = 11.0 + loopN * 5.0 + (floor(log2(g * 52.0)) + 1.0) * 1.618;
    vec2 id0 = floor(q / c);
    float best = 9.0;
    for (int j = -1; j <= 0; j++) for (int i = -1; i <= 0; i++) {
      vec2 id = id0 + vec2(i, j), a, b, e; float h, hb, he;
      if (!moteAt(id, c, amt, seed, a, h)) continue;
      if (moteAt(id + vec2(1.0, 0.0), c, amt, seed, b, hb)) best = min(best, sdSeg(q, a, b));
      if (moteAt(id + vec2(0.0, 1.0), c, amt, seed, e, he)) best = min(best, sdSeg(q, a, e));
    }
    return ink(best, g * 0.6, g);
  }
  float plate(int id, vec2 q, float g) {
${ids}
    return 0.0;
  }
  void main() {
    gUv = plateUv();
    wUv = uWc + (vUv - uWc) * uWf;
    vec2 a = (vUv - uWall.xy) / uWall.z;                     // wall-screen units
    int lv = 0;
    for (int i = 1; i < ${MAX_LEVELS}; i++) {
      if (i >= uLevels) break;
      vec3 V = uView[i - 1]; vec4 P = uPortal[i - 1];
      vec2 d = V.xy + a / V.z - P.xy;
      bool inside = P.w > 0.0 ? (abs(d.x) < P.z * P.w && abs(d.y) < P.z) : length(d) < P.z;
      if (inside) lv = i; else break;
    }
    vec3 V = uView[lv];
    vec2 q = V.xy + a / V.z;
    gAge = uAge[lv]; gPlate = uId[lv]; gDepth = uDepth[lv];
    gPtr = V.xy + uArt.xy / V.z; gPtrV = uArtV / V.z; gPtrOn = uArt.z;
    float g = uPx / V.z;
    float lum = plate(uId[lv], q, g);
    float amt = uDepth[lv], loopN = uLoop[lv];
    // the words: their plaques (canvas alpha, softened) blot out the engraving, then the letters (red) on them
    float halo = textureLod(uText, wUv, 2.0).a;
    vec4 T = texture(uText, wUv);
    // (lifts the edges of fine strokes; a large letter's strokes are wide enough to show their true edge, which
    // reads sharper: the lift eases off from 14 to 40 px, by the nearest letter's size in the words' field)
    float txt = pow(T.a * T.r, mix(0.75, 1.0, smoothstep(14.0, 40.0, words(wUv).w)));
    float clear = 1.0 - 0.95 * smoothstep(0.03, 0.45, halo);
    vec3 washC = vec3(0.0);
#ifdef PAINT
    // a watercolour wash, not a plaque: the blots' shape (canvas alpha) bled wider and ragged by noise, darker where
    // the pigment gathered at its drying edge, on a faint paper grain; ink-grey on the surface, the world's deep
    // colour (with a little of its others bleeding in) deeper. Only near a blot (the canvas's coarsest mips: the wash
    // and its fringe reach well under one of their texels), so the rest of the plate pays nothing for it
    if (textureLod(uText, wUv, 7.0).a > 0.0005) {
      vec2 P = wUv * uCanvas;
      // at rest (see WASH): how settled the words here are (0 while they paint in or unpaint: the wash as it was),
      // and the drift, rolling through a warp of itself
      vec4 wr = words(wUv);
      float settle = smoothstep(0.85, 1.0, paintAge(wUv, wr)) * smoothstep(0.85, 1.0, wr.y);
      float em = max(wr.w, 8.0);
      float core = 1.0 - smoothstep(0.35 * em, 0.9 * em, wr.x);              // right behind the letters: never thinned
      float near = 1.0 - smoothstep(0.8 * em, 1.6 * em, wr.x);               // … and its edge held still round them
      float lt = uTime * WASH_SPEED, swell = mix(1.0, 0.5 + (uMusic < 0.0 ? 0.5 : uMusic), WASH_MUSIC);
      vec2 wq = (P - WASH_FLOW * uTime) / WASH_SCALE;
      vec2 ww = vec2(noise3(vec3(wq * 0.7, lt)), noise3(vec3(wq * 0.7 + 5.2, lt + 3.0))) - 0.5;
      float live = noise3(vec3(wq + WASH_WARP * ww, lt * 1.6 + 7.0));
      float roam = settle * (1.0 - near);
      // the blots' shape looked up through a slow warp, so its edge wanders instead of following them
      vec2 wv = 0.6 * (vec2(noise3(vec3(P / 70.0, 1.3)), noise3(vec3(P / 70.0, 6.1))) - 0.5)   // (one octave: the warp is broad)
              + roam * 0.6 * swell * ww;
      float n1 = fbm3(vec3(P / 40.0, 3.1)) + roam * 0.5 * (live - 0.5), n2 = noise3(vec3(P / 9.0, 5.7));
      float h = mix(textureLod(uText, wUv + wv * 30.0 / uCanvas, 2.0).a, textureLod(uText, wUv + wv * 50.0 / uCanvas, 3.5).a, 0.5)
              + 0.16 * (n1 - 0.5) + 0.07 * (n2 - 0.5);
      float wash = smoothstep(0.05, 0.3, h);
      float rim = smoothstep(0.05, 0.13, h) * (1.0 - smoothstep(0.13, 0.3, h));   // where the pigment dried at the edge
      float grain = noise3(vec3(P / 1.7, 9.1));
      float bloom = smoothstep(0.35, 0.75, n1);                                  // paler pools inside, where water ran back
      // and a pale outer bleed, so what glows just beyond the wash cannot flood back over the words
      float fringe = smoothstep(0.0, 0.12, textureLod(uText, wUv + wv * 80.0 / uCanvas, 5.0).a + 0.05 * (n1 - 0.5));
      clear = (1.0 - wash * (0.965 + 0.03 * rim)) * (1.0 - 0.55 * fringe);
      float bleedA = smoothstep(0.55, 0.8, noise3(vec3(P / 70.0, 2.2))), bleedB = smoothstep(0.6, 0.85, noise3(vec3(P / 60.0, 8.4)));
      vec3 deep = uPal[0] * (1.0 - 0.45 * rim) + uPal[3] * 0.035 * bleedA + uPal[1] * 0.03 * bleedB;
      vec3 wc = mix(vec3(0.0045 + 0.004 * bloom) * (1.0 - 0.6 * rim), deep * (0.85 + 0.3 * bloom), uDepth[lv]);
      washC = wc * wash * (0.75 + 0.5 * grain);
      if (settle > 0.0) {
        // its ripples, where the pigment runs thin (never in the core)
        float band = WASH_STYLE == 1 ? fract((P.y + 24.0 * ww.x) / (WASH_SCALE * WASH_BANDS) - uTime * WASH_SPEED * 3.0)
                   : WASH_STYLE == 2 ? fract(wr.x / (em * WASH_BANDS) - uTime * WASH_SPEED * 5.0)
                   : fract(live * WASH_BANDS + lt);
        float rip = (1.0 - smoothstep(0.0, 0.14, abs(band - 0.5))) * settle * (1.0 - core) * swell;
        if (WASH_STYLE == 2) rip *= 0.6 + 0.4 * sin(uTime * 1.3);                 // (pulses, coming and going)
        clear = min(clear + WASH_RIPPLE * rip * wash, 1.0);
        washC *= (1.0 - 0.5 * rip) * (1.0 + settle * 0.3 * swell * (live - 0.5));   // and its body breathes,
        washC += mix(vec3(0.012), fullTone(uPal[0]) * 0.02, uDepth[lv])             // pale wisps on its crests
               * smoothstep(0.5, 0.85, live) * settle * swell * (1.0 - core) * wash;
        if (WASH_SHEEN > 0.0) {                                                  // an oil film's colours, sliding over it
          float hh = fract(live * 2.0 + lt);
          vec3 iri = hh < 0.333 ? mix(uPal[1], uPal[3], hh * 3.0) : hh < 0.667 ? mix(uPal[3], uPal[2], hh * 3.0 - 1.0) : mix(uPal[2], uPal[1], hh * 3.0 - 2.0);
          washC += fullTone(iri) * 0.008 * WASH_SHEEN * settle * (1.0 - core) * wash * smoothstep(0.3, 0.7, live);
        }
      }
    }
#endif
    // the words take on the world's colour with depth as the lines do (white on the surface):
    // body in its light tone, figures and the caret in its accent; a slow glint runs across them
    bool oddL = mod(loopN, 2.0) > 0.5;
    vec3 body = mix(vec3(1.0), mix(vec3(1.0), fullTone(uPal[2]), 0.6), amt);
    vec3 accent = mix(vec3(1.0), fullTone(oddL ? uPal[1] : uPal[3]), amt);
    float acc = 1.0 - smoothstep(0.45, 0.55, T.g / max(T.r, 1e-3));
#if defined(TEXT_FX) || defined(PAINT)
    acc = words(wUv).z;                                       // (the nearest letter's, so a word's effect keeps its colour)
#endif
    vec3 tc = mix(body, accent, acc);
    tc = mix(tc, vec3(1.0), sat(0.62 - dot(tc, vec3(0.2126, 0.7152, 0.0722))));   // no colour too dark to read
    float sweep = exp(-pow((fract(dot(q, vec2(0.55, 0.835)) * 0.32 - uTime * 0.055) - 0.5) * 10.0, 2.0));
    tc *= 0.64 * (1.0 + 0.3 * sweep);
#ifdef PAINT
    paintWords(wUv, txt, tc);
#endif
#ifdef TEXT_FX
    // a world may reshape its words by their field (kpx: canvas px per plate unit); each effect ends as the plain text
    textFx(wUv, q, V.z * uWall.z * uCanvas * uWf, txt, tc, clear);
#endif
    lum *= clear;
    vec3 rgb = vec3(lum);
    if (amt > 0.001) {
      rgb = lum * mix(vec3(1.0), fullTone(depthColour(lum, q, loopN)), amt);
      // life in the dark: motes (and, past the first loop, their constellations)
      float dark = (1.0 - smoothstep(0.03, 0.2, lum)) * clear;
      vec2 m = motes(q, g, amt, loopN);
      vec3 mc = fullTone(mix(uPal[2], uPal[3], step(0.5, fract(m.y * 7.31))));
      rgb += mc * m.x * 0.9 * dark;
      if (loopN > 0.5) rgb += mc * threads(q, g, amt, loopN) * 0.16 * dark;
    }
    // alpha: how much of the plate may glow (Post's bright pass, through the face). Words that have come to rest, their
    // paint dry, are kept out of it, fading out as each finishes arriving (no pop); their effects glow while they play
    float rest = 0.0;
#ifdef PAINT
    if (halo > 0.01) {                                        // (letters always sit on their blots)
      vec4 wr = words(wUv);
      rest = smoothstep(0.9, 1.0, paintAge(wUv, wr)) * smoothstep(0.9, 1.0, wr.y)
           * (1.0 - smoothstep(0.0, 0.15 * max(wr.w, 8.0) + 1.0, wr.x));
    }
#endif
    outColor = vec4(rgb * uBright + washC + txt * tc, 1.0 - rest);
  }
`;
}

export class PlateRenderer {
  constructor(renderer, textTexture) {
    this.renderer = renderer;
    this.text = textTexture;
    this.size = 0;
    this.scale = 1;
    this.reach = 1;
    this.target = null;
    this.mats = new Map();

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(g);
    this.quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.uniforms = {
      uText: { value: textTexture },
      uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() },
      uArt: { value: new THREE.Vector3() }, uArtV: { value: new THREE.Vector2() }, uArtT: { value: 0 }, uTilt: { value: new THREE.Vector2() },
      uVN: { value: 0 }, uVBox: { value: Array.from({ length: MAX_VERDICTS }, () => new THREE.Vector4()) }, uVId: { value: new Array(MAX_VERDICTS).fill(0) },
      uWall: { value: new THREE.Vector3(WALL.cu, WALL.cv, WALL.ru) },
      uPx: { value: 1 }, uBright: { value: 0.42 },
      uLevels: { value: 1 },
      uId: { value: new Array(MAX_LEVELS).fill(0) },
      uView: { value: Array.from({ length: MAX_LEVELS }, () => new THREE.Vector3(0, 0, 1)) },
      uPortal: { value: Array.from({ length: MAX_LEVELS }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uDepth: { value: new Array(MAX_LEVELS).fill(0) },
      uLoop: { value: new Array(MAX_LEVELS).fill(0) },
      uAge: { value: new Array(MAX_LEVELS).fill(0) },
      uPal: { value: Array.from({ length: 4 }, () => new THREE.Color(1, 1, 1)) },
      uScreen: { value: 0 }, uH: { value: new THREE.Matrix3() },
      uWc: { value: new THREE.Vector2(0.5, 0.5) }, uWf: { value: 1 },
    };

    // the text field (see FIELD): two seed targets the flood ping-pongs between, and the field itself
    const exact = renderer.extensions.has('EXT_color_buffer_float');
    const rt = (type, filter, format) => new THREE.WebGLRenderTarget(FIELD, FIELD, {
      type, format, minFilter: filter, magFilter: filter, generateMipmaps: false, depthBuffer: false,
    });
    this.seeds = [0, 1].map(() => rt(exact ? THREE.FloatType : THREE.HalfFloatType, THREE.NearestFilter, THREE.RGFormat));
    this.field = rt(THREE.HalfFloatType, THREE.LinearFilter, THREE.RGBAFormat);
    this.fieldVersion = -1;
    const pass = (fs, uniforms) => new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false,
    });
    const texel = { value: 1 / FIELD }, canvas = { value: textTexture.image.width };
    this.passes = {
      seed: pass(FIELD_SEED, { uText: { value: textTexture }, uTexel: texel }),
      step: pass(FIELD_STEP, { uSeed: { value: null }, uStep: { value: 0 } }),
      out: pass(FIELD_OUT, { uSeed: { value: null }, uText: { value: textTexture }, uTexel: texel, uCanvas: canvas }),
    };
    this.uniforms.uField = { value: this.field.texture };
    this.uniforms.uCanvas = canvas;
    this.uniforms.uMusic = { value: -1 };
    this.resize();
  }

  /** The music's level for the shader (uMusic, eased a little), or −1 when there is none to hear. */
  setMusic(lv, dt) {
    const u = this.uniforms.uMusic;
    if (lv == null) { u.value = -1; return; }
    u.value = u.value < 0 ? lv : u.value + (lv - u.value) * Math.min(1, dt * 12);
  }

  /** Rebuild the text field, only when the canvas has been redrawn, and only for a world whose words have effects (or paint). */
  _field(def) {
    if (!(def.textFx || def.fonts) || this.text.version === this.fieldVersion) return;
    this.fieldVersion = this.text.version;
    const r = this.renderer, F = this.passes;
    const run = (mat, target) => { this.quad.material = mat; r.setRenderTarget(target); r.render(this.scene, this.cam); };
    run(F.seed, this.seeds[0]);
    let i = 0;
    for (let k = REACH; k >= 1; k >>= 1) {
      F.step.uniforms.uSeed.value = this.seeds[i].texture;
      F.step.uniforms.uStep.value = k / FIELD;
      run(F.step, this.seeds[1 - i]);
      i = 1 - i;
    }
    F.out.uniforms.uSeed.value = this.seeds[i].texture;
    run(F.out, this.field);
  }

  _material(def) {
    let m = this.mats.get(def.id);
    if (!m) {
      m = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: fragment(def),
        uniforms: this.uniforms, depthTest: false, depthWrite: false,
      });
      this.mats.set(def.id, m);
    }
    return m;
  }

  /** Compile every world's program, and the field's, off the critical path (parallel compile where the driver has it). */
  prepare() {
    for (const m of [...World.defs().map((def) => this._material(def)), ...Object.values(this.passes)]) {
      this.quad.material = m;
      this.renderer.compileAsync?.(this.scene, this.cam).catch(() => {});
    }
  }

  /**
   * Has a world's program (and the field's) finished compiling? Asked without blocking, where the driver
   * has KHR_parallel_shader_compile; without it three says yes at once, and the first draw pays.
   */
  ready(def = null) {
    const done = (m) => { const p = this.renderer.properties.get(m).currentProgram; return !p || p.isReady(); };
    return (!def || done(this._material(def))) && Object.values(this.passes).every(done);
  }

  /**
   * What every world's first frame would otherwise pay once, paid now: the field's targets and passes, the
   * words' first upload, the plate target. Only once ready(): a program still compiling would block here.
   */
  warmShared() {
    const r = this.renderer, saved = r.getRenderTarget();
    this._tiny = new THREE.WebGLRenderTarget(16, 16, { depthBuffer: false });
    this._field({ fonts: true });
    r.initRenderTarget(this.target);
    r.setRenderTarget(saved);
  }

  /**
   * Draw a world once, off screen at a tiny size, so what its first frame would otherwise pay (the link's
   * last step, uniform lookups) is paid now. Only after warmShared, and once ready(def).
   */
  warm(def) {
    const r = this.renderer, saved = r.getRenderTarget();
    this.quad.material = this._material(def);
    r.setRenderTarget(this._tiny);
    r.render(this.scene, this.cam);
    r.setRenderTarget(saved);
  }

  /** What the face shows: the screen target while the plate is drawn straight onto the screen (see render), else the square one. */
  get texture() { return (this.screen ? this.screenTarget : this.target).texture; }

  /**
   * Size the target to what the face can show at full approach (≈1.45 × the drawing-buffer height for
   * the whole face texture), times `reach`: how many face textures wide the square it covers is then
   * (see setRegion), so a grown face is drawn as finely as the whole one was.
   *
   * The engraving's pixel (uPx: line spacing and width are chosen in pixels) stays that of the whole face
   * texture, whatever square the target covers: were it the target's, it would swell and shrink with the
   * square as the face grows, and the line work would coarsen and refine against the zoom. It is also the
   * screen's own pixel, not the (supersampled, governed) drawing buffer's, so the line work looks the same
   * at every quality step and the extra pixels go into drawing it more finely.
   */
  resize() {
    const buf = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const fit = (h, k, cap) => Math.max(768, Math.min(cap, Math.round((1.45 * h * k) / 128) * 128));
    const screen = window.innerHeight * Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    this.uniforms.uPx.value = 1 / (WALL.ru * fit(screen, 1, PLATE_CAP));
    const S = this.screenTarget;                                   // (the drawing buffer's own size, a texel a pixel)
    if (!S || S.width !== buf.x || S.height !== buf.y) {
      S?.dispose();
      this.screenTarget = new THREE.WebGLRenderTarget(buf.x, buf.y, {
        minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: false,
      });
    }
    const size = fit(buf.y * this.scale, this.reach, ULTRA ? 4096 : PLATE_CAP);
    if (size === this.size) return;
    this.size = size;
    this.target?.dispose();
    this.target = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: true, depthBuffer: false,
    });
    this.target.texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
  }

  setScale(v) { this.scale = v; this.resize(); }
  setReach(v) { if (v !== this.reach) { this.reach = v; this.resize(); } }

  /** The square of face uv the target (and the words' canvas, World.setRegion) covers: { x0, y0, span }, or null for the whole. */
  setRegion(m) {
    const { x0 = 0, y0 = 0, span = 1 } = m || {};
    this.region = { x0, y0, span };
    this.uniforms.uWall.value.set((WALL.cu - x0) / span, (WALL.cv - y0) / span, WALL.ru / span);
  }

  get pxPerUnit() { return this.uniforms.uWall.value.z * this.size; }

  /**
   * view (Crystal.faceScreenMap): the face's map from drawing-buffer pixels to face uv, H, and how much face uv a pixel
   * spans, perPx. Where the square target would show at no more than about a texel a pixel, and drawing the buffer's
   * pixels costs no more than its own, the plate is drawn straight onto the screen instead (`screen`): shaded once per
   * pixel the face shows, which the face then reads a pixel for a pixel, with no resampling between them and no
   * mipmaps to build. Further out (orbit, early in the approach) the face is small, and the square target and its
   * mipmaps are what keep the line work from shimmering, so that is drawn as before.
   */
  render(world, levels, t, pointer, art = null, view = null) {
    const u = this.uniforms;
    let screen = false;
    if (view) {
      const { x0, y0, span } = this.region || { x0: 0, y0: 0, span: 1 }, S = this.screenTarget;
      u.uH.value.set(1 / span, 0, -x0 / span, 0, 1 / span, -y0 / span, 0, 0, 1).multiply(view.H);
      screen = (view.perPx / span) * this.size <= 1.35 && S.width * S.height <= 1.1 * this.size * this.size;
    }
    this.screen = screen;
    u.uScreen.value = screen ? 1 : 0;
    u.uWf.value = world.drawScale;                               // (the scale the words' canvas was last drawn at, see World.draw)
    u.uWc.value.set(world.CX / world.SIZE, 1 - world.CY / world.SIZE);
    const dt = Math.min(Math.max(t - (this._t ?? t), 0), 0.1);
    this._t = t;
    u.uTime.value = t;
    u.uPointer.value.set(pointer.x, pointer.y);
    // the art's pointer (Pilot._artPointer): wall units, its velocity and how present it is; and, for a world that
    // is driven by it (`pointer(q, id)`: 0–1 at plate point q of the plate in view), that drive summed over time
    if (art) {
      u.uArt.value.set(art.x, art.y, art.on); u.uArtV.value.set(art.vx, art.vy); u.uTilt.value.set(art.tx, art.ty);
      let L = levels[0];
      for (let i = 1; L && i < levels.length; i++) {                     // (the plate the pointer is over: as the shader picks it)
        const V = levels[i - 1], P = V.portal, dx = V.cx + art.x / V.s - P[0], dy = V.cy + art.y / V.s - P[1];
        if (!(P[3] ? Math.abs(dx) < P[2] * P[3] && Math.abs(dy) < P[2] : Math.hypot(dx, dy) < P[2])) break;
        L = levels[i];
      }
      if (world.def.pointer && L && art.on > 0.01) u.uArtT.value += dt * art.on * world.def.pointer([L.cx + art.x / L.s, L.cy + art.y / L.s], L.id);
    }
    // a world that judges its words: where they are on the canvas, and how they are judged (World._judged)
    if (world.def.verdicts) {
      const B = world.vboxes || [];
      u.uVN.value = B.length;
      B.forEach((b, i) => { u.uVBox.value[i].set(b[0], b[1], b[2], b[3]); u.uVId.value[i] = b[4]; });
    }
    u.uLevels.value = levels.length;
    levels.forEach((L, i) => {
      u.uId.value[i] = L.id;
      u.uView.value[i].set(L.cx, L.cy, L.s);
      u.uPortal.value[i].set(L.portal[0], L.portal[1], L.portal[2], L.portal[3] || 0);
      u.uDepth.value[i] = world.depth(L.k);
      u.uLoop.value[i] = world.loops + Math.floor(L.k / world.N);
      u.uAge.value[i] = L.age || 0;
    });
    const pal = world.def.palette || ['#202020', '#a0a0a0', '#ffffff', '#ffffff'];
    pal.forEach((hex, i) => u.uPal.value[i].set(hex).convertSRGBToLinear());
    const r = this.renderer, saved = r.getRenderTarget();
    this._field(world.def);
    this.quad.material = this._material(world.def);
    r.setRenderTarget(screen ? this.screenTarget : this.target);
    r.render(this.scene, this.cam);
    r.setRenderTarget(saved);
  }
}
