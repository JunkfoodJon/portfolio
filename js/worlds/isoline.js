/**
 * isoline.js — Isoline as a world: the studio, drawn in its own line.
 *
 *   0 The Studio  the editor itself: a part tree, the viewport with a creature
 *                 in it, the judge strip, the command log
 *   1 The Form    the creature in the viewport (raymarched 3D, the one plate
 *                 that is), engraved along its own depth contours; its head is
 *                 grabbed and pulled, and a section disc cuts its back
 *   2 The Slice   what the disc cuts: the field at z = 0 as a contour map, the
 *                 zero line bright — a loupe sits in the valley between two studs
 *   3 The Proof   the loupe's ground proven box by box: inside, outside or
 *                 undecided, subdividing toward the surface — and the one box
 *                 left open at the centre is the Studio again
 *
 * The plates nest exactly: the slice is the creature's own field (z = 0), the
 * proof the slice's own field magnified, so every portal shows what it frames.
 * This site's engraving is named after the project: line width is the only
 * brightness, and the lines follow fields' own isolines.
 */

const VIEW = 1.3333;                          // the viewport, and every box of the proof: 4:3

export const ISOLINE = {
  id: 'isoline',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — deep field, violet, contour mint, the zero line red
  palette: ['#1a0f45', '#9145ff', '#c9fff0', '#ff6f61'],
  // its words are painted (world.js): titles and figures in a rounded face drawn like a contour, the rest in a
  // draughtsman's hand, brushed in along each line as you come in, on a wash
  fonts: { title: ['Comfortaa', 600], body: ['Architects Daughter', 400] },
  // at rest its wash is contour mist: the drift's own isolines, many and fine, flowing
  wash: { scale: 60, speed: 0.05, warp: 1.2, ripple: 0.2, bands: 8 },
  reveal: 'paint',

  // portal / medal: [x, y, r] circles or [x, y, r, aspect] rectangles (r the half height)
  plates: [
    { title: 'The Studio', note: 'The editor, engraved. Scroll into the viewport.', portal: [0, 0.2, 0.42, VIEW], medal: [0, -0.08, 0.95, VIEW] },
    { title: 'The Form', note: 'A creature of distance fields, its head pulled. Scroll into the section disc.', portal: [-0.15, 0.3, 0.2], medal: [0, 0.3, 1.3, VIEW] },
    { title: 'The Slice', note: 'The field at the cut, as contours. Scroll into the loupe.', portal: [0.1, 0.30838, 0.12], medal: [0, 0, 1] },
    { title: 'The Proof', note: 'Boxes proven inside or outside. The one left open is the Studio again.', portal: [0, 0, 0.075, VIEW], medal: [0, 0, 1] },
  ],

  inscriptions(p) {
    const out = [];
    // left-aligned text: inscriptions are centred, so a line's centre is set from its estimated width
    const left = (x, text, size, track = 0) => x + text.length * size * (0.27 + track / 2);

    // 0 · the studio: the window carries the parts, the log and the stack; the name under it
    out.push({ plate: 0, text: `${p.name}  ·  ${p.kind}`, x: 0, y: 0.77, size: 0.018, track: 0.14, alpha: 0.65 });
    ['lit', 'normal', 'depth', 'step count', 'field quality'].forEach((t, i) => {
      out.push({ plate: 0, text: t, x: -0.4 + i * 0.2, y: 0.685, size: 0.017, track: 0.04, alpha: i ? 0.6 : 0.9 });
    });
    out.push({ plate: 0, text: 'parts', x: -0.88, y: -0.03, size: 0.017, track: 0.24, upper: true, alpha: 0.7 });
    const parts = [['creature', 0], ['body', 1], ['head', 1], ['eye', 2], ['tail', 1], ['legs', 1], ['studs', 1]];
    parts.forEach(([t, ind], i) => {
      out.push({ plate: 0, text: t, x: left(-1.0 + ind * 0.045, t, 0.018), y: -0.088 - i * 0.046, size: 0.018, alpha: i === 2 ? 0.95 : 0.75 });
    });
    out.push({ plate: 0, text: 'command log', x: 0.88, y: -0.03, size: 0.017, track: 0.24, upper: true, alpha: 0.7 });
    const log = ['add  body', 'add  head', 'carve  eye', 'add  tail', 'studs  ×6', 'inflate  head', 'smear  tail', 'drag  head  ·  solve'];
    log.forEach((t, i) => {
      out.push({ plate: 0, text: t, x: left(0.73, t, 0.018), y: -0.088 - i * 0.04, size: 0.018, alpha: i === log.length - 1 ? 0.95 : 0.72 });
    });
    // the log is the undo history and a replay: it grows by one line for every plate you fall
    const n0 = log.length;
    out.push({ plate: 0, text: (n) => `${n0 + n} commands  ·  undo  ·  replay`, x: 0.88, y: -0.43, size: 0.0165, track: 0.06, alpha: 0.6 });
    const sentences = p.summary.match(/[^.]+\.\s*/g) || [p.summary];
    out.push({ plate: 0, text: sentences[0].trim(), x: -0.88, y: -0.485, size: 0.0175, w: 0.44, lh: 1.4, alpha: 0.8 });
    out.push({ plate: 0, text: sentences.slice(1).join(' ').trim(), x: 0.88, y: -0.51, size: 0.0168, w: 0.45, lh: 1.38, alpha: 0.8 });
    out.push({ plate: 0, text: p.stack.map(([, items]) => items.join(' · ')).join('     '), x: 0, y: -0.633, size: 0.017, track: 0.06, alpha: 0.6 });
    //     (the small print stacked in the middle, inside the face's bevel)
    out.push({ plate: 0, text: p.name, x: 0, y: -0.728, size: 0.08 });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.81, size: 0.028, w: 2.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.862, size: 0.018, track: 0.16, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.903, size: 0.015, track: 0.06, alpha: 0.5 });

    // 1 · the form: the pull's arrow carries drag-to-solve; the other highlights and the sculpting edits below
    out.push({ plate: 1, text: p.highlights[0], x: -0.17, y: 0.93, size: 0.026, w: 0.66, lh: 1.4, alpha: 0.9 });
    [[p.inside[2].title, p.inside[2].text], ['', p.highlights[2]], ['', p.highlights[3]]].forEach(([t, s], i) => {
      const x = -1.0 + i * 1.0, y = -0.8;
      if (t) out.push({ plate: 1, text: t, x, y: y + 0.1, size: 0.034, face: 'title' });
      out.push({ plate: 1, text: s, x, y: y + 0.04, size: 0.026, w: 0.66, lh: 1.4, alpha: 0.85, hang: true });
    });
    out.push({ plate: 1, text: 'section  ·  z = 0', x: -0.15, y: 0.575, size: 0.017, track: 0.2, upper: true, alpha: 0.6 });

    // 2 · the slice: what is inside, about the contour map; the field's three regions named on it
    const spots = [[-0.47, 0.56], [0.47, 0.56], [0, -0.64]];
    [p.inside[0], p.inside[1], p.inside[3]].forEach((s, i) => {
      const [x, y] = spots[i];
      out.push({ plate: 2, text: s.title, x, y: y + 0.1, size: 0.034, face: 'title' });
      out.push({ plate: 2, text: s.text, x, y: y + 0.04, size: 0.026, w: i === 2 ? 0.9 : 0.46, lh: 1.4, alpha: 0.85, hang: true });
    });
    out.push({ plate: 2, text: 'd > 0', x: -0.72, y: 0.12, size: 0.02, track: 0.2, alpha: 0.6 });
    out.push({ plate: 2, text: 'd = 0', x: 0.62, y: 0.45, size: 0.02, track: 0.2, alpha: 0.75 });
    out.push({ plate: 2, text: 'd < 0', x: -0.55, y: -0.2, size: 0.02, track: 0.2, alpha: 0.6 });

    // 3 · the proof: its figures in the corners, its claim round the rim
    const corners = [[-0.13, 0.6], [0.27, 0.6], [-0.44, -0.4], [0.44, -0.4]];
    p.stats.forEach((s, i) => {
      const [x, y] = corners[i % 4];
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 3, text: v, count: s, x, y, size: 0.11, weight: 200, track: 0.02 });
      out.push({ plate: 3, text: s.label, x, y: y - 0.095, size: 0.024, track: 0.16, upper: true, alpha: 0.75 });
    });
    out.push({ plate: 3, text: p.highlights[1], x: 0, y: 0, size: 0.022, track: 0.04, arc: { r: 0.885, a: -Math.PI / 2 }, alpha: 0.75 });
    const maths = p.stack.find(([g]) => g === 'Maths');
    if (maths) out.push({ plate: 3, text: maths[1].join('  ·  '), x: 0, y: 0, size: 0.024, track: 0.2, upper: true, arc: { r: 0.885, a: Math.PI / 2 }, alpha: 0.7 });
    return out;
  },

  // on top of the paint (world.js): while it is wet the ink is still liquid, a slow band of light running across
  // it and a bright meniscus round each stroke; contour rings, isolines of the words' own field, ripple out from
  // them as you scroll in, and a faint few stay round the larger words
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float p = w0.y, em = max(w0.w, 8.0), plaque = (1.0 - clear) / 0.95;
  if (w0.x > 1.8 * em) return;                               // (nothing reaches this far from a word)
  float a = paintAge(uv, w0);
  float wet = (1.0 - smoothstep(0.05, 0.9, a)) * smoothstep(0.0, 0.05, a);
  float band = smoothstep(0.7, 0.95, 0.5 + 0.5 * sin(dot(uv * uCanvas / em, vec2(0.7, 0.4)) - uTime * 0.6));
  float rim = exp(-pow(w0.x / (0.06 * em + 0.6), 2.0));
  txt = max(txt * (1.0 + 0.35 * band * wet), rim * 0.75 * wet);
  float inner = mix(0.2, 0.55, smoothstep(0.7, 1.0, p)) * em;
  float ring = rings(w0.x, 0.34 * em, p * 3.0 * em + uTime * 0.04 * em, 0.04 * em + 0.45, 0.7)
             * smoothstep(inner, inner + 0.15 * em, w0.x) * (1.0 - smoothstep(0.6 * em, 1.75 * em, w0.x))
             * (0.05 * smoothstep(16.0, 30.0, w0.w) * plaque + 0.8 * sin(PI * min(1.0, p * 1.1)));   // (round larger words, none at rest;
                                                                                                   // mid-zoom they ripple out past the wash)
  txt = max(txt, ring);
}
`,

  glsl: /* glsl */ `
float ilRBox(vec2 p, vec2 b, float r) { return sdBox2(p, b - r) - r; }

// ── the creature: one field shared by the form, the slice and the proof ──────
// materials: 1 skin · 2 the eye
vec4 ilTug = vec4(0.0); vec3 ilTugD = vec3(0.0, 0.0, 1.0);                  // the pointer, in the form's frame (w: how much), and its line of sight
float ilPull() { return 1.0 + 0.03 * sin(uTime * 1.3); }                 // the head swells as it is pulled
const vec3 IL_H = vec3(0.64, 0.5, 0.0);                                   // the skull's centre
vec2 ilMap(vec3 p) {
  vec3 a = vec3(p.x, p.y, abs(p.z));
  // it breathes: the body swells sideways only (an ellipsoid's distance at z = 0 does not depend on its depth,
  // so the slice and the proof, both at z = 0, stay exact)
  float d = sdEllipsoid(p - vec3(-0.05, 0.0, 0.0), vec3(0.62, 0.36, 0.38 * (1.0 + 0.05 * sin(uTime * 0.9))));
  // a long neck to a wedge of a skull, tipped down, horns swept back
  d = smin(d, sdRound(p, vec3(0.38, 0.1, 0.0), vec3(0.58, 0.44, 0.0), 0.16, 0.08), 0.12);
  vec3 hq = p - IL_H; hq.xy = rot(0.28) * hq.xy; hq /= ilPull();
  float skull = smin(sdEllipsoid(hq, vec3(0.15, 0.075, 0.085)), sdEllipsoid(hq - vec3(0.13, -0.012, 0.0), vec3(0.08, 0.042, 0.055)), 0.05) * ilPull();
  d = smin(d, skull, 0.06);
  float horn = min(sdRound(a, vec3(0.6, 0.57, 0.045), vec3(0.47, 0.69, 0.09), 0.028, 0.013),
                   sdRound(a, vec3(0.47, 0.69, 0.09), vec3(0.36, 0.66, 0.125), 0.013, 0.004));
  d = smin(d, horn, 0.02);
  // a tail that tapers and curls up
  d = smin(d, min(sdRound(p, vec3(-0.5, 0.05, 0.0), vec3(-0.88, 0.1, 0.0), 0.14, 0.06),
                  sdRound(p, vec3(-0.88, 0.1, 0.0), vec3(-1.04, 0.36, 0.0), 0.06, 0.014)), 0.12);
  vec3 lq = vec3(abs(p.x + 0.05), p.y, abs(p.z));                          // four jointed legs
  float leg = min(sdRound(lq, vec3(0.3, -0.18, 0.17), vec3(0.37, -0.4, 0.2), 0.1, 0.055),
                  sdRound(lq, vec3(0.37, -0.4, 0.2), vec3(0.31, -0.56, 0.2), 0.05, 0.035));
  d = smin(d, smin(leg, sdEllipsoid(lq - vec3(0.335, -0.57, 0.2), vec3(0.06, 0.02, 0.04)), 0.03), 0.08);
  if (p.y > 0.1 && abs(p.z) < 0.25 && p.x > -0.7 && p.x < 0.45) {          // a row of studs down the spine
    float s = 9.0;
    for (int i = 0; i < 6; i++) {
      float x = -0.45 + float(i) * 0.13, u = (x + 0.05) / 0.62;
      s = min(s, sdSphere(p - vec3(x, 0.36 * sqrt(1.0 - u * u), 0.0), 0.05));
    }
    d = smin(d, s, 0.03);
  }
  d = smax(d, -sdEllipsoid(a - vec3(0.7, 0.505, 0.072), vec3(0.034, 0.013, 0.03)), 0.008);   // the eye: a narrow slit, carved
  // the pointer draws the form out toward it (the Form sets ilTug); nothing at z = 0, so the slice and the proof stay exact
  if (ilTug.w > 0.0) {
    vec3 pt = p - ilTug.xyz;
    float off = length(pt - ilTugD * dot(pt, ilTugD));                     // from the pointer's line of sight
    d -= 0.05 * ilTug.w * exp(-off * off / 0.012) * sat(abs(p.z) / 0.12);
  }
  float eye = sdEllipsoid(a - vec3(0.698, 0.505, 0.066), vec3(0.03, 0.009, 0.022));
  return eye < d ? vec2(eye, 2.0) : vec2(d, 1.0);
}
float ilSlice(vec2 p) { return ilMap(vec3(p, 0.0)).x; }
// the field's contours flow: a slow swell travels out through them (k: per unit of F); the zero line never moves
float ilFlow(float F, float k) { return F * (1.0 + 0.05 * sin(uTime * 0.7 - F * k)); }

// the slice's and the proof's frames, in the creature's units (see the plates' portals)
const vec2 IL_D = vec2(-0.15, 0.3);                                       // the section disc's centre, r 0.2
const vec2 IL_P = vec2(-0.13, 0.3616753);                                 // the loupe: on d = 0, between two studs
float ilF2(vec2 q) { return ilSlice(IL_D + q * 0.2) / 0.2; }
float ilF3(vec2 q) { return ilSlice(IL_P + q * 0.024) / 0.024; }

// a little arrow from a to b
float ilArrow(vec2 q, vec2 a, vec2 b, float head) {
  vec2 d = normalize(b - a), n = vec2(-d.y, d.x);
  return min(sdSeg(q, a, b), min(sdSeg(q, b, b - d * head + n * head * 0.6), sdSeg(q, b, b - d * head - n * head * 0.6)));
}

// ═══ 0 · THE STUDIO ════════════════════════════════════════════════════════

// the creature in miniature, for the judge strip (2D)
float ilMini(vec2 p) {
  float b = (length(p * vec2(1.0, 1.65)) - 0.052) / 1.65;
  b = smin(b, sdSeg(p, vec2(0.03, 0.012), vec2(0.05, 0.03)) - 0.011, 0.012);
  b = smin(b, (length((p - vec2(0.062, 0.034)) * vec2(1.0, 1.9)) - 0.016) / 1.9, 0.01);
  b = smin(b, sdSeg(p, vec2(-0.04, 0.0), vec2(-0.08, 0.02)) - 0.008, 0.015);
  return b;
}

float plate0(vec2 q, float g) {
  float w = lw(0.0026, g);
  vec2 vq = q - vec2(0.0, 0.2);
  float vp = sdBox2(vq, vec2(0.56, 0.42));
  float win = ilRBox(q - vec2(0.0, 0.07), vec2(1.24, 0.73), 0.03);       // the window: y -0.66 … 0.80

  // the room is lit by the viewport alone, along its own isolines
  float v = engrave(vp, 0.12 * exp(-max(vp, 0.0) * 12.0), g, 0.012);
  if (win < 0.0) {
    v = engrave(vp, 0.08 * exp(-max(vp, 0.0) * 7.0), g, 0.01);           // the window's ground, dimmer
    // title bar and its buttons
    if (q.y > 0.74) {
      v = engrave(q.x, 0.1, g, 0.006);
      for (int i = 0; i < 3; i++) v = max(v, ink(length(q - vec2(0.62 - float(i) * 0.04, 0.77)) - 0.011, w * 0.8, g));
    }
    v = max(v, ink(q.y - 0.74, w * 0.8, g));
    // view tabs over the viewport: lit is on
    for (int i = 0; i < 5; i++) {
      float tab = ilRBox(q - vec2(-0.4 + float(i) * 0.2, 0.685), vec2(0.092, 0.025), 0.012);
      if (i == 0 && tab < 0.0) v = engrave(-tab, 0.2, g, 0.005);
      v = max(v, ink(tab, w * 0.75, g) * (i == 0 ? 1.0 : 0.6));
    }

    // the part tree: each part drawn alone beside its name; the head is selected
    vec2 pq = q - vec2(-0.88, -0.29);
    float pan = ilRBox(pq, vec2(0.24, 0.29), 0.02);
    if (pan < 0.0) {
      v = 0.012;
      float row = floor((-0.065 - q.y) / 0.046);
      float ry = -0.088 - row * 0.046;
      if (row == 2.0) v = max(v, ink(ilRBox(q - vec2(-0.88, ry), vec2(0.225, 0.02), 0.01), w * 0.6, g) * 0.8);   // the selected row
      if (row >= 0.0 && row < 7.0) {
        float ind = row == 0.0 ? 0.0 : (row == 3.0 ? 2.0 : 1.0);
        vec2 ic = q - vec2(-1.065 + ind * 0.045, ry);
        float glyph;                                                     // the part's own outline
        if (row == 0.0) glyph = ilMini(ic * 2.3) / 2.3;
        else if (row == 1.0) glyph = (length(ic * vec2(1.0, 1.7)) - 0.016) / 1.7;
        else if (row == 4.0) glyph = sdSeg(ic, vec2(-0.016, -0.004), vec2(0.016, 0.006)) - 0.004;
        else if (row == 5.0) glyph = min(sdSeg(ic, vec2(-0.007, 0.012), vec2(-0.008, -0.012)), sdSeg(ic, vec2(0.008, 0.012), vec2(0.009, -0.012))) - 0.003;
        else if (row == 6.0) glyph = length(vec2(ic.x - clamp(floor(ic.x / 0.012 + 0.5), -1.0, 1.0) * 0.012, ic.y)) - 0.0045;
        else glyph = length(ic) - (row == 3.0 ? 0.007 : 0.013);
        v = max(v, ink(glyph, w * 0.6, g));
        vec2 eq = q - vec2(-0.69, ry);                                   // visibility: an eye per part
        v = max(v, max(ink(sdVesica(eq.yx, 0.016, 0.01), w * 0.5, g) * 0.6, 1.0 - smoothstep(-g, g, length(eq) - 0.0035)));
      }
      // the tree's connectors
      v = max(v, ink(sdSeg(q, vec2(-1.07, -0.1), vec2(-1.07, -0.364)), w * 0.45, g) * 0.6);
      v = max(v, ink(sdSeg(q, vec2(-1.025, -0.192), vec2(-1.025, -0.226)), w * 0.45, g) * 0.6);
      if (row >= 1.0 && row < 7.0) {
        float x0 = row == 3.0 ? -1.025 : -1.07;
        v = max(v, ink(sdSeg(q, vec2(x0, ry), vec2(x0 + 0.022, ry)), w * 0.45, g) * 0.6);
      }
      v = max(v, ink(q.y + 0.055, w * 0.6, g));
      v = max(v, ink(q.y + 0.42, w * 0.5, g) * 0.6);
    }
    v = max(v, ink(pan, w, g));

    // the command log: a line per edit, numbered in the gutter; the last one live
    vec2 lq = q - vec2(0.88, -0.29);
    float lgp = ilRBox(lq, vec2(0.24, 0.29), 0.02);
    if (lgp < 0.0) {
      v = 0.012;
      float row = floor((-0.068 - q.y) / 0.04);
      float ry = -0.088 - row * 0.04;
      if (row >= 0.0 && row < 8.0) {
        v = max(v, ink(sdSeg(q, vec2(0.665, ry), vec2(0.69, ry)), w * 0.5, g) * 0.6);
        if (row == 7.0) {
          v = max(v, ink(ilRBox(q - vec2(0.9, ry), vec2(0.2, 0.017), 0.01), w * 0.6, g) * 0.8);
          v = max(v, (1.0 - smoothstep(-g, g, sdBox2(q - vec2(1.085, ry), vec2(0.003, 0.012)))) * step(0.5, fract(uTime * 1.1)));
        }
      }
      v = max(v, ink(q.x - 0.705, w * 0.45, g) * step(q.y, -0.06) * step(-0.4, q.y) * 0.5);
      v = max(v, ink(q.y + 0.055, w * 0.6, g));
      v = max(v, ink(q.y + 0.4, w * 0.5, g) * 0.6);
    }
    v = max(v, ink(lgp, w, g));

    // the judge strip: the same creature five ways, each with its meter
    if (q.y < -0.24 && q.y > -0.46 && abs(q.x) < 0.56) {
      float k = clamp(floor((q.x + 0.56) / 0.224), 0.0, 4.0);
      vec2 tq = q - vec2(-0.448 + k * 0.224, -0.335);
      float th = sdBox2(tq, vec2(0.095, 0.07));
      if (th < 0.0) {
        float d = ilMini(tq - vec2(0.01, -0.005));
        float t = 0.0;
        if (k == 0.0) t = d < 0.0 ? engrave(-d, 0.28 + 0.4 * sat(dot(normalize(tq + vec2(0.05, -0.08)), vec2(-0.6, 0.8))), g, 0.004) : 0.0;
        else if (k == 1.0) t = d < 0.0 ? engrave(tq.x * 0.7 + tq.y * 0.7, 0.3, g, 0.004) : 0.0;
        else if (k == 2.0) t = d < 0.0 ? isolines(d, 0.008, g, 0.0008) * 0.7 : 0.0;
        else if (k == 3.0) {                                             // step count: halftone squares, heavy at the rim
          vec2 cell = floor(tq / 0.008), cq = tq - (cell + 0.5) * 0.008;
          float dc = ilMini((cell + 0.5) * 0.008 - vec2(0.01, -0.005));
          float s = sat(1.0 - abs(dc) / 0.03) * 0.0034;
          t = 1.0 - smoothstep(s - g, s + g, max(abs(cq.x), abs(cq.y)));
        } else t = d > 0.0 ? isolines(d, 0.01, g, 0.0007) * 0.5 * exp(-d * 20.0) : 0.0;
        v = max(v, t);
        v = max(v, ink(d, w * 0.6, g) * 0.9);
      }
      v = max(v, ink(th, w * 0.7, g));
      vec2 mq = tq - vec2(0.0, -0.095);                                   // the meter
      float score = 0.45 + 0.5 * hash3(vec3(k, 5.0, 2.0));
      v = max(v, ink(sdSeg(mq, vec2(-0.09, 0.0), vec2(0.09, 0.0)), w * 0.4, g) * 0.5);
      v = max(v, ink(sdSeg(mq, vec2(-0.09, 0.0), vec2(-0.09 + 0.18 * score, 0.0)), w * 1.4, g));
    }

    // the status bar
    v = max(v, ink(q.y + 0.605, w * 0.7, g));
    // the viewport: the next plate shows through it
    if (vp < 0.0) v = 0.2;
    v = max(v, max(ink(vp, w, g), ink(vp - 0.014, w * 0.6, g)));
  }
  v = max(v, ink(win, w, g));
  v = max(v, ink(q.y + 0.975, w * 0.8, g) * 0.7);                        // the ledge under the name
  return v;
}

// ═══ 1 · THE FORM (raymarched) ═════════════════════════════════════════════

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  float yaw = -0.32 + 0.14 * uPointer.x + 0.04 * sin(uTime * 0.29);
  float pitch = 0.3 - 0.08 * uPointer.y;
  vec3 ro = vec3(q, 1.3), rd = vec3(0.0, 0.0, -1.0);
  ro.yz = rot(pitch) * ro.yz; rd.yz = rot(pitch) * rd.yz;
  ro.xz = rot(yaw) * ro.xz; rd.xz = rot(yaw) * rd.xz;

  // the pointer, carried into the form's frame as the view is (see ilMap)
  vec3 tp = vec3(gPtr, 0.0);
  tp.yz = rot(pitch) * tp.yz; tp.xz = rot(yaw) * tp.xz;
  ilTug = vec4(tp, gPtrOn); ilTugD = rd;

  // the field around the form: its own isolines on the slice through it, fading out
  vec3 sp = vec3(q, 0.0);
  sp.yz = rot(pitch) * sp.yz; sp.xz = rot(yaw) * sp.xz;
  float F = ilMap(sp).x;
  float v = isolines(ilFlow(F, 6.0), 0.06, g, 0.0011) * 0.42 * exp(-max(F, 0.0) * 4.5);

  // march, only through the creature's bounding sphere
  vec3 oc = ro - vec3(-0.17, 0.0, 0.0);
  float bb = dot(oc, rd), cc = dot(oc, oc) - 1.15 * 1.15, disc = bb * bb - cc;
  float t = 0.0, minD = 9.0;
  vec2 h = vec2(9.0, 0.0);
  bool hit = false;
  if (disc > 0.0) {
    float s = sqrt(disc), t1 = -bb + s;
    t = max(0.0, -bb - s);
    for (int i = 0; i < 64; i++) {
      h = ilMap(ro + rd * t);
      minD = min(minD, h.x);
      if (h.x < 0.0004 + g * 0.3) { hit = true; break; }
      t += h.x * 0.9;
      if (t > t1) break;
    }
  }
  if (!hit) v = max(v, (1.0 - smoothstep(0.6 * g, 2.2 * g, minD)) * 0.85);   // the silhouette's cut edge
  else {
    vec3 p = ro + rd * t;
    const float e = 0.0015;
    vec2 kk = vec2(1.0, -1.0);
    vec3 n = normalize(kk.xyy * ilMap(p + kk.xyy * e).x + kk.yyx * ilMap(p + kk.yyx * e).x +
                       kk.yxy * ilMap(p + kk.yxy * e).x + kk.xxx * ilMap(p + kk.xxx * e).x);
    vec3 nv = n; nv.xz = rot(-yaw) * nv.xz; nv.yz = rot(-pitch) * nv.yz;   // back to the viewer's frame
    vec3 L = normalize(vec3(-0.5, 0.72, 0.5));
    float dif = max(dot(nv, L), 0.0);
    float occ = sat(ilMap(p + n * 0.06).x / 0.06);
    float lum = (0.03 + 0.78 * dif) * (0.35 + 0.65 * occ);
    float facing = max(nv.z, 0.15);
    if (h.y > 1.5) {                                                     // the eye: a dark pupil, one glint
      vec3 ec = vec3(0.698, 0.505, sign(p.z) * 0.066);
      vec3 rel = p - ec; rel.xz = rot(-yaw) * rel.xz; rel.yz = rot(-pitch) * rel.yz;
      v = 0.04 + 0.5 * (1.0 - smoothstep(-g, g, length(rel.xy - vec2(-0.008, 0.003)) - 0.0045));   // dark, one glint
      return v;
    }
    // skin: engraved along its own height contours — the form as a stack of slices
    vec3 ex = vec3(1.0, 0.0, 0.0), ey = vec3(0.0, 1.0, 0.0);              // the screen's axes, in the form's frame
    ex.yz = rot(pitch) * ex.yz; ex.xz = rot(yaw) * ex.xz;
    ey.yz = rot(pitch) * ey.yz; ey.xz = rot(yaw) * ey.xz;
    float nr = dot(n, rd);
    nr = nr < 0.0 ? min(nr, -0.08) : max(nr, 0.08);
    vec2 dy = vec2(ex.y - rd.y * dot(n, ex) / nr, ey.y - rd.y * dot(n, ey) / nr);
    float grad = clamp(length(dy), 0.2, 8.0);
    v = engrave(p.y + 0.002 * noise3(p * 40.0), lum, g * grad, 0.012);
    v = max(v, smoothstep(0.6, 0.9, pow(1.0 - sat(nv.z), 2.0)) * 0.85);  // the rim: a white edge
  }

  // the drag: a grabbed point on the head, its dashed normal and the pull's arrow
  vec3 g3 = IL_H + vec3(-0.02, 0.085, 0.0) * ilPull(), n3 = normalize(vec3(-0.1, 1.0, 0.0));
  g3.xz = rot(-yaw) * g3.xz; g3.yz = rot(-pitch) * g3.yz;
  n3.xz = rot(-yaw) * n3.xz; n3.yz = rot(-pitch) * n3.yz;
  vec2 gp = g3.xy, gd = normalize(n3.xy);
  float pull = 0.26 + 0.05 * sin(uTime * 1.3);
  float tl = dot(q - gp, gd);
  float dash = step(0.45, fract(tl * 22.0)) * step(0.0, tl) * step(tl, pull - 0.03);
  v = max(v, ink(sdSeg(q, gp, gp + gd * (pull - 0.03)), w * 0.8, g) * dash);
  v = max(v, ink(ilArrow(q, gp + gd * (pull - 0.06), gp + gd * pull, 0.035), w * 1.1, g));
  v = max(v, max(ink(length(q - gp) - 0.026, w, g), 1.0 - smoothstep(-g, g, length(q - gp) - 0.009)));

  // the section disc: a plane through the spine, seen face on — the slice is the next plate
  vec2 dq = q - IL_D;
  float dr = length(dq), da = atan(dq.y, dq.x);
  if (dr < 0.2) v = 0.2;
  else if (dr < 0.232) {
    v = 0.02;
    float sa = da - spinAngle(1.5, uTime);                               // its graduations sweep round (about the portal's centre)
    float k = floor(sa / TAU * 48.0 + 0.5);
    v = max(v, ink(abs(sa - k * TAU / 48.0) * dr, w * 0.6, g) * step(mod(k, 4.0) < 0.5 ? 0.2 : 0.214, dr));
  }
  v = max(v, max(ink(dr - 0.2, w, g), ink(dr - 0.232, w * 0.8, g)));
  vec2 st0 = IL_D + vec2(0.164, -0.164), st1 = IL_D + vec2(0.25, -0.25);   // its handle
  v = max(v, max(ink(sdSeg(q, st0, st1), w, g), ink(length(q - st1) - 0.013, w, g)));

  // the viewport's axis gizmo
  vec2 ax = q - vec2(-1.18, -0.5);
  vec3 X = vec3(1.0, 0.0, 0.0), Y = vec3(0.0, 1.0, 0.0), Z = vec3(0.0, 0.0, 1.0);
  X.xz = rot(-yaw) * X.xz; X.yz = rot(-pitch) * X.yz;
  Y.xz = rot(-yaw) * Y.xz; Y.yz = rot(-pitch) * Y.yz;
  Z.xz = rot(-yaw) * Z.xz; Z.yz = rot(-pitch) * Z.yz;
  v = max(v, ink(sdSeg(ax, vec2(0.0), X.xy * 0.08), w, g));
  v = max(v, ink(sdSeg(ax, vec2(0.0), Y.xy * 0.08), w, g) * 0.75);
  v = max(v, ink(sdSeg(ax, vec2(0.0), Z.xy * 0.08), w, g) * 0.5);
  v = max(v, 1.0 - smoothstep(-g, g, length(ax - X.xy * 0.08) - 0.008));
  float gra = atan(ax.y, ax.x) - spinAngle(3.0, uTime);                 // its orbit ring, dashed, turning
  v = max(v, ink(length(ax) - 0.105, w * 0.7, g) * step(0.5, fract(gra / TAU * 24.0)) * 0.6);
  return v;
}

// ═══ 2 · THE SLICE ═════════════════════════════════════════════════════════

float plate2(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q), a = atan(q.y, q.x);
  float F = ilF2(q);
  float v;
  if (F < 0.0) v = engrave(F, 0.18 * exp(F * 8.0), g, 0.01);              // inside: its own isolines, dying into the solid
  else {                                                                 // outside: the contour map, flowing, lit as the sweep passes
    float sw = exp(-mod(a - spinAngle(4.0, uTime), TAU) * 2.5);
    v = isolines(ilFlow(F, 1.5), 0.1, g, 0.0012) * 0.42 * exp(-F * 3.6) * (1.0 + 1.2 * sw);
  }
  v = max(v, ink(F, w * 1.7, g));                                        // d = 0

  // the gradient, sampled on a grid outside: arrows straight up the field
  vec2 cell = floor(q / 0.2), c = (cell + 0.5) * 0.2;
  float fc = ilF2(c);
  if (fc > 0.06 && fc < 0.9) {
    vec2 gr = normalize(vec2(ilF2(c + vec2(0.01, 0.0)) - fc, ilF2(c + vec2(0.0, 0.01)) - fc));
    float al = ilArrow(q, c - gr * 0.045, c + gr * 0.045, 0.022);
    v = max(v * (1.0 - ink(al, w * 2.5, g)), ink(al, w * 0.8, g) * 0.75);
  }

  // the loupe on the zero line, between two studs: the next plate
  vec2 lc = vec2(0.1, 0.30838), lq = q - lc;
  float lr = length(lq);
  if (lr < 0.12) v = 0.2;
  else if (lr < 0.15) v = 0.03;
  v = max(v, max(ink(lr - 0.12, w, g), max(ink(lr - 0.134, w * 0.6, g), ink(lr - 0.15, w, g))));
  v = max(v, ink(sdSeg(q, lc + vec2(0.106, 0.106), lc + vec2(0.24, 0.24)), w * 1.4, g));

  // the disc's edge: a fine double line inside the plane's graduated rim
  if (r > 0.955) v = min(v, 0.04);
  v = max(v, max(ink(r - 0.955, w, g), ink(r - 0.975, w * 0.6, g)));
  return v;
}

// ═══ 3 · THE PROOF ═════════════════════════════════════════════════════════

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q), a = atan(q.y, q.x);
  float F = ilF3(q);
  // the boxes: a quadtree of 4:3 cells over the loupe's ground, each proven by its centre's distance
  vec2 lo = vec2(-1.7, -1.275), sz = vec2(3.2, 2.4);
  vec2 u = (q - lo) / sz;
  float v = 0.0;
  if (u.x > 0.0 && u.y > 0.0 && u.x < 1.0 && u.y < 1.0) {
    int state = 0;                                                       // 0 undecided · 1 inside · 2 outside · 3 the open box
    vec2 cc = vec2(0.0), hs = sz * 0.5;
    float lev = 0.0;
    for (int L = 0; L <= 7; L++) {
      float nn = exp2(float(L));
      vec2 cell = floor(u * nn);
      hs = sz / nn * 0.5;
      cc = lo + (cell + 0.5) * sz / nn;
      lev = float(L);
      if (L == 4 && cell == vec2(8.0)) { state = 3; break; }
      float fc = ilF3(cc), rad = length(hs);
      if (fc > rad) { state = 2; break; }
      if (fc < -rad) { state = 1; break; }
    }
    vec2 lp = q - cc;
    float box = sdBox2(lp, hs);
    if (state == 3) return max(0.2, max(ink(box, w * 1.3, g), ink(sdBox2(lp, hs + 0.014), w * 0.7, g)));
    // proven boxes are left dark — the light is spent on the boxes still undecided, and the surface they close on
    if (state == 0) v = engrave(-box, 0.1, g, 0.004);                    // undecided, to the last
    else if (state == 1) v = ink(sdBox2(lp, hs - min(hs.y * 0.12, 0.012)), w * 0.45, g) * 0.4;   // inside: a solid box, double ruled
    float edge = state == 0 ? 0.95 : (state == 1 ? 0.6 : 0.38);
    v = max(v, ink(box, w * 0.55, g) * edge);
    // the verdict in each box big enough to hold one: − inside, + outside
    float gs = min(hs.y * 0.18, 0.03);
    if (state != 0 && gs > 9.0 * g && r < 0.84) {
      float mark = min(sdSeg(lp, vec2(-gs, 0.0), vec2(gs, 0.0)), state == 2 ? sdSeg(lp, vec2(0.0, -gs), vec2(0.0, gs)) : 9.0);
      v = max(v * (1.0 - ink(mark, w * 3.0, g)), ink(mark, w * 0.9, g) * 0.75);
    }
  }
  v = max(v, ink(F, w * 1.5, g));                                        // the surface itself
  // the loupe's rim
  if (r > 0.94 && r < 0.99) {
    v = 0.02;
    float sa = a + spinAngle(1.0, uTime);                                // (turning about the open box, the portal)
    float k = floor(sa / TAU * 72.0 + 0.5);
    v = max(v, ink(abs(sa - k * TAU / 72.0) * r, w, g) * step(mod(k, 6.0) < 0.5 ? 0.94 : 0.965, r));
  }
  v = max(v, max(ink(r - 0.94, w, g), ink(r - 0.99, w, g)));
  return v;
}
`,
};
