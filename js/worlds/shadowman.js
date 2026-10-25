/**
 * shadowman.js — OpenShadowMan as a world: a creature who looks at itself.
 *
 *   0 The Desktop   application windows as a landscape: title bars are ledges,
 *                   each window a slab with a cliff for a side, a dark valley
 *                   between them; on the summit stands the small round creature
 *   1 The Eye       its eye, a black glossy orb; in the pupil the desktop is
 *                   reflected, bowing into the iris like a fisheye — and in the
 *                   reflection, standing on its ledge, the creature again
 *
 * The reflection is exact: the pupil holds the desktop itself (plate 0), and
 * across the iris the same windows carry on under a convex-mirror map that is
 * the identity at the pupil's rim, so the zoom loops with no seam to hide.
 * Same engraving as every world: line width is the only brightness.
 */

export const SHADOWMAN = {
  id: 'openshadowman',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — dusk plum, pink glow, ice
  palette: ['#2b1440', '#ff6fb5', '#ffe1f0', '#8fe9ff'],
  // how its words arrive (world.js): typed out, as the assistant answers
  reveal: 'type',
  // and painted (world.js): titles and figures in a soft round face, like him; the rest in a pixel face, like the
  // fonts he is drawn with
  fonts: { title: ['Fredoka', 600], body: ['Pixelify Sans', 400] },
  // at rest its wash is shadow smoke, drifting low and sideways
  wash: { scale: 55, speed: 0.05, flow: [5, -1], warp: 1.7, ripple: 0.15, bands: 2.5 },

  // portal / medal: [x, y, r] in the plate's own units
  plates: [
    { title: 'The Desktop', note: 'Windows as terrain, and a small round creature on the highest ledge. Scroll into its eye.', portal: [-0.092, 0.845, 0.072], medal: [0, 0.1, 1.9] },
    { title: 'The Eye', note: 'The desktop reflected in its eye, and the creature in the reflection. Scroll into the pupil.', portal: [0, 0, 0.3], medal: [0, 0, 1] },
  ],

  inscriptions(p) {
    const out = [];
    // 0 · the taskbar carries the name; its tray the stack
    out.push({ plate: 0, text: p.name, x: 0, y: -0.765, size: 0.07, track: 0.2, upper: true });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.855, size: 0.028, w: 1.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.925, size: 0.018, track: 0.22, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: -1.02, y: -0.925, size: 0.015, track: 0.12, alpha: 0.5 });
    p.stack.forEach(([g, items], i) => {
      out.push({ plate: 0, text: `${g}: ${items.join(' · ')}`, x: 1.1, y: -0.725 - i * 0.048, size: 0.017, track: 0.04, alpha: 0.62 });
    });
    // the summit window: the creature's ledge, the summary inside it
    out.push({ plate: 0, text: `${p.name}  ·  ${p.kind}`, x: -0.34, y: 0.592, size: 0.019, track: 0.06, alpha: 0.75 });
    out.push({ plate: 0, text: p.summary, x: 0, y: 0.41, size: 0.0195, w: 0.84, lh: 1.45, alpha: 0.85 });
    // the other windows: what is inside, a title on each bar
    const wins = [[-0.62, 0.19, -0.05, 0.56], [0.66, 0.25, 0.01, 0.56], [-0.46, -0.395, -0.5, 0.78], [0.46, -0.395, -0.5, 0.78]];
    p.inside.forEach((s, i) => {
      const [x, ty, by, w] = wins[i % 4];
      out.push({ plate: 0, text: s.title, x, y: ty, size: 0.019, track: 0.14, upper: true, alpha: 0.8 });
      out.push({ plate: 0, text: s.text, x, y: by, size: 0.026, w, lh: 1.38, alpha: 0.85 });   // (its window's width, not grown past it)
    });

    // 1 · the eye: the highlights run round its rim, the figures sit in the dark of it
    p.highlights.forEach((t, i) => {
      out.push({ plate: 1, text: t, x: 0, y: 0, size: 0.021, arc: { r: 0.865, a: Math.PI / 4 + (i * Math.PI) / 2 }, alpha: 0.85 });
    });
    const spots = [[0, 0.71], [0.7, 0.02], [0, -0.67], [-0.7, 0.02]];
    p.stats.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 1, text: v, count: s, x, y, size: 0.056, weight: 200, track: 0.02 });
      out.push({ plate: 1, text: s.label, x, y: y - 0.05, size: 0.017, track: 0.1, upper: true, alpha: 0.7, w: 0.3 });
    });
    return out;
  },

  // on top of the paint (world.js): while it is wet, each word stands in a dim pool of light and casts its shadow
  // long down and to the right across it; as the paint dries the shadow draws in under the letters and the light
  // goes. In the Eye the shadows also bend through its lens, a convex mirror that straightens as they settle
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float p = w0.y, m = 1.0 - p, em = max(w0.w, 8.0);
  if (w0.x > 1.6 * em || p > 0.92) return;                   // (nothing reaches this far from a word; none at rest)
  vec2 P = uv * uCanvas;
  if (gPlate == 1) {                                         // the lens: the band between pupil and rim bows
    float r = length(q);
    vec2 bent = q * (1.0 - 0.6 * m * sin(PI * sat((r - 0.3) / 0.65)));
    P += (bent - q) * kpx;
  }
  // the shadow, cast by the paint that has been laid, and the pool of light it falls on
  vec2 off = vec2(0.35, -0.55) * em * (0.3 + 1.1 * m);
  vec4 S = textureLod(uText, (P - off) / uCanvas, 1.2 + m);
  float dark = S.a * S.r * smoothstep(0.0, 0.05, S.b / max(S.r, 1e-3));
  float pool = 0.3 * (1.0 - smoothstep(0.2 * em, 1.3 * em, w0.x)) * (1.0 - smoothstep(0.55, 0.92, p));
  float ground = pool * (1.0 - 0.97 * smoothstep(0.08, 0.45, dark));
  txt = max(txt, ground * (1.0 - txt));
}
`,

  glsl: /* glsl */ `
// the creature's eyes (plate 0 units), and the mirror: plate 1's pupil (r SM_P) holds plate 0's medal (SM_C, SM_R)
const vec2 SM_E1 = vec2(-0.092, 0.845);
const vec2 SM_E2 = vec2(0.092, 0.845);
const float SM_ER = 0.072;
const vec2 SM_C = vec2(0.0, 0.1);
const float SM_R = 1.9;
const float SM_P = 0.3;
const float SM_K = 0.6;                                    // how hard the iris bows the reflection
// the windows, back to front: [centre, half size]. The first seven lie off the face: only the eye sees them.
const vec4 SM_WIN[11] = vec4[11](
  vec4(-2.05, 1.15, 0.5, 0.32), vec4(2.0, 1.3, 0.55, 0.3), vec4(-1.35, 2.25, 0.45, 0.28), vec4(1.3, 2.35, 0.5, 0.3),
  vec4(0.0, 2.75, 0.6, 0.3), vec4(-2.4, -0.15, 0.5, 0.35), vec4(2.45, -0.05, 0.5, 0.35),
  vec4(0.0, 0.36, 0.5, 0.26), vec4(-0.74, -0.04, 0.47, 0.26), vec4(0.76, 0.02, 0.47, 0.26), vec4(0.0, -0.47, 0.92, 0.17));

// the creature's own light, falling on the ledges round it
float smGlow(vec2 P) { return exp(-length((P - vec2(0.0, 0.77)) * vec2(1.0, 1.4)) * 2.4); }

// a window as a slab of terrain: drop shadow on what is behind, a cliff for its right side,
// an underside, the face (dark: the words live there) and a title bar that is a lit ledge
void smWin(vec2 p, vec2 b, float g, float w, float glow, inout float v) {
  if (sdBox2(p - vec2(0.04, -0.05), b + 0.14) > 0.0) return;
  const float D = 0.062;                                   // how deep the slab is: its cliff and underside
  float sh = sdBox2(p - vec2(0.085, -0.1) - 0.014 * vec2(sin(uTime * 0.23), cos(uTime * 0.19)), b);   // (the light drifts, and the shadow with it)
  v *= 0.1 + 0.9 * smoothstep(-0.03, 0.05, sh);
  float u = p.x - b.x, u2 = -b.y - p.y;
  bool cliff = u > 0.0 && u < D && p.y < b.y - u && p.y > -b.y - u;
  bool under = u2 > 0.0 && u2 < D && p.x > -b.x + u2 && p.x < b.x + u2;
  // rock in layers: strata that wander and break, a few lit by his glow
  float grain = noise3(vec3(p * vec2(9.0, 40.0), 2.0));
  float strata = p.y + 0.005 * grain + 0.0015 * sin(p.x * 47.0);
  if (cliff) v = engrave(strata, (0.05 + 0.42 * glow) * (0.55 + 0.6 * grain) * (1.0 - 0.5 * u / D), g, 0.006);
  if (under) v = engrave(strata, (0.02 + 0.14 * glow) * (0.5 + 0.6 * grain), g, 0.007);
  if (cliff || under) {
    float e = min(min(sdSeg(p, vec2(b.x + D, b.y - D), vec2(b.x + D, -b.y - D)), sdSeg(p, vec2(-b.x + D, -b.y - D), vec2(b.x + D, -b.y - D))),
                  min(sdSeg(p, b, b + vec2(D, -D)), min(sdSeg(p, -b, -b + vec2(D, -D)), sdSeg(p, vec2(b.x, -b.y), vec2(b.x + D, -b.y - D)))));
    v = max(v, ink(e, w * 0.8, g));
  }
  float f = sdBox2(p, b);
  if (f < 0.0) {
    float bar = p.y - (b.y - 0.062);
    if (bar > 0.0) {                                       // the ledge: strata, brightest under the creature
      v = engrave(p.y + 0.0015 * sin(p.x * 23.0), 0.13 + 0.42 * glow, g, 0.006);
      for (int i = 0; i < 3; i++) {                        // close, maximise, minimise
        vec2 c = p - vec2(b.x - 0.035 - float(i) * 0.045, b.y - 0.031);
        float gl = i == 0 ? min(sdSeg(c, vec2(-0.009), vec2(0.009)), sdSeg(c, vec2(-0.009, 0.009), vec2(0.009, -0.009)))
                 : i == 1 ? abs(sdBox2(c, vec2(0.009)))
                 : sdSeg(c, vec2(-0.009, -0.004), vec2(0.009, -0.004));
        v = max(v * smoothstep(0.004, 0.012, gl), ink(gl, w * 0.7, g));
      }
    } else {
      // the face: dark (the words live there), the rock showing through toward its foot; a scrollbar
      float foot = smoothstep(-b.y + 0.12, -b.y, p.y);
      v = foot > 0.02 ? engrave(strata, 0.08 * foot * (0.5 + 0.7 * grain), g, 0.007) : 0.0;
      float sb = p.x - (b.x - 0.022);
      if (sb > 0.0) v = ink(sb - 0.011, w * 0.5, g) * 0.4;
      float th = sdBox2(p - vec2(b.x - 0.011, b.y - 0.16), vec2(0.004, 0.05));
      v = max(v, (1.0 - smoothstep(-g, g, th)) * 0.35);
    }
    v = max(v, ink(bar, w * 0.7, g));
    v = max(v, ink(p.y - b.y, w * 1.5, g));                // the ledge's lit lip
  }
  v = max(v, ink(f, w, g));
  if (abs(p.y - b.y) < 0.1) v *= roomForWords(3.5, 0.95);       // (the lit ledge steps back from a title set on it)
}

// the desktop (plate 0 units), without the creature: the valley, the windows, the taskbar.
// Windows off the face are only ever seen in the eye's reflection.
float smDesk(vec2 P, float g) {
  float w = lw(0.0024, g);
  float glow = smGlow(P);
  float hgt = noise3(vec3(P * 1.7, 3.1 + uTime * 0.035)) + 0.45 * noise3(vec3(P * 3.9, 8.3 - uTime * 0.05));
  float v = isolines(hgt, 0.09, g * 6.0, 0.003) * (0.018 + 0.24 * glow);   // the valley's contours, lit near him, slowly flowing
  // back to front: off the face round about, the summit, the two shoulders, the window in front
  // (a loop the compiler cannot unroll: one copy of the window, not eleven)
  int nw = 11 + int(min(uTime, 0.0));
  for (int i = 0; i < nw; i++) {
    vec4 W = SM_WIN[i];
    smWin(P - W.xy, W.zw, g, w, glow, v);
    if (i == 7) {                                          // his shadow on the summit's ledge
      vec2 sp = (P - vec2(0.0, 0.602)) / vec2(0.27, 0.042);
      if (P.y > 0.55 && P.y < 0.63) v *= mix(0.06, 1.0, smoothstep(0.55, 1.15, length(sp)));
    }
  }
  if (abs(P.x) < 0.9 && P.y < -0.362 && P.y > -0.62) v = max(v, ink(P.x, w * 0.6, g) * 0.5);   // its two panes
  // the taskbar: dark, a start mark, pinned apps (his among them, running)
  if (P.y < -0.66 && abs(P.x) < 3.2) {
    v = 0.0;
    vec2 s = P - vec2(-1.38, -0.79);
    vec2 cell = abs(abs(s) - 0.016);
    if (max(abs(s.x), abs(s.y)) < 0.032) v = (1.0 - smoothstep(-g, g, max(cell.x, cell.y) - 0.011)) * 0.5;
    for (int i = 0; i < 3; i++) {
      vec2 c = P - vec2(-1.24 + float(i) * 0.1, -0.79);
      v = max(v, ink(sdBox2(c, vec2(0.026)) - 0.008, w * 0.8, g) * 0.7);
    }
    vec2 pc = P - vec2(-0.94, -0.79);
    float pet = length(pc / vec2(0.03, 0.026)) - 1.0;
    v = max(v, (1.0 - smoothstep(-0.05, 0.05, pet)) * 0.45);
    v = max(v, ink(sdSeg(P, vec2(-0.975, -0.835), vec2(-0.905, -0.835)), w, g));
  }
  v = max(v, ink(P.y + 0.66, w * 1.2, g) * step(abs(P.x), 3.2));
  v = max(v, ink(P.y + 0.672, w * 0.6, g) * 0.5 * step(abs(P.x), 3.2));
  return v;
}

// the convex mirror: plate 1 → plate 0, the identity scale at the pupil's rim, bowing beyond it
vec2 smMirror(vec2 q, float g, out float gp) {
  float t = max(length(q) / SM_P, 1.0);
  float h = 1.0 + SM_K * (t - 1.0) * (t - 1.0);
  gp = g * (SM_R / SM_P) * (h + 2.0 * SM_K * t * (t - 1.0));
  return SM_C + q * (SM_R / SM_P) * h;
}

// where the eye looks (eye units, toward the pointer) and how much (set by the plate drawing it)
vec2 smLook = vec2(0.0); float smLookOn = 0.0;

// the eye in its own units (rim r = 1): a black glossy orb, an iris of fibres,
// the desktop reflected and bowed, the glint of a window, and the pupil
float smEyeBall(vec2 q, float g) {
  float w = lw(0.004, g);
  float r = length(q), a = atan(q.y, q.x);
  if (r > 1.0) return ink(r - 1.0, w, g);
  float gp; vec2 P = smMirror(q, g, gp);
  float desk = r < 0.6 ? smDesk(P, gp) : 0.0;              // the desktop: itself in the pupil, bowed across the iris
  float v;
  if (r < SM_P) {                                          // the pupil (drawn by plate 0 whenever it can be seen)
    float pet = length((P - vec2(0.0, 0.817)) / vec2(0.225, 0.19)) - 1.0;
    v = max(desk, (1.0 - smoothstep(-0.05, 0.05, pet)) * 0.55);
  } else {
    // the orb: darkness, turned in a few rings toward the rim, lit lower right
    float fres = smoothstep(0.8, 1.0, r) * smoothstep(0.1, 0.9, dot(q / r, vec2(0.6, -0.8)));
    v = engrave(r, 0.12 * fres, g, 0.012);
    // the iris: fibres, brightest at the pupil's lip. It turns slowly, and breathes: the fibres draw toward the
    // lip and the lip brightens (the pupil's edge, the portal, never moves)
    if (r < 0.64) {
      float br = 0.5 + 0.5 * sin(uTime * 0.8);
      float ri = SM_P + (r - SM_P) * (1.0 + 0.07 * br);
      vec2 fd = rot(spinAngle(0.7, uTime)) * q / r;                       // (round the circle, so the turn has no seam)
      float fib = noise3(vec3(fd * 6.0, ri * 9.0 + 2.0)) + 0.5 * noise3(vec3(fd * 17.0, ri * 20.0 + 4.0));
      float lum = 0.07 * smoothstep(0.75, 1.3, fib) * smoothstep(0.64, 0.42, r) + (0.05 + 0.04 * br) * exp(-(r - SM_P) * 22.0 / (1.0 + 0.35 * br));
      // it looks at the pointer: the iris and the pupil's lip catch the light on that side (the pupil itself never moves)
      lum *= 1.0 + smLookOn * (1.3 * max(dot(q / r, smLook), 0.0) - 0.35);
      v = max(v, engrave(a * 0.3 + 0.006 * noise3(vec3(q * 30.0, 1.0)), lum, g * 0.3 / max(r, 0.05), 0.006));
    }
    v = max(v, desk * (0.25 + 0.6 * smoothstep(0.58, SM_P, r)));   // the reflection, dimmed by the glass
    v = max(v, max(ink(r - SM_P, w * 1.3, g), ink(r - SM_P - 0.016, w * 0.6, g) * 0.6));   // the pupil's rim
  }
  // the glint: a window, curved over the glass, in four panes
  float ga = a - 2.3;
  float gq = max(abs(r - 0.715) - 0.07, abs(ga) * r - 0.15) - 0.025;
  if (gq < 0.0) {
    float pane = min(abs(r - 0.715), abs(ga) * r);
    v = engrave(-gq, 0.72, g, 0.006) * smoothstep(0.008, 0.008 + 1.5 * g, pane);
  }
  v = max(v, ink(gq, w * 0.8, g) * 0.8);
  v = max(v, (1.0 - smoothstep(-g, g, length(q - vec2(0.44, -0.47)) - 0.032)) * 0.8);   // and a small one, lower right
  v = max(v, ink(r - 1.0, w, g));
  return v;
}

// ═══ 0 · THE DESKTOP ═══════════════════════════════════════════════════════

// the creature: a white blob on the summit's ledge. It breathes (the body bobs about eyes
// that never move: the left one is the portal), its sprout sways, and the right eye blinks.
void smCreature(vec2 q, float g, float w, inout float v) {
  if (abs(q.x) > 0.34 || q.y < 0.56 || q.y > 1.19) return;
  float bob = sin(uTime * 2.1);
  vec2 R = vec2(0.225 * (1.0 - 0.012 * bob), 0.19 * (1.0 + 0.024 * bob));
  vec2 c = vec2(0.0, 0.627 + R.y);
  vec2 u = (q - c) / R;
  float lu = length(u);
  float body = (lu - 1.0) * min(R.x, R.y);
  float feet = min(length((q - vec2(-0.085, 0.638)) / vec2(0.056, 0.02)), length((q - vec2(0.085, 0.638)) / vec2(0.056, 0.02))) - 1.0;
  float d = smin(body, feet * 0.02, 0.02);
  // the sprout on his crown
  float top = c.y + R.y;
  float lean = gPtrOn * clamp(gPtr.x / 0.6, -1.0, 1.0);    // (toward the pointer, as he looks at it)
  float sw = 0.25 * sin(uTime * 1.3) + 0.2 * lean;
  vec2 s0 = vec2(0.015, top - 0.008), s1 = s0 + vec2(0.012 + sw * 0.05, 0.05), s2 = s1 + vec2(0.03 + sw * 0.04, 0.025);
  float stem = min(sdSeg(q, s0, s1), sdSeg(q, s1, s2));
  float leaf = length(rot(-0.5 - sw) * (q - s2 - vec2(0.012, 0.006)) / vec2(0.022, 0.011)) - 1.0;
  if (leaf < 0.0) v = engrave(q.x + q.y, 0.35, g, 0.004);
  v = max(v, max(ink(stem, w * 1.1, g), ink(leaf * 0.011, w * 0.8, g)));

  float bodyV = 0.0;
  if (d < 0.0) {                                           // white: engraved round his form, lit from the upper left
    float nz = sqrt(max(1.0 - lu * lu, 0.0));
    vec3 n = normalize(vec3(u, max(nz, 1e-3)));
    float dif = max(dot(n, normalize(vec3(-0.5, 0.65, 0.58))), 0.0);
    float back = pow(1.0 - nz, 3.0) * smoothstep(-0.2, 0.6, u.x);
    float lum = 0.03 + 0.38 * pow(dif, 1.6) + 0.18 * back;
    float f = (u.y + u.x * 0.12 - 0.26 * nz) * R.y;   // cross-contours: slices through his form
    float gf = clamp(fwidth(f), g * 0.5, g * 4.0);
    bodyV = body < 0.0 ? engrave(f, lum, gf, 0.011) : engrave(q.y, 0.1, g, 0.006);
    v = bodyV;
  }
  v = max(v, ink(d, w * 1.25, g));
  // a small mouth, under the eyes
  vec2 mc = vec2(0.012 * lean, 0.782);
  float m = abs(length(q - mc) - 0.026);
  v = max(v, ink(m, w * 0.9, g) * step(q.y, 0.765) * step(abs(q.x - mc.x), 0.02));
  // the eyes: a dark socket, the orb, its frame (one at a time: the nearer)
  bool right = q.x > 0.0;
  vec2 E = right ? SM_E2 : SM_E1;
  float er = length(q - E);
  if (er < SM_ER + 0.02) {
    if (er < SM_ER + 0.009) v = 0.0;
    vec2 to = gPtr - E;
    smLook = to / max(length(to), 1e-4); smLookOn = gPtrOn * smoothstep(0.0, 0.5 * SM_ER, length(to));
    if (er < SM_ER) v = smEyeBall((q - E) / SM_ER, g / SM_ER);
    if (right) {                                           // the blink (the portal's eye never does)
      float ph = mod(uTime, 4.7);
      float lid = smoothstep(0.0, 0.07, ph) * (1.0 - smoothstep(0.1, 0.2, ph));
      if (lid > 0.01 && er < SM_ER + 0.009) {
        float x = (q.x - E.x) / SM_ER;
        float ly = E.y + SM_ER * (1.08 - 2.16 * lid) - 0.25 * SM_ER * lid * (1.0 - x * x);
        if (q.y > ly) v = bodyV;
        v = max(v, ink(q.y - ly, w * 1.1, g));
      }
    }
    v = max(v, ink(er - SM_ER, w, g));
  }
}

float plate0(vec2 q, float g) {
  float w = lw(0.0024, g);
  float v = smDesk(q, g);
  smCreature(q, g, w, v);
  return v;
}

// ═══ 1 · THE EYE ═══════════════════════════════════════════════════════════

float plate1(vec2 q, float g) {
  smLook = gPtr / max(length(gPtr), 1e-4); smLookOn = gPtrOn * smoothstep(0.0, 0.5, length(gPtr));
  return smEyeBall(q, g);
}
`,
};
