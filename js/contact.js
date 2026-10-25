/**
 * contact.js — the one piece of HTML UI in WebGL mode: "Work with me".
 *
 * A small paper-plane glyph sits beside the hint, shown only at orbit. It opens
 * a black glass panel with a line about the author and a three-step quote
 * request (what it is → timeline → contact). A real
 * form, so keyboards, autofill and screen readers work. While it is open no
 * key, wheel or touch reaches the crystal (keys stop at the panel; the backdrop
 * covers the canvas; main.js pauses the pilot).
 *
 * Delivery is a form service posted to from the page (GitHub Pages has no
 * server). Until CONTACT.endpoint is set nothing is sent anywhere.
 */

// ── the author's part ───────────────────────────────────────────────────────
export const CONTACT = {
  endpoint: 'https://formspree.io/f/mljjjekg',        // the form service (Formspree); null: not connected, nothing is sent
  about: ["A vibe-coder who knows what he's doing."],
  github: 'JunkfoodJon',                              // shown as plain text, not a link
};

const MIN_MS = 4000;                                  // a person cannot fill three steps faster than this
const TIMELINES = ['As soon as possible', 'Within a month', 'In a few months', 'No fixed date'];
const STEPS = ['What it is', 'Timeline', 'Contact'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chip = (type, name, value, i) =>
  `<label class="ct-chip"><input type="${type}" name="${name}" value="${esc(value)}" id="ct-${name}-${i}"><span>${esc(value)}</span></label>`;

const PLANE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Zm-11 10 11-10" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>';

export class Contact {
  constructor({ onOpen = () => {}, onClose = () => {} } = {}) {
    this.onOpen = onOpen; this.onClose = onClose;
    this.isOpen = false; this.step = 0; this.openedAt = 0;

    this.btn = document.createElement('button');
    this.btn.id = 'contact-btn';
    this.btn.className = 'dim';                             // (first load: as grey as the hint beside it)
    this.btn.type = 'button';
    this.btn.setAttribute('aria-haspopup', 'dialog');
    this.btn.innerHTML = `${PLANE}<span class="ct-label">Work with me</span>`;
    this.btn.setAttribute('aria-label', 'Work with me');
    this.btn.addEventListener('click', () => this.open());

    this.root = document.createElement('div');
    this.root.id = 'contact';
    this.root.innerHTML = `
      <div class="ct-backdrop"></div>
      <div class="ct-panel" role="dialog" aria-modal="true" aria-labelledby="ct-title">
        <div class="ct-head">
          <span class="ct-glyph">${PLANE}</span>
          <h2 id="ct-title">Work with me</h2>
          <button type="button" class="ct-close" aria-label="Close">✕</button>
        </div>
        <div class="ct-scroll">
          <div class="ct-about">${CONTACT.about.map((l) => `<p>${esc(l)}</p>`).join('')}</div>

          <form class="ct-form" novalidate>
            <h3>Ask for a quote</h3>
            <p class="ct-steps" aria-live="polite"></p>

            <div class="ct-step" data-step="0">
              <label for="ct-desc">A few words about it</label>
              <textarea id="ct-desc" name="description" rows="4" required></textarea>
            </div>

            <div class="ct-step" data-step="1" hidden>
              <fieldset><legend>When do you need it?</legend>
                <div class="ct-chips">${TIMELINES.map((l, i) => chip('radio', 'timeline', l, i)).join('')}</div>
              </fieldset>
            </div>

            <div class="ct-step" data-step="2" hidden>
              <label for="ct-name">Your name</label>
              <input id="ct-name" name="name" type="text" autocomplete="name" required>
              <label for="ct-reply">How to reply (email or other)</label>
              <input id="ct-reply" name="reply" type="text" autocomplete="email" inputmode="email" required>
            </div>

            <!-- honeypot: hidden from people, filled by bots -->
            <div class="ct-hp" aria-hidden="true"><label for="ct-gotcha">Leave this empty</label><input id="ct-gotcha" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></div>

            <p class="ct-status" role="status"></p>
            <div class="ct-nav">
              <button type="button" class="ct-back">Back</button>
              <button type="submit" class="ct-next">Next</button>
            </div>
            <p class="ct-note">Your message goes only to my inbox and is used only to reply. Nothing is stored on this page.</p>
          </form>

          <div class="ct-done" hidden tabindex="-1">
            <p>Sent. Thank you — I’ll reply soon.</p>
          </div>

          <p class="ct-note ct-fallback">Or find me on GitHub: github.com/${esc(CONTACT.github)}</p>
        </div>
      </div>`;

    document.body.append(this.btn, this.root);
    const $ = (s) => this.root.querySelector(s);
    this.panel = $('.ct-panel'); this.scroll = $('.ct-scroll'); this.form = $('.ct-form');
    this.about = $('.ct-about'); this.status = $('.ct-status'); this.stepsEl = $('.ct-steps'); this.done = $('.ct-done');
    this.back = $('.ct-back'); this.next = $('.ct-next');

    $('.ct-close').addEventListener('click', () => this.close());
    $('.ct-backdrop').addEventListener('click', () => this.close());
    this.back.addEventListener('click', () => this._go(this.step - 1));
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this._submit(); });
    this.root.addEventListener('keydown', (e) => this._key(e));
    // the page is touch-locked for the crystal: nothing in here may reach it
    for (const ev of ['wheel', 'pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove'])
      this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });

    // a phone's keyboard shrinks the visual viewport, not the layout one: the sheet follows the visible part
    const vv = window.visualViewport;
    if (vv) {
      const fit = () => {
        this.root.style.setProperty('--vvh', `${vv.height}px`);
        this.root.style.setProperty('--vvt', `${vv.offsetTop}px`);
      };
      vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit();
    }
    this.root.addEventListener('focusin', (e) => {
      if (e.target.matches('input, textarea')) setTimeout(() => e.target.scrollIntoView({ block: 'nearest' }), 300);
    });
    this._go(0);
  }

  /** At orbit or not (main.js, each frame): the glyph shows only there. */
  setOrbit(on) {
    if (on === this._orbit) return;
    if (!on && this._orbit) this._been = true;            // left orbit once: from now on it shows at full brightness
    this._orbit = on;
    this.btn.classList.toggle('on', on);
    if (on) this.btn.classList.toggle('dim', !this._been); // (stays grey while it fades out; bright only on its return)
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.openedAt = performance.now();
    this.root.classList.add('open');
    document.body.classList.add('contact-open');
    this.onOpen();
    const first = this.done.hidden ? this.root.querySelector(`.ct-step[data-step="${this.step}"] input, .ct-step[data-step="${this.step}"] textarea`) : this.done;
    setTimeout(() => (first || this.panel.querySelector('.ct-close')).focus({ preventScroll: true }), 60);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.root.classList.remove('open');
    document.body.classList.remove('contact-open');
    this.onClose();
    this.btn.focus({ preventScroll: true });
    if (!this.done.hidden) { this.form.reset(); this.form.hidden = false; this.about.hidden = false; this.done.hidden = true; this._go(0); }
  }

  _key(e) {
    e.stopPropagation();                                    // (window's listeners — the pilot, M for sound — never see it)
    if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
    if (e.key !== 'Tab') return;
    const all = [...this.panel.querySelectorAll('button, input, textarea, [tabindex="-1"].ct-done')]
      .filter((el) => el.tabIndex >= 0 && !el.closest('[hidden]') && !el.closest('.ct-hp') && el.offsetParent !== null);
    if (!all.length) return;
    const first = all[0], last = all[all.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!this.panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
  }

  _go(n) {
    this.step = Math.max(0, Math.min(STEPS.length - 1, n));
    this.root.querySelectorAll('.ct-step').forEach((el) => { el.hidden = Number(el.dataset.step) !== this.step; });
    this.stepsEl.textContent = `${this.step + 1} / ${STEPS.length} · ${STEPS[this.step]}`;
    this.back.hidden = this.step === 0;
    this.next.textContent = this.step === STEPS.length - 1 ? 'Send' : 'Next';
    this.status.textContent = '';
    if (this.isOpen) this.root.querySelector(`.ct-step[data-step="${this.step}"] input, .ct-step[data-step="${this.step}"] textarea`)?.focus();
  }

  async _submit() {
    const step = this.root.querySelector(`.ct-step[data-step="${this.step}"]`);
    const missing = [...step.querySelectorAll('[required]')].find((el) => !el.value.trim());
    if (missing) { this.status.textContent = `Please fill in “${this.root.querySelector(`label[for="${missing.id}"]`).textContent}”.`; missing.focus(); return; }
    if (this.step < STEPS.length - 1) { this._go(this.step + 1); return; }

    const data = new FormData(this.form);
    if (data.get('_gotcha')) { this._sent(); return; }                                      // a bot: pretend
    if (performance.now() - this.openedAt < MIN_MS) { this.status.textContent = 'One moment — please check your message, then send again.'; return; }
    if (!CONTACT.endpoint) { this.status.textContent = 'Not connected yet — nothing was sent.'; return; }

    data.set('_subject', 'Quote request from the portfolio');
    this.next.disabled = true; this.status.textContent = 'Sending…';
    try {
      // Formspree answers in JSON: { ok: true } on success, else { errors: [{ field?, message }] } or { error }
      const res = await fetch(CONTACT.endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok !== false) { this._sent(); return; }
      this._errors(body.errors || [{ message: body.error }]);
    } catch {
      this.status.textContent = 'Could not send. Please try again, or find me on GitHub.';
    } finally { this.next.disabled = false; }
  }

  /** The service's errors, in the panel: a field's goes to its step and marks it; the rest are said as they come. */
  _errors(errors) {
    const ids = { description: 'ct-desc', name: 'ct-name', reply: 'ct-reply' };
    const field = errors.map((e) => e.field && this.root.querySelector(`#${ids[e.field]}`)).find(Boolean);
    if (field) {
      this._go(Number(field.closest('.ct-step').dataset.step));
      field.setAttribute('aria-invalid', 'true');
      field.addEventListener('input', () => field.removeAttribute('aria-invalid'), { once: true });
      field.focus();
    }
    this.status.textContent = errors.map((e) => e.message).filter(Boolean).join(' ') || 'Could not send. Please try again, or find me on GitHub.';
  }

  _sent() {
    this.form.hidden = true; this.about.hidden = true; this.done.hidden = false; this.status.textContent = '';
    this.root.classList.add('sent');
    document.body.classList.add('contact-flare');
    setTimeout(() => { this.root.classList.remove('sent'); document.body.classList.remove('contact-flare'); }, 1400);
    this.done.focus();
  }
}
