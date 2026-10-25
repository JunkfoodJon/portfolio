/**
 * wall.js — the information wall: a zoomable picture that lives ON a face.
 *
 * Nothing here is HTML. Each project is a tree of discs:
 *
 *     project (the emblem)  ─▶  4 sections  ─▶  leaves (the actual text / figures)
 *
 * Zooming in reveals the next layer; each layer's label fades as its children
 * resolve, like a picture that keeps going. The wall is drawn with Canvas 2D in
 * the face's own UV space and sampled by the face shader, so it glows with the
 * rest of the crystal.
 *
 * Coordinates: "wall units" (wu). The triangle's incircle has radius 1 wu and
 * is centred on the origin; the apex is at (0, 2), the base at y = −1.
 * Must match FACE_UV in crystal.js.
 */

import { PROJECTS } from './content.js';

export const WALL = { cu: 0.5, cv: 0.362, ru: 0.277 };
export const S_MAX = 36;
const SIZE = 2048;
const U  = WALL.ru * SIZE;                  // canvas px per wu
const CX = WALL.cu * SIZE;
const CY = (1 - WALL.cv) * SIZE;
const ROOT = { cx: 0, cy: 0.2, r: 0.62 };

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const fmt = (v, d = 0) => (d ? v.toFixed(d) : String(Math.round(v)));
const shortLabel = (t) => {
  const head = t.split(/[:;—(,]/)[0].trim();
  const w = head.split(/\s+/);
  return w.length > 3 ? w.slice(0, 3).join(' ') + '…' : head;
};

/** Place n children on a ring inside a parent disc. */
function ring(parent, items) {
  const n = items.length;
  const Rr = 0.6 * parent.r;
  const rc = n === 1 ? 0.5 * parent.r : Math.min(0.34 * parent.r, Rr * Math.sin(Math.PI / n) * 0.92);
  return items.map((it, i) => {
    const a = Math.PI / 2 - (i * Math.PI * 2) / n;
    return { ...it, cx: parent.cx + Math.cos(a) * Rr, cy: parent.cy + Math.sin(a) * Rr, r: rc, parent, kids: [] };
  });
}

export function buildTree(p) {
  const root = { kind: 'project', label: p.name, tag: p.tagline, ...ROOT, parent: null, kids: [] };
  const sections = [
    { label: 'Overview', items: [{ label: 'In short', text: p.summary }, ...p.highlights.map((t) => ({ label: shortLabel(t), text: t }))] },
    { label: 'Inside',   items: p.inside.map((s) => ({ label: s.title, text: s.text })) },
    { label: 'Stack',    items: p.stack.map(([g, items]) => ({ label: g, text: items.join('   ·   ') })) },
    { label: 'Numbers',  items: p.stats.map((s) => ({ label: s.label, value: fmt(s.value, s.decimals || 0) + s.suffix, stat: true })) },
  ];
  root.kids = ring(root, sections.map((s) => ({ kind: 'section', label: s.label })));
  root.kids.forEach((sec, i) => {
    sec.kids = ring(sec, sections[i].items.map((it) => ({ kind: 'leaf', ...it })));
  });
  return root;
}

export class Wall {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.root = null;
    this.project = -1;
    this.hover = null;
    this.version = 0;
  }

  setProject(i) {
    if (i === this.project) return;
    this.project = i;
    this.root = i >= 0 ? buildTree(PROJECTS[i]) : null;
    this.hover = null;
  }

  /** Wall-screen coordinates (incircle-relative, after the view transform) → world wall coordinates. */
  toWorld(ax, ay, view) { return [view.px + ax / view.s, view.py + ay / view.s]; }

  // ── queries ────────────────────────────────────────────────────────────────

  /** Deepest visible node under a wall-screen point, or null. */
  hit(ax, ay, view) {
    if (!this.root) return null;
    const [wx, wy] = this.toWorld(ax, ay, view);
    let best = null;
    const walk = (n, gate) => {
      const rho = n.r * view.s;
      if (rho < 0.1 || gate < 0.4) return;
      const dx = wx - n.cx, dy = wy - n.cy;
      if (dx * dx + dy * dy > n.r * n.r) return;
      if (n.parent) best = n;
      const g = smooth(0.9, 1.4, rho);
      for (const k of n.kids) walk(k, g);
    };
    walk(this.root, 1);
    return best;
  }

  /** The node the view is "inside": deepest disc containing the view centre at a comfortable size. */
  current(view) {
    let n = this.root;
    if (!n) return null;
    for (;;) {
      const next = n.kids.find((k) => {
        const dx = view.px - k.cx, dy = view.py - k.cy;
        return dx * dx + dy * dy < k.r * k.r && k.r * view.s >= 0.75;
      });
      if (!next) return n;
      n = next;
    }
  }

  /** The view that frames a node. */
  viewFor(node) {
    return { s: Math.min(S_MAX, Math.max(1, 0.9 / node.r)), px: node.cx, py: node.cy };
  }

  // ── drawing ────────────────────────────────────────────────────────────────

  draw(view, opts = {}) {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, SIZE, SIZE);
    if (!this.root) { this.version++; return; }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.strokeStyle = '#fff';
    if ('letterSpacing' in c) c.letterSpacing = '0px';

    // project header, only while the whole emblem is in view
    const head = 1 - smooth(1.05, 1.6, view.s);
    if (head > 0.01) this._header(c, head);

    this._node(c, this.root, view, 1, 0);
    this.version++;
  }

  _header(c, a) {
    const p = PROJECTS[this.project];
    c.globalAlpha = a;
    let px = 0.2 * U;
    c.font = `300 ${px}px ${FONT}`;
    const maxW = 3.0 * U;
    const w = c.measureText(p.name).width;
    if (w > maxW) { px *= maxW / w; c.font = `300 ${px}px ${FONT}`; }
    if ('letterSpacing' in c) c.letterSpacing = `${px * 0.04}px`;
    c.fillText(p.name, CX, CY - (-0.64) * U);
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.globalAlpha = a * 0.7;
    const tp = 0.062 * U;
    c.font = `300 ${tp}px ${FONT}`;
    this._wrap(c, p.tagline, 2.9 * U).slice(0, 2).forEach((line, i) => c.fillText(line, CX, CY - (-0.86) * U + i * tp * 1.35));
    c.globalAlpha = 1;
  }

  _node(c, n, view, gate, depth) {
    const X = CX + (n.cx - view.px) * view.s * U;
    const Y = CY - (n.cy - view.py) * view.s * U;
    const rho = n.r * view.s;
    const R = rho * U;
    if (X + R < 0 || X - R > SIZE || Y + R < 0 || Y - R > SIZE) return;

    const vis = gate * smooth(0.1, 0.22, rho);
    const kidsGate = gate * smooth(0.9, 1.4, rho);

    if (n.parent && vis > 0.01) {
      const hot = this.hover === n;
      c.globalAlpha = vis * (hot ? 0.95 : 0.5);
      c.lineWidth = Math.max(1.5, R * 0.006) * (hot ? 1.6 : 1);
      c.beginPath(); c.arc(X, Y, R, 0, Math.PI * 2); c.stroke();
      c.globalAlpha = vis * 0.1;
      c.beginPath(); c.arc(X, Y, R * 0.965, 0, Math.PI * 2); c.stroke();
    }

    if (n.kind === 'project') {
      for (const k of n.kids) this._node(c, k, view, kidsGate, depth + 1);
      return;
    }

    if (n.kind === 'section') {
      const la = vis * (1 - smooth(0.75, 1.15, rho));
      if (la > 0.01) this._label(c, n.label, X, Y, R, la, 0.26, 1);
      for (const k of n.kids) this._node(c, k, view, kidsGate, depth + 1);
      return;
    }

    // leaf
    const textA = vis * smooth(0.62, 0.98, rho);
    const labelA = vis * (1 - smooth(0.36, 0.62, rho));
    if (n.stat) {
      // the figure itself is the label; it enlarges as the leaf grows
      const a = vis;
      if (a > 0.01) {
        const big = Math.min(R * 0.46, R * 0.9 / Math.max(1, n.value.length * 0.55));
        c.globalAlpha = a;
        c.font = `300 ${Math.max(big, 4)}px ${FONT}`;
        c.fillText(n.value, X, Y - R * 0.06);
        const lp = Math.min(R * 0.1, R * 1.7 / Math.max(10, n.label.length * 0.6));
        c.globalAlpha = a * 0.75 * smooth(0.18, 0.4, rho);
        c.font = `300 ${Math.max(lp, 3)}px ${FONT}`;
        this._wrap(c, n.label, R * 1.5).slice(0, 2).forEach((l, i) => c.fillText(l, X, Y + R * 0.36 + i * lp * 1.3));
      }
      c.globalAlpha = 1;
      return;
    }
    if (labelA > 0.01) this._label(c, n.label, X, Y, R, labelA, 0.17, 2);
    if (textA > 0.01) {
      c.globalAlpha = textA * 0.55;
      const hp = R * 0.075;
      c.font = `300 ${hp}px ${FONT}`;
      c.fillText(n.label.toUpperCase(), X, Y - R * 0.62, R * 1.4);
      c.globalAlpha = textA;
      this._body(c, n.text, X, Y + R * 0.04, R);
    }
    c.globalAlpha = 1;
  }

  _label(c, text, X, Y, R, a, base, maxLines) {
    c.globalAlpha = a;
    let px = R * base;
    c.font = `300 ${px}px ${FONT}`;
    const maxW = R * 1.62;
    let lines = this._wrap(c, text, maxW);
    if (lines.length > maxLines) {                       // shrink until it fits
      for (let i = 0; i < 10 && lines.length > maxLines; i++) {
        px *= 0.88; c.font = `300 ${px}px ${FONT}`;
        lines = this._wrap(c, text, maxW);
      }
    }
    const lh = px * 1.25;
    lines.forEach((l, i) => c.fillText(l, X, Y + (i - (lines.length - 1) / 2) * lh));
    c.globalAlpha = 1;
  }

  _body(c, text, X, Y, R) {
    const side = R * 1.5;
    let px = R * 0.13;
    let lines;
    for (let i = 0; i < 12; i++) {
      c.font = `300 ${px}px ${FONT}`;
      lines = this._wrap(c, text, side);
      if (lines.length * px * 1.42 <= side * 0.74) break;
      px *= 0.9;
    }
    const lh = px * 1.42;
    lines.forEach((l, i) => c.fillText(l, X, Y + (i - (lines.length - 1) / 2) * lh));
  }

  _wrap(c, text, maxW) {
    const words = String(text).split(/\s+/);
    const out = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (line && c.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
    return out;
  }
}
