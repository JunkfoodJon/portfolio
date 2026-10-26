/**
 * main.js — boot and the frame loop.
 *
 * WebGL mode has no HTML UI at all: the crystal and the information wall are
 * the interface. The DOM layer (dossier.js) is built only if WebGL cannot start,
 * where it becomes a plain readable page.
 */

import * as THREE from 'three';
import { Crystal, MOBILE } from './crystal.js';
import { FaceRenderer } from './emblems.js';
import { Wall }         from './wall.js';
import { World, PlateRenderer, fontsReady } from './worlds/world.js';
import { Pilot }        from './pilot.js';
import { Dossier }      from './dossier.js';
import { Score }        from './audio.js';
import { PROJECTS }     from './content.js';
import { Contact }      from './contact.js';

const loader  = document.getElementById('loader');
const canvas  = document.getElementById('canvas');
const tipEl   = document.getElementById('tip');
const liveEl  = document.getElementById('live');
const hintEl  = document.getElementById('hint');
const loaderFaces = loader.querySelectorAll('.loader-dot i');

// the loader stays until every side is prepared (see warmStep), or this long at most: past it the page opens
// anyway and the rest is prepared behind it (a side not yet ready holds its approach, see Pilot)
const WAIT_CAP = 5000;
const warmed = new Array(8).fill(false);

await fontsReady;                                    // (painted words: lay out only once their faces are in)

let crystal = null, faces = null, pilot = null, world = null, plates = null, score = null;

try {
  // ?flat forces the no-WebGL page (handy for testing it)
  if (new URLSearchParams(location.search).has('flat')) throw new Error('flat layout requested');
  crystal = new Crystal(canvas);
  faces   = new FaceRenderer(crystal.renderer);
  crystal.applyFaceTextures(faces.textures);

  const wall = new Wall();
  const texture = new THREE.CanvasTexture(wall.canvas);
  texture.anisotropy = Math.min(8, crystal.renderer.capabilities.getMaxAnisotropy());

  // faces with a world (a painting you fall into) draw it here; they share the wall's canvas for their words
  world  = new World(wall.canvas);
  plates = new PlateRenderer(crystal.renderer, texture);

  let tipFace = -2;
  pilot = new Pilot({
    crystal, faces, wall, texture, world, plates,
    ready: (i) => warmed[i],
    onLabel: (face, x, y) => {
      if (face < 0) { tipEl.classList.remove('on'); tipFace = -2; return; }
      if (tipFace !== face) { tipEl.textContent = PROJECTS[face].name; tipFace = face; }
      const w = tipEl.offsetWidth || 120;
      tipEl.style.transform = `translate(${Math.min(x + 16, window.innerWidth - w - 12)}px, ${y + 14}px)`;
      tipEl.classList.add('on');
    },
    onAnnounce: (text) => { liveEl.textContent = text; },
  });
  score = new Score();
} catch (err) {
  console.warn('WebGL unavailable — showing the plain page.', err);
  crystal = faces = pilot = world = plates = null;
  document.body.classList.add('no-webgl');
  const dossier = new Dossier({
    onSelect: (i) => dossier.open(i, { keepTab: true }),
    onHover:  () => {},
    onClose:  () => dossier.close(),
    onStep:   (d) => dossier.open((dossier.index + d + PROJECTS.length) % PROJECTS.length, { keepTab: true }),
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') dossier.close(); });
}

function dismissLoader(delay, keep = false) {
  setTimeout(() => {
    pilot?.startIntro();
    loader.classList.add('out');
    if (!keep) setTimeout(() => loader.remove(), 900);   // (kept where it comes back over a side, see warmStep)
  }, delay);
}

if (!crystal) {
  hintEl?.setAttribute('hidden', '');
  dismissLoader(0);
} else {
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.body.classList.add('ctx-lost'); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  window.addEventListener('resize', () => { crystal.resize(); plates.resize(); });

  // the hint is there to be read once (a phone's names its own gestures)
  if (MOBILE && hintEl) hintEl.innerHTML = 'Drag to spin &nbsp;·&nbsp; Pinch to approach &nbsp;·&nbsp; Two-finger tap returns &nbsp;·&nbsp; Tap for sound';
  const hideHint = () => hintEl?.classList.add('gone');
  window.addEventListener('pointerdown', hideHint, { once: true });
  window.addEventListener('wheel', hideHint, { once: true, passive: true });
  window.addEventListener('keydown', hideHint, { once: true });
  setTimeout(hideHint, 9000);

  // the contact panel: its glyph only at orbit; while it is open the crystal takes no input
  const contact = new Contact({ onOpen: () => pilot.pause(true), onClose: () => pilot.pause(false) });

  // the warm-up: every program is compiled in the background from the start (parallel compile, where the
  // driver has it), and nothing is drawn with one before it is in: a draw would wait on it, and the loader
  // with it. Meanwhile each side's words are laid out; then each side whose programs are in is drawn once
  // off screen and its face lights in the loader. One step a frame at most, asked of the driver every
  // 50 ms, never waited on.
  // Without parallel compile (Firefox) a program compiles on the main thread the first time it is drawn, and a
  // world's takes seconds: those are left out of the loader, which opens once the words are laid out, and each is
  // compiled only once a side is approached, when its hold has come to a stop (Pilot.holding). The page stands
  // still while it is, so the loader comes back over the side first, veiled (VEIL ms to fade in: the compositor
  // keeps it turning through the compile), and its face lights once the side is in
  const parallel = crystal.renderer.extensions.has('KHR_parallel_shader_compile');
  if (parallel) plates.prepare();
  else loader.querySelector('.loader-note').textContent = `${/Firefox\//.test(navigator.userAgent) ? 'Firefox' : 'This browser'} builds each world from scratch — this takes a moment`;
  const VEIL = 400;
  let veilAt = -1;
  const emblemsIn = new Array(8).fill(false);
  const emblems = faces.prepare();
  emblems.forEach((p, i) => p.then(() => { emblemsIn[i] = true; }));
  let sceneIn = false;                                   // the crystal, the bloom and every emblem
  Promise.all([crystal.prepare(), ...emblems]).then(() => { sceneIn = true; });
  const laid = new Array(8).fill(false);
  let nextPoll = 0, shared = false, allWarm = false, booted = false, dismissed = false;
  const warmStep = (now) => {
    if (allWarm || now < nextPoll) return false;
    nextPoll = now + 50;
    const l = laid.indexOf(false);
    if (l >= 0) { world.prelayout(l); laid[l] = true; return true; }
    if (!shared) { if (plates.ready()) { plates.warmShared(); shared = true; return true; } return false; }
    if (!parallel) {
      if (!booted) { booted = true; score.prefetch(); }
      const f = pilot.holding;
      if (f < 0 || warmed[f]) { if (veilAt >= 0) { veilAt = -1; loader.classList.add('out'); } return false; }
      if (veilAt < 0) {
        if (!dismissed || !loader.classList.contains('out')) return false;   // (the opening loader is still on its way out)
        veilAt = now; loader.classList.add('veil'); loader.classList.remove('out');
        return false;
      }
      if (now - veilAt < VEIL) return false;
      plates.warm(world.defOf(f));
      warmed[f] = true;
      loaderFaces[f]?.classList.add('on');
      veilAt = -1; loader.classList.add('out');
      if (warmed.every(Boolean)) allWarm = true;
      return true;
    }
    for (let i = 0; i < 8; i++) {
      if (warmed[i] || !emblemsIn[i] || !plates.ready(world.defOf(i))) continue;
      plates.warm(world.defOf(i));
      warmed[i] = true;
      loaderFaces[i]?.classList.add('on');
      if (warmed.every(Boolean)) { allWarm = true; score.prefetch(); }
      return true;
    }
    return false;
  };

  const facing = new Array(8).fill(true);
  let last = performance.now(), t = 0, emaDt = 1 / 60, slow = 0, frameCount = 0, words = -1, warming = false;
  const startedAt = performance.now();
  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  const frame = (now) => {
    requestAnimationFrame(frame);
    // real elapsed time (capped only against tab-switch jumps) so a slow GPU gets fewer frames, not slow motion
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.2));
    last = now;
    t += dt;
    const redrew = plates.text.version !== words;        // the last frame redrew the words' canvas (so dt is mostly that)
    words = plates.text.version;
    const warmedLast = warming;                          // … or prepared a side
    warming = warmStep(now);

    pilot.update(dt, t);
    score.update(pilot.focused, pilot.depth);
    contact.setOrbit(dismissed && pilot.depth < 0.02 && !pilot.goal);
    crystal.update(dt, t);
    if (!sceneIn) return;
    crystal.facing(facing);
    faces.render(t, dt, facing, pilot.focused, pilot.emblemOn);
    if (pilot.worldOn && pilot.infoOn > 0.01) { plates.setMusic(score.level(), dt); plates.render(world, pilot.levels, t, pilot.pointer, pilot.art); }
    crystal.render();

    // frame-time governor, one way only (it never steps back up, so it cannot oscillate): after ~1.5 s
    // (counted in time, not frames, so a slow GPU is not kept waiting through 90 slow ones) under ~45 fps (a
    // 50 Hz screen is not slow) the pixel ratio 0.5 at a time from MAX_RATIO down to 1 (2 → 1.5 → 1, 1.4 → 1;
    // MSAA returns below 1.5); then, under ~26 fps, the plates' size, then MSAA. A frame counts for at most 50 ms, so a one-off hitch (a shader compiling)
    // does not trip it, and frames that follow a redraw of the words' canvas not at all: that time is the
    // CPU's, and fewer pixels would not buy it back (nor do those that prepared a side: that is the warm-up's)
    if (!redrew && !warmedLast) {
      emaDt += (dt - emaDt) * Math.min(1, dt * 3);
      if (t > 4 && emaDt > (crystal.pixelRatio > 1 ? 1 / 45 : 1 / 26)) slow += Math.min(dt, 0.05); else slow = Math.max(0, slow - 2 * dt);
    }
    if (slow > 1.5) {
      slow = 0;
      if (crystal.pixelRatio > 1) { crystal.setPixelRatio(Math.max(1, crystal.pixelRatio - 0.5)); plates.resize(); }
      else if (plates.scale > 0.7) plates.setScale(0.7);
      else if (MOBILE && plates.scale > 0.5) plates.setScale(0.5);          // (a phone has one step more to give)
      else if (crystal.post.quality > 0) crystal.post.setQuality(0);
    }

    if (frameCount++ >= 3 && !dismissed && (allWarm || booted || now - startedAt > WAIT_CAP)) {
      dismissed = true;
      dismissLoader(Math.max(0, 900 - (performance.now() - startedAt)), !parallel);
    }
  };
  requestAnimationFrame(frame);
}
