/**
 * rubix.js — OpenRubixMachina as a world: one box of parts, all the way down.
 *
 *   0 The Box      a puzzle cube on a tiled bench, its top layer half turned
 *                  (raymarched 3D, the one plate that is); six colours drawn as
 *                  heraldic hatching. Its front centre facelet is a window
 *   1 The Machine  behind the facelet, the works: meshing gears and a crank
 *                  and rocker, the figures cast into the gears' bosses
 *   2 The Glyphs   in the great gear's hub, the teeth are the language's words
 *                  and glyphs; parts leave them and snap together at the
 *                  centre — into the Box again, so the box is made of boxes
 *
 * Same engraving as every world: darkness is the canvas, line width the only
 * brightness; light is spent on the cube, the gears' rims and the edges.
 */

const BOX = [-0.06, 0.16];                   // the cube's front-face centre on plate 0 (= the portal facelet's centre)
const RING = ['tile', 'fold', 'lattice', 'shape', 'dtype', 'layout', 'space', 'quant'];
// the gears' bosses on the Machine that carry the first three figures: [x, y, size, label radius]
const BOSSES = [[0.6182, -0.1656, 0.06, 0.092], [-0.4456, -0.312, 0.05, 0.064], [0.696, 0.2756, 0.036, 0.074]];

export const RUBIX = {
  id: 'openrubixmachina',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — enamel blue, brass
  palette: ['#14245a', '#4f86ff', '#e2ecff', '#ffb347'],
  // how its words arrive (world.js): glyphs settling, as the machine resolves them
  reveal: 'decode',
  // and painted (world.js): titles and figures stencilled, as on a crate of parts, the rest in a squared technical face
  fonts: { title: ['Big Shoulders Stencil', 700], body: ['Chakra Petch', 400] },
  // at rest its wash is an oil sheen: the film's colours sliding round in fine fringes
  wash: { scale: 70, speed: 0.05, warp: 1.4, ripple: 0.15, bands: 6, sheen: 1 },

  // portal / medal: [x, y, r] circles or [x, y, r, aspect] rectangles, in the plate's own units
  plates: [
    { title: 'The Box', note: 'A puzzle cube, one layer turned. Scroll into its centre facelet.', portal: [BOX[0], BOX[1], 0.1, 1], medal: [0, 0.25, 1.2] },
    { title: 'The Machine', note: 'Gears, a crank and a rocker behind the facelet. Scroll into the great gear’s hub.', portal: [0, 0, 0.1], medal: [0, 0, 1, 1] },
    { title: 'The Glyphs', note: 'The teeth are the words of the language. At the centre, the Box again.', portal: [0, 0, 0.12], medal: [0, 0, 1] },
  ],

  // the pointer near the Machine's gears drives the train (world.js sums it into uArtT, rbTrain): 1 over a gear,
  // fading a little past its teeth
  pointer([x, y], id) {
    if (id !== 1) return 0;
    const G = [[0, 0, 24], [-0.3703, 0.4412, 12], [0.6182, -0.1656, 16], [-0.4456, -0.312, 10], [0.696, 0.2756, 12]];
    return Math.max(...G.map(([gx, gy, n]) => {
      const d = Math.hypot(x - gx, y - gy) - 0.016 * n, t = Math.min(Math.max(d / 0.12, 0), 1);
      return 1 - t * t * (3 - 2 * t);
    }));
  },

  inscriptions(p) {
    const out = [];
    // 0 · the bench carries the name; the overview stands either side of the cube (all of it inside the circle
    //     the Box shows through once you have looped, which narrows fast toward the bench's foot)
    out.push({ plate: 0, text: p.name, x: 0, y: -0.615, size: 0.082 });
    out.push({ plate: 0, text: p.kind, x: 0, y: -0.682, size: 0.021, track: 0.24, upper: true, alpha: 0.62 });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.735, size: 0.031, alpha: 0.85 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.788, size: 0.019, track: 0.14, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.83, size: 0.015, track: 0.06, alpha: 0.5 });
    const sentences = p.summary.match(/[^.]+\.\s*/g) || [p.summary];
    const cut = Math.ceil(sentences.length / 2);
    [sentences.slice(0, cut), sentences.slice(cut)].forEach((part, i) => {
      out.push({ plate: 0, text: part.join(' ').trim(), x: i ? 0.7 : -0.7, y: -0.25, size: 0.026, w: 0.5, lh: 1.45, alpha: 0.86 });
    });

    // 1 · the machine: the figures are cast into the gears' bosses, the parts list runs underneath
    p.stats.forEach((s, i) => {
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      if (i < 3) {
        const [x, y, size, r] = BOSSES[i];
        out.push({ plate: 1, text: v, count: s, x, y: y + 0.008, size, weight: 200, track: 0.02 });
        out.push({ plate: 1, text: s.label, x, y, size: 0.017, track: 0.14, upper: true, arc: { r, a: -Math.PI / 2 }, alpha: 0.78 });
      } else {                                                          // the last on the rocker's nameplate
        out.push({ plate: 1, text: v, count: s, x: 0.4, y: 0.79, size: 0.05, weight: 200, track: 0.02 });
        out.push({ plate: 1, text: s.label, x: 0.4, y: 0.738, size: 0.017, track: 0.14, upper: true, alpha: 0.75 });
      }
    });
    p.inside.forEach((s, i) => {
      const x = -0.75 + i * 0.5;
      out.push({ plate: 1, text: s.title, x, y: -0.655, size: 0.022, track: 0.18, upper: true });
      out.push({ plate: 1, text: s.text, x, y: -0.8, size: 0.023, w: 0.44, lh: 1.4, alpha: 0.85 });
    });

    // 2 · the glyph ring: the words on the teeth, the highlights round it, the stack on the rim
    RING.forEach((t, i) => {
      out.push({ plate: 2, text: t, x: 0, y: 0, size: 0.028, track: 0.1, upper: true, arc: { r: 0.642, a: (i * Math.PI) / 4 }, alpha: 0.9 });
    });
    p.highlights.forEach((t, i) => {
      out.push({ plate: 2, text: t, x: 0, y: 0, size: 0.024, arc: { r: 0.83, a: Math.PI / 4 + (i * Math.PI) / 2 }, alpha: 0.86 });
    });
    p.stack.forEach(([g, items], i) => {
      out.push({ plate: 2, text: `${g}  ·  ${items.join('  ·  ')}`, x: 0, y: 0, size: 0.02, track: 0.12, upper: true, arc: { r: 0.951, a: (i * Math.PI) / 2 }, alpha: 0.7 });
    });
    return out;
  },

  // on top of the paint (world.js): each word lies on a grid of chamfered tiles, faint while the paint is still
  // to come; as it dries under a tile the tile seats, its edge flashing, and the grid is gone at rest. On the
  // Machine the figures sit inside cog rings that turn with their gears, and a turn more as you come in
  textFx: /* glsl */ `
float rbCog(vec2 q, vec2 c, float R, float rot, float gq) {
  vec2 d = q - c;
  float r = length(d), a = atan(d.y, d.x), n = floor(R * 150.0);
  float teeth = R + 0.006 + 0.008 * clamp(sin(n * (a - rot)) * 3.0, -1.0, 1.0);   // (turned by rot, radians)
  float wq = max(0.0018, 0.8 * gq);
  return max(ink(r - teeth, wq, gq) * step(R, r), max(ink(r - R, wq, gq), ink(r - R + 0.012, wq * 0.7, gq) * 0.6));
}
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float em = max(w0.w, 8.0);
  if (gPlate == 1) {
    float gq = 1.6 / kpx;                                    // about a pixel, in plate units
    vec3 B[3] = vec3[3](${BOSSES.map(([x, y, , r]) => `vec3(${x}, ${y}, ${(r + 0.04).toFixed(4)})`).join(', ')});
    float ph0, ph1, ph[3];
    rbTrain(ph0, ph1, ph[0], ph[1], ph[2]);                  // (the bosses are gears 2, 3 and 4)
    for (int i = 0; i < 3; i++) {
      float pc = words(uv + (B[i].xy - q) * kpx / uCanvas).y;    // its figure's progress
      float dir = i == 2 ? 1.0 : -1.0;                       // (the way its gear turns)
      float rot = ph[i] + dir * (1.0 - pc) * 0.6;
      txt = max(txt, rbCog(q, B[i].xy, B[i].z, rot, gq) * (0.35 + 0.65 * sin(PI * pc)));
    }
  }
  if (w0.x > 1.2 * em) return;
  vec2 P = uv * uCanvas;
  float ls = latticeSize(max(w0.w, 22.0));                   // (on small words a tile spans letters, so it reads as a tile)
  float cs = ls * mix(0.8, 1.5, smoothstep(30.0, 70.0, ls));   // a letter a tile; on large words, a little more
  vec2 id = floor(P / cs), c = (id + 0.5) * cs, l = P - c;
  vec4 wc = words(c / uCanvas);
  if (wc.x > 0.6 * cs) return;                               // only tiles over letters
  float ph = paintAge(c / uCanvas, wc);                      // how dry the paint is under this tile
  float hw = 0.47 * cs;
  float dt = max(max(abs(l.x), abs(l.y)) - hw, (abs(l.x) + abs(l.y) - 1.7 * hw) * 0.70710678);   // chamfered square
  float lock = smoothstep(0.55, 0.8, ph) * (1.0 - smoothstep(0.8, 1.0, ph));   // the edge flashes as it seats
  txt = max(txt, ink(dt, 0.05 * cs + 0.5, 0.7) * (0.3 * (1.0 - smoothstep(0.0, 0.6, ph)) + 1.1 * lock));
}
`,

  glsl: /* glsl */ `
// ═══ shared ════════════════════════════════════════════════════════════════

// isosceles trapezoid (Quilez): half width r1 at y = -he, r2 at y = +he
float rbTrap(vec2 p, float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he), k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2 ca = vec2(p.x - min(p.x, p.y < 0.0 ? r1 : r2), abs(p.y) - he);
  vec2 cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot(k2, k2), 0.0, 1.0);
  float s = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
// pointy-topped hexagon, circumradius R
float rbHex(vec2 p, float R) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  float r = R * 0.866025404;
  p = abs(p.yx);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
// a little cube in isometric, circumradius R: lit top, half-lit left, dark right
void rbIso(vec2 p, float R, float g, float w, inout float v) {
  if (R < 0.002) return;
  float hx = rbHex(p, R);
  if (hx > 2.0 * g + w) return;
  if (hx < 0.0) {
    float an = atan(p.y, p.x);
    if (an > 0.5236 && an < 2.618) v = engrave(p.x * 0.5 + p.y * 0.866, 0.62, g, 0.0035);
    else if (an > -1.5708 && an <= 0.5236) v = engrave(p.y, 0.1, g, 0.0035);
    else v = engrave(p.y, 0.32, g, 0.0035);
  }
  float e = min(sdSeg(p, vec2(0.0), vec2(0.866, 0.5) * R), min(sdSeg(p, vec2(0.0), vec2(-0.866, 0.5) * R), sdSeg(p, vec2(0.0), vec2(0.0, -R))));
  v = max(v, max(ink(hx, w, g), ink(e, w * 0.7, g) * step(hx, 0.0)));
}

// ═══ 0 · THE BOX (raymarched) ══════════════════════════════════════════════
// Off-axis perspective: the plate is the cube's front plane, so the front face
// draws true and square (its centre facelet is the portal), while the top and
// the right side recede toward a vanishing point up and to the right.

const vec2  RB_C  = vec2(${BOX[0]}, ${BOX[1]});
const float RB_S  = 0.26667;                 // cubie pitch
const float RB_B  = 0.1273;                  // cubie half size
const float RB_F  = 0.394;                   // the front face, z = RB_S + RB_B
const float RB_DD = 2.2;                     // eye to front plane
const vec3  RB_E  = vec3(1.0, 1.25, 2.594);  // the eye, in the cube's frame
float rbTh;                                  // the top layer's turn

float rbCubies(vec3 p, float ylo, float yhi) {
  vec3 c = clamp(floor(p / RB_S + 0.5), vec3(-1.0, ylo, -1.0), vec3(1.0, yhi, 1.0));
  return sdBox(p - c * RB_S, vec3(RB_B - 0.02), 0.02);
}
vec3 rbTop(vec3 p) { p.xz = rot(rbTh) * p.xz; return p; }    // into the turned layer's frame
float rbMap(vec3 p) { return min(rbCubies(p, -1.0, 0.0), rbCubies(rbTop(p), 1.0, 1.0)); }
vec3 rbNormal(vec3 p) {
  const float e = 0.0008;
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * rbMap(p + k.xyy * e) + k.yyx * rbMap(p + k.yyx * e) +
                   k.yxy * rbMap(p + k.yxy * e) + k.xxx * rbMap(p + k.xxx * e));
}
// stipple: dots whose area is the brightness, spacing chosen in octaves like engrave()
float rbDotsAt(vec2 uv, float lum, float h, float g) {
  float d = length((fract(uv / h) - 0.5) * h);
  float c = 1.0 - smoothstep(sqrt(lum / PI) * h - g, sqrt(lum / PI) * h + g, d);
  return mix(lum, c, smoothstep(2.0 * g, 4.0 * g, h));
}
float rbDots(vec2 uv, float lum, float g, float h0) {
  float lev = clamp(log2(g * 10.0 / h0), -24.0, 24.0);
  float il = floor(lev), t = lev - il, h = h0 * exp2(il);
  return mix(rbDotsAt(uv, lum, h, g), rbDotsAt(uv, lum, 2.0 * h, g), smoothstep(0.0, 1.0, t));
}

// the bench: tiles one cubie wide (tesserae), lit near the cube, its shadow thrown back and right
float rbFloor(vec3 ro, vec3 rd, float g) {
  if (rd.y > -1e-4) return 0.0;
  vec3 F = ro + rd * ((-RB_F - 0.004 - ro.y) / rd.y);
  float zd = ro.z - F.z;
  float gx = g * zd / RB_DD, gz = gx * zd / (ro.y + RB_F);   // world units per pixel across / along the depth
  vec2 f = F.xz / RB_S;
  float dx = abs(fract(f.x + 0.5) - 0.5) * RB_S, dz = abs(fract(f.y + 0.5) - 0.5) * RB_S;
  float sdw = 9.0;
  for (int i = 0; i < 5; i++) sdw = min(sdw, sdBox2(F.xz - vec2(0.53, -0.47) * float(i) * 0.25, vec2(RB_F)));
  vec2 lp = F.xz - vec2(-0.35, 0.35);
  float lit = exp(-dot(lp, lp) * 3.0) * smoothstep(-0.02, 0.16, sdw);
  float lx = ink(dx, gx * (0.35 + 0.9 * lit), gx) * smoothstep(3.0 * gx, 7.0 * gx, RB_S);
  float lz = ink(dz, gz * (0.35 + 0.9 * lit), gz) * smoothstep(3.0 * gz, 7.0 * gz, RB_S);
  return max(lx, lz) * 0.55 * lit;
}

float plate0(vec2 q, float g) {
  float w = lw(0.0024, g);
  rbTh = -(0.27 + 0.1 * uPointer.x + 0.05 * sin(uTime * 0.27));   // the top layer turns with the hand; the facelet never moves
  vec3 ro = RB_E;
  vec3 rd = normalize(vec3(q - RB_C, RB_F) - RB_E);
  float v = rbFloor(ro, rd, g);

  vec3 inv = 1.0 / (rd + vec3(1e-7));
  vec3 bb = vec3(0.58, 0.41, 0.58);
  vec3 ta = (-bb - ro) * inv, tb = (bb - ro) * inv;
  vec3 t0 = min(ta, tb), t1 = max(ta, tb);
  float tn = max(max(t0.x, t0.y), t0.z), tf = min(min(t1.x, t1.y), t1.z);
  if (tf < tn) return v;
  float t = tn, minD = 9.0, gw = g;
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    float d = rbMap(p);
    minD = min(minD, d);
    gw = g * (RB_E.z - p.z) / RB_DD;
    if (d < 0.0002 + gw * 0.3) { hit = true; break; }
    t += d;
    if (t > tf) break;
  }
  if (!hit) return max(v, (1.0 - smoothstep(0.6 * gw, 2.2 * gw, minD)) * 0.8);   // the silhouette's cut edge

  vec3 p = ro + rd * t;
  vec3 n = rbNormal(p);
  bool top = rbCubies(rbTop(p), 1.0, 1.0) < rbCubies(p, -1.0, 0.0);
  vec3 pl = top ? rbTop(p) : p;
  vec3 nl = n;
  if (top) nl.xz = rot(rbTh) * nl.xz;
  vec3 c = clamp(floor(pl / RB_S + 0.5), vec3(-1.0, top ? 1.0 : -1.0, -1.0), vec3(1.0, top ? 1.0 : 0.0, 1.0));
  vec3 l = pl - c * RB_S, an = abs(nl);
  vec2 uv; vec3 ax;
  if (an.x > an.y && an.x > an.z) { uv = l.zy; ax = vec3(sign(nl.x), 0.0, 0.0); }
  else if (an.y > an.z)           { uv = l.xz; ax = vec3(0.0, sign(nl.y), 0.0); }
  else                            { uv = l.xy; ax = vec3(0.0, 0.0, sign(nl.z)); }
  float sd = sdBox2(uv, vec2(0.1));                                       // the facelet (sticker)

  // the front centre facelet is the window into the works
  if (!top && ax.z > 0.5 && c == vec3(0.0, 0.0, 1.0) && sd < 0.004)
    return sd < 0.0 ? max(0.1, ink(sd, w, g)) : max(ink(sd, w, g), ink(sd - 0.004, w * 0.6, g));

  vec3 Lp = vec3(-1.3, 1.9, 1.6) - p;                                     // the lamp: up, left, in front
  vec3 L = normalize(Lp);
  float dif = max(dot(n, L), 0.0) * 4.0 / (1.0 + dot(Lp, Lp) * 0.5);    // falling off across the cube
  // the key's direction alone sets each face's tone: top lit, front half-lit, the far side in shadow
  float tone = pow(max(dot(n, normalize(vec3(-0.35, 1.0, 0.3))), 0.0), 1.6);
  float facing = max(dot(n, -rd), 0.25);
  float gf = gw / facing;                                                 // face units per pixel
  float wl = lw(0.0016, gf);
  float bev = 1.0 - max(an.x, max(an.y, an.z));
  bool skin = dot(c, ax) > 0.5;                                           // outer faces only; the gaps show the dark core
  float o = 0.0;
  if (skin && sd < 0.0) {
    // six colours as heraldic tinctures: plain, dotted, vertical, horizontal, bend, cross-hatched
    float lum = 0.02 + 0.8 * tone * min(dif, 1.2);
    float k = floor(hash3(c * 1.7 + ax * 0.37 + 5.0) * 6.0);
    if (k < 0.5)      o = engrave(sd, lum, gf, 0.011);
    else if (k < 1.5) o = rbDots(uv, lum * 0.8, gf, 0.016);
    else if (k < 2.5) o = engrave(uv.x, lum * 0.8, gf, 0.011);
    else if (k < 3.5) o = engrave(uv.y, lum * 0.75, gf, 0.011);
    else if (k < 4.5) o = engrave((uv.x + uv.y) * 0.7071, lum * 0.7, gf, 0.011);
    else              o = max(engrave((uv.x + uv.y) * 0.7071, lum * 0.32, gf, 0.012), engrave((uv.x - uv.y) * 0.7071, lum * 0.32, gf, 0.012));
  }
  if (skin) o = max(o, ink(sd, wl, gf) * (0.14 + 0.86 * tone));       // the stickers' edges, lit as their face is
  // every edge catches the lamp: the rounding engraved in lines along the edge
  float spec = pow(max(dot(reflect(rd, n), L), 0.0), 12.0);
  float eD = RB_B - max(abs(uv.x), abs(uv.y));
  float el = skin ? 0.03 + 0.32 * tone + 0.4 * spec : 0.03;
  o = max(o, engrave(eD, el, gf, 0.006) * smoothstep(0.02, 0.06, bev));
  return o;
}

// ═══ 1 · THE MACHINE ═══════════════════════════════════════════════════════

const float RB_M = 0.032;                    // the gears' module: pitch radius = module · teeth / 2

// the train: the great gear turns, the others mesh with it (and the last with the right one); each smaller
// gear turns faster, by its tooth ratio (the cog rings round the bosses turn with theirs, textFx). The pointer
// over the gears drives it faster (pointer, uArtT), every gear still at its ratio
void rbTrain(out float ph0, out float ph1, out float ph2, out float ph3, out float ph4) {
  ph0 = spinAngle(1.9, uTime) + 0.8 * uArtT;
  ph1 = meshPhase(ph0, 24.0, 12.0, radians(130.0));
  ph2 = meshPhase(ph0, 24.0, 16.0, radians(-15.0));
  ph3 = meshPhase(ph0, 24.0, 10.0, radians(215.0));
  ph4 = meshPhase(ph2, 16.0, 12.0, radians(80.0));
}

float rbGearD(vec2 p, float n, float ph) {
  float R = 0.5 * RB_M * n, sec = TAU / n;
  float k = floor((atan(p.y, p.x) - ph) / sec + 0.5);
  vec2 lp = rot(ph + k * sec) * p;                                        // the nearest tooth, laid along +x
  float tooth = rbTrap(vec2(lp.y, lp.x - R), 0.95 * RB_M, 0.45 * RB_M, RB_M) - 0.12 * RB_M;
  return min(length(p) - (R - RB_M), tooth);
}
// a gear: rim turned on the lathe, five spokes, a boss of radius hub (the figures are cast there)
void rbGear(vec2 p, float n, float ph, float hub, float lk, float g, float w, inout float v) {
  float R = 0.5 * RB_M * n, r = length(p);
  if (r > R + 1.5 * RB_M + 3.0 * g) return;
  float d = rbGearD(p, n, ph);
  float ri = R - 2.4 * RB_M;
  float lit = sat(0.5 + 0.5 * dot(p / max(r, 1e-4), vec2(-0.6, 0.8)));
  if (d < 0.0) {
    if (r > ri) v = engrave(r > R - RB_M ? -d : r, (0.1 + 0.42 * lit * lit) * lk, g, 0.006);
    else if (r < hub) v = engrave(r, 0.03 + 0.04 * lit, g, 0.005);
    else {
      float ss = TAU / 5.0;
      float k = floor((atan(p.y, p.x) - ph) / ss + 0.5);
      vec2 sp = rot(ph + k * ss) * p;
      float hw = R * 0.085;
      float win = max(max(r - ri, hub - r), hw - abs(sp.y)) + 0.008;     // < 0: the open window between two spokes
      if (win > 0.0) v = engrave(abs(sp.y) - hw, (0.08 + 0.3 * lit) * lk, g, 0.005);
      v = max(v, ink(win, w * 0.8, g));
    }
  }
  v = max(v, max(ink(d, w, g), ink(r - hub, w * 0.8, g)));
  v = max(v, ink(r - ri, w * 0.6, g) * step(d, 0.0) * step(hub + 0.01, r) * 0.6);
}
float rbBar(vec2 q, vec2 a, vec2 b, float hw, float g, float w, inout float v) {
  float d = sdSeg(q, a, b) - hw;
  if (d < 0.0) v = engrave(-d, 0.32, g, 0.004);
  v = max(v, ink(d, w, g));
  return d;
}
void rbPin(vec2 q, vec2 c, float g, float w, inout float v) {
  float d = length(q - c);
  if (d < 0.016) v = 0.0;
  v = max(v, max(ink(d - 0.016, w, g), 1.0 - smoothstep(0.004 - g, 0.004 + g, d)));
}

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  float v = 0.0;                                                         // the backplate: darkness

  float ph0, ph1, ph2, ph3, ph4;
  rbTrain(ph0, ph1, ph2, ph3, ph4);
  vec2 c1 = vec2(-0.3703, 0.4412), c2 = vec2(0.6182, -0.1656), c3 = vec2(-0.4456, -0.312), c4 = vec2(0.696, 0.2756);
  rbGear(q, 24.0, ph0, 0.17, 1.25, g, w, v);
  rbGear(q - c1, 12.0, ph1, 0.05, 1.0, g, w, v);
  rbGear(q - c2, 16.0, ph2, 0.118, 1.0, g, w, v);
  rbGear(q - c3, 10.0, ph3, 0.085, 1.0, g, w, v);
  rbGear(q - c4, 12.0, ph4, 0.098, 1.0, g, w, v);
  float r = length(q);
  if (r < 0.17) v = 0.0;                                                 // the great boss: dark, bolted
  if (r < 0.1) v = 0.1;                                                  // its hub: the next plate
  v = max(v, max(ink(r - 0.1, w, g), max(ink(r - 0.113, w * 0.6, g), ink(r - 0.128, w, g))));
  for (int i = 0; i < 8; i++) {                                          // bolts round the hub
    float a = float(i) * TAU / 8.0 + ph0;
    float b = length(q - vec2(cos(a), sin(a)) * 0.15) - 0.008;
    v = max(v, ink(b, w * 0.8, g));
  }

  // a crank on the upper wheel drives a rocker hung from the frame
  vec2 D = vec2(0.12, 0.8);
  float bracket = rbTrap(q - vec2(0.12, 0.9), 0.045, 0.09, 0.1);
  if (bracket < 0.0) v = engrave(q.x, 0.14, g, 0.005);
  v = max(v, ink(bracket, w, g));
  vec2 A = c1 + vec2(cos(ph1 + 0.4), sin(ph1 + 0.4)) * 0.135;
  vec2 AD = D - A; float dd = length(AD);
  float lc = 0.55, lr = 0.22;
  float ea = (lc * lc - lr * lr + dd * dd) / (2.0 * dd);
  vec2 B = A + AD / dd * ea + vec2(-AD.y, AD.x) / dd * sqrt(max(lc * lc - ea * ea, 0.0));
  vec2 T = D - normalize(B - D) * 0.11;
  rbBar(q, T, B, 0.018, g, w, v);
  float cw = length(q - T) - 0.04;                                       // the counterweight
  if (cw < 0.0) v = engrave(cw, 0.3, g, 0.004);
  v = max(v, ink(cw, w, g));
  rbBar(q, A, B, 0.014, g, w, v);
  rbPin(q, A, g, w, v); rbPin(q, B, g, w, v); rbPin(q, D, g, w, v);
  // the rocker's nameplate
  float plateD = sdBox2(q - vec2(0.4, 0.77), vec2(0.13, 0.062));
  if (plateD < 0.0) v = engrave(-plateD, 0.25 * (1.0 - smoothstep(0.006, 0.016, -plateD)) + 0.02, g, 0.004);
  v = max(v, max(ink(plateD, w, g), ink(plateD + 0.01, w * 0.6, g)));

  // the parts list underneath, in four columns
  v = max(v, max(ink(q.y + 0.58, w, g), ink(q.y + 0.595, w * 0.6, g)));
  float col = min(abs(q.x), abs(abs(q.x) - 0.5));
  v = max(v, ink(col, w * 0.6, g) * step(q.y, -0.63) * step(-0.97, q.y) * 0.7);

  // the frame: the facelet's edge, and four rivets
  float fr = sdBox2(q, vec2(1.0));
  v = max(v, max(ink(fr, w * 1.2, g), ink(fr + 0.025, w * 0.6, g)));
  vec2 rq = abs(q) - vec2(0.95);
  v = max(v, ink(length(rq) - 0.012, w, g));
  return v * roomForWords(2.2, 0.8);                                          // (its figures read even small, seen through the facelet)
}

// ═══ 2 · THE GLYPHS ════════════════════════════════════════════════════════

// a glyph on a tooth (tooth-local: x across, y outward): tile, fold, lattice, cube
float rbGlyph(vec2 p, float j, float g, float w) {
  float d;
  if (j < 0.5) d = min(abs(sdBox2(p, vec2(0.026))), abs(sdBox2(p, vec2(0.012))));
  else if (j < 1.5) {
    vec2 a = vec2(abs(p.x), p.y);
    d = min(sdSeg(a, vec2(0.0, 0.022), vec2(0.028, -0.002)), sdSeg(a, vec2(0.0, -0.004), vec2(0.028, -0.028)));
  }
  else if (j < 2.5) { vec2 c = p - clamp(floor(p / 0.022 + 0.5), -1.0, 1.0) * 0.022; return 1.0 - smoothstep(0.0045 - g, 0.0045 + g, length(c)); }
  else {
    float hx = rbHex(p, 0.03);
    d = min(abs(hx), min(sdSeg(p, vec2(0.0), vec2(0.026, 0.015)), min(sdSeg(p, vec2(0.0), vec2(-0.026, 0.015)), sdSeg(p, vec2(0.0), vec2(0.0, -0.03)))));
  }
  return ink(d, w, g);
}

float plate2(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q), a = atan(q.y, q.x);
  vec2 L2 = vec2(-0.6, 0.8);
  // the light the parts gather to, engraved in rings round the centre
  float v = engrave(r, 0.16 * exp(-(r - 0.16) * 24.0) * smoothstep(0.155, 0.175, r), g, 0.008);

  // eight lanes: parts leave the glyph teeth and snap into the box at the centre
  float sec = TAU / 16.0, s8 = TAU / 8.0;
  float jl = floor((a - sec) / s8 + 0.5), al = sec + jl * s8;
  vec2 dir = vec2(cos(al), sin(al));
  float u = dot(q, dir), s = dot(q, vec2(-dir.y, dir.x));
  if (u > 0.15 && u < 0.5) {
    v = max(v, ink(s, w * 0.5, g) * step(0.5, fract(u * 40.0)) * 0.35);
    if (abs(s) < 0.06) {
      float sp = 0.085, m = mod(u + uTime * 0.03, sp) - sp * 0.5, uc = u - m;
      float sz = 0.036 * (0.55 + 0.9 * uc) * smoothstep(0.16, 0.24, uc) * smoothstep(0.48, 0.41, uc);
      rbIso(q - dir * uc, sz, g, w, v);
    }
  }

  // the ring the teeth stand on
  float lit = sat(0.5 + 0.5 * dot(q / max(r, 1e-4), L2));
  if (r > 0.47 && r < 0.535) {
    v = engrave(r, 0.14 + 0.3 * lit * lit, g, 0.005);
    float ta = a - spinAngle(1.5, uTime), tk = abs(fract(ta / TAU * 64.0) - 0.5) * TAU / 64.0 * r;   // its ticks turn under the teeth
    float on = step(abs(r - 0.5025), mod(floor(ta / TAU * 64.0 + 0.5), 4.0) < 0.5 ? 0.024 : 0.012);
    v = max(v * (1.0 - ink(tk, w * 1.6, g) * on), ink(tk, w * 0.6, g) * on * 0.7);
  }
  v = max(v, max(ink(r - 0.47, w, g), ink(r - 0.535, w, g)));

  // sixteen teeth: words on the broad ones, glyphs on the narrow
  float k = floor(a / sec + 0.5);
  vec2 lp = rot(k * sec) * q;
  bool word = mod(k, 2.0) < 0.5;
  vec2 tp = vec2(lp.y, lp.x - 0.65);
  float td = (word ? rbTrap(tp, 0.118, 0.092, 0.115) : rbTrap(tp, 0.072, 0.05, 0.115)) - 0.006;
  float tl = sat(0.5 + 0.5 * dot(vec2(cos(k * sec), sin(k * sec)), L2));
  if (td < 0.0) {
    float bevel = 1.0 - smoothstep(0.008, 0.022, -td);
    v = engrave(-td, (0.12 + 0.45 * tl) * bevel + 0.025, g, 0.004);     // a bevelled block, dark in the middle
    if (word) v = max(v, ink(td + 0.026, w * 0.6, g));
    else v = max(v, rbGlyph(rot(spinAngle(5.0, uTime) * (mod(k, 4.0) < 2.0 ? 1.0 : -1.0)) * tp, mod((k - 1.0) * 0.5, 4.0), g, w * 1.2));   // each glyph turns in place
  }
  v = max(v, ink(td, w, g));

  // the highlights' band and the rim
  v = max(v, ink(r - 0.79, w * 0.6, g) * 0.6);
  v = max(v, max(ink(r - 0.915, w, g), max(ink(r - 0.987, w, g), ink(r - 0.995, w * 0.6, g))));
  for (int i = 0; i < 4; i++) {                                          // diamonds between the stack's words
    float da = float(i) * PI * 0.5 + PI * 0.25;
    vec2 dq = rot(da) * q - vec2(0.951, 0.0);
    v = max(v, ink(abs(dq.x) + abs(dq.y) - 0.012, w, g));
  }

  // the centre: the Box, framed
  if (r < 0.12) v = 0.1;
  v = max(v, max(ink(r - 0.12, w, g), max(ink(r - 0.133, w * 0.6, g), ink(r - 0.15, w, g))));
  return v;
}
`,
};
