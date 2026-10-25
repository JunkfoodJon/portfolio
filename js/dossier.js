/**
 * dossier.js — all DOM UI: the project rail, the hover tip and the dossier panel.
 *
 * The dossier is ordinary DOM laid over (not on top of) the canvas: only the
 * panel itself takes pointer events, so the canvas underneath stays draggable
 * and the wheel still reaches it. No WebGL is needed to use any of this — if the
 * canvas fails, body.no-webgl turns the same markup into the whole page.
 */

import { PROJECTS, SITE } from './content.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'inside',   label: 'Inside' },
  { id: 'stack',    label: 'Stack' },
  { id: 'numbers',  label: 'Numbers' },
];

const pad = (n) => String(n).padStart(2, '0');

function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) e.append(kid);
  return e;
}

export class Dossier {
  /**
   * @param {{onSelect:(i:number)=>void, onHover:(i:number)=>void, onClose:()=>void, onStep:(d:number)=>void}} cb
   */
  constructor(cb) {
    this.cb = cb;
    this.index = -1;
    this.tab = 'overview';
    this._countRaf = 0;

    this.root = document.getElementById('dossier');
    this.railList = document.getElementById('rail-list');
    this.tip = document.getElementById('tip');
    this.live = document.getElementById('live');

    this._buildRail();
    this._buildPanel();
    this.updateLayout();
  }

  // ── layout ────────────────────────────────────────────────────────────────

  /** Plain-page layout helper (the WebGL build has no DOM panel). */
  layout() {
    const W = window.innerWidth, H = window.innerHeight;
    if (W >= 860 && W / H >= 0.9) return { mode: 'side', size: Math.min(460, W * 0.38) };
    return { mode: 'bottom', size: Math.min(H * 0.5, 460) };
  }

  updateLayout() {
    const l = this.layout();
    document.body.classList.toggle('layout-side', l.mode === 'side');
    document.body.classList.toggle('layout-bottom', l.mode === 'bottom');
    return l;
  }

  // ── rail ──────────────────────────────────────────────────────────────────

  _buildRail() {
    this.railBtns = PROJECTS.map((p, i) => {
      const b = h('button', {
        type: 'button', class: 'rail-btn', 'data-i': i,
        style: `--tint:${p.tint}`,
        'aria-label': `${p.name}: ${p.kind}`,
        onclick: () => this.cb.onSelect(i),
        onpointerenter: () => this.cb.onHover(i),
        onpointerleave: () => this.cb.onHover(-1),
        onfocus: () => this.cb.onHover(i),
        onblur: () => this.cb.onHover(-1),
      },
        h('span', { class: 'rail-pip', 'aria-hidden': 'true' }),
        h('span', { class: 'rail-idx', text: pad(i + 1), 'aria-hidden': 'true' }),
        h('span', { class: 'rail-name', text: p.name }),
      );
      this.railList.append(h('li', {}, b));
      return b;
    });
  }

  setRailActive(i) {
    this.railBtns.forEach((b, k) => {
      if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  setRailHover(i) {
    this.railBtns.forEach((b, k) => b.classList.toggle('is-hot', k === i));
  }

  // ── tip ───────────────────────────────────────────────────────────────────

  showTip(i, x, y) {
    if (i < 0) { this.tip.classList.remove('on'); return; }
    const p = PROJECTS[i];
    if (this.tip.dataset.i !== String(i)) {
      this.tip.dataset.i = i;
      this.tip.replaceChildren(
        h('span', { class: 'tip-idx', text: `${pad(i + 1)} / ${pad(PROJECTS.length)}` }),
        h('strong', { text: p.name }),
        h('span', { class: 'tip-kind', text: p.kind }),
        h('span', { class: 'tip-go', text: 'Click to enter' }),
      );
      this.tip.style.setProperty('--tint', p.tint);
    }
    const w = this.tip.offsetWidth || 180, hgt = this.tip.offsetHeight || 80;
    const px = Math.min(x + 18, window.innerWidth - w - 12);
    const py = Math.min(y + 18, window.innerHeight - hgt - 12);
    this.tip.style.transform = `translate(${Math.max(8, px)}px, ${Math.max(8, py)}px)`;
    this.tip.classList.add('on');
  }

  // ── panel ─────────────────────────────────────────────────────────────────

  _buildPanel() {
    this.elIdx     = h('span', { class: 'dz-idx' });
    this.elStatus  = h('span', { class: 'dz-status' });
    this.elClose   = h('button', { type: 'button', class: 'dz-close', 'aria-label': 'Back to the crystal (Esc)', onclick: () => this.cb.onClose() },
      h('span', { 'aria-hidden': 'true', text: 'Esc' }), h('span', { class: 'sr', text: 'Back to the crystal' }));
    this.elTitle   = h('h2', { class: 'dz-title', tabindex: '-1' });
    this.elTag     = h('p', { class: 'dz-tag' });
    this.elMeta    = h('p', { class: 'dz-meta' });
    this.elTabs    = h('div', { class: 'dz-tabs', role: 'tablist', 'aria-label': 'Project sections' });
    this.elBody    = h('div', { class: 'dz-body' });
    this.elFoot    = h('footer', { class: 'dz-foot' });

    this.tabBtns = TABS.map((t, k) => {
      const b = h('button', {
        type: 'button', role: 'tab', id: `tab-${t.id}`, 'aria-controls': 'dz-panel', 'data-tab': t.id,
        // mouse clicks hand arrow keys back to project stepping; keyboard users keep tab focus
        onclick: (e) => { this.setTab(t.id); if (e.detail > 0) e.currentTarget.blur(); },
        onkeydown: (e) => this._tabKey(e, k),
      }, h('span', { class: 'dz-tab-num', text: pad(k + 1), 'aria-hidden': 'true' }), t.label);
      this.elTabs.append(b);
      return b;
    });
    this.elBody.setAttribute('role', 'tabpanel');
    this.elBody.id = 'dz-panel';
    this.elBody.tabIndex = 0;

    const prev = h('button', { type: 'button', class: 'dz-step', onclick: () => this.cb.onStep(-1), 'aria-label': 'Previous project' },
      h('span', { 'aria-hidden': 'true', text: '←' }), h('span', { class: 'dz-step-name' }));
    const next = h('button', { type: 'button', class: 'dz-step dz-next', onclick: () => this.cb.onStep(1), 'aria-label': 'Next project' },
      h('span', { class: 'dz-step-name' }), h('span', { 'aria-hidden': 'true', text: '→' }));
    this.elPrev = prev; this.elNext = next;
    this.elFoot.append(prev, next);

    this.root.append(
      h('div', { class: 'dz-head' }, this.elIdx, this.elStatus, this.elClose),
      this.elTitle, this.elTag, this.elMeta, this.elTabs, this.elBody, this.elFoot,
    );
    if (SITE.contact) this.root.append(h('p', { class: 'dz-contact', text: SITE.contact }));
  }

  _tabKey(e, k) {
    let n = -1;
    if (e.key === 'ArrowRight') n = (k + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') n = (k - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = TABS.length - 1;
    if (n < 0) return;
    e.preventDefault(); e.stopPropagation();
    this.setTab(TABS[n].id);
    this.tabBtns[n].focus();
  }

  get isOpen() { return this.index >= 0; }

  /** Show project i. `keepTab` preserves the current tab when stepping. */
  open(i, { keepTab = true, focus = true } = {}) {
    const first = this.index < 0;
    this.index = i;
    const p = PROJECTS[i];
    this.root.hidden = false;
    this.root.style.setProperty('--tint', p.tint);
    document.documentElement.style.setProperty('--accent', p.tint);
    document.body.classList.add('state-focus');
    this.setRailActive(i);

    this.elIdx.textContent = `${pad(i + 1)} / ${pad(PROJECTS.length)}`;
    this.elStatus.textContent = p.status;
    this.elTitle.textContent = p.name;
    this.elTag.textContent = p.tagline;
    this.elMeta.textContent = [p.kind, p.version, p.platform].join('  ·  ');

    const prevP = PROJECTS[(i + PROJECTS.length - 1) % PROJECTS.length];
    const nextP = PROJECTS[(i + 1) % PROJECTS.length];
    this.elPrev.querySelector('.dz-step-name').textContent = prevP.name;
    this.elNext.querySelector('.dz-step-name').textContent = nextP.name;
    this.elPrev.setAttribute('aria-label', `Previous project: ${prevP.name}`);
    this.elNext.setAttribute('aria-label', `Next project: ${nextP.name}`);

    if (!keepTab) this.tab = 'overview';
    this._renderTab(true);

    this.root.classList.remove('in');
    void this.root.offsetWidth;                    // restart the entrance
    this.root.classList.add('in');
    this.live.textContent = `${p.name}. ${p.tagline}`;
    if (focus && first) this.elTitle.focus({ preventScroll: true });
  }

  close() {
    if (this.index < 0) return;
    const i = this.index;
    this.index = -1;
    cancelAnimationFrame(this._countRaf);
    this.root.classList.remove('in');
    document.body.classList.remove('state-focus');
    document.documentElement.style.removeProperty('--accent');
    this.root.hidden = true;
    this.setRailActive(-1);
    this.railBtns[i]?.focus({ preventScroll: true });
  }

  setTab(id) {
    if (id === this.tab) return;
    this.tab = id;
    this._renderTab(false);
  }

  _renderTab(initial) {
    const p = PROJECTS[this.index];
    cancelAnimationFrame(this._countRaf);
    this.tabBtns.forEach((b) => {
      const on = b.dataset.tab === this.tab;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    this.elBody.setAttribute('aria-labelledby', `tab-${this.tab}`);
    this.elBody.scrollTop = 0;
    this.elBody.replaceChildren(...this._panel(this.tab, p));
    // stagger children in
    Array.from(this.elBody.children).forEach((c, k) => c.style.setProperty('--i', k));
    this.elBody.classList.remove('swap'); void this.elBody.offsetWidth; this.elBody.classList.add('swap');
    if (this.tab === 'numbers') this._countUp(initial ? 350 : 80);
  }

  _panel(id, p) {
    if (id === 'overview') {
      return [
        h('p', { class: 'dz-lead', text: p.summary }),
        h('ul', { class: 'dz-list' }, p.highlights.map((t) => h('li', { text: t }))),
      ];
    }
    if (id === 'inside') {
      return [h('div', { class: 'dz-acc' }, p.inside.map((s, k) => {
        const open = k === 0;
        const btn = h('button', { type: 'button', class: 'dz-acc-btn', 'aria-expanded': open ? 'true' : 'false', 'aria-controls': `acc-${k}` },
          h('span', { class: 'dz-acc-n', text: pad(k + 1), 'aria-hidden': 'true' }), h('span', { text: s.title }), h('span', { class: 'dz-acc-ico', 'aria-hidden': 'true' }));
        const body = h('div', { class: 'dz-acc-body', id: `acc-${k}`, role: 'region', 'aria-label': s.title }, h('p', { text: s.text }));
        body.hidden = !open;
        btn.addEventListener('click', () => {
          const exp = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', exp ? 'false' : 'true');
          body.hidden = exp;
        });
        return h('div', { class: 'dz-acc-item' }, btn, body);
      }))];
    }
    if (id === 'stack') {
      return p.stack.map(([group, items]) => h('div', { class: 'dz-stack-row' },
        h('span', { class: 'dz-stack-g', text: group }),
        h('ul', { class: 'dz-chips' }, items.map((t) => h('li', { text: t })))));
    }
    // numbers
    return [
      h('div', { class: 'dz-stats' }, p.stats.map((s) => h('div', { class: 'dz-stat' },
        h('div', { class: 'dz-stat-v' },
          h('span', { class: 'dz-count', 'data-v': s.value, 'data-d': s.decimals || 0, text: this._fmt(s.value, s.decimals || 0) }),
          h('span', { class: 'dz-stat-u', text: s.suffix })),
        h('div', { class: 'dz-stat-l', text: s.label })))),
      h('p', { class: 'dz-foot-note', text: SITE.asOf }),
    ];
  }

  _fmt(v, d) { return v.toFixed(d); }

  _countUp(delay) {
    const nodes = Array.from(this.elBody.querySelectorAll('.dz-count'));
    nodes.forEach((n) => { n.textContent = this._fmt(0, +n.dataset.d); });
    const t0 = performance.now() + delay, dur = 1100;
    const step = (now) => {
      const u = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - u, 4);
      nodes.forEach((n) => { n.textContent = this._fmt(+n.dataset.v * e, +n.dataset.d); });
      if (u < 1) this._countRaf = requestAnimationFrame(step);
    };
    this._countRaf = requestAnimationFrame(step);
  }
}
