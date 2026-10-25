/**
 * arachnia.js — Arachnia as a world: a web, a drop, a thread, a mind.
 *
 *   0 The Web       an orb-weaver's web strung across the face: radials, the
 *                   capture spiral, the spider at the hub, dew on the silk
 *   1 The Dewdrop   inside one drop, the desktop seen through it: the
 *                   workbench's windows bent by the glass, light on its rim
 *   2 The Thread    inside a glue bead on the silk: the strand magnified,
 *                   tokens strung along it like beads
 *   3 The Mind      inside one token, attention: weighted edges converging on
 *                   a hub — and the hub is the Web again
 *
 * Same engraving as every world: line width is the only brightness. The
 * darkness is the canvas; light is spent on the silk, the glass and the spider.
 */

export const ARACHNIA = {
  id: 'arachnia',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — dew-green silk, violet dusk
  palette: ['#10301c', '#4fcf6a', '#e6ff9a', '#b07bff'],
  // how its words arrive (world.js): tokens streaming in, as the model writes, behind a small spider
  reveal: 'type',
  caret: 'spider',
  // and painted (world.js): titles and figures in a spiky gothic, the rest as the model's own monospace
  fonts: { title: ['Metamorphous', 400], body: ['JetBrains Mono', 400] },
  // at rest its wash is dew mist: fine, slow, drifting a little with the air
  wash: { scale: 28, speed: 0.04, flow: [2, 0.5], warp: 0.8, ripple: 0.18, bands: 4 },

  // portal / medal: [x, y, r] in the plate's own units; home: [x, y, s] (default [0, 0, 1])
  plates: [
    { title: 'The Web', note: 'An orb-weaver’s web across the face, the spider at its hub. Scroll into the dewdrop.', portal: [0.5, -0.24, 0.085], medal: [0, 0.1, 1.15] },
    { title: 'The Dewdrop', note: 'The desktop seen through the drop: the workbench, bent by the glass. Scroll into the bead on the thread.', portal: [0, 0.62, 0.1], medal: [0, 0, 1] },
    { title: 'The Thread', note: 'The silk magnified: tokens strung along it like beads. Scroll into the brightest.', portal: [0, 0, 0.12], medal: [0, 0, 1] },
    { title: 'The Mind', note: 'Inside the token, attention converging on one hub. At the hub, the web again.', portal: [0, 0, 0.1], medal: [0, 0, 1] },
  ],

  inscriptions(p) {
    const out = [];
    // 0 · under the web's lowest thread: the name and the overview
    out.push({ plate: 0, text: p.name, x: 0, y: -0.7, size: 0.088, track: 0.2, upper: true });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.808, size: 0.031, w: 2.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.875, size: 0.019, track: 0.22, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.912, size: 0.015, track: 0.12, alpha: 0.5 });

    // 1 · the workbench seen through the drop: the summary in its main window, the figures beside it,
    //     the stack written round the drop's rim
    out.push({ plate: 1, text: `${p.name}  ·  ${p.version}`, x: -0.12, y: 0.335, size: 0.018, track: 0.1, alpha: 0.7 });
    out.push({ plate: 1, text: p.summary, x: -0.29, y: 0.0, size: 0.0235, w: 0.64, lh: 1.5, alpha: 0.88 });
    p.stats.forEach((s, i) => {
      const y = 0.2 - i * 0.155;
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 1, text: v, count: s, x: 0.37, y, size: 0.046, weight: 200 });
      out.push({ plate: 1, text: s.label, x: 0.37, y: y - 0.048, size: 0.0155, track: 0.08, upper: true, alpha: 0.7 });
    });
    const items = p.stack.map(([g, it]) => `${g}  ·  ${it.join('  ·  ')}`);
    const R = 0.905, size = 0.021, track = 0.12, gap = 0.12;
    const span = (s) => (s.length * size * (0.64 + track)) / R;      // radians, near enough (monospace capitals)
    let a = -Math.PI / 2 - (items.reduce((t, s) => t + span(s), 0) + gap * (items.length - 1)) / 2;
    items.forEach((s) => {
      out.push({ plate: 1, text: s, x: 0, y: 0, size, track, upper: true, arc: { r: R, a: a + span(s) / 2 }, alpha: 0.7 });
      a += span(s) + gap;
    });

    // 2 · the thread: the tagline as tokens on its beads, the highlights above and below the silk
    const tokens = ['A', 'local', '-first', 'AI', 'work', 'bench', '78 tok/s'];
    const bx = [-0.8, -0.56, -0.31, 0, 0.31, 0.56, 0.8], br = [0.06, 0.08, 0.095, 0.12, 0.095, 0.08, 0.06];
    tokens.forEach((t, i) => out.push({ plate: 2, text: t, x: bx[i], y: br[i] + 0.05, size: i === 3 ? 0.03 : 0.022, track: 0.06, alpha: i === 3 ? 0.9 : 0.7 }));
    p.highlights.forEach((t, i) => {
      const x = i % 2 ? 0.43 : -0.43, y = i < 2 ? 0.47 : -0.42;
      out.push({ plate: 2, text: t, x, y, size: 0.024, w: 0.48, lh: 1.45, alpha: 0.88 });
    });

    // 3 · the mind: what is inside, in the four quarters the attention leaves dark
    const spots = [[-0.46, 0.45], [0.46, 0.45], [-0.5, -0.4], [0.5, -0.4]];
    p.inside.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      out.push({ plate: 3, text: s.title, x, y: y + 0.12, size: 0.034, face: 'title' });
      out.push({ plate: 3, text: s.text, x, y: y + 0.06, size: 0.026, w: 0.44, lh: 1.4, alpha: 0.85, hang: true });
    });
    return out;
  },

  // on top of the paint (world.js): while it is wet, dew stands on the letters, a bead here and there on the
  // strokes catching the light up and to the left; silk strands, loose at first, draw tight round each line
  // as you scroll in and link its words
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float p = w0.y, em = max(w0.w, 8.0), plaque = (1.0 - clear) / 0.95;
  if (w0.x > 1.5 * em) return;                               // (nothing reaches this far from a word)
  vec2 P = uv * uCanvas;
  float a = paintAge(uv, w0);
  float wet = (1.0 - smoothstep(0.05, 0.9, a)) * smoothstep(0.0, 0.05, a);
  // the dew: one bead to a cell of a lattice, on cells whose centre lies on a stroke
  float cs = 0.46 * latticeSize(max(w0.w, 22.0));
  vec2 id = floor(P / cs), c = (id + 0.5) * cs;
  float h = hash3(vec3(id, 3.7)), r = cs * (0.1 + 0.08 * h) * wet;
  float on = step(words(c / uCanvas).x, 0.04 * em) * step(0.4, h);
  float bead = (1.0 - smoothstep(-0.7, 0.7, length(P - c) - r)) * on;
  vec2 sp = P - c - vec2(-0.3, 0.3) * r;
  float spot = exp(-dot(sp, sp) / max(0.1 * r * r, 0.5)) * bead;
  // silk: one strand along an outline of each line, drawing tight as you scroll in (loose, it sags and sways);
  // a faint one stays round the larger words, clear of their letters
  float reach = mix(1.35 * em, 0.55 * em, smoothstep(0.05, 0.8, p));
  float wob = warp2(P / em * 0.35, uTime * 0.05).x * mix(0.05, 0.22, 1.0 - p) * em;
  float sw = 0.045 * em + 0.5;
  float silk = (1.0 - smoothstep(sw - 0.4, sw + 0.4, abs(w0.x + wob - reach)))
             * (0.1 * smoothstep(16.0, 30.0, w0.w) * plaque + 0.85 * sin(PI * min(1.0, 0.12 + p)));   // (mid-zoom it strays past the wash)
  txt = max(max(txt * (1.0 - 0.35 * bead), bead * 0.55 + spot), silk);
}
`,

  glsl: /* glsl */ `
// the face's triangle (incircle 1 about the origin, apex up)
float arTri(vec2 q) { return max(-q.y, max(dot(q, vec2(0.8660254, 0.5)), dot(q, vec2(-0.8660254, 0.5)))) - 1.0; }
float arRBox(vec2 p, vec2 b, float r) { return sdBox2(p, b - r) - r; }

// a drop of glass lit from the upper left: rings about its highlight, a crescent of focused light
// at the lower right, the glint; the cut edge round it
void arBead(vec2 q, vec2 c, float rb, float g, float w, float lum, inout float v) {
  vec2 lp = (q - c) / rb;
  float d = length(q - c) - rb;
  if (d < 0.0) {
    float rr = length(lp);
    float sh = sat(dot(lp / max(rr, 1e-3), vec2(0.6, -0.8)));
    float body = lum * (0.12 + 0.88 * smoothstep(0.3, 1.0, rr) * (0.15 + 0.85 * sh));
    v = engrave(length(lp - vec2(-0.38, 0.4)) * rb, body, g, rb * 0.16);
    v = max(v, 1.0 - smoothstep(0.1, 0.17, length(lp - vec2(-0.4, 0.42))));
  }
  v = max(v, ink(d, w, g));
}
// a bead turning on the silk (axis along x): two great circles through the axis, their near halves drawn
void arSpin(vec2 q, vec2 c, float rb, float ph, float g, float w, inout float v) {
  vec2 l = (q - c) / rb;
  if (dot(l, l) > 1.0) return;
  float s = sqrt(1.0 - l.x * l.x);
  for (int i = 0; i < 2; i++) {
    float a = ph + float(i) * PI * 0.5;
    float y = s * cos(a) * sign(sin(a));                                    // the near branch: it sweeps over the top, then away
    v = max(v, ink((l.y - y) * rb, w * 0.6, g) * 0.7 * abs(sin(a)) * smoothstep(1.0, 0.8, length(l)));
  }
}
// on a ring at radius r, n dashes parted by gaps gap wide (a: angle round the ring, plate units for gap and g)
float arDash(float a, float r, float n, float gap, float g) {
  float hc = PI / n * r, dd = abs(fract(a / TAU * n) - 0.5) * 2.0 * hc;
  return smoothstep(gap * 0.5 - g, gap * 0.5 + g, hc - dd);
}

// ═══ 0 · THE WEB ═══════════════════════════════════════════════════════════

const vec2 AR_HUB = vec2(0.0, 0.2);
const float AR_FR = 0.76;                          // the frame threads: a triangle of incircle 0.76 about the hub
const float AR_SEC = TAU / 28.0;                   // 28 radials
const float AR_PITCH = 0.034;                      // the capture spiral's pitch
const vec3 AR_DROP = vec3(0.5, -0.24, 0.085);      // the dewdrop that is the next plate

// from the hub along d, how far to the frame
float arReach(vec2 d) {
  float t = 9.0;
  if (d.y < 0.0) t = min(t, AR_FR / -d.y);
  float a = dot(d, vec2(0.8660254, 0.5)), b = dot(d, vec2(-0.8660254, 0.5));
  if (a > 0.0) t = min(t, AR_FR / a);
  if (b > 0.0) t = min(t, AR_FR / b);
  return t;
}

// the spider, head down as orb-weavers hang (p relative to the hub); returns its outline distance.
// Legs (right side, from the cephalothorax): knee, ankle, tip — I and II reach down, III is short, IV climbs beside the abdomen
const vec2 AR_LK[4] = vec2[4](vec2(0.062, 0.022), vec2(0.072, -0.004), vec2(0.056, 0.03), vec2(0.056, 0.062));
const vec2 AR_LM[4] = vec2[4](vec2(0.098, -0.088), vec2(0.14, -0.06), vec2(0.105, 0.024), vec2(0.098, 0.15));
const vec2 AR_LT[4] = vec2[4](vec2(0.085, -0.215), vec2(0.195, -0.165), vec2(0.15, -0.012), vec2(0.122, 0.255));
float arRun = 0.0;                           // how hard it is scurrying (plate0: from the pointer)
float arSpider(vec2 p, float g, float w, inout float v) {
  vec2 C = vec2(0.0, -0.045), A = vec2(0.0, 0.08);
  vec2 ps = vec2(abs(p.x), p.y);
  float legs = 9.0, seg = 0.0, side = step(p.x, 0.0);
  for (int j = 0; j < 4; j++) {
    vec2 b = C + normalize(AR_LK[j]) * 0.022, k = C + AR_LK[j], m = C + AR_LM[j], t = C + AR_LT[j];
    float tw = 0.22 * pow(sat(sin(uTime * 0.83 + float(j) * 2.3 + side * 1.9)), 30.0)    // now and then a leg twitches at the knee
             + 0.3 * arRun * sin(uTime * 17.0 + float(j) * 1.7 + side * 3.1);              // (all of them, running)
    m = rotAt(m, k, tw); t = rotAt(t, k, tw * 1.4);
    float d1 = sdSeg(ps, b, k) - 0.0075, d2 = sdSeg(ps, k, m) - 0.0058, d3 = sdSeg(ps, m, t) - 0.0034;
    float d = min(d1, min(d2, d3));
    if (d < legs) { legs = d; seg = d1 < min(d2, d3) ? 0.0 : (d2 < d3 ? 1.0 : 2.0); }
  }
  legs = min(legs, min(sdSeg(ps, C + vec2(0.012, -0.045), C + vec2(0.026, -0.072)) - 0.005, sdSeg(ps, C + vec2(0.026, -0.072), C + vec2(0.02, -0.09)) - 0.0035));   // the palps
  vec2 la = (p - A) / vec2(0.076, 0.09);
  la.x /= 0.9 + 0.14 * clamp(la.y, -1.0, 1.0);                               // a pear, broad at the shoulders
  float abd = (length(la) - 1.0) * 0.074;
  vec2 lc = (p - C) / vec2(0.04, 0.048);
  float cep = (length(lc) - 1.0) * 0.04;
  float body = min(abd, cep), whole = min(body, legs);

  v *= smoothstep(0.0, 0.012, whole);                                       // a dark cut round it, so it stands off the silk
  if (legs < 0.0 && body > 0.0) v = engrave(-legs, 0.42 - 0.12 * seg, g, 0.003);   // legs: tubes, darker toward the tips
  if (abd < 0.0 && abd < cep) {                                             // the abdomen: a dome, lit from the upper left
    vec2 hl = la - vec2(-0.35, 0.3);
    float lum = 0.06 + 0.62 * exp(-dot(hl, hl) * 1.6);
    float fol = abs(la.x) - 0.42 * (1.0 - 0.5 * la.y * la.y) + 0.035 * sin(la.y * 15.0);   // the folium, scalloped
    if (fol < 0.0) lum *= 0.32;
    v = engrave(((la.x - la.y) * 0.62 + 0.3 * dot(la, la)) * 0.074, lum, g, 0.005);   // curved strokes across the form
    v = max(v, ink(fol * 0.074, w * 0.8, g) * 0.85);
    v = max(v, ink(abs(fract(la.y * 2.6 + abs(la.x) * 1.4) - 0.5) * 0.03, w * 0.6, g) * step(fol, 0.0) * 0.6);   // its chevrons
  }
  if (cep < 0.0 && cep <= abd) {
    vec2 hl = lc - vec2(-0.3, 0.25);
    v = engrave(((lc.x - lc.y) * 0.62 + 0.3 * dot(lc, lc)) * 0.04, 0.08 + 0.5 * exp(-dot(hl, hl) * 1.5), g, 0.004);
    v = max(v, 1.0 - smoothstep(-g, g, length(ps - vec2(0.011, -0.08)) - 0.005));   // eyes, at the bottom: head down
  }
  v = max(v, ink(whole, w, g));
  return whole;
}

// the breeze: how far the silk at q is carried (before it is held at the frame and the drop)
vec2 arSway(vec2 q) {
  return vec2(0.006 * sin(uTime * 0.53 + q.y * 2.1) + 0.0025 * sin(uTime * 1.13 + q.x * 3.7), 0.004 * sin(uTime * 0.41 + q.x * 1.7 + 1.0));
}

float plate0(vec2 q, float g) {
  float w = lw(0.0016, g);
  // the web sways, most at the hub, not at all at the frame or round the drop (the portal never moves)
  float hold = sat(-arTri((q - AR_HUB) / AR_FR) * AR_FR / 0.3) * smoothstep(0.0, 0.22, length(q - AR_DROP.xy) - AR_DROP.z);
  vec2 p = q - AR_HUB - arSway(q) * hold;
  float r = length(p), a0 = atan(p.y, p.x);
  float a = a0 + 0.07 * sin(2.0 * a0 + 1.0) + 0.045 * sin(5.0 * a0 + 2.0);   // radials unevenly spaced, as spun
  float da = 1.0 + 0.14 * cos(2.0 * a0 + 1.0) + 0.225 * cos(5.0 * a0 + 2.0);
  vec2 pw = r * vec2(cos(a), sin(a));                                       // the web in its own (warped) frame
  float frame = arTri(p / AR_FR) * AR_FR;
  float La = 2.25 + 0.12 * sin(uTime * 0.13) + 0.15 * uPointer.x;          // where the light lies across the silk
  float v = 0.0;

  // the capture spiral: a polar field whose isolines run as straight chords from radial to radial
  float k = floor(a / AR_SEC), ac = (k + 0.5) * AR_SEC;
  float rp = r * cos(a - ac) / cos(AR_SEC * 0.5);
  float f = rp / AR_PITCH + a / TAU;
  float n = floor(f + 0.5);
  float rLine = (n - a / TAU) * AR_PITCH;
  float rOut = min(0.9 * arReach(vec2(cos(ac), sin(ac))) - 0.03, 0.8);   // (near enough in the warped frame)
  float glint = exp(-pow(sin(ac - La) * 3.2, 2.0));                          // silk shines where it lies across the light
  float run = exp(-pow(sin(0.5 * (a - spinAngle(3.5, uTime) - n * 2.4)) * 5.0, 2.0)) * step(0.6, hash3(vec3(n, 9.0, 1.0)));   // a glint running round some turns
  float sg = max(glint, 0.85 * run);
  float spiral = ink(abs(f - n) * AR_PITCH, lw(0.0008 + 0.0022 * sg, g), g) * (0.35 + 0.65 * sg);
  spiral = mix(0.05, spiral, smoothstep(2.0 * g, 5.0 * g, AR_PITCH));        // too fine to cut: a faint sheen
  v = max(v, spiral * step(0.17, rLine) * step(rLine, rOut));

  // radials, hub to frame
  float ar = floor(a / AR_SEC + 0.5) * AR_SEC;
  float rgl = exp(-pow(cos(ar - La) * 3.2, 2.0));
  float ri = floor(a / AR_SEC + 0.5), rh = hash3(vec3(ri, 4.0, 2.0));
  rgl = max(rgl, 0.85 * exp(-pow((fract(r * 1.6 - uTime * 0.09 + rh * 7.0) - 0.5) * 9.0, 2.0)) * step(0.55, rh));   // … and a glint runs out along some
  float radial = ink(r * abs(sin(a - ar)) / da, lw(0.0009 + 0.0018 * rgl, g), g) * (0.45 + 0.55 * rgl);
  v = max(v, radial * smoothstep(2.0 * g, 5.0 * g, r * AR_SEC * 0.6) * step(frame, 0.0) * smoothstep(0.02, 0.05, r));

  // the hub's tight, uneven mesh
  if (r < 0.105) v = max(v, ink(abs(fract(r / 0.016 + 0.25 * sin(a * 3.0)) - 0.5) * 0.016, w * 0.7, g) * 0.55 * smoothstep(1.5 * g, 4.0 * g, 0.016));

  // the frame threads, and the moorings out to the face's edges
  v = max(v, max(ink(frame, lw(0.0022, g), g), ink(frame + 0.011, w * 0.7, g) * 0.6));
  vec2 fa = AR_HUB + vec2(0.0, 2.0) * AR_FR, fb = AR_HUB + vec2(1.732, -1.0) * AR_FR;
  vec2 qs = vec2(abs(q.x), q.y);
  float moor = min(sdSeg(q, fa, vec2(0.0, 2.0)), sdSeg(qs, fb, vec2(1.732, -1.0)));
  moor = min(moor, min(sdSeg(qs, vec2(0.526, 0.808), vec2(0.66, 0.86)), sdSeg(qs, vec2(0.987, 0.01), vec2(1.12, 0.06))));
  moor = min(moor, sdSeg(qs, vec2(1.02, -0.56), vec2(1.2, -1.0)));
  v = max(v, ink(moor, w, g) * 0.75);

  // dew on the spiral: a few drops per turn, sized and placed by hash
  for (int i = 0; i < 2; i++) {
    float nn = floor(f) + float(i);
    if (hash3(vec3(k, nn, 3.0)) < 0.3) {
      float t0 = 0.2 + 0.6 * hash3(vec3(k, nn, 5.0));
      float ad = (k + t0) * AR_SEC;
      float rl = (nn - ad / TAU) * AR_PITCH;
      if (rl > 0.17 && rl < rOut) {
        vec2 c = vec2(cos(ad), sin(ad)) * rl * cos(AR_SEC * 0.5) / cos(ad - ac);
        arBead(pw, c, (0.0035 + 0.0065 * hash3(vec3(k, nn, 7.0))) * (0.7 + 0.5 * glint), g, w * 0.8, 0.9, v);
      }
    }
  }

  // the great drop: the threads end at its skin; its light spills round it
  float dd = length(q - AR_DROP.xy) - AR_DROP.z;
  v *= smoothstep(0.0, 0.006, dd);
  v = max(v, max(ink(dd - 0.018, w * 0.7, g) * 0.5, ink(dd - 0.042, w * 0.5, g) * 0.25));
  if (dd < 0.0) v = 0.3;                                                     // (drawn by plate 1 whenever it is visible)
  v = max(v, max(ink(dd, lw(0.0026, g), g), ink(dd - 0.008, w * 0.6, g)));

  vec2 sp = q - AR_HUB - arSway(AR_HUB) - vec2(0.0, 0.005 * sin(uTime * 1.7));   // carried with the hub, bobbing on it
  // the pointer comes near: it scurries off along the web away from it, legs going, and back once it has gone
  vec2 away = AR_HUB - gPtr;
  float shy = gPtrOn * (1.0 - smoothstep(0.12, 0.45, length(away)));
  sp -= normalize(away + vec2(0.0, 1e-4)) * 0.09 * shy;
  arRun = shy * min(1.0, 0.3 + length(gPtrV) * 2.0);
  if (length(sp - vec2(0.0, 0.02)) < 0.36) arSpider(sp, g, w, v);           // (its legs reach 0.31 at most)
  return v;
}

// ═══ 1 · THE DEWDROP ═══════════════════════════════════════════════════════

// a window: hides what is behind it; title bar and three buttons. l: window-local, b: half size
float arWin(vec2 l, vec2 b, float g, float w, inout float v) {
  float f = arRBox(l, b, 0.02);
  float bar = l.y - (b.y - 0.055);
  if (f < 0.0) {
    v = 0.0;
    if (bar > 0.0) {
      v = engrave(l.x, 0.12, g, 0.006);
      for (int i = 0; i < 3; i++) v = max(v, ink(length(l - vec2(b.x - 0.04 - float(i) * 0.038, b.y - 0.0275)) - 0.01, w * 0.8, g));
    }
  }
  v = max(v, max(ink(f, w, g), ink(bar, w * 0.7, g) * step(f, 0.0)));
  return f;
}
// faux text: rows of word strokes inside a box b (l relative to its centre)
float arText(vec2 l, vec2 b, float pitch, float seed, float g, float w) {
  if (abs(l.x) > b.x || abs(l.y) > b.y) return 0.0;
  float row = floor(l.y / pitch);
  float y = l.y - (row + 0.5) * pitch;
  float x = l.x + b.x;
  float len = 2.0 * b.x * (0.3 + 0.7 * hash3(vec3(row, seed, 1.0)));
  float word = step(0.2, fract(x / 0.075 + hash3(vec3(row, seed, 2.0))));
  return ink(y, w * 0.9, g) * step(x, len) * word;
}

// the desktop, flat (p: desktop units)
float arDesk(vec2 p, float g, float w) {
  float v = 0.0;
  // the taskbar
  if (p.y < -1.38) {
    v = engrave(p.x, 0.07, g, 0.008);
    for (int i = 0; i < 6; i++) v = max(v, ink(arRBox(p - vec2(-0.5 + float(i) * 0.16, -1.48), vec2(0.045), 0.012), w, g));
  }
  v = max(v, ink(p.y + 1.38, w, g));
  // behind: the model list (upper left)
  vec2 l = p - vec2(-0.95, 0.78);
  if (arWin(l, vec2(0.55, 0.3), g, w, v) < 0.0) {
    for (int i = 0; i < 4; i++) {
      float y = 0.13 - float(i) * 0.1;
      v = max(v, arText(l - vec2(0.06, y), vec2(0.36, 0.012), 0.024, float(i), g, w));
      float dt = length(l - vec2(-0.42, y)) - 0.016;
      v = max(v, i == 0 ? 1.0 - smoothstep(-g, g, dt) : ink(dt, w, g));
    }
  }
  // the terminal (upper right)
  l = p - vec2(1.0, 0.6);
  if (arWin(l, vec2(0.52, 0.32), g, w, v) < 0.0) v = max(v, arText(l - vec2(-0.05, -0.05), vec2(0.4, 0.2), 0.045, 7.0, g, w) * 0.8);
  // the governor's graph: memory per layer against the card's ceiling (lower right)
  l = p - vec2(0.98, -0.82);
  if (arWin(l, vec2(0.6, 0.4), g, w, v) < 0.0) {
    vec2 gq = l - vec2(0.0, -0.06);
    if (abs(gq.x) < 0.5 && gq.y > -0.26 && gq.y < 0.24) {
      float col = floor(gq.x / 0.05);
      float hgt = -0.26 + 0.38 * (0.35 + 0.65 * noise3(vec3(col * 0.37, uTime * 0.25, 4.0)));
      float bar = sdBox2(vec2(gq.x - (col + 0.5) * 0.05, gq.y - (hgt - 0.26) * 0.5), vec2(0.017, (hgt + 0.26) * 0.5));
      if (bar < 0.0) v = engrave(gq.y, 0.18 + 0.25 * smoothstep(-0.26, 0.12, gq.y), g, 0.006);
      v = max(v, ink(bar, w * 0.8, g));
      v = max(v, ink(gq.y - 0.16, w * 0.8, g) * step(0.5, fract(gq.x * 18.0)));   // the ceiling, dashed
    }
  }
  // the workbench itself (centre): a sidebar, the conversation, the figures, the prompt
  l = p - vec2(-0.19, -0.057);
  vec2 B = vec2(0.89, 0.42);
  if (arWin(l, B, g, w, v) < 0.0 && l.y < B.y - 0.055) {
    float side = l.x + B.x - 0.17;
    v = max(v, ink(side, w * 0.8, g));
    if (side < 0.0) {
      for (int i = 0; i < 5; i++) {
        float ic = arRBox(l - vec2(-B.x + 0.085, 0.28 - float(i) * 0.12), vec2(0.04), 0.012);
        if (i == 0 && ic < 0.0) v = engrave(-ic, 0.4, g, 0.004);
        v = max(v, ink(ic, w * 0.8, g));
      }
    }
    v = max(v, ink(l.x - 0.31, w * 0.7, g) * step(-0.37, l.y));             // the figures' column
    if (l.x > 0.31) for (int i = 0; i < 4; i++) {                           // a meter under each figure
      float y = 0.2 - float(i) * 0.155 + 0.057 - 0.072;
      float m = sdBox2(l - vec2(0.56, y), vec2(0.18, 0.006));
      // it fills as its figure counts (one after another), then a bead of light runs along it
      float grow = smoothstep(0.0, 1.0, (gAge - 0.35 - float(i) * 0.12) / 1.5);
      float end = 0.38 + 0.36 * (0.4 + 0.6 * hash3(vec3(float(i), 2.0, 3.0))) * (1.0 - pow(1.0 - grow, 3.0));
      float fill = l.x - end;
      float run = exp(-pow((l.x - 0.38 - fract(uTime * 0.22 + float(i) * 0.27) * (end - 0.38)) * 60.0, 2.0)) * step(0.999, grow);
      v = max(v, max(ink(m, w * 0.6, g), (1.0 - smoothstep(-g, g, max(m, fill))) * (0.55 + 0.45 * run)));
      v = max(v, (1.0 - smoothstep(-g, g, abs(l.x - end) - 0.0025)) * step(abs(l.y - y), 0.014) * step(0.001, grow));   // the leading edge
    }
    // the prompt, with a ghost-text completion trailing the caret
    vec2 pq = l - vec2(-0.25, -0.32);
    float box = arRBox(pq, vec2(0.45, 0.045), 0.045);
    v = max(v, ink(box, w, g));
    if (box < 0.0) {
      v = max(v, ink(pq.y, w, g) * step(-0.38, pq.x) * step(pq.x, -0.1));
      v = max(v, ink(pq.x + 0.08, w, g) * step(abs(pq.y), 0.025) * step(0.5, fract(uTime * 1.1)));
      v = max(v, ink(pq.y, w * 0.6, g) * step(-0.06, pq.x) * step(pq.x, 0.3) * step(0.5, fract(pq.x * 30.0)) * 0.6);
    }
    // the question above the answer, in a bubble at the right
    vec2 bq = l - vec2(0.02, 0.245);
    float bub = arRBox(bq, vec2(0.24, 0.045), 0.03);
    v = max(v, ink(bub, w * 0.8, g));
    v = max(v, arText(bq, vec2(0.2, 0.024), 0.024, 11.0, g, w));
  }
  return v;
}

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  float r = length(q);
  // the glass: almost flat through the middle, the edges crushed outward (barrel)
  float kk = 1.0 + 0.85 * pow(r, 4.0);
  float v = arDesk(q * kk, g * kk, w * kk);
  v *= 1.0 - 0.75 * smoothstep(0.72, 1.0, r);

  // the rim: rings that catch the light, brightest across from it
  float sh = sat(dot(q / max(r, 1e-3), vec2(0.6, -0.8)));
  if (r > 0.82) v = max(v, engrave(r, smoothstep(0.82, 1.0, r) * (0.12 + 0.55 * sh), g, 0.008));
  // the window the drop reflects, small and bent, at the upper left
  vec2 hq = rot(-0.5) * (q - vec2(-0.47, 0.46));
  hq.y += 1.6 * hq.x * hq.x;
  float hl = arRBox(hq, vec2(0.085, 0.055), 0.02);
  if (hl < 0.0) {
    v = engrave(hq.x + hq.y, 0.75, g, 0.005);
    v *= smoothstep(0.0, 0.006, min(abs(hq.x), abs(hq.y)));                  // its mullions
  }
  v = max(v, ink(hl, w * 0.7, g));

  // the thread the drop hangs on, seen through it: two fibres twisted, beaded with glue
  float yt = 0.62 + 0.05 * q.x * q.x;
  float dT = abs(q.y - yt) / sqrt(1.0 + 0.01 * q.x * q.x);
  if (r < 0.985) {
    v *= smoothstep(0.006, 0.016, dT);
    float tw = 0.0045 * sin(q.x * 38.0);
    v = max(v, max(ink(q.y - yt - tw, w, g), ink(q.y - yt + tw, w, g)));
    for (int i = 0; i < 8; i++) {
      float s = i < 4 ? -1.0 : 1.0;
      int j = i < 4 ? i : i - 4;
      float x = s * (0.17 + float(j) * 0.165);
      float rb = j == 0 ? 0.042 : (j == 1 ? 0.028 : (j == 2 ? 0.036 : 0.022));
      arBead(q, vec2(x, 0.62 + 0.05 * x * x), rb, g, w, 0.85, v);
      arSpin(q, vec2(x, 0.62 + 0.05 * x * x), rb, spinAngle(14.0, uTime) * s + float(i) * 1.3, g, w, v);   // (either side of the drop turning its own way)
    }
  }
  // the bead that is the next plate
  float dP = length(q - vec2(0.0, 0.62)) - 0.1;
  if (dP < 0.0) v = 0.3;                                                     // (drawn by plate 2)
  v = max(v, max(ink(dP, lw(0.0026, g), g), ink(dP - 0.012, w * 0.6, g)));
  // the drop's skin
  v = max(v, max(ink(r - 0.995, lw(0.0026, g), g), ink(r - 0.972, w * 0.6, g)));
  return v;
}

// ═══ 2 · THE THREAD ════════════════════════════════════════════════════════

// one fibre of the pair, centred on y = yc with slope s
void arFibre(vec2 q, float yc, float s, float g, float w, inout float v) {
  float d = (q.y - yc) / sqrt(1.0 + s * s);
  float e = abs(d) - 0.019;
  if (e < 0.0) v = engrave(d, 0.2 + 0.42 * sat(d / 0.019 + 0.3), g, 0.003);   // fibrils, lit along the top
  v = max(v, ink(e, w, g));
}

float plate2(vec2 q, float g) {
  float w = lw(0.002, g);
  float r = length(q);
  float v = 0.0;
  // the glue's own glass: dark, rings toward the rim, lit across from the light
  float sh = sat(dot(q / max(r, 1e-3), vec2(0.6, -0.8)));
  if (r > 0.8) v = engrave(r, smoothstep(0.8, 1.0, r) * (0.1 + 0.5 * sh), g, 0.008);
  // the web behind, seen through the glue: upside down and crushed toward the rim
  float sc = 1.4 + 2.2 * r * r;
  vec2 wq = -q * sc;
  float wr = length(wq), wa = atan(wq.y, wq.x);
  float wsec = TAU / 18.0;
  float web = min(abs(fract(wr / 0.16 + wa / TAU + 0.5) - 0.5) * 0.16, wr * abs(sin(wa - floor(wa / wsec + 0.5) * wsec))) / (sc + 4.4 * r * r);
  v = max(v, ink(web, w * 0.5, g) * 0.1 * smoothstep(0.4, 0.7, r) * smoothstep(0.97, 0.85, r) * smoothstep(0.09, 0.16, abs(q.y)));

  // the strand: two fibres twisted round each other in a sheath of glue
  float tw = q.x * 6.5;
  float y1 = 0.036 * sin(tw), s1 = 0.036 * 6.5 * cos(tw);
  v *= smoothstep(0.07, 0.085, abs(q.y));
  v = max(v, ink(abs(q.y) - 0.075, w * 0.6, g) * 0.45);
  if (cos(tw) > 0.0) { arFibre(q, -y1, -s1, g, w, v); arFibre(q, y1, s1, g, w, v); }
  else { arFibre(q, y1, s1, g, w, v); arFibre(q, -y1, -s1, g, w, v); }

  // tokens in flight: small beads streaming along the silk toward the bright one
  float xm = mod(abs(q.x) + uTime * 0.06, 0.09) - 0.045;
  float mb = length(vec2(xm, q.y)) - 0.012;
  v = max(v, (1.0 - smoothstep(-g, g, mb)) * 0.8 * step(abs(q.x), 0.95));

  // the tokens strung on it; a pulse of light runs in from either end
  float pulse = fract(uTime * 0.18);
  for (int i = 0; i < 7; i++) {
    if (i == 3) continue;
    float x = i == 0 ? -0.8 : (i == 1 ? -0.56 : (i == 2 ? -0.31 : (i == 4 ? 0.31 : (i == 5 ? 0.56 : 0.8))));
    float rb = (i == 0 || i == 6) ? 0.06 : ((i == 1 || i == 5) ? 0.08 : 0.095);
    float lit = exp(-pow((1.0 - abs(x) - pulse) * 5.0, 2.0));
    arBead(q, vec2(x, 0.0), rb, g, w, 0.45 + 0.5 * lit, v);
    arSpin(q, vec2(x, 0.0), rb, spinAngle(9.0, uTime) * sign(x) + float(i) * 1.3, g, w, v);
  }
  // the bead that is the next plate, and its dial: a ring of dashes and a ring of ticks turning against
  // each other about it (the portal itself stays still)
  float dB = r - 0.12, ba = atan(q.y, q.x);
  float dash = ink(dB - 0.03, w * 0.7, g) * arDash(ba + spinAngle(5.0, uTime), r, 24.0, 0.012, g);
  float tk = abs(fract((ba - spinAngle(3.0, uTime)) / TAU * 48.0) - 0.5) * TAU / 48.0 * r;
  float ticks = ink(tk, w * 0.6, g) * step(abs(dB - 0.065), mod(floor((ba - spinAngle(3.0, uTime)) / TAU * 48.0 + 0.5), 4.0) < 0.5 ? 0.012 : 0.006);
  v = max(v, max(dash * 0.55, max(ink(dB - 0.065, w * 0.5, g) * 0.25, ticks * 0.45)) * step(0.085, abs(q.y)));
  if (dB < 0.0) v = 0.3;                                                     // (drawn by plate 3)
  v = max(v, max(ink(dB, lw(0.0026, g), g), ink(dB - 0.014, w * 0.6, g)));
  // the bead's skin
  v = max(v, max(ink(r - 0.995, lw(0.0026, g), g), ink(r - 0.972, w * 0.6, g)));
  return v;
}

// ═══ 3 · THE MIND ══════════════════════════════════════════════════════════

vec2 arMid(int j) { float a = float(j) * TAU / 7.0 + 0.22; return vec2(cos(a), sin(a)) * (0.37 + 0.03 * sin(float(j) * 2.3)); }
vec2 arOut(int i) {
  float fi = float(i);
  float a = (floor(fi / 3.0) * 90.0 + (mod(fi, 3.0) - 1.0) * 23.0) * PI / 180.0 + 0.06 * sin(fi * 1.7);
  return vec2(cos(a), sin(a)) * (0.72 + 0.08 * hash3(vec3(fi, 2.0, 9.0)));
}
// a weighted edge: a band of silk as wide as its weight, its fibres engraved along it
void arEdge(vec2 q, vec2 a, vec2 b, float wt, float g, float w, inout float v) {
  float d = sdSeg(q, a, b);
  float bw = 0.001 + 0.0042 * wt;
  if (d > bw + 0.01) return;
  if (d < bw) v = max(v, engrave(d, 0.12 + 0.38 * wt, g, 0.0025));
  v = max(v, ink(d - bw, w * 0.55, g) * (0.3 + 0.6 * wt));
}

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q), a = atan(q.y, q.x);
  float v = 0.0;
  // the light gathered at the hub, spent outward in rings of dashes, each turning against the next; the token's glass at the rim
  for (int i = 0; i < 4; i++) {
    float fi = float(i), ra = a + (mod(fi, 2.0) * 2.0 - 1.0) * spinAngle(4.0 - fi, uTime);
    v = max(v, ink(r - 0.16 - fi * (0.04 + fi * 0.012), w * (1.0 - 0.15 * fi), g) * (0.6 - 0.13 * fi) * arDash(ra, r, 12.0 + 8.0 * fi, 0.02, g));
  }
  float sh = sat(dot(q / max(r, 1e-3), vec2(0.6, -0.8)));
  if (r > 0.84) v = max(v, engrave(r, smoothstep(0.84, 1.0, r) * (0.1 + 0.45 * sh), g, 0.008));
  // the attention field itself, surveyed faintly: contours of how strongly each head pulls
  float F = 0.0; vec2 dF = vec2(0.0);
  for (int j = 0; j < 7; j++) { vec2 e = q - arMid(j); float k = exp(-dot(e, e) * 14.0); F += k; dF -= 28.0 * e * k; }
  float lev = min(abs(F - 0.25), min(abs(F - 0.55), abs(F - 0.85))) / max(length(dF), 0.3);
  v = max(v, ink(lev, w * 0.6, g) * 0.3 * smoothstep(0.97, 0.8, r) * smoothstep(0.14, 0.22, r));

  // outer tokens attend to the two heads beside them; each head pours into the hub
  for (int i = 0; i < 12; i++) {
    vec2 o = arOut(i);
    float ao = atan(o.y, o.x);
    int j0 = int(mod(floor((ao - 0.22) / (TAU / 7.0)), 7.0));
    for (int e = 0; e < 2; e++) {
      float wt = pow(0.5 + 0.5 * sin(uTime * 0.45 + hash3(vec3(float(i), float(e), 5.0)) * TAU), 2.0);
      arEdge(q, o, arMid((j0 + e) % 7), wt, g, w, v);
    }
  }
  for (int j = 0; j < 7; j++) {
    vec2 m = arMid(j), h = normalize(m) * 0.14;
    float wt = 0.55 + 0.45 * sin(uTime * 0.3 + float(j) * 2.1);
    arEdge(q, m, h, wt, g, w, v);
    vec2 n2 = arMid((j + 1) % 7);
    v = max(v, ink(sdSeg(q, m, n2), w * 0.6, g) * 0.35 * step(0.5, fract(dot(q - m, normalize(n2 - m)) * 30.0)));
    vec2 pp = mix(m, h, fract(uTime * 0.35 + float(j) / 7.0));              // attention flowing in
    v = max(v, 1.0 - smoothstep(-g, g, length(q - pp) - 0.007));
  }
  for (int j = 0; j < 7; j++) arBead(q, arMid(j), 0.044, g, w, 0.55 + 0.35 * sin(uTime * 0.3 + float(j) * 2.1), v);
  for (int i = 0; i < 12; i++) arBead(q, arOut(i), 0.028, g, w, 0.5, v);

  // the hub: the next plate is the web
  float d = r - 0.1;
  if (d < 0.0) v = 0.3;                                                      // (drawn by plate 0)
  v = max(v, max(ink(d, lw(0.0026, g), g), max(ink(d - 0.015, w * 0.6, g), ink(d - 0.035, w, g))));
  v = max(v, max(ink(r - 0.995, lw(0.0026, g), g), ink(r - 0.972, w * 0.6, g)));
  return v;
}
`,
};
