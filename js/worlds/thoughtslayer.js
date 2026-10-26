/**
 * thoughtslayer.js — ThoughtSlayer as a world: a mind that reads what passes through it.
 *
 *   0 The Mind            a head, eyes closed, listening; brainwaves ring out
 *                         from its temples and its third eye stands open —
 *                         the way in
 *   1 The Eye             the third eye, wide and watching; through its pupil,
 *                         what it is looking at
 *   2 The Thought-stream  thoughts carried past on a slow current, the brain's
 *                         rhythms traced along its banks, the figures on them;
 *                         one thought is held and read, and opens
 *   3 The Verdict         the thought set out field by field (its makings and
 *                         what is inside) and judged friend,
 *                         unknown or foe on a seal — and in the seal, the Mind again
 *
 * Art direction: a dark mind with one waking eye. The darkness is the canvas; the
 * eye, the rings of thought and whatever it reads get the light. Everything is
 * engraved — line width is the only brightness. Its words arrive as thoughts being
 * read: ghosted, then focused, then judged (textFx).
 */

export const THOUGHTSLAYER = {
  id: 'thoughtslayer',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — night, friend teal, unknown amber, foe red
  palette: ['#0b1f3a', '#2aa7b8', '#ffd27a', '#ff3347'],
  // how its words arrive (world.js): scrambled signal resolving into a verdict; figures guess before they settle
  reveal: 'decode',
  flicker: true,
  // and painted (world.js): titles and figures in a CRT terminal's face, the rest in a monitor's monospace
  fonts: { title: ['VT323', 400], body: ['Share Tech Mono', 400] },
  // its words are judged as they are read (textFx): each inscription's `verdict` (0 friend, 1 unknown, 2 foe, or
  // by word); what is not judged is its own account of itself, a friend
  verdicts: true,
  // at rest its wash is thought fog, faint pulses running out from the words
  wash: { scale: 80, speed: 0.05, flow: [1, 0], warp: 1.0, ripple: 0.2, bands: 1.6, style: 2 },

  // portal / medal: [x, y, r] circles or [x, y, r, aspect] rectangles, in the plate's own units
  plates: [
    { title: 'The Mind', note: 'A head, eyes closed, listening; its third eye open. Scroll into the third eye.', portal: [0, 0.36, 0.13], medal: [0, 0.05, 1.15] },
    { title: 'The Eye', note: 'The third eye, wide and watching. Scroll into its pupil.', portal: [0, 0, 0.11], medal: [0, 0, 1] },
    { title: 'The Thought-stream', note: 'Thoughts carried past on a slow current; one is held and read. Scroll into it.', portal: [0, -0.27, 0.075], medal: [0, 0, 1] },
    { title: 'The Verdict', note: 'The thought, field by field, judged friend, unknown or foe. In the seal, the Mind again.', portal: [0, -0.4, 0.125], medal: [0, 0, 1] },
  ],

  inscriptions(p) {
    const out = [];
    // 0 · under the head: the name and the overview; either side of it, what it does
    out.push({ plate: 0, text: p.name, x: 0, y: -0.6, size: 0.085, track: 0.2, upper: true });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.69, size: 0.03, w: 2.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.755, size: 0.019, track: 0.22, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.805, size: 0.015, track: 0.12, alpha: 0.5 });
    const sentences = p.summary.match(/[^.]+\.\s*/g) || [p.summary];
    const cut = Math.ceil(sentences.length / 2);
    [sentences.slice(0, cut), sentences.slice(cut)].forEach((part, i) => {
      out.push({ plate: 0, text: part.join(' ').trim(), x: i ? 0.72 : -0.72, y: -0.08, size: 0.027, w: 0.46, lh: 1.5, alpha: 0.88 });
    });

    // 1 · the eye: the three verdicts round its pupil; the highlights in the corners round it
    const VERDICTS = { friend: 0, unknown: 1, foe: 2 };
    out.push({ plate: 1, text: 'friend  ·  foe  ·  unknown', x: 0, y: 0, size: 0.017, track: 0.18, upper: true, arc: { r: 0.155, a: Math.PI / 2 }, alpha: 0.85, verdict: VERDICTS });
    const corners = [[-0.52, 0.6], [0.52, 0.6], [-0.52, -0.6], [0.52, -0.6]];
    // (content.js order: decoys flag a foe; the live monitor watches the unknown; detections find foes; responses are the friend's)
    const judged = [2, 1, 2, 0];
    p.highlights.forEach((t, i) => {
      const [x, y] = corners[i % 4];
      out.push({ plate: 1, text: t, x, y, size: 0.022, w: 0.36, lh: 1.42, alpha: 0.88, verdict: judged[i] });
    });

    // 2 · the stream: the figures on its banks; the held thought's verdict under it
    const spots = [[-0.48, 0.62], [0.48, 0.62], [-0.5, -0.4], [0.5, -0.4]];
    p.stats.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 2, text: v, count: s, x, y, size: 0.075, weight: 200, track: 0.02 });
      out.push({ plate: 2, text: s.label, x, y: y - 0.086, size: 0.026, track: 0.04, upper: true, w: 0.36, lh: 1.25, alpha: 0.72, hang: true });   // (wrapped inside its column)
    });
    out.push({ plate: 2, text: 'unknown  ·  held for reading', x: 0, y: -0.45, size: 0.017, track: 0.2, upper: true, alpha: 0.7, verdict: 1 });

    // 3 · the verdict: the stack and what is inside as the thought's fields, the seal's three judgements
    const rowA = [-0.31, 0.31], rowB = [-0.533, 0, 0.533], rowC = [-0.66, -0.22, 0.22, 0.66];
    p.stack.forEach(([g, items], i) => {
      const top = i < 2;
      const x = top ? rowA[i] : rowB[(i - 2) % 3], y = top ? 0.52 : 0.32;
      out.push({ plate: 3, text: g, x, y: y + 0.064, size: 0.017, track: 0.22, upper: true, alpha: 0.6 });
      out.push({ plate: 3, text: items.join('  ·  '), x, y: y - 0.012, size: top ? 0.04 : 0.026, weight: top ? 200 : 300, w: top ? 0.56 : 0.46, lh: 1.35 });
    });
    p.inside.forEach((s, i) => {
      out.push({ plate: 3, text: s.title, x: rowC[i % 4], y: 0.172, size: 0.034, face: 'title' });
      out.push({ plate: 3, text: s.text, x: rowC[i % 4], y: 0.122, size: 0.026, w: 0.39, lh: 1.3, alpha: 0.85, hang: true });   // (wrapped inside its field)
    });
    out.push({ plate: 3, text: 'friend', x: -0.25, y: -0.27, size: 0.025, track: 0.16, upper: true, alpha: 0.75, verdict: 0 });
    out.push({ plate: 3, text: 'unknown', x: 0, y: -0.15, size: 0.025, track: 0.16, upper: true, alpha: 0.75, verdict: 1 });
    out.push({ plate: 3, text: 'foe', x: 0.25, y: -0.27, size: 0.025, track: 0.16, upper: true, alpha: 0.75, verdict: 2 });
    out.push({ plate: 3, text: 'never phones home', x: 0, y: -0.4, size: 0.027, track: 0.18, upper: true, arc: { r: 0.24, a: -Math.PI / 2 } });
    return out;
  },

  // on top of the paint (world.js), the words as thoughts being read: while the paint is wet, faint ghost copies
  // of it drift round the letters (one mirrored) in a slow field of brainwave rings; scrolling in, the third
  // eye's focus ring tightens round the block, the ghosts converge, and it locks with a verdict's colour —
  // friend teal, unknown amber, foe a red flare — before settling into the plate's own
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float p = w0.y, m = 1.0 - p, em = max(w0.w, 8.0), plaque = (1.0 - clear) / 0.95;
  if (w0.x > 3.0 * em) return;                               // (nothing reaches this far from a word)
  vec2 P = uv * uCanvas;
  // the focus: a ring round each block, tightening as you scroll in, gone once it is read
  float R = min(mix(2.6 * em, 0.6 * em, smoothstep(0.0, 0.85, p)), 110.0);   // (within the field's reach)
  float fw = 0.06 * em + 0.6;
  float focus = (1.0 - smoothstep(fw, fw + 0.9, abs(w0.x - R)))
              * smoothstep(0.0, 0.08, p) * (1.0 - smoothstep(0.82, 0.95, p));
  // thought noise: ghosts of the words drifting well apart, the last one mirrored, flickering
  float ghosts = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 o = (vec2(sin(uTime * 0.21 + fi * 2.1), cos(uTime * 0.17 + fi * 1.3)) * 0.4 + vec2(fi - 1.0, 0.45 * (fi - 1.0))) * 1.6 * em * m;
    vec2 at = P + o;
    if (i == 2) { float c = (floor(P.x / (3.0 * em)) + 0.5) * 3.0 * em; at.x = 2.0 * c - at.x; }
    vec4 G = texture(uText, at / uCanvas);
    float painted = smoothstep(0.0, 0.05, G.b / max(G.r, 1e-3));   // (only paint that has been laid casts a ghost)
    ghosts = max(ghosts, G.a * G.r * painted * (i == 2 ? 0.8 * m : 0.9));
  }
  ghosts *= mix(1.0, 0.35 + 0.9 * noise3(vec3(P / em * 1.5, uTime * 0.8)), m);
  // brainwave interference rings in the plaque, well clear of the letters; none left at rest round small words
  float F = sin(w0.x / em * 5.0 - uTime * 0.7) * sin(dot(P / em, vec2(0.8, 0.6)) * 2.2 + uTime * 0.4);
  float band = (1.0 - smoothstep(0.0, 0.14, abs(F))) * plaque * smoothstep(0.35 * em, 0.6 * em, w0.x)
             * (0.04 * smoothstep(16.0, 30.0, em) + 0.22 * m);
  txt = max(max(max(txt, ghosts * 0.5 * m), focus * 0.95), band);   // (the ghosts beside the letters, never over them)
  // the verdict the words were given (an inscription's own, see verdicts): it flashes in as the word locks, a glow
  // of its colour round the block (a foe flares and flickers), and settles back into the plate's colours. Friend
  // teal, unknown amber, foe red; what is not judged is a friend
  float vd = verdictAt(uv);
  vec3 verdict = vd > 1.5 ? vec3(1.0, 0.18, 0.22) : vd > 0.5 ? vec3(1.0, 0.72, 0.25) : vec3(0.1, 0.85, 0.78);
  float lock = smoothstep(0.55, 0.8, p) * (1.0 - smoothstep(0.9, 1.0, p));
  tc = mix(tc, verdict, lock);
  float flare = vd > 1.5 ? 0.85 * (0.75 + 0.25 * sin(uTime * 23.0)) : 0.5;
  txt = max(txt, lock * flare * exp(-max(w0.x, 0.0) / (0.45 * em)) * plaque);
}
`,

  glsl: /* glsl */ `

// fbm3 written out: the brain's folds and the eye's veins take it at every pixel, where the loop fbm3 keeps
// (for a quicker first compile) costs a third more frame time; the same noise, octave for octave
float tsFbm(vec3 p) { float s = 0.5 * noise3(p); p *= 2.03; s += 0.25 * noise3(p); p *= 2.03; s += 0.125 * noise3(p); p *= 2.03; return s + 0.0625 * noise3(p); }

// rays out of a point: isolines of the angle, each as wide as lum asks
float tsRays(vec2 d, float lum, float g) {
  float r = max(length(d), 1e-3);
  return engrave(atan(d.y, d.x), lum, g / r, 0.02);
}

// a sparse, slowly twinkling field of stars
float tsStars(vec2 q, float g) {
  vec2 c = floor(q / 0.07), f = q - (c + 0.5) * 0.07;
  float h = hash3(vec3(c, 3.0));
  if (h > 0.32) return 0.0;
  vec2 o = (vec2(hash3(vec3(c, 5.0)), hash3(vec3(c, 7.0))) - 0.5) * 0.045;
  float r = max(0.0015 + 0.0035 * hash3(vec3(c, 9.0)), 0.8 * g);
  float tw = 0.45 + 0.4 * sin(uTime * (0.8 + h * 3.0) + h * 40.0);
  return (1.0 - smoothstep(r - g, r + g, length(f - o))) * tw;
}

// a parabolic stroke y = y0 − k (x − x0)² over |x − x0| < hw, as a distance (for brows, lids, the mouth)
float tsArc(vec2 q, float x0, float y0, float k, float hw) {
  float dx = q.x - x0, f = q.y - (y0 - k * dx * dx);
  return abs(f) / sqrt(1.0 + 4.0 * k * k * dx * dx) + max(abs(dx) - hw, 0.0);
}

// ═══ 0 · THE MIND ══════════════════════════════════════════════════════════

// what the watchman wires into: traces of a circuit board over the shoulders, running in toward the neck, each
// cell one run (along x or y) ending in a via; ph: how far a signal has run along them (0: still; for motion)
float tsTraces(vec2 q, float g, float w, float ph) {
  const float C = 0.055;
  vec2 id = floor(q / C), f = q - (id + 0.5) * C;
  float h = hash3(vec3(id, 11.0));
  if (h > 0.62) return 0.0;
  bool alongX = hash3(vec3(id, 12.0)) < 0.5;
  float off = (hash3(vec3(id, 13.0)) - 0.5) * 0.5 * C;
  vec2 a = alongX ? vec2(-0.5 * C, off) : vec2(off, -0.5 * C), b = alongX ? vec2(0.5 * C, off) : vec2(off, 0.5 * C);
  float d = sdSeg(f, a, b);
  float via = abs(length(f - b * 0.8) - 0.006);
  float sig = 0.6 + 0.4 * sin(h * 40.0 + ph);
  return max(ink(d, w * 0.55, g), ink(via, w * 0.5, g)) * sig;
}

// synapses in the brain: sparse nodes where its folds meet, with a faint halo (ph: their firing, 0: still)
float tsSynapses(vec2 q, float g, float ph) {
  const float C = 0.034;
  vec2 id = floor(q / C), f = q - (id + 0.5) * C;
  float h = hash3(vec3(id, 21.0));
  if (h > 0.28) return 0.0;
  vec2 o = (vec2(hash3(vec3(id, 22.0)), hash3(vec3(id, 23.0))) - 0.5) * 0.5 * C;
  float r = length(f - o), fire = 0.55 + 0.45 * sin(h * 31.0 + ph);
  return max(1.0 - smoothstep(0.0035 - g, 0.0035 + g, r), 0.25 * exp(-r / 0.007)) * fire;
}

// the head and shoulders, front on, as one smooth outline
float tsHead(vec2 q) {
  float cran = (length((q - vec2(0.0, 0.17)) / vec2(0.37, 0.45)) - 1.0) * 0.37;
  float jaw = (length((q - vec2(0.0, -0.08)) / vec2(0.27, 0.34)) - 1.0) * 0.27;
  float ear = (length((vec2(abs(q.x), q.y) - vec2(0.36, 0.06)) / vec2(0.045, 0.09)) - 1.0) * 0.045;
  float neck = sdBox2(q - vec2(0.0, -0.46), vec2(0.11, 0.14));
  float body = (length((q - vec2(0.0, -0.86)) / vec2(0.72, 0.3)) - 1.0) * 0.3;
  float d = smin(cran, jaw, 0.1);
  d = smin(d, ear, 0.03);
  d = smin(d, neck, 0.08);
  return smin(d, body, 0.12);
}

float plate0(vec2 q, float g) {
  float w = lw(0.0026, g);
  const vec2 E = vec2(0.0, 0.36);                                        // the third eye (the portal)
  float head = tsHead(q), rE = length(q - E);
  float v = 0.0;
  if (head > 0.0) {
    // brainwaves: ring trains from both temples, crossing into interference out in the dark
    vec2 t1 = q - vec2(-0.3, 0.16), t2 = q - vec2(0.3, 0.16);
    float r1 = length(t1), r2 = length(t2), ph = uTime * 1.3;
    float F = sin(r1 * 34.0 - ph) + sin(r2 * 34.0 - ph);
    vec2 dF = 34.0 * (cos(r1 * 34.0 - ph) * t1 / r1 + cos(r2 * 34.0 - ph) * t2 / r2);
    float fade = exp(-min(r1, r2) * 3.2) * smoothstep(0.0, 0.08, head);
    v = ink(F / max(length(dF), 30.0), w * 0.45, g) * 0.3 * fade;
    v = max(v, tsStars(q, g) * 0.6 * smoothstep(0.3, 0.6, head));
  } else {
    // the head, shaded along its own outline and lit from the left, darker toward the shoulders
    float lit = sat(0.62 - q.x * 1.3);
    v = engrave(head, (0.012 + 0.09 * lit) * (0.4 + 0.6 * smoothstep(-0.8, 0.2, q.y)), g, 0.012);
    // the shadow side cross-hatched, as an engraver would turn it away from the light
    float shade = smoothstep(0.02, 0.3, q.x) * smoothstep(0.0, -0.05, head);
    if (shade > 0.01) v = max(v, engrave(dot(q, vec2(0.7071, 0.7071)), 0.11 * shade, g, 0.009) * 0.85);
    // over the shoulders and up the neck, the circuit it is wired into
    float wired = smoothstep(-0.38, -0.5, q.y) * smoothstep(0.0, -0.03, head);
    if (wired > 0.01) v = max(v, tsTraces(q, g, w, 0.0) * 0.42 * wired);
    // the brain seen through the brow: folds as isolines of a slow field, pulsing outward from the eye
    float brain = (length((q - vec2(0.0, 0.27)) / vec2(0.3, 0.3)) - 1.0) * 0.3;
    if (brain < 0.0 && q.y > 0.19) {
      float f = tsFbm(vec3(q * 7.0, 1.0)) + 0.15 * q.y;
      float pulse = 0.5 + 0.5 * sin(uTime * 1.3 - rE * 18.0);
      float inside = smoothstep(0.0, -0.04, brain) * smoothstep(0.19, 0.26, q.y);
      v = max(v * 0.6, isolines(f, 0.045, g * 4.0, w * 0.5) * (0.22 + 0.35 * pulse) * inside);
      // finer folds between them, and synapses where they gather
      v = max(v, isolines(f + 0.0225, 0.045, g * 4.0, w * 0.3) * 0.12 * inside);
      v = max(v, tsSynapses(q, g, 0.0) * 0.55 * inside * (rE > 0.15 ? 1.0 : 0.0));
    }
    // the face: brows, closed eyes and their lashes, the nose, the mouth
    vec2 aq = vec2(abs(q.x), q.y);
    v = max(v, ink(tsArc(aq, 0.15, 0.17, 2.2, 0.085), w * 1.2, g) * 0.8);
    float lid = tsArc(aq, 0.14, 0.06, -2.4, 0.075);
    v = max(v, ink(lid, w * 1.1, g));
    float lx = aq.x - 0.14;
    if (abs(lx) < 0.06 && aq.y < 0.06 + 2.4 * lx * lx && aq.y > 0.03 + 2.4 * lx * lx)
      v = max(v, ink(abs(fract(lx / 0.015 + 0.5) - 0.5) * 0.015, w * 0.5, g) * 0.6);
    v = max(v, ink(sdSeg(q, vec2(0.0, 0.06), vec2(0.024, -0.075)), w, g) * 0.7);
    v = max(v, ink(tsArc(aq, 0.03, -0.085, -6.0, 0.03), w * 0.9, g) * 0.7);
    v = max(v, ink(tsArc(q, 0.0, -0.2, -3.0, 0.075), w * 1.1, g) * 0.8);
  }
  v = max(v, ink(head, w * 1.3, g));
  // the third eye: light pours out of it across the brow and beyond (inside the ring, the Eye)
  if (rE > 0.13) v = max(v, tsRays(q - E, 0.16 * exp(-(rE - 0.13) * 11.0), g));
  v = max(v, max(ink(rE - 0.135, w * 1.2, g), ink(rE - 0.15, w * 0.6, g) * 0.7));
  // a graduated ring round it, a dial the eye reads by: a tick every 10°, longer every 30° (ta: its turn, for motion)
  if (rE > 0.16 && rE < 0.2) {
    float ta = 0.0, ae = atan(q.y - E.y, q.x - E.x) + ta, step10 = TAU / 36.0;
    float k = floor(ae / step10 + 0.5), long3 = mod(k, 3.0) < 0.5 ? 1.0 : 0.0;
    float tick = abs(ae - k * step10) * rE;
    v = max(v, ink(tick, w * 0.6, g) * step(rE, 0.18 + 0.015 * long3) * (0.45 + 0.3 * long3));
  }
  v = max(v, ink(rE - 0.2, w * 0.5, g) * 0.5);
  return v;
}

// ═══ 1 · THE EYE ═══════════════════════════════════════════════════════════

float plate1(vec2 q, float g) {
  float w = lw(0.0024, g);
  float r = length(q), a = atan(q.y, q.x);
  const float ER = 1.197, EO = 0.807;                                    // the lids: two arcs meeting 0.88 either side
  vec2 eu = q - vec2(0.0, -EO), el = q - vec2(0.0, EO);
  float eye = max(length(eu) - ER, length(el) - ER);
  // the brow round it, engraved along the eye's own outline, dark toward the edge (where the Mind's brow begins)
  float v = engrave(eye, (0.015 + 0.07 * sat(0.4 - q.x * 0.5)) * exp(-max(eye, 0.0) * 3.0) * smoothstep(1.0, 0.75, r), g, 0.02);
  float flash = pow(0.5 + 0.5 * sin(uTime * 0.35), 30.0);               // now and then it widens on you
  if (eye < 0.0) {
    float nx = q.x / 0.88, ball = sqrt(sat(1.0 - nx * nx));
    v = engrave(r, (0.02 + 0.1 * sat(0.5 - nx * 0.6)) * ball, g, 0.04);   // the white, rounded and lit from the left
    v = max(v, ink((tsFbm(vec3(q * 10.0, 4.0)) - 0.5) / 10.0, w * 0.5, g) * smoothstep(0.36, 0.7, r) * 0.35);   // veins
    float iris = r - 0.36;
    if (iris < 0.0) {
      float breath = sin(uTime * 0.7);                                   // it breathes round the pupil (the pupil's rim, the portal, never moves)
      float fib = 0.18 + 0.4 * smoothstep(0.36, 0.17 + 0.03 * breath, r) + 0.3 * flash;
      float ia = a + spinAngle(2.0, uTime);                              // the iris turns: its fibres as rays, spaced to close round the circle
      v = engrave(ia, fib * (0.75 + 0.25 * sin(ia * 23.0)), g / max(r, 1e-3), TAU / 320.0);   // (so the angle's cut never shows)
      v = max(v, engrave(r, 0.12, g, 0.045) * 0.5);
      v = max(v, ink(r - 0.2 - 0.015 * breath, w * 0.8, g) * 0.6);      // the collarette
    }
    v = max(v, ink(iris, w * 1.4, g));
    v = max(v, ink(r - 0.11, w * 1.2, g));                              // the pupil's rim (inside it, the stream)
    if (length((q - vec2(-0.17, 0.15) - uTilt * vec2(0.07, 0.05)) / vec2(1.0, 0.7)) < 0.035) v = 0.9;   // a catchlight (it slides as a phone tilts)
  }
  v = max(v, ink(eye, w * 1.8, g));
  float crease = max(length(eu) - ER - 0.09, 0.05 - q.y);                // the upper lid's fold
  v = max(v, ink(crease, w, g) * smoothstep(0.83, 0.4, abs(q.x)));
  float lash = length(eu) - ER, low = length(el) - ER;                   // lashes, long above and short below
  if (lash > 0.0 && lash < 0.08 && q.y > 0.0 && abs(q.x) < 0.7) v = max(v, tsRays(eu, 0.22 * smoothstep(0.08, 0.0, lash), g) * 0.8);
  if (low > 0.0 && low < 0.04 && q.y < 0.0 && abs(q.x) < 0.6) v = max(v, tsRays(el, 0.15 * smoothstep(0.04, 0.0, low), g) * 0.6);
  return v;
}

// ═══ 2 · THE THOUGHT-STREAM ════════════════════════════════════════════════

// a thought: a capsule b half size, a scribble of signal inside it (seed: which); d out = its outline
float tsThought(vec2 p, vec2 b, float seed, float g, float w, out float d) {
  d = sdBox2(p, vec2(b.x - b.y, 0.0)) - b.y;
  if (d > 0.0) return 0.0;
  float s = p.y - 0.55 * b.y * sin(p.x / b.x * 9.0 + seed * 3.0 + uTime * 2.0) * cos(p.x / b.x * PI * 0.5);
  return ink(s, w * 0.7, g) * 0.8;
}

float plate2(vec2 q, float g) {
  float w = lw(0.0022, g);
  float r = length(q), t = uTime;
  // the current: streamlines of a slow flow (isolines of its stream function), brightest mid-stream
  float psi = q.y + 0.07 * sin(q.x * 3.5 + t * 0.25) + 0.04 * sin(q.x * 8.0 - q.y * 3.0 - t * 0.4) + 0.05 * (noise3(vec3(q * 2.2, t * 0.04)) - 0.5);
  float v = engrave(psi, 0.006 + 0.07 * exp(-pow((q.y - 0.02) / 0.42, 2.0)), g, 0.025);
  // the brain's rhythms, traced along both banks
  for (int i = 0; i < 2; i++) {
    float y0 = i == 0 ? 0.8 : -0.8, f = i == 0 ? 26.0 : 41.0;
    float tr = q.y - y0 - 0.028 * sin(q.x * f - t * (2.0 + float(i))) * (0.6 + 0.4 * sin(q.x * 3.0 + t * 0.5));
    v = max(v, ink(tr, w * 0.8, g) * 0.6 * step(abs(q.x), 0.6));
  }
  // thoughts carried on three lanes of the current, far to near
  for (int i = 0; i < 3; i++) {
    float fi = float(i), lane = 0.32 - 0.19 * fi, sz = 0.03 + 0.012 * fi, cell = 0.36 + 0.1 * fi;
    float x = q.x - t * (0.03 + 0.02 * fi) + fi * 0.37;
    float id = floor(x / cell);
    if (hash3(vec3(id, fi, 2.0)) < 0.3) continue;                        // a stretch with nothing in mind
    vec2 p = vec2(x - (id + 0.5) * cell, psi - lane);
    float d, s = tsThought(p, vec2(sz * 2.2, sz), id + fi * 7.0, g, w, d);
    if (d < 0.0) v = max(v * 0.2, s);
    v = max(v, ink(d, w, g) * 0.8);
  }
  // the held thought: stopped in mid-stream, bracketed, a reading passing over it; it opens at the centre
  vec2 hp = q - vec2(0.0, -0.27);
  float d, s = tsThought(hp, vec2(0.3, 0.11), 1.0, g, w, d);
  if (d < 0.0) v = max(engrave(hp.y, 0.05 + 0.12 * exp(-length(hp) * 5.0), g, 0.008), s);
  v = max(v, max(ink(d, w * 1.2, g), ink(d + 0.012, w * 0.6, g) * 0.6));
  vec2 bq = abs(hp) - vec2(0.36, 0.16);
  float brk = max(min(abs(bq.x), abs(bq.y)), max(bq.x, bq.y));
  v = max(v, ink(brk, w, g) * step(-0.06, bq.x) * step(-0.06, bq.y) * 0.85);
  float xs = 0.28 * sin(t * 0.6);
  v = max(v, ink(q.x - xs, w * 0.7, g) * step(abs(hp.y), 0.11) * step(0.09, length(hp)) * 0.7);
  float pr = length(hp);
  if (pr < 0.075) v = 0.3;
  if (pr > 0.075 && pr < 0.088) v = engrave(pr, 0.12, g, 0.003);
  v = max(v, max(ink(pr - 0.075, w * 1.2, g), ink(pr - 0.088, w * 0.8, g)));

  // the pupil's rim we came through
  if (r > 0.94) v = engrave(r, 0.16, g, 0.006);
  v = max(v, max(ink(r - 0.94, w, g), max(ink(r - 0.965, w * 0.6, g), ink(r - 0.995, w, g))));
  return v;
}

// ═══ 3 · THE VERDICT ═══════════════════════════════════════════════════════

// a field of the thought's record: a riveted frame round a box (c centre, b half size)
void tsCell(vec2 q, vec2 c, vec2 b, float light, float g, float w, inout float v) {
  float d = sdBox2(q - c, b);
  float edge = (0.35 + 0.65 * light);
  v = max(v, max(ink(d, w, g), ink(d + 0.012, w * 0.6, g) * 0.8) * edge);
  vec2 rq = abs(q - c) - (b - 0.022);
  v = max(v, (1.0 - smoothstep(-g, g, length(rq) - max(0.006, g))) * edge);   // corner rivets
}

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  vec2 P = vec2(0.0, -0.4);                                              // the seal
  float r = length(q), rp = length(q - P);
  float light = exp(-rp * 2.2);                                          // the record is lit from the seal
  float v = engrave(rp, 0.005 + 0.04 * light * light, g, 0.012);

  // the fields: light from the seal runs through them as rings
  float row = q.y > 0.42 ? 0.0 : q.y > 0.22 ? 1.0 : q.y > -0.14 ? 2.0 : 3.0;   // (row 2, what is inside, the tallest)
  vec4 R = row < 0.5 ? vec4(-0.62, 0.62, 0.42, 0.62) : row < 1.5 ? vec4(-0.8, 0.8, 0.22, 0.42) : row < 2.5 ? vec4(-0.88, 0.88, -0.14, 0.22) : vec4(-0.62, 0.62, -0.66, -0.14);
  float n = row < 0.5 ? 2.0 : row < 1.5 ? 3.0 : row < 2.5 ? 4.0 : 1.0;
  float cw = (R.y - R.x) / n;
  float i = clamp(floor((q.x - R.x) / cw), 0.0, n - 1.0);
  vec2 c = vec2(R.x + (i + 0.5) * cw, (R.z + R.w) * 0.5);
  vec2 b = vec2(cw * 0.5 - 0.008, (R.w - R.z) * 0.5 - 0.008);
  float d = sdBox2(q - c, b);
  float lc = exp(-length(c - P) * 2.2);
  if (d < -0.012) {
    if (row > 2.5) v = tsRays(q - P, 0.004 + 0.4 * exp(-rp * 7.0), g); // the judgement: light pours out of the seal
    else v = engrave(rp, 0.01 + 0.28 * light * light, g, 0.01);
  }
  tsCell(q, c, b, lc, g, w, v);

  // the bit ruler along the top of the header
  if (abs(q.x) < 0.62 && q.y > 0.62 && q.y < 0.65) {
    float k = floor((q.x + 0.62) / (1.24 / 32.0) + 0.5);
    float tick = abs(q.x + 0.62 - k * 1.24 / 32.0);
    v = max(v, ink(tick, w * 0.7, g) * step(q.y, mod(k, 8.0) < 0.5 ? 0.65 : 0.635) * 0.6);
  }
  v = max(v, ink(sdSeg(q, vec2(-0.62, 0.62), vec2(0.62, 0.62)), w * 0.8, g) * 0.5);

  // the seal: over its top three sectors, friend · unknown · foe (left to right), each hatched its own way,
  // a needle swinging between them; below, a bolted ring (inside it is the Mind)
  float ba = atan(q.y - P.y, q.x - P.x);
  if (rp > 0.125 && rp < 0.2) {
    if (ba > 0.0) {
      float sec = floor(ba / (PI / 3.0));                                // 0 foe, 1 unknown, 2 friend
      float ang = sec * 0.9 + 0.4;
      v = engrave(dot(q - P, vec2(cos(ang), sin(ang))) + uTime * 0.004 * (sec - 1.0), 0.12 + 0.12 * sec, g, 0.006);   // (its hatching drifting)
      v = max(v, ink(abs(fract(ba / (PI / 3.0) + 0.5) - 0.5) * (PI / 3.0) * rp, w, g));   // the dividers
    } else v = engrave(rp, 0.2, g, 0.004);
  }
  float bs = spinAngle(3.0, uTime), bk = floor((ba - bs) / (TAU / 10.0) + 0.5) * (TAU / 10.0) + bs;   // the bolted ring turns about the seal
  v = max(v, (1.0 - smoothstep(-g, g, length(q - P - vec2(cos(bk), sin(bk)) * 0.1625) - 0.007)) * sat(-sin(bk) * 6.0));   // (bolts slip under the sectors)
  float na = PI * 0.5 + 1.2 * sin(uTime * 0.3);                          // the needle, weighing
  vec2 nd = vec2(cos(na), sin(na));
  v = max(v, ink(sdSeg(q, P + nd * 0.13, P + nd * 0.235), w * 1.4, g));
  if (rp < 0.125) v = 0.3;
  v = max(v, max(ink(rp - 0.125, w * 1.3, g), max(ink(rp - 0.135, w * 0.6, g), ink(rp - 0.2, w, g))));

  // the rim of the held thought we came through, and its bolts
  if (r > 0.92) v = engrave(r, 0.12, g, 0.006);
  float ra = atan(q.y, q.x);
  float rk = floor(ra / (TAU / 16.0) + 0.5) * (TAU / 16.0);
  v = max(v, 1.0 - smoothstep(-g, g, length(q - vec2(cos(rk), sin(rk)) * 0.96) - 0.011));
  v = max(v, max(ink(r - 0.92, w, g), max(ink(r - 0.94, w * 0.6, g), ink(r - 0.995, w, g))));
  return v;
}
`,
};
