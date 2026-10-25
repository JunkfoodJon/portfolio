/**
 * audio.js — each world's music, rising as you go in.
 *
 * One number drives it, as it drives everything else: the pilot's depth. Out at
 * the crystal there is silence. Turning a face to you brings its music in
 * softly, the first plate takes it most of the way, and by the second it is at
 * full — the level never goes past that, however far you zoom. Deeper still the
 * arrangement fills out instead (pad → arpeggio → bass → bells → pulse), so the
 * zoom keeps adding without getting louder.
 *
 * Each world has a small generative score written for it here (key, tempo,
 * voices, patterns). Giving a score a `track` (an audio file path) plays that
 * file instead, looped, on the same curve; giving it `notes` (a written piece)
 * has its own voices play that piece in place of the patterns. `gain` trims a
 * world so they all peak at about the same loudness.
 *
 * Browsers only allow sound after a click or a key press (a scroll does not
 * count), so the context is made on the first one. M mutes (remembered).
 */

import { PROJECTS } from './content.js';

const MAX_GAIN = 0.5;                       // the ceiling: a world at full depth
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const easeOut = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return 1 - (1 - t) * (1 - t); };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/** Level for an absolute depth (1 = face centred, 1.5 = first plate): soft at the face, ~0.7 at the first plate, full by 2.2. */
export const levelFor = (A) => Math.pow(0.3 * smooth(0.45, 1.0, A) + 0.7 * easeOut(1.0, 2.2, A), 1.4);

// Where each layer comes in (absolute depth): the arrangement grows after the level has peaked.
const LAYERS = { pad: [0.4, 1.0], arp: [1.0, 1.6], bass: [1.5, 2.3], bell: [2.2, 3.0], perc: [2.8, 3.6] };

const SCALES = {
  dorian:   [0, 2, 3, 5, 7, 9, 10],
  aeolian:  [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian:   [0, 2, 4, 6, 7, 9, 11],
  major:    [0, 2, 4, 5, 7, 9, 11],
};

/**
 * Written pieces, for a score's `notes`. Each voice is one token per beat: a note ('f#4', middle C
 * is c4) or notes joined by '+', '-' holds, '.' rests; '|' only marks bars. The piece loops.
 * chord → pad, mel → arp (and the bell doubles its downbeats), bass → bass.
 */
// Erik Satie, Gymnopédie No. 1 (1888) — public domain; notes from the Mutopia Project edition
const GYMNOPEDIE_1 = {
  bpm: 70, meter: 3,
  mel: `
    . . .      | . . .      | . . .      | . . .
    . f#5 a5   | g5 f#5 c#5 | b4 c#5 d5  | a4 - -
    f#4 f#4 -  | - f#4 -    | - f#4 -    | - . .
    . f#5 a5   | g5 f#5 c#5 | b4 c#5 d5  | a4 - -
    c#5 - -    | f#5 - -    | e4 - -     | - - -
    - - -      | a4 b4 c5   | e5 d5 b4   | d5 c5 b4
    d5 - -     | - - d5     | e5 f5 g5   | a5 c5 d5
    e5 d5 b4   | d5 - -     | - - d5     | g5 - -
    f#5 - -    | b4 a4 b4   | c#5 d5 e5  | c#5 d5 e5
    f#4 - -    | . . .      | . . .      | g5 - -
    f5 - -     | b4 c5 f5   | e5 d5 c5   | e5 d5 c5
    f4 - -     | . . .      | . . .
  `,
  chord: `
    . b3+d4+f#4 -          | . a3+c#4+f#4 -         | . b3+d4+f#4 -          | . a3+c#4+f#4 -
    . b3+d4+f#4 -          | . a3+c#4+f#4 -         | . b3+d4+f#4 -          | . a3+c#4+f#4 -
    . b3+d4 -              | . a3+c#4 -             | . b3+d4 -              | . a3+c#4+f#4 -
    . b3+d4+f#4 -          | . a3+c#4+f#4 -         | . b3+d4+f#4 -          | . a3+c#4+f#4 -
    . a3+c#4+f#4 -         | . b3+d4+f#4 -          | . g3+b3 -              | . b3+d4+g4 -
    . f3+a3+d4 -           | . a3+c4+e4 -           | . g3+b3+e4 -           | . d3+g3+b3+e4 -
    . c3+e3+a3+d4 -        | . c3+f#3+a3+d4 -       | . a3+c4+f4 -           | . a3+c4+e4 -
    . d3+g3+b3+e4 -        | . c3+e3+a3+d4 -        | . c3+f#3+a3+d4 -       | . b3+e4+g4 -
    . a3+c#4+f#4 -         | . b3+d4+f#4 -          | . c#4+e4+a4 -          | . a3+c#4+f#4+a4 -
    . b2+a3+d4 e3+b3+d4+g4 | g3+c4+e4+a4+c5 - -     | a2+d3+d4+f#4+a4+d5 - - | . b3+e4+g4 -
    . a3+d4+f4+a4 -        | . a3+c4+f4 -           | . c4+e4+a4 -           | . a3+c4+f4+a4 -
    . b2+a3+d4 e3+b3+d4+g4 | g3+c4+e4+a4+c5 - -     | a2+d3+d4+f4+a4+d5 - -
  `,
  bass: `
    g2 - -  | d2 - -  | g2 - -  | d2 - -
    g2 - -  | d2 - -  | g2 - -  | d2 - -
    g2 - -  | d2 - -  | g2 - -  | d2 - -
    g2 - -  | d2 - -  | g2 - -  | d2 - -
    f#2 - - | b1 - -  | e2 - -  | e2 - -
    d2 - -  | a1 - -  | d2 - -  | d2 - -
    d2 - -  | d2 - -  | d2 - -  | d2 - -
    d2 - -  | d2 - -  | d2 - -  | e2 - -
    f#2 - - | b1 - -  | e2 - -  | e2 - -
    e2 - -  | a2 - -  | d2 - -  | e2 - -
    e2 - -  | e2 - -  | e2 - -  | e2 - -
    e2 - -  | a2 - -  | d2 - -
  `,
};

// Erik Satie, Gymnopédie No. 3 (1888) — public domain; notes from the Mutopia Project edition
const GYMNOPEDIE_3 = {
  bpm: 64, meter: 3,
  mel: `
    . . .    | . . .    | . . .    | . . .
    a5 - -   | g5 f5 e5 | d5 e5 f5 | e5 d5 c5
    e5 - -   | g5 - g5  | d5 - -   | - - -
    d5 - -   | . c5 f5  | g5 - a5  | d5 e5 f5
    b4 a4 g4 | a4 - -   | d4 - -   | - - -
    e5 - -   | f5 g5 f5 | e5 d5 e5 | - - -
    - d5 c5  | b4 c5 b4 | a4 - -   | . . .
    . . .    | . . .    | a5 - -   | g5 f5 e5
    d5 e5 f5 | e5 d5 c5 | e5 - -   | g5 - g5
    c5 b4 a4 | b4 - c5  | d5 - -   | e5 - -
    . . .    | . . .    | g5 - a5  | d5 e5 f5
    b4 a4 g4 | a4 - -   | d4 - -   | - - -
    e5 - -   | f5 g5 f5 | e5 d5 e5 | - - -
    - d5 c5  | b4 c5 b4 | a4 - -   | . . .
    . . .    | . . .    | . . .    | . . .
  `,
  chord: `
    . c4+e4+a4 -          | . b3+e4+g4 -          | . c4+e4+a4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . c4+e4+a4 -          | . a#3+d4+g4 -         | . a3+d4+f4 -
    . a3+c4+e4 -          | . g3+b3+e4 -          | . d3+g3+b3+f4+a4 -    | . a3+c4+f4 -
    . d3+g3+b3+f4+a4 -    | . a3+c4+f4 -          | . b3+e4+g4 -          | . a3+c4+f4 -
    . a3+c4+e4 -          | . a3+c4+f4 -          | . a3+c4+f4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | . c4+e4+a4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | . a3+c4+f4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | . c4+e4+a4 -          | . c4+e4+a4 -
    . a#3+d4+g4 -         | . a3+d4+f4 -          | . a3+c4+e4 -          | . g3+b3+e4 -
    . a3+c4+f4 -          | . g3+b3+e4 -          | . a3+c4+f4 -          | . c4+e4+a4 -
    . a3+c4+e4 -          | . a3+c4+f4 -          | . b3+e4+g4 -          | . a3+c4+f4 -
    . a3+c4+e4 -          | . a3+c4+f4 -          | . a3+c4+f4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | . c4+e4+a4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | . a3+c4+f4 -          | . b3+e4+g4 -
    . c4+e4+a4 -          | . b3+e4+g4 -          | e2+a2+c4+e4+a4+c5 - - | - - -
  `,
  bass: `
    a2 - - | d2 - - | a2 - - | d2 - -
    a2 - - | c3 - - | g2 - - | d2 - -
    a2 - - | e2 - - | g2 - - | d2 - -
    g2 - - | d2 - - | g1 - - | g1 - -
    g1 - - | d2 - - | g1 - - | g1 - -
    c2 - - | e2 - - | c2 - - | e2 - -
    c2 - - | e2 - - | a2 - - | d2 - -
    a2 - - | d2 - - | a2 - - | c3 - -
    g2 - - | d2 - - | a2 - - | e2 - -
    e2 - - | e2 - - | d2 - - | d2 - -
    d2 - - | d2 - - | g1 - - | g1 - -
    g1 - - | d2 - - | g1 - - | g1 - -
    c2 - - | e2 - - | c2 - - | e2 - -
    c2 - - | e2 - - | a2 - - | d2 - -
    a2 - - | d2 - - | a1 - - | - - -
  `,
};

const PITCH = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const noteMidi = (s) => { const m = /^([a-g])(#?)(\d)$/.exec(s); return 12 * (+m[3] + 1) + PITCH[m[1]] + (m[2] ? 1 : 0); };

/** A voice's beat tokens → per beat, null or { midi: [...], len: beats including its holds }. */
const parseNotes = (src) => {
  const tk = src.replace(/\|/g, ' ').trim().split(/\s+/);
  return tk.map((x, i) => {
    if (x === '.' || x === '-') return null;
    let len = 1;
    while (tk[i + len] === '-') len++;
    return { midi: x.split('+').map(noteMidi), len };
  });
};

/**
 * Scores. prog: scale degrees, two bars each. Patterns are sixteenths, usually a bar (other lengths
 * cycle across the bar line): a digit is a chord tone (0 root, 1 third, 2 fifth, 3 seventh, 4… the
 * next octave up), '.' rests; for perc, 'x' is a hit. A bell with `shift` plays the arp's figure
 * instead, one step further ahead every `shift` times round (phasing). Volumes are each layer's share before the depth level. A `track` or `notes`
 * takes over from the patterns (the patterns stay as the fallback); `gain` scales the whole world.
 */
const SCORES = {
  // a web of plucked silk, ticking like a mind at work — minimal electronic, D dorian
  arachnia: {
    track: 'audio/arachnia.mp3',           // “Machina” by Scott Buckley, CC BY 4.0
    bpm: 98, root: 50, scale: 'dorian', prog: [0, 3, 0, 6],
    pad:  { wave: 'sawtooth', cut: 700, vol: 0.09 },
    arp:  { voice: 'pluck', wave: 'triangle', pat: '0.2.4.2.1.3.5.3.', oct: 1, vol: 0.13 },
    bass: { pat: '0.......0...2...', vol: 0.2 },
    bell: { pat: '........6.......', oct: 1, vol: 0.05 },
    perc: { hat: '..x...x...x...xx', kick: 'x.......x.......', vol: 0.12 },
    reverb: 0.35, delay: 0.25, gain: 0.72,
  },
  // a box of gears: clockwork staccato over a steady drive — A minor
  openrubixmachina: {
    track: 'audio/openrubixmachina.mp3',   // “Welcome to the machine” by Komiku, CC0
    bpm: 112, root: 45, scale: 'aeolian', prog: [0, 5, 2, 6],
    pad:  { wave: 'square', cut: 600, vol: 0.06 },
    arp:  { voice: 'pluck', wave: 'square', pat: '0.0.2.0.4.0.2.0.', oct: 1, vol: 0.09, decay: 0.12 },
    bass: { pat: '0...0...0...0.2.', vol: 0.2 },
    bell: { pat: '....5.......4...', oct: 1, vol: 0.05 },
    perc: { hat: 'x.x.x.x.x.x.x.x.', kick: 'x...x...x...x...', vol: 0.1 },
    reverb: 0.25, delay: 0.12, gain: 0.9,
  },
  // a mind being read: slow drone, a thought pinging through, a heartbeat — C# phrygian
  thoughtslayer: {
    track: 'audio/thoughtslayer.mp3',      // “Shadows and Dust” by Scott Buckley, CC BY 4.0
    bpm: 66, root: 49, scale: 'phrygian', prog: [0, 1, 0, 5],
    pad:  { wave: 'sawtooth', cut: 480, vol: 0.13 },
    arp:  { voice: 'bell', pat: '0...............', oct: 2, vol: 0.1 },
    bass: { pat: '0...............', vol: 0.24, long: true },
    bell: { pat: '........4.....2.', oct: 1, vol: 0.05 },
    perc: { kick: 'x..x............', vol: 0.16 },
    reverb: 0.55, delay: 0.3, gain: 0.7,
  },
  // a rose window and a choir: sung pads, an organ pedal, a slow bell — E minor
  choirofsouls: {
    track: 'audio/choirofsouls.mp3',           // “The Illusionist” by Scott Buckley, CC BY 4.0
    bpm: 60, root: 52, scale: 'aeolian', prog: [0, 5, 3, 4],
    pad:  { wave: 'sawtooth', cut: 1400, vol: 0.12, vowel: true },
    arp:  { voice: 'bell', pat: '0.......4.......', oct: 1, vol: 0.07 },
    bass: { pat: '0...............', vol: 0.18, long: true },
    bell: { pat: '........7.......', oct: 1, vol: 0.05 },
    perc: { kick: 'x...............', vol: 0.1 },
    reverb: 0.7, delay: 0.1, gain: 0.75,
  },
  // the desktop's eye: a dreamy, wide synthwave haze — F lydian
  openshadowman: {
    track: 'audio/openshadowman.mp3',      // “Nighum” by cinameng (James Gargette), CC0
    bpm: 84, root: 53, scale: 'lydian', prog: [0, 1, 5, 4],
    pad:  { wave: 'sawtooth', cut: 1100, vol: 0.1, detune: 14 },
    arp:  { voice: 'pluck', wave: 'sine', pat: '0.1.2.3.4.3.2.1.', oct: 1, vol: 0.12, decay: 0.5 },
    bass: { pat: '0.....0.0.......', vol: 0.2 },
    bell: { pat: '............5...', oct: 1, vol: 0.05 },
    perc: { hat: '....x.......x...', kick: 'x.......x.......', vol: 0.12 },
    reverb: 0.45, delay: 0.3,
  },
  // a record and its light: warm keys on a soft four-on-the-floor — G major sevenths
  lightify: {
    track: 'audio/lightify.mp3',           // “Chill lofi inspired” by omfgdude, CC0
    bpm: 92, root: 55, scale: 'major', prog: [0, 5, 1, 4],
    pad:  { wave: 'triangle', cut: 1800, vol: 0.12 },
    arp:  { voice: 'pluck', wave: 'triangle', pat: '0..2..1.3..2..4.', oct: 1, vol: 0.12, decay: 0.4 },
    bass: { pat: '0..0..0.0..0..0.', vol: 0.18 },
    bell: { pat: '......4.........', oct: 1, vol: 0.05 },
    perc: { hat: '..x...x...x...x.', kick: 'x...x...x...x...', vol: 0.12 },
    reverb: 0.3, delay: 0.18,
  },
  // a screen inside a screen: every note comes back, a hop later — B♭ minor downtempo
  doppelstream: {
    track: 'audio/doppelstream.mp3',       // “Ephemera” by Scott Buckley, CC BY 4.0
    bpm: 100, root: 46, scale: 'aeolian', prog: [0, 5, 2, 6],
    pad:  { wave: 'sawtooth', cut: 900, vol: 0.09 },
    arp:  { voice: 'pluck', wave: 'triangle', pat: '0...2...4...2...', oct: 1, vol: 0.13, decay: 0.3 },
    bass: { pat: '0.....0.....0...', vol: 0.2 },
    bell: { pat: '..........5.....', oct: 1, vol: 0.05 },
    perc: { hat: '..x...x...x...x.', kick: 'x.....x...x.....', vol: 0.12 },
    reverb: 0.3, delay: 0.55, gain: 0.75,
  },
  // forms sculpted from distance: a twelve-note glass figure, and its twin drifting out of step over a steady pulse — E lydian
  isoline: {
    bpm: 116, root: 52, scale: 'lydian', prog: [0, 0, 1, 1, 0, 0, 5, 5],
    pad:  { wave: 'triangle', cut: 1500, vol: 0.1 },
    arp:  { voice: 'bell', pat: '042634062436', oct: 1, vol: 0.05, decay: 0.9 },
    bass: { pat: '0.0.0.0.0.0.0.0.', vol: 0.14 },
    bell: { shift: 6, oct: 1, vol: 0.045, decay: 0.9 },
    perc: { hat: '..x...x...x...x.', kick: 'x.......x.......', vol: 0.08 },
    reverb: 0.4, delay: 0.1, gain: 1.75,
  },
};

export class Score {
  constructor() {
    this.ctx = null;
    this.buses = new Map();
    this.face = -1;
    this.depth = 0;
    this.muted = false;
    try { this.muted = localStorage.getItem('eightfaces.muted') === '1'; } catch { /* storage blocked */ }

    const unlock = () => this._start();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'm' && e.key !== 'M') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      this.setMuted(!this.muted);
    });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend(); else this.ctx.resume();
    });
  }

  /**
   * Fetch every recording now, one after another, without decoding (playing waits for a click anyway), so
   * a side's music is already here when it starts. Each is kept as a blob its <audio> plays from.
   */
  async prefetch() {
    this.urls = this.urls || new Map();
    for (const sc of Object.values(SCORES)) {
      if (!sc.track || this.urls.has(sc.track)) continue;
      try {
        const res = await fetch(sc.track);
        if (res.ok) this.urls.set(sc.track, URL.createObjectURL(await res.blob()));
      } catch { /* it streams on demand instead */ }
    }
  }

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('eightfaces.muted', m ? '1' : '0'); } catch { /* storage blocked */ }
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.12);
  }

  /** How loud the mix is now, 0–1, or null when there is nothing to hear (not started, muted, suspended). */
  level() {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return null;
    this.analyser.getFloatTimeDomainData(this.tap);
    let s = 0;
    for (const v of this.tap) s += v * v;
    return Math.min(1, Math.sqrt(s / this.tap.length) * 5);
  }

  _start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume();
      // a recording asked to play outside a tap may have been refused (iOS): a tap is allowed to start it
      for (const b of this.buses.values()) if (b.on && b.el?.paused) b.el.play().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    // master: a gentle limiter so stacked layers never poke above the ceiling
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.02; comp.release.value = 0.3;
    this.master.connect(comp).connect(ctx.destination);
    // a tap for the picture (see level()); it only listens
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.master.connect(this.analyser);
    this.tap = new Float32Array(this.analyser.fftSize);

    // a shared hall and a shared echo
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.4);
    this.reverb.connect(this.master);
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.36;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
    this.delay.connect(tone).connect(fb).connect(this.delay);
    tone.connect(this.master);
    tone.connect(this.reverb);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    this.timer = setInterval(() => this._tick(), 40);
  }

  _impulse(sec) {
    const ctx = this.ctx, n = Math.floor(sec * ctx.sampleRate), buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    }
    return buf;
  }

  /** A world's mixer strip: layers → tone filter → level → master (+ hall and echo sends). */
  _bus(face) {
    let b = this.buses.get(face);
    if (b) return b;
    const ctx = this.ctx, sc = SCORES[PROJECTS[face].id];
    if (!sc) return null;
    const level = ctx.createGain(); level.gain.value = 0;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900; filter.Q.value = 0.4;
    filter.connect(level).connect(this.master);
    // a recording brings its own room, so it skips the hall and the echo
    const rv = ctx.createGain(); rv.gain.value = sc.track ? 0 : sc.reverb ?? 0.3; level.connect(rv).connect(this.reverb);
    const dl = ctx.createGain(); dl.gain.value = sc.track ? 0 : sc.delay ?? 0.2; level.connect(dl).connect(this.delay);
    const layers = {};
    for (const name of Object.keys(LAYERS)) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(filter); layers[name] = g;
    }
    b = { sc, level, filter, layers, step: 0, next: 0, on: false, lv: 0, el: null, set: {}, seq: null, bpm: sc.notes?.bpm ?? sc.bpm };
    if (sc.notes) b.seq = { mel: parseNotes(sc.notes.mel), chord: parseNotes(sc.notes.chord), bass: parseNotes(sc.notes.bass) };
    if (sc.track) {
      b.el = new Audio(this.urls?.get(sc.track) || sc.track); b.el.loop = true;
      ctx.createMediaElementSource(b.el).connect(filter);
      layers.pad.gain.value = 1;
    }
    this.buses.set(face, b);
    return b;
  }

  /** Each frame: which face, how deep (Pilot.depth). */
  update(face, depth) {
    this.face = face; this.depth = depth;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const ramp = (b, key, param, v, tc) => {
      if (Math.abs((b.set[key] ?? -1) - v) < 0.002) return;
      b.set[key] = v; param.setTargetAtTime(v, now, tc);
    };
    if (face >= 0) this._bus(face);
    for (const [f, b] of this.buses) {
      const here = f === face;
      const lv = here ? levelFor(depth) : 0;
      b.lv = lv;
      ramp(b, 'level', b.level.gain, MAX_GAIN * lv * (b.sc.gain ?? 1), here ? 0.35 : 0.6);
      ramp(b, 'cut', b.filter.frequency, 700 + 7000 * Math.pow(lv, 1.5), 0.4);
      if (!b.el) for (const [name, [a, z]] of Object.entries(LAYERS)) {
        const part = b.sc[name];
        ramp(b, name, b.layers[name].gain, part ? part.vol * (name === 'pad' ? 1 : smooth(a, z, depth)) * (here ? 1 : 0) : 0, 0.5);
      }
      const audible = here && lv > 0.001;
      if (audible && !b.on) {
        b.on = true; b.step = 0; b.next = now + 0.06;
        b.el?.play().catch(() => {});
      } else if (!audible && b.on && b.level.gain.value < 0.002) {
        b.on = false; b.el?.pause();
      }
    }
  }

  // ── the sequencer ───────────────────────────────────────────────────────────

  _tick() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const horizon = this.ctx.currentTime + 0.2;
    for (const b of this.buses.values()) {
      if (!b.on || b.el) continue;
      const dt = 60 / b.bpm / 4;
      if (b.next < this.ctx.currentTime - 0.5) b.next = this.ctx.currentTime + 0.02;   // after a stall, don't flood
      while (b.next < horizon) { this._step(b, b.step, b.next, dt); b.step++; b.next += dt; }
    }
  }

  /** Chord tone j of scale degree deg, as MIDI (tones stack in thirds; past the seventh they go up an octave). */
  _tone(sc, deg, j) {
    const S = SCALES[sc.scale], idx = deg + 2 * j;
    return sc.root + S[idx % 7] + 12 * Math.floor(idx / 7);
  }

  /** A written piece: one beat is four steps; each voice's notes last as long as their holds. */
  _written(b, i, t, dt) {
    if (i % 4) return;
    const sc = b.sc, L = b.layers, k = i / 4, beat = dt * 4;
    const want = (name) => (b.set[name] ?? 0) > 0.001;
    const at = (v) => b.seq[v][k % b.seq[v].length];
    let n = at('chord');
    if (n && want('pad')) for (const m of n.midi) this._pad(t, mtof(m), n.len * beat, L.pad, sc.pad);
    if ((n = at('mel'))) for (const m of n.midi) {
      if (want('arp')) {
        if (sc.sing) this._pad(t, mtof(m), n.len * beat, L.arp, sc.pad);
        else if (sc.arp.voice === 'bell') this._bell(t, mtof(m), L.arp, Math.max(2.6, n.len * beat));
        else this._pluck(t, mtof(m), L.arp, sc.arp.wave || 'triangle', sc.arp.decay || 0.3);
      }
      if (sc.bell && want('bell') && k % sc.notes.meter === 0) this._bell(t, mtof(m + 12 * (sc.bell.oct || 0)), L.bell, 3.5);
    }
    if ((n = at('bass')) && want('bass')) for (const m of n.midi) this._bass(t, mtof(m), n.len * beat, L.bass);
  }

  _step(b, i, t, dt) {
    if (b.seq) return this._written(b, i, t, dt);
    const sc = b.sc, L = b.layers, s = i % 16, bar = Math.floor(i / 16);
    const deg = sc.prog[Math.floor(bar / 2) % sc.prog.length];
    const want = (name) => (b.set[name] ?? 0) > 0.001;
    const ch = (pat) => (pat ? pat[i % pat.length] : '.');

    if (sc.pad && s === 0 && bar % 2 === 0 && want('pad')) {
      const len = dt * 32;
      for (let j = 0; j < 4; j++) this._pad(t, mtof(this._tone(sc, deg, j)), len, L.pad, sc.pad);
    }
    if (sc.arp && want('arp')) {
      const c = ch(sc.arp.pat);
      if (c >= '0' && c <= '9') {
        const f = mtof(this._tone(sc, deg, +c) + 12 * (sc.arp.oct || 0));
        if (sc.arp.voice === 'bell') this._bell(t, f, L.arp, sc.arp.decay || 2.6);
        else this._pluck(t, f, L.arp, sc.arp.wave || 'triangle', sc.arp.decay || 0.3);
      }
    }
    // phasing: the bell plays the arp's figure, one step further ahead every `shift` times round
    if (sc.bell?.shift && want('bell')) {
      const n = sc.arp.pat.length, c = sc.arp.pat[(i + Math.floor(i / (n * sc.bell.shift))) % n];
      if (c >= '0' && c <= '9') this._bell(t, mtof(this._tone(sc, deg, +c) + 12 * (sc.bell.oct || 0)), L.bell, sc.bell.decay || 2.6);
    }
    if (sc.bass && want('bass')) {
      const c = ch(sc.bass.pat);
      if (c >= '0' && c <= '9') this._bass(t, mtof(this._tone(sc, deg, +c) - 12), sc.bass.long ? dt * 30 : dt * 3, L.bass);
    }
    if (sc.bell && !sc.bell.shift && want('bell')) {
      const c = ch(sc.bell.pat);
      if (c >= '0' && c <= '9' && bar % 2 === 1) this._bell(t, mtof(this._tone(sc, deg, +c) + 12 * (sc.bell.oct || 0)), L.bell, 3.5);
    }
    if (sc.perc && want('perc')) {
      if (ch(sc.perc.hat) === 'x') this._hat(t, L.perc, s % 4 === 2 ? 1 : 0.6);
      if (ch(sc.perc.kick) === 'x') this._kick(t, L.perc);
    }
  }

  // ── voices ──────────────────────────────────────────────────────────────────

  _env(t, a, peak, hold, rel) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    return g;
  }

  _pad(t, f, len, out, p) {
    const ctx = this.ctx, att = Math.min(1.6, len * 0.3), rel = Math.min(2.4, len * 0.4);
    const env = this._env(t, att, 0.22, Math.max(0, len - att - rel * 0.5), rel);
    let dest = env;
    if (p.vowel) {                                    // sung "ah": two formants in parallel
      const mix = ctx.createGain(); mix.gain.value = 1;
      for (const [fq, q, gn] of [[730, 8, 1], [1090, 10, 0.6], [2440, 12, 0.25]]) {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
        const g = ctx.createGain(); g.gain.value = gn * 3;
        mix.connect(bp).connect(g).connect(env);
      }
      dest = mix;
    } else {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = p.cut || 900;
      lp.connect(env); dest = lp;
    }
    env.connect(out);
    const det = p.detune ?? 7;
    for (const d of [-det, det]) {
      const o = ctx.createOscillator(); o.type = p.wave || 'sawtooth'; o.frequency.value = f; o.detune.value = d;
      if (p.vowel) { const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 9; lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + len + rel); }
      o.connect(dest); o.start(t); o.stop(t + len + rel + 0.1);
    }
  }

  _pluck(t, f, out, wave, decay) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(Math.min(12000, f * 8), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 1.2), t + decay);
    const env = this._env(t, 0.004, 0.5, 0, decay * 1.6);
    o.connect(lp).connect(env).connect(out);
    o.start(t); o.stop(t + decay * 1.6 + 0.05);
  }

  _bell(t, f, out, dur) {                              // two-operator FM: inharmonic, glassy
    const ctx = this.ctx;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(mg).connect(car.frequency);
    const env = this._env(t, 0.003, 0.35, 0, dur);
    car.connect(env).connect(out);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }

  _bass(t, f, len, out) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
    const env = this._env(t, 0.02, 0.6, Math.max(0, len - 0.3), 0.4);
    o.connect(env); o2.connect(lp).connect(env); env.connect(out);
    for (const x of [o, o2]) { x.start(t); x.stop(t + len + 0.5); }
  }

  _hat(t, out, v) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.noise;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const env = this._env(t, 0.002, 0.18 * v, 0, 0.06);
    src.connect(hp).connect(env).connect(out);
    src.start(t, Math.random() * 0.5, 0.1);
  }

  _kick(t, out) {
    const ctx = this.ctx, o = ctx.createOscillator();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const env = this._env(t, 0.003, 0.9, 0, 0.32);
    o.connect(env).connect(out);
    o.start(t); o.stop(t + 0.4);
  }
}
