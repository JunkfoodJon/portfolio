/**
 * bench.js — the measuring harness, loaded only with ?bench (main.js). Nothing here runs for a visitor.
 *
 * It takes over the frame loop's clock: time, performance.now and Math.random become its own, so every run
 * flies the same fixed views and sees the same frames. Per view it records:
 *   - GPU time per pass (EXT_disjoint_timer_query_webgl2; without it, a gl.finish per pass: rougher) and the
 *     CPU time of each, at rest and while zooming;
 *   - the memory of every render target and canvas, worked out from their sizes;
 *   - the frame as the screen shows it (the drawing buffer scaled to device pixels the way the browser does),
 *     and the words in it: the same frame drawn again with the letters' ink taken out, the difference being
 *     the words alone. From that: edge width (lower is sharper), contrast and red/blue misregistration.
 * The first run at a screen size is kept as the baseline (IndexedDB); later runs are compared with it (SSIM).
 * ?bench=baseline keeps this run as the baseline instead. Results: the panel, the console, window.__bench.
 */

import * as THREE from 'three';

// ── its clock, its randomness, its frame loop ───────────────────────────────

const realNow = performance.now.bind(performance);
let vnow = 0;                                        // ms, advanced only by step()
performance.now = () => vnow;
let seed = 1;
Math.random = () => {                                // mulberry32: the same draws every run
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
let pending = null;
window.requestAnimationFrame = (cb) => { pending = cb; return 1; };
// the window as the run began, held whatever happens to it after (a resized window would draw other frames)
const HELD = { innerWidth, innerHeight, devicePixelRatio };
for (const [k, v] of Object.entries(HELD)) Object.defineProperty(window, k, { get: () => v, configurable: true });
window.addEventListener('resize', (e) => e.stopImmediatePropagation(), true);

const FRAME = 1000 / 60;
const HOLD = 60;                                     // frames timed at rest at each view
const MODE = new URLSearchParams(location.search).get('bench');
const ONLY = new URLSearchParams(location.search).get('only')?.split(',');   // ?only=arachnia,isoline: those sides alone (orbit always)

let ctx = null, gl = null, skipRender = false, timing = null, noInk = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const channel = new MessageChannel(), queue = [];
channel.port1.onmessage = () => queue.shift()?.();
const yieldTask = () => new Promise((r) => { queue.push(r); channel.port2.postMessage(0); });

/** One frame of main.js's loop, dt ms later on the bench's clock (0: the same instant again). */
function step(dt = FRAME) {
  vnow += dt;
  const cb = pending; pending = null;
  cb?.(vnow);
  timer.poll();
}

async function frames(n, render = true) {
  skipRender = !render;
  for (let i = 0; i < n; i++) { step(); if (i % 4 === 3) await yieldTask(); }
  skipRender = false;
}

// ── timing: GPU segments and CPU time per section, nested sections counted apart ─

const timer = {
  ext: null, mode: 'none', stack: [], open: null, pending: [],
  init() {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.mode = this.ext ? 'timer-query' : 'finish';
  },
  _gpuStart(name) {
    if (!timing) return;
    if (this.ext) { const q = gl.createQuery(); gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q); this.open = { q, name, run: timing }; }
    else { gl.finish(); this.open = { t0: realNow(), name, run: timing }; }
  },
  _gpuEnd() {
    const o = this.open; if (!o) return;
    this.open = null;
    if (this.ext) { gl.endQuery(this.ext.TIME_ELAPSED_EXT); this.pending.push(o); }
    else { gl.finish(); add(o.run.gpu, o.name, realNow() - o.t0); }
  },
  enter(name) {
    const now = realNow(), top = this.stack.at(-1);
    if (top) { if (timing) add(timing.cpu, top.name, now - top.t0); this._gpuEnd(); }
    this.stack.push({ name, t0: realNow() });
    this._gpuStart(name);
  },
  leave() {
    const top = this.stack.pop();
    this._gpuEnd();
    if (timing) add(timing.cpu, top.name, realNow() - top.t0);
    const up = this.stack.at(-1);
    if (up) { up.t0 = realNow(); this._gpuStart(up.name); }
  },
  poll() {
    if (!this.ext || !this.pending.length) return;
    const disjoint = gl.getParameter(this.ext.GPU_DISJOINT_EXT);
    this.pending = this.pending.filter((o) => {
      if (!gl.getQueryParameter(o.q, gl.QUERY_RESULT_AVAILABLE)) return true;
      if (!disjoint) add(o.run.gpu, o.name, gl.getQueryParameter(o.q, gl.QUERY_RESULT) / 1e6);
      else o.run.disjoint = true;
      gl.deleteQuery(o.q);
      return false;
    });
  },
  async settle() { while (this.pending.length) { await sleep(5); this.poll(); } },
};
const add = (m, k, v) => { m[k] = (m[k] || 0) + v; };

/** Time n frames: per-section GPU and CPU ms a frame. */
async function timed(n, render = true, until = null) {
  const run = timing = { gpu: {}, cpu: {}, frames: 0, uploads: 0, uploadMB: 0 };
  for (let i = 0; i < n; i++) {
    const t0 = realNow();
    step();
    add(run.cpu, 'frame (all)', realNow() - t0);
    run.frames++;
    if (i % 4 === 3) await yieldTask();
    if (until && until()) break;
  }
  timing = null;
  await timer.settle();
  const per = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, +(v / run.frames).toFixed(3)]));
  return { frames: run.frames, gpu: per(run.gpu), cpu: per(run.cpu), uploadsPerFrame: +(run.uploads / run.frames).toFixed(2), uploadMBPerFrame: +(run.uploadMB / run.frames).toFixed(2), disjoint: !!run.disjoint };
}

/** obj[key] becomes a timed section; render sections are skipped while the bench only travels. */
function section(obj, key, name, render = false) {
  const fn = obj[key];
  obj[key] = function (...a) {
    if (render && skipRender) return undefined;
    timer.enter(name);
    try { return fn.apply(this, a); } finally { timer.leave(); }
  };
}

/** Uploads (an image source into a texture) and mipmap builds, as their own sections under the one they happen in. */
function hookGL() {
  const sub = (name) => `${timer.stack.at(-1)?.name || 'other'} › ${name}`;
  const tex = gl.texImage2D, texSub = gl.texSubImage2D, mips = gl.generateMipmap;
  const source = (a) => a.find((x) => x && typeof x === 'object' && 'width' in x && !ArrayBuffer.isView(x));
  gl.texImage2D = function (...a) {
    const src = source(a);
    if (!src) return tex.apply(this, a);
    if (timing) { timing.uploads++; timing.uploadMB += (src.width * src.height * 4) / 1048576; }
    timer.enter(sub('upload'));
    try { return tex.apply(this, a); } finally { timer.leave(); }
  };
  gl.texSubImage2D = function (...a) {
    const src = source(a);
    if (!src) return texSub.apply(this, a);
    if (timing) { timing.uploads++; timing.uploadMB += (src.width * src.height * 4) / 1048576; }
    timer.enter(sub('upload'));
    try { return texSub.apply(this, a); } finally { timer.leave(); }
  };
  gl.generateMipmap = function (...a) {
    timer.enter(sub('mipmaps'));
    try { return mips.apply(this, a); } finally { timer.leave(); }
  };
}

// ── memory, from the sizes of what is allocated ─────────────────────────────

function bpp(tex) {
  const ch = tex.format === THREE.RGFormat ? 2 : tex.format === THREE.RedFormat ? 1 : 4;
  const by = tex.type === THREE.FloatType ? 4 : tex.type === THREE.HalfFloatType ? 2 : 1;
  return ch * by;
}
const mipped = (tex) => tex.generateMipmaps && tex.minFilter !== THREE.LinearFilter && tex.minFilter !== THREE.NearestFilter;
function rtBytes(rt) {
  const n = rt.width * rt.height, s = rt.samples || 0, b = bpp(rt.texture);
  let bytes = n * b * (mipped(rt.texture) ? 4 / 3 : 1);   // the texture (the resolve target, when multisampled)
  if (s > 0) bytes += n * b * s;                          // the multisampled colour buffer
  if (rt.depthBuffer) bytes += n * 4 * Math.max(1, s);
  return bytes;
}

function memory() {
  const { crystal, faces, plates, world } = ctx, P = crystal.post, MB = (b) => +(b / 1048576).toFixed(1);
  const buf = crystal.renderer.getDrawingBufferSize(new THREE.Vector2());
  const C = world.canvas, words = C.width * C.height * 4;
  const rows = {
    'canvas (drawing buffer ×2 for presenting, + depth)': buf.x * buf.y * (4 * 2 + 4),
    [`scene target ${P.sceneRT.width}×${P.sceneRT.height}, ${P.sceneRT.samples || 0}× MSAA${P.sceneRT.depthBuffer ? ', depth' : ''}`]: rtBytes(P.sceneRT),
    'bloom chain': rtBytes(P.brightRT) + P.blurRT.reduce((t, [a, b]) => t + rtBytes(a) + rtBytes(b), 0),
    [`plate target ${plates.target.width}² + mipmaps`]: rtBytes(plates.target),
    ...(plates.screenTarget ? { [`plate screen target ${plates.screenTarget.width}×${plates.screenTarget.height}`]: rtBytes(plates.screenTarget) } : {}),
    [`emblem targets 8 × ${faces.faces[0].target.width}², ${faces.faces[0].target.samples}× MSAA${faces.msaa ? `, + one shared ${faces.msaa.samples}× buffer` : ''}`]:
      faces.faces.reduce((t, f) => t + rtBytes(f.target), 0) + (faces.msaa ? rtBytes(faces.msaa) : 0),
    [`words canvas ${C.width}² (texture + mipmaps)`]: words * 4 / 3,
    [`words canvas ${C.width}² (the canvas itself)`]: words,
    'words distance field (jump flood)': plates.seeds.reduce((t, r) => t + rtBytes(r), 0) + rtBytes(plates.field),
    'arc letter atlas': world._atlas ? world._atlas.canvas.width * world._atlas.canvas.height * 4 : 0,
  };
  const out = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, MB(v)]));
  out['total (MB)'] = +Object.values(out).reduce((t, v) => t + v, 0).toFixed(1);
  if (performance.memory) out['JS heap in use (MB)'] = MB(performance.memory.usedJSHeapSize);
  return out;
}

// ── the frame as shown, and the words in it ─────────────────────────────────

/** The drawing buffer, scaled to device pixels as the browser composites it (bilinear), as RGBA rows top-down. */
function grab() {
  const r = ctx.crystal.renderer;
  step(0);                                           // (drawn again, same instant: a buffer already shown may be cleared)
  r.setRenderTarget(null);
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const flipped = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) flipped.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  const src = new OffscreenCanvas(w, h);
  src.getContext('2d').putImageData(new ImageData(flipped, w, h), 0, 0);
  const dw = Math.round(innerWidth * devicePixelRatio), dh = Math.round(innerHeight * devicePixelRatio);
  if (dw === w && dh === h) return { w, h, data: flipped, canvas: src };
  const dst = new OffscreenCanvas(dw, dh), c = dst.getContext('2d');
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'low';
  c.drawImage(src, 0, 0, dw, dh);
  return { w: dw, h: dh, data: c.getImageData(0, 0, dw, dh).data, canvas: dst };
}

/** Draw the current instant again (no time passes), with the words' ink taken out or put back. */
function redrawWords(strip) {
  noInk = strip;
  ctx.pilot._drawn.s = -1;                           // (forces the words' canvas to be drawn again)
  step(0);
}

const LIN = Float32Array.from({ length: 256 }, (_, i) => { const c = i / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];               // sRGB-encoded, 0–255
const lumLin = (d, i) => 0.2126 * LIN[d[i]] + 0.7152 * LIN[d[i + 1]] + 0.0722 * LIN[d[i + 2]];
const pct = (a, p) => { if (!a.length) return NaN; const s = Float32Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

/**
 * The words alone (ink frame minus no-ink frame): where they are, how sharp their edges are (width of each edge
 * across its own contrast, in device px: lower is sharper), their contrast against what they sit on, and how far
 * the red and blue edges sit from each other (px; 0 is perfectly registered).
 */
function wordsMetrics(ink, bare) {
  const { w, h } = ink, A = ink.data, B = bare.data, n = w * h;
  const Y = new Float32Array(n), R = new Float32Array(n), G = new Float32Array(n), Bl = new Float32Array(n), mask = new Uint8Array(n);
  let count = 0;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    R[p] = A[i] - B[i]; G[p] = A[i + 1] - B[i + 1]; Bl[p] = A[i + 2] - B[i + 2];
    Y[p] = 0.2126 * R[p] + 0.7152 * G[p] + 0.0722 * Bl[p];
    if (Math.abs(Y[p]) > 6) { mask[p] = 1; count++; }
  }
  if (count < 50) return { textPx: count };
  const core = (C) => { const v = []; for (let p = 0; p < n; p += 1) if (mask[p]) v.push(C[p]); return Math.max(1, pct(v, 0.95)); };
  const rc = core(R), gc = core(G), bc = core(Bl);
  const widths = [], shifts = [], inkL = [], bareL = [];
  for (let y = 3; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
    const p = y * w + x;
    if (!mask[p]) continue;
    inkL.push(lumLin(A, p * 4)); bareL.push(lumLin(B, p * 4));
    const gx = (Y[p + 1] - Y[p - 1]) / 2, gy = (Y[p + w] - Y[p - w]) / 2, g = Math.hypot(gx, gy);
    if (g < 10) continue;
    const s = Math.abs(gx) >= Math.abs(gy) ? 1 : w;                                       // across the edge
    const gn = (q) => Math.hypot((Y[q + 1] - Y[q - 1]) / 2, (Y[q + w] - Y[q - w]) / 2);
    if (gn(p - s) > g || gn(p + s) > g) continue;                                         // its steepest point only
    let lo = Infinity, hi = -Infinity;
    for (let k = -3; k <= 3; k++) { const v = Y[p + k * s]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (hi - lo < 30) continue;
    widths.push((hi - lo) / g);
    const dG = (G[p + s] - G[p - s]) / 2 / gc;
    if (Math.abs(dG) > 0.12) shifts.push(Math.abs((R[p] / rc - Bl[p] / bc) / (2 * dG)));
  }
  const L1 = pct(inkL, 0.95), L2 = pct(bareL, 0.5);
  return {
    textPx: count,
    edgeWidth: +pct(widths, 0.5).toFixed(3), edgeWidthP90: +pct(widths, 0.9).toFixed(3), edges: widths.length,
    contrast: +((L1 + 0.05) / (L2 + 0.05)).toFixed(2),
    rbShift: shifts.length > 20 ? +pct(shifts, 0.5).toFixed(3) : null,
    mask,
  };
}

/** SSIM over 8×8 blocks (luma) against the baseline frame, overall and over the blocks that hold words. */
function compare(cur, base, mask) {
  const { w, h } = cur, A = cur.data, B = base.data, C1 = (0.01 * 255) ** 2, C2 = (0.03 * 255) ** 2;
  let all = 0, nAll = 0, txt = 0, nTxt = 0, worst = 1, diffPx = 0, sumAbs = 0;
  for (let i = 0; i < A.length; i += 4) { const d = Math.abs(luma(A, i) - luma(B, i)); sumAbs += d; if (d > 8) diffPx++; }
  for (let by = 0; by + 8 <= h; by += 8) for (let bx = 0; bx + 8 <= w; bx += 8) {
    let ma = 0, mb = 0, va = 0, vb = 0, cov = 0, words = 0;
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) { const i = (y * w + x) * 4; ma += luma(A, i); mb += luma(B, i); if (mask?.[y * w + x]) words = 1; }
    ma /= 64; mb /= 64;
    for (let y = by; y < by + 8; y++) for (let x = bx; x < bx + 8; x++) {
      const i = (y * w + x) * 4, a = luma(A, i) - ma, b = luma(B, i) - mb;
      va += a * a; vb += b * b; cov += a * b;
    }
    va /= 63; vb /= 63; cov /= 63;
    const s = ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
    all += s; nAll++; worst = Math.min(worst, s);
    if (words) { txt += s; nTxt++; }
  }
  return {
    ssim: +(all / nAll).toFixed(5), ssimWords: nTxt ? +(txt / nTxt).toFixed(5) : null, worstBlock: +worst.toFixed(4),
    meanAbsDiff: +(sumAbs / (w * h)).toFixed(3), pxOver8: diffPx,
  };
}

// ── the baseline store ──────────────────────────────────────────────────────

const db = new Promise((res, rej) => {
  const q = indexedDB.open('eightfaces-bench', 1);
  q.onupgradeneeded = () => { q.result.createObjectStore('frames'); q.result.createObjectStore('runs', { autoIncrement: true }); };
  q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
});
const idb = async (store, mode, fn) => { const d = await db; return new Promise((res, rej) => { const t = d.transaction(store, mode), r = fn(t.objectStore(store)); t.oncomplete = () => res(r?.result); t.onerror = () => rej(t.error); }); };
const getFrame = (key) => idb('frames', 'readonly', (s) => s.get(key));
const putFrame = (key, blob) => idb('frames', 'readwrite', (s) => s.put(blob, key));

async function decode(blob) {
  const bmp = await createImageBitmap(blob), c = new OffscreenCanvas(bmp.width, bmp.height), x = c.getContext('2d');
  x.drawImage(bmp, 0, 0);
  return { w: bmp.width, h: bmp.height, data: x.getImageData(0, 0, bmp.width, bmp.height).data };
}

/**
 * Crops of this run against the baseline, each where the two differ most: before | after, at 2× (pixels kept
 * sharp). Each is POSTed as a PNG to `url`/<tag>__<view> (a local receiver that saves it). Views that differ by
 * no more than `min` (summed |Δluma| over the crop) are skipped. Returns [view, x, y, difference] per crop.
 */
window.__benchCrops = async (url = 'http://localhost:8099', tag = 'crop', W = 400, H = 240, min = 0) => {
  const out = [];
  for (const [name, blob] of window.__benchFrames || []) {
    const cur = await decode(blob), prev = await getFrame(`${cur.w}x${cur.h}/${name}`);
    if (!prev) continue;
    const base = await decode(prev), w = cur.w, h = cur.h, I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let row = 0;
      for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; row += Math.abs(luma(cur.data, i) - luma(base.data, i)); I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; }
    }
    let best = -1, bx = 0, by = 0;
    for (let y = 0; y + H <= h; y += 8) for (let x = 0; x + W <= w; x += 8) {
      const s = I[(y + H) * (w + 1) + x + W] - I[y * (w + 1) + x + W] - I[(y + H) * (w + 1) + x] + I[y * (w + 1) + x];
      if (s > best) { best = s; bx = x; by = y; }
    }
    if (best <= min) continue;
    const d = new Uint8ClampedArray(w * h * 4);                 // the difference, ×8, red where it got brighter, cyan darker
    for (let i = 0; i < d.length; i += 4) {
      const v = (luma(cur.data, i) - luma(base.data, i)) * 8;
      d[i] = v > 0 ? v : 0; d[i + 1] = d[i + 2] = v < 0 ? -v : 0; d[i + 3] = 255;
    }
    const c = new OffscreenCanvas(W * 6 + 16, H * 2), g = c.getContext('2d');
    g.imageSmoothingEnabled = false; g.fillStyle = '#333'; g.fillRect(0, 0, c.width, c.height);
    [base.data, cur.data, d].forEach((data, k) => {
      const src = new OffscreenCanvas(w, h);
      src.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
      g.drawImage(src, bx, by, W, H, k * (W * 2 + 8), 0, W * 2, H * 2);
    });
    g.font = '15px monospace'; g.fillStyle = '#ff0';
    ['before', 'after', 'difference ×8'].forEach((s, k) => g.fillText(s, k * (W * 2 + 8) + 8, 20));
    await fetch(`${url}/${tag}__${name}`, { method: 'POST', body: await c.convertToBlob({ type: 'image/png' }), headers: { 'Content-Type': 'image/png' } });
    out.push([name, bx, by, Math.round(best)]);
  }
  return out;
};

// ── the run ─────────────────────────────────────────────────────────────────

let panel = null;
function say(text) {
  if (!panel) {
    panel = Object.assign(document.createElement('pre'), { id: 'bench' });
    panel.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99;max-width:min(96vw,760px);max-height:90vh;overflow:auto;margin:0;padding:8px 10px;font:11px/1.35 ui-monospace,Consolas,monospace;color:#cfe;background:rgba(0,0,0,.82);border:1px solid #345;white-space:pre-wrap;pointer-events:none';
    document.body.append(panel);
  }
  panel.textContent = text;
}

function environment() {
  const { crystal, plates } = ctx, info = gl.getExtension('WEBGL_debug_renderer_info');
  const buf = crystal.renderer.getDrawingBufferSize(new THREE.Vector2());
  return {
    gpu: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown',
    userAgent: navigator.userAgent,
    css: `${innerWidth}×${innerHeight}`, dpr: devicePixelRatio,
    device: `${Math.round(innerWidth * devicePixelRatio)}×${Math.round(innerHeight * devicePixelRatio)}`,
    pixelRatio: crystal.pixelRatio, buffer: `${buf.x}×${buf.y}`, sceneMSAA: crystal.post.sceneRT.samples || 0,
    plate: plates.size, mobile: ctx.mobile, timer: timer.mode,
  };
}

async function reset() {
  const P = ctx.pilot;
  Object.assign(P, { rewind: null, goal: null, anchor: null, D: 0, Dt: 0, Dv: 0, loops: 0, leaving: false, idle: 9, wantD: null });
  Object.assign(P.art, { x: 0, y: 0, vx: 0, vy: 0, on: 0, tx: 0, ty: 0 });
  P.pointer.x = P.pointer.y = 0;
  await frames(150, false);                          // (lets the face go and every eased highlight die away)
  P.qBase.setFromEuler(new THREE.Euler(0.42, 0.6, 0, 'XYZ'));
  P.spin.x = 0; P.spin.y = 0.17;
  ctx.plates.uniforms.uArtT.value = 0;
  ctx.faces._n = 0;
  ctx.setTime(0);
  seed = 1;
}

/** Step until the view has come to rest and the words have finished arriving (or `max` frames). */
async function rest(max = 1500, render = false) {
  const P = ctx.pilot, W = ctx.world;
  skipRender = !render;
  for (let i = 0; i < max; i++) {
    step();
    if (i % 4 === 3) await yieldTask();
    if (!P.goal && !P.rewind && P.Dv === 0 && P.D === P.Dt && !(P.worldOn && (W.animating || W.rough))) break;
  }
  skipRender = false;
}

async function shoot(name, results, base, stamp) {
  const timingRest = await timed(HOLD);
  const ink = grab();
  if (`${ink.w}×${ink.h}` !== results.env.device) throw new Error(`the window changed size during the run (${results.env.device} → ${ink.w}×${ink.h}): its frames are not comparable, run it again`);
  redrawWords(true);
  const bare = grab();
  redrawWords(false);
  const words = wordsMetrics(ink, bare);
  const blob = await ink.canvas.convertToBlob({ type: 'image/png' });
  (window.__benchFrames ||= new Map()).set(name, blob);   // (this run's frames, for crops against the baseline)
  const key = `${ink.w}x${ink.h}/${name}`;
  let vs = null;
  const prev = base ? await getFrame(key) : null;
  if (prev) vs = compare(ink, await decode(prev), words.mask);
  if (!prev || MODE === 'baseline') await putFrame(key, blob);
  delete words.mask;
  const v = { view: name, rest: timingRest, words, vsBaseline: vs, savedAsBaseline: !prev || MODE === 'baseline', plateOnScreen: !!ctx.plates.screen };
  results.views.push(v);
  say(report(results, stamp));
  return v;
}

const VIEWS = ['face', 'window', 'plate 1', 'deep (loop 2)'];

async function run() {
  const { pilot: P, world: W } = ctx;
  const t0 = realNow();
  say('bench: waiting for every side to be prepared…');
  while (!([...Array(8).keys()].every((i) => ctx.ready(i)) && P.introT >= 1 && innerWidth > 0 && innerHeight > 0)) {
    step(); await sleep(16);
    if (realNow() - t0 > 60000) { say('bench: sides still not prepared after 60 s (a browser without parallel compile is not supported)'); return; }
  }
  P.pause(true);
  const results = { when: new Date().toISOString(), env: environment(), memory: null, views: [], zoom: [] };
  const stamp = realNow();
  say(report(results, stamp));

  await reset();
  await rest(300, true);
  await shoot('orbit', results, true, stamp);
  results.memory = memory();

  for (let f = 0; f < 8; f++) {
    const name = W.defOf(f).id;
    if (ONLY && !ONLY.includes(name)) continue;
    await reset();
    P.enter(f);
    await rest(); await frames(30);
    await shoot(`${name} · ${VIEWS[0]}`, results, true, stamp);
    P.worldNext();
    await rest(); await frames(30);
    await shoot(`${name} · ${VIEWS[1]}`, results, true, stamp);
    // the zoom to the next plate, timed all the way (the words redraw every frame while it moves)
    P.worldNext();
    const z = await timed(1500, true, () => !P.goal && P.Dv === 0 && P.D === P.Dt);
    results.zoom.push({ world: name, ...z });
    await rest(); await frames(30);
    await shoot(`${name} · ${VIEWS[2]}`, results, true, stamp);
    for (let k = 0; k < W.N; k++) { P.worldNext(); await rest(); }
    await frames(30);
    await shoot(`${name} · ${VIEWS[3]}`, results, true, stamp);
    results.memoryInWorld ||= memory();
  }
  results.seconds = Math.round((realNow() - t0) / 1000);
  idb('runs', 'readwrite', (s) => s.add(JSON.parse(JSON.stringify(results)))).catch(() => {});
  window.__bench = results;
  say(report(results, stamp, true));
  console.log('[bench]', results);
}

function report(R, stamp, done = false) {
  const L = [], f = (x) => (x == null || Number.isNaN(x) ? '—' : typeof x === 'number' ? x.toFixed(2) : x);
  const e = R.env;
  L.push(`bench ${done ? `done in ${R.seconds}s` : `running ${Math.round((realNow() - stamp) / 1000)}s`}  ·  ${e.gpu}`);
  L.push(`css ${e.css} @${e.dpr}  device ${e.device}  buffer ${e.buffer} (ratio ${e.pixelRatio}, scene MSAA ${e.sceneMSAA})  plate ${e.plate}²  ${e.mobile ? 'PHONE tier' : 'desktop tier'}  timing: ${e.timer}`);
  if (R.memory) L.push('', 'memory (MB, from sizes): ' + Object.entries(R.memoryInWorld || R.memory).map(([k, v]) => `\n  ${k}: ${v}`).join(''));
  L.push('', 'view                         gpu ms  cpu ms │ edge px  contrast  r/b px │ ssim   ssim(words)');
  for (const v of R.views) {
    const g = Object.values(v.rest.gpu).reduce((t, x) => t + x, 0), c = v.rest.cpu['frame (all)'];
    L.push(`${v.view.padEnd(28)} ${f(g).padStart(6)}  ${f(c).padStart(6)} │ ${f(v.words.edgeWidth).padStart(7)}  ${f(v.words.contrast).padStart(8)}  ${f(v.words.rbShift).padStart(6)} │ ${v.vsBaseline ? `${v.vsBaseline.ssim.toFixed(4)} ${v.vsBaseline.ssimWords?.toFixed(4) ?? '—'}` : 'baseline saved'}`);
  }
  if (R.zoom.length) {
    L.push('', 'zooming (window → plate 1)    gpu ms  cpu ms  uploads/frame  MB/frame');
    for (const z of R.zoom) {
      const g = Object.values(z.gpu).reduce((t, x) => t + x, 0);
      L.push(`${z.world.padEnd(28)} ${f(g).padStart(7)} ${f(z.cpu['frame (all)']).padStart(7)} ${f(z.uploadsPerFrame).padStart(14)} ${f(z.uploadMBPerFrame).padStart(9)}`);
    }
  }
  return L.join('\n');
}

/** main.js hands over the scene once it is built: { crystal, faces, world, plates, pilot, ready(i), setTime(t), mobile }. */
export function attach(c) {
  ctx = c;
  gl = c.crystal.renderer.getContext();
  timer.init();
  hookGL();
  section(c.pilot, 'update', 'pilot (cpu)');
  const draw = c.world.draw;
  c.world.draw = function (levels) {
    timer.enter('words: draw canvas');
    try {
      draw.call(this, levels);
      if (noInk) {                                    // the letters' ink is the canvas's red: take it out, keep the plaques' alpha
        // (on the GPU: reading the canvas back would move it off the GPU for good, and every upload after it would crawl)
        const x = this.ctx;
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-atop';
        x.fillStyle = '#000'; x.fillRect(0, 0, this.SIZE, this.SIZE);
        x.restore();
      }
    } finally { timer.leave(); }
  };
  section(c.faces, 'render', 'emblems', true);
  section(c.plates, '_field', 'words: distance field');
  section(c.plates, 'render', 'plate', true);
  section(c.crystal, 'render', 'crystal scene', true);
  section(c.crystal.post, 'composite', 'bloom + composite');
  run().catch((err) => { say(`bench failed: ${err.stack || err}`); console.error(err); });
}
