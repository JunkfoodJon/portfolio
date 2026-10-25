/**
 * choir.js — Choir of Souls as a world: the Great Window, zoomed forever.
 *
 *   0 The Great Window   the face itself is a lancet: two lights, a rose above
 *   1 The Rose           the rose is the tempo gauge round the twelve-type star
 *   2 The Choir          in the rose's eye stands the Choir: an eye in a column
 *                        of bone (raymarched 3D, the one plate that is)
 *   3 The Field          inside its pupil, what it is made of: a distance field,
 *                        drawn as its isolines — and at its zero, the Window again
 *
 * Art direction (the game's "Gothic ink & gilt", folded to white light): the
 * darkness is the canvas; light is spent on the glass, the eye and the edges.
 * Everything is engraved — line width is the only brightness.
 */

export const CHOIR = {
  id: 'choirofsouls',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — hellfire, gilt, holy sapphire
  palette: ['#4a0d16', '#ff6a2c', '#ffd27a', '#79c2ff'],
  // its words are painted (world.js): titles and figures in a blackletter, the rest in a book face, brushed in
  // along each line as you come in, on a wash
  fonts: { title: ['Grenze Gotisch', 600], body: ['Alegreya', 500] },
  // at rest its wash is incense smoke: rising, curling on itself, in thin wisps
  wash: { scale: 45, speed: 0.06, flow: [1, 6], warp: 1.8, ripple: 0.25, bands: 3 },
  reveal: 'paint',

  // portal / medal: [x, y, r] in the plate's own units; home: [x, y, s] (default [0, 0, 1])
  plates: [
    { title: 'The Great Window', note: 'Scroll into the rose.', portal: [0, 1.13, 0.33], medal: [0, 0.5, 1.6] },
    // (each comes to rest on its words: the box that holds them and the portal, filling a 4:3 screen less a margin,
    // the portal at its heart, so they read without the hand having to look for them)
    { title: 'The Rose', note: 'The tempo gauge round the twelve types. Scroll into its eye.', portal: [0, 0, 0.1], medal: [0, 0, 1], home: [0, 0, 1.42] },
    { title: 'The Choir', note: 'An eye in a column of bone. Scroll into the pupil.', portal: [0, 0.12, 0.065], medal: [0, 0, 1], home: [0, 0.016, 1.96] },
    { title: 'The Field', note: 'Everything is a distance field. At its centre, the Window again.', portal: [0, 0, 0.09], medal: [0, 0, 1], home: [0.012, 0, 1.32] },
  ],

  inscriptions(p) {
    const out = [];
    // 0 · the plinth carries the name; the two lights carry the overview
    //     (the small print kept to the middle: past one loop the Window shows through a circle that cuts the plinth's ends)
    out.push({ plate: 0, text: p.name, x: 0, y: -0.722, size: 0.088 });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.805, size: 0.031, w: 2.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.version, p.platform].join('   ·   '), x: 0, y: -0.858, size: 0.019, track: 0.16, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.9, size: 0.015, track: 0.06, alpha: 0.5 });
    const sentences = p.summary.match(/[^.]+\.\s*/g) || [p.summary];
    const cut = Math.ceil(sentences.length / 2);
    [sentences.slice(0, cut), sentences.slice(cut)].forEach((part, i) => {
      out.push({ plate: 0, text: part.join(' ').trim(), x: i ? 0.47 : -0.47, y: -0.22, size: 0.029, w: 0.6, lh: 1.5 });
    });
    // 1 · the four highlights run round the rose
    p.highlights.forEach((t, i) => {
      out.push({ plate: 1, text: t, x: 0, y: 0, size: 0.0235, arc: { r: 0.797, a: Math.PI / 4 + (i * Math.PI) / 2 }, alpha: 0.88 });
    });
    // 2 · what is inside, on four tablets about the Choir
    //     (each tablet held well inside the plate's circle: its title, lettered, over a short column)
    const spots = [[-0.5, 0.56], [0.5, 0.56], [-0.5, -0.36], [0.5, -0.36]];
    p.inside.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      out.push({ plate: 2, text: s.title, x, y, size: 0.036, face: 'title' });
      out.push({ plate: 2, text: s.text, x, y: y - 0.065, size: 0.026, w: 0.4, lh: 1.4, alpha: 0.85, hang: true });
    });
    // 3 · the field is surveyed: its figures, and its materials round the rim
    const corners = [[-0.42, 0.36], [0.42, 0.36], [-0.42, -0.42], [0.42, -0.42]];
    p.stats.forEach((s, i) => {
      const [x, y] = corners[i % 4];
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 3, text: v, count: s, x, y, size: 0.115, weight: 200, track: 0.02 });
      out.push({ plate: 3, text: s.label, x, y: y - 0.1, size: 0.026, track: 0.16, upper: true, alpha: 0.75 });
    });
    p.stack.forEach(([g, items], i) => {
      out.push({ plate: 3, text: `${g}  ·  ${items.join('  ·  ')}`, x: 0, y: 0, size: 0.024, track: 0.12, upper: true, arc: { r: 0.875, a: Math.PI / 4 + (i * Math.PI) / 2 }, alpha: 0.7 });
    });
    return out;
  },

  // on top of the paint (world.js): the candles of the old stained glass stay as the light caught in the wet
  // paint, flickering warm until it dries
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float em = max(w0.w, 8.0);
  if (w0.x > 0.5 * em + 2.0) return;                         // (no bleed reaches this far from a word)
  float a = paintAge(uv, w0);
  float wet = (1.0 - smoothstep(0.05, 0.9, a)) * smoothstep(0.0, 0.05, a);
  float flame = 0.6 + 0.4 * noise3(vec3(uv * uCanvas / (1.5 * em), uTime * 3.2));
  tc *= 1.0 + wet * flame * 0.3 * mix(vec3(1.0, 0.85, 0.6), vec3(1.0), 1.0 - gDepth);
}
`,

  glsl: /* glsl */ `
// ═══ 0 · THE GREAT WINDOW ═══════════════════════════════════════════════════

float chStone(vec2 q, float g, float base) {
  float lum = base * (0.7 + 0.6 * fbm3(vec3(q * 7.0, 1.3)));
  return engrave(q.y + 0.004 * (noise3(vec3(q * 18.0, 4.0)) - 0.5), lum, g, 0.011);   // hand-cut, near level
}
float chAshlar(vec2 q, float g) {
  float row = floor(q.y / 0.15);
  float x = q.x + mod(row, 2.0) * 0.17;
  float col = floor(x / 0.34);
  vec2 cell = vec2(x - (col + 0.5) * 0.34, q.y - (row + 0.5) * 0.15);
  float edge = -sdBox2(cell, vec2(0.17, 0.075));
  float v = chStone(q, g, 0.12 + 0.12 * hash3(vec3(col, row, 7.0)));
  return v * smoothstep(0.004, 0.004 + 1.5 * g, edge);                    // mortar joints cut dark
}
// glass: lit from above, engraved along the opening's own isolines; lead cames in diamond quarries
float chGlass(vec2 q, float d, float g, float seed) {
  float light = 0.2 + 0.25 * fbm3(vec3(q * 3.5, seed)) + 0.4 * smoothstep(-0.7, 1.0, q.y);
  float v = engrave(-d, light, g, 0.017);
  vec2 r = vec2(q.x + q.y, q.x - q.y) * (0.70710678 / 0.12);
  vec2 l = abs(fract(r) - 0.5) * 0.12;
  return v * smoothstep(0.0025, 0.0025 + 1.5 * g, min(l.x, l.y));
}

float plate0(vec2 q, float g) {
  float w = lw(0.0028, g);
  float outer = sdArch(q, 1.08, 0.12, -0.62);
  float inner = sdArch(q, 0.96, 0.12, -0.62);
  if (q.y < -0.62) {                                                     // the plinth: it carries the name
    float v = chStone(q, g, 0.12);
    return max(v, max(ink(q.y + 0.645, w, g), ink(q.y + 0.965, w, g)));
  }
  if (outer > 0.0) return max(chAshlar(q, g), ink(outer, w, g));         // the wall
  if (inner > 0.0)                                                       // the moulding: the arch's own isolines
    return max(engrave(inner, 0.3, g, 0.012), max(ink(inner, w, g), ink(outer, w, g)));

  vec2 lq = vec2(abs(q.x) - 0.47, q.y);
  float lancet = sdArch(lq, 0.39, 0.12, -0.62);
  float rose = length(q - vec2(0.0, 1.13)) - 0.33;
  float tre = length(vec2(abs(q.x), q.y) - vec2(0.55, 1.0)) - 0.085;
  float v;
  if (lancet < 0.0) v = chGlass(q, lancet, g, 2.0 + sign(q.x));
  else if (rose < 0.0) v = 0.5;                                          // (drawn by plate 1 whenever it is visible)
  else if (tre < 0.0) v = chGlass(q, tre, g, 5.0);
  else v = chStone(q, g, 0.09);                                          // the tracery's stone
  v = max(v, ink(inner, w, g));
  v = max(v, ink(lancet, w, g));
  v = max(v, max(ink(rose, w, g), max(ink(rose - 0.02, w * 0.6, g), ink(rose - 0.042, w, g))));
  v = max(v, ink(tre, w, g));
  return v;
}

// ═══ 1 · THE ROSE ══════════════════════════════════════════════════════════

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  float r = length(q), a = atan(q.y, q.x);
  float v = engrave(r, 0.05 + 0.05 * fbm3(vec3(q * 9.0, 2.0)), g, 0.01);   // stone, turned in rings

  // the tempo gauge: a sweep fills the band clockwise from the top; 60 ticks
  float cw = mod(PI * 0.5 - a, TAU);
  float sweep = mod(uTime * 0.5, TAU);
  if (r > 0.84 && r < 0.93) {
    float lit = cw < sweep ? 0.5 + 0.25 * smoothstep(sweep - 0.6, sweep, cw) : 0.07;
    v = engrave(cw * 0.885, lit, g * 0.885 / r, 0.008);
    float k = floor(cw / TAU * 60.0 + 0.5);
    float tick = ink(abs(cw - k * TAU / 60.0) * r, w, g) * step(mod(k, 5.0) < 0.5 ? 0.848 : 0.885, r);
    v = max(v * (1.0 - tick), tick);
  }
  vec2 nd = vec2(sin(sweep), cos(sweep));
  v = max(v, ink(sdSeg(q, nd * 0.83, nd * 0.95), w * 1.3, g));             // the needle

  // twelve foils, each a quatrefoil of glass
  float sec = TAU / 12.0;
  float k = floor(a / sec + 0.5), kk = mod(k, 12.0);
  float ac = k * sec;
  vec2 fq = q - vec2(cos(ac), sin(ac)) * 0.585;
  float fd = length(fq) - 0.155;
  vec2 aq = abs(rot(ac) * fq);
  float qf = min(length(aq - vec2(0.066, 0.0)), length(aq - vec2(0.0, 0.066))) - 0.068;
  if (fd < 0.0) {
    float lum = 0.22 + 0.34 * hash3(vec3(kk, 3.0, 1.0));
    v = qf < 0.0 ? engrave(-qf, lum + 0.18, g, 0.009) : engrave(-fd, lum * 0.5, g, 0.009);
    v = max(v, ink(qf, w * 0.8, g));
  }
  v = max(v, max(ink(fd, w, g), ink(fd - 0.018, w * 0.6, g)));

  // tracery bars between the foils
  float ab = (floor(a / sec) + 0.5) * sec;
  vec2 bd = vec2(cos(ab), sin(ab));
  float bar = sdSeg(q, bd * 0.42, bd * 0.8);
  v = max(v, ink(bar - 0.012, w * 0.7, g));                              // each bar a double line

  // the inner ring, and the twelve's star {12/5}: its inner polygon frames the eye
  v = max(v, max(ink(r - 0.40, w, g), ink(r - 0.42, w, g)));
  if (r < 0.4) {
    float s = 9.0;
    for (int i = 0; i < 12; i++) {
      float a0 = float(i) * sec, a1 = float(i + 5) * sec;
      s = min(s, sdSeg(q, vec2(cos(a0), sin(a0)) * 0.4, vec2(cos(a1), sin(a1)) * 0.4));
    }
    v = max(v * 0.6, ink(s, w * 0.8, g));
  }
  v = max(v, max(ink(r - 0.1, w, g), max(ink(r - 0.114, w * 0.6, g), ink(r - 0.13, w, g))));   // the eye's frame
  v = max(v, max(ink(r - 0.94, w, g), max(ink(r - 0.965, w * 0.6, g), ink(r - 0.99, w, g))));  // the moulding
  return v;
}

// ═══ 2 · THE CHOIR (raymarched) ════════════════════════════════════════════

const vec3 CH_EYE = vec3(0.0, 0.12, -0.04);
vec2 chU(vec2 a, vec2 b) { return a.x < b.x ? a : b; }
float chVesica(vec2 p) { return sdVesica(p - vec2(0.0, 0.12), 0.40, 0.22); }   // 0.36 wide, 0.67 tall

// materials: 1 bone · 2 flayed flesh · 3 the eye · 4 iron
vec2 chMap(vec3 p) {
  vec3 bq = vec3(p.x, p.y, p.z * 1.35);
  float body = sdRound(bq, vec3(0.0, -0.62, 0.0), vec3(0.0, 0.66, 0.0), 0.31, 0.12) / 1.35;
  body = smin(body, sdEllipsoid(p - vec3(0.0, -0.8, -0.02), vec3(0.52, 0.22, 0.36)), 0.14);
  float ves = chVesica(p.xy);
  body = smax(body, -max(ves + 0.012, -(p.z + 0.02)), 0.025);            // the almond, cut to the eye
  vec2 res = vec2(body, 2.0);

  vec2 e2 = p.xy - vec2(0.0, 0.12);
  float notch = 0.008 * sin(atan(e2.y / 1.85, e2.x) * 30.0);
  res = chU(res, vec2(length(vec2(ves - 0.02, p.z - 0.09)) - 0.036 - notch, 1.0));   // its bone frame, notched like a spine
  res = chU(res, vec2(sdSphere(p - CH_EYE, 0.2), 3.0));

  if (length(p - vec3(0.0, 0.82, 0.0)) < 0.32 + res.x) {                 // a crown of broken ribs
    float crown = 9.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i) - 2.0, an = fi * 0.42;
      float len = 0.18 + 0.12 * hash3(vec3(fi, 1.0, 9.0));
      vec3 a0 = vec3(fi * 0.045, 0.64, 0.0);
      crown = min(crown, sdRound(p, a0, a0 + vec3(sin(an), cos(an), -0.1) * len, 0.03, 0.009));
    }
    res = chU(res, vec2(crown, 1.0));
  }
  vec3 hq = vec3(abs(p.x), p.y, p.z);
  if (length(hq - vec3(0.24, 0.08, 0.1)) < 0.2 + res.x) {                // two hands of bone grip the column
    float hand = sdEllipsoid(hq - vec3(0.28, 0.06, 0.06), vec3(0.065, 0.11, 0.055));
    for (int i = 0; i < 3; i++) {
      float fy = 0.15 - float(i) * 0.075;
      vec3 k0 = vec3(0.28, fy, 0.09), k1 = vec3(0.225, fy + 0.02, 0.15), k2 = vec3(0.178, fy - 0.012, 0.135);
      hand = smin(hand, min(sdRound(hq, k0, k1, 0.021, 0.016), sdRound(hq, k1, k2, 0.016, 0.005)), 0.02);
    }
    res = chU(res, vec2(hand, 1.0));
  }
  if (hq.x > 0.15 && hq.z < 0.0 && p.y < 0.5) {                          // bare wing bones, arched behind
    vec3 wa = vec3(0.2, -0.45, -0.12), wb = vec3(0.68, -0.14, -0.2), wc = vec3(0.88, 0.36, -0.22);
    float wing = min(sdRound(hq, wa, wb, 0.04, 0.024), sdRound(hq, wb, wc, 0.024, 0.008));
    for (int i = 0; i < 3; i++) {
      vec3 s0 = mix(wb, wc, 0.2 + float(i) * 0.26);
      wing = min(wing, sdRound(hq, s0, s0 + vec3(0.05, -0.34 + float(i) * 0.05, 0.02), 0.011, 0.003));
    }
    res = chU(res, vec2(wing, 1.0));
  }
  vec3 ap = p - vec3(0.0, 0.12, -0.3);
  if (abs(ap.z) < 0.03 + res.x && ap.y > -0.25) {                        // a broken fan of iron blades behind
    float blades = 9.0;
    for (int i = 0; i < 9; i++) {
      float fi = float(i);
      float ang = 0.18 + fi * (PI - 0.36) / 8.0 + 0.07 * sin(fi * 3.7);
      float len = (i == 2 || i == 6) ? 0.2 : 0.4 + 0.24 * hash3(vec3(fi, 4.0, 2.0));
      vec2 dir = vec2(cos(ang), sin(ang));
      vec2 lp = vec2(dot(ap.xy, dir), dot(ap.xy, vec2(-dir.y, dir.x)));
      float taper = 0.026 * (1.0 - clamp((lp.x - 0.48) / len, 0.0, 1.0)) + 0.004;
      blades = min(blades, sdBox(vec3(lp.x - 0.48 - len * 0.5, lp.y, ap.z), vec3(len * 0.5, taper, 0.008), 0.002));
    }
    res = chU(res, vec2(blades * 0.8, 4.0));
  }
  return res;
}

vec3 chNormal(vec3 p) {
  const float e = 0.0015;
  vec2 k = vec2(1.0, -1.0);
  return normalize(k.xyy * chMap(p + k.xyy * e).x + k.yyx * chMap(p + k.yyx * e).x +
                   k.yxy * chMap(p + k.yxy * e).x + k.xxx * chMap(p + k.xxx * e).x);
}

float plate2(vec2 q, float g) {
  float w = lw(0.0018, g);
  vec2 eq = q - vec2(0.0, 0.12);
  float er = length(eq), ea = atan(eq.y, eq.x);

  // holy light behind: rays out of the eye, engraved as a sunburst
  float ray = 0.5 + 0.5 * sin(ea * 9.0 + 0.7 * sin(ea * 3.0 + uTime * 0.17));
  float bl = 0.2 * smoothstep(1.0, 0.18, er) * (0.3 + 0.7 * ray);
  float v = engrave(ea, bl, g / max(er, 1e-3), 0.006);

  // the Choir, raymarched orthographically and turned a little toward the hand
  float yaw = 0.16 * uPointer.x + 0.05 * sin(uTime * 0.31);
  float pitch = -0.1 * uPointer.y + 0.03 * sin(uTime * 0.23);
  vec3 piv = vec3(0.0, 0.12, 0.16);                                       // the pupil stays where the portal is
  vec3 ro = vec3(q, 0.45) - piv, rd = vec3(0.0, 0.0, -1.0);
  ro.xz = rot(yaw) * ro.xz; rd.xz = rot(yaw) * rd.xz;
  ro.yz = rot(pitch) * ro.yz; rd.yz = rot(pitch) * rd.yz;
  ro += piv;
  float t = 0.0, minD = 9.0;
  vec2 h = vec2(9.0, 0.0);
  bool hit = false;
  if (length(q) < 1.02) for (int i = 0; i < 64; i++) {
    h = chMap(ro + rd * t);
    minD = min(minD, h.x);
    if (h.x < 0.0004 + g * 0.3) { hit = true; break; }
    t += h.x * 0.9;
    if (t > 1.05) break;
  }
  if (!hit) return max(v, (1.0 - smoothstep(0.6 * g, 2.2 * g, minD)) * 0.85);   // the silhouette's cut edge

  vec3 p = ro + rd * t;
  vec3 n = chNormal(p);
  vec3 nv = n; nv.yz = rot(-pitch) * nv.yz; nv.xz = rot(-yaw) * nv.xz;    // back to the viewer's frame
  vec3 L = normalize(vec3(-0.45, 0.72, 0.55));                            // the cold key, from above
  float dif = max(dot(nv, L), 0.0);
  float occ = sat(chMap(p + n * 0.05).x / 0.05);
  float lum = (0.05 + 0.92 * dif) * (0.45 + 0.55 * occ);
  float facing = max(nv.z, 0.3);
  float f, grad = 1.0, h0 = 0.011;
  float m = h.y;
  if (m < 1.5) {                                                         // bone: diagonal strokes
    lum = min(1.0, lum * 1.2);
    f = p.y * 0.8 + p.x * 0.6 + 0.004 * noise3(p * 60.0);
    h0 = 0.009;
  } else if (m < 2.5) {                                                  // flesh: cross-contours round the form
    f = p.y + 0.06 * fbm3(p * 5.0) + 0.01 * sin(p.x * 40.0);
    lum *= 0.55; h0 = 0.008;
  } else if (m < 3.5) {                                                  // the eye
    vec2 ue = p.xy - vec2(0.0, 0.12);
    float rho = length(ue);
    float pupil = sdBox2(ue, vec2(0.04, 0.095)) - 0.025;                 // a goat's pupil, stood on end
    if (pupil < 0.0) {
      v = ink(er - 0.065, w, g) * 0.85;                                  // the light inside it is the next world
      return max(v, ink(pupil, w * 1.4, g));
    }
    if (rho < 0.135) {                                                   // iris: fibres, molten at the pupil's lip
      lum = 0.12 + 0.8 * exp(-pupil * 38.0) + 0.1 * noise3(vec3(ea * 12.0, rho * 40.0, 1.0));
      f = atan(ue.y, ue.x) * 0.108 + 0.004 * noise3(vec3(ue * 70.0, 2.0)); grad = 0.108 / max(rho, 0.02); h0 = 0.0025;
    } else {                                                             // the white: rings about the iris, a few veins
      float vein = smoothstep(0.93, 0.99, 1.0 - abs(noise3(vec3(ue * 26.0, 3.0)) * 2.0 - 1.0));
      lum = (0.25 + 0.6 * dif) * (1.0 - 0.7 * vein);
      f = rho; h0 = 0.008;
    }
    float glint = smoothstep(0.022, 0.012, length(ue - vec2(-0.055, 0.06)));
    v = max(engrave(f, lum, g * grad / facing, h0), glint);
    return max(v, ink(rho - 0.135, w * 0.8, g) * 0.7);
  } else {                                                               // iron: concentric scoring across the blades
    f = length(p.xy - vec2(0.0, 0.12));
    lum *= 0.75; h0 = 0.007;
  }
  v = engrave(f, lum, g * grad / facing, h0);
  float rim = pow(1.0 - sat(nv.z), 2.0);
  return max(v, smoothstep(0.55, 0.85, rim) * 0.9);                      // the rim light: a white edge
}

// ═══ 3 · THE FIELD ═════════════════════════════════════════════════════════

float chField(vec2 q) {
  float d = 9.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float a = fi * TAU / 6.0 + 0.3 + uTime * 0.04 * (mod(fi, 2.0) * 2.0 - 1.0);
    float rr = 0.54 + 0.08 * sin(uTime * 0.21 + fi * 1.7);
    d = smin(d, length(q - vec2(cos(a), sin(a)) * rr) - (0.11 + 0.05 * sin(fi * 2.3 + 1.0)), 0.3);
  }
  return d;
}

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q), a = atan(q.y, q.x);
  float F0 = chField(q);
  vec2 gr = vec2(chField(q + vec2(0.002, 0.0)) - F0, chField(q + vec2(0.0, 0.002)) - F0) / 0.002;
  float F = F0 / max(length(gr), 0.25);                                  // an even field: no fat saddles
  float v;
  if (F < 0.0) v = engrave(F, 0.26 + 0.24 * sat(-F * 6.0), g, 0.008);   // inside: filled with its own isolines
  else v = isolines(F, 0.05, g, 0.0012) * (0.16 + 0.5 * exp(-F * 5.0)); // outside: the contour map
  v = max(v, ink(F, w * 1.6, g));                                        // d = 0
  // round the centre, rings lead the eye down into the Window
  v = max(v * smoothstep(0.13, 0.22, r), isolines(r, 0.03, g, 0.0012) * 0.32 * smoothstep(0.45, 0.14, r));
  v = max(v, max(ink(r - 0.09, w, g), max(ink(r - 0.104, w * 0.6, g), ink(r - 0.122, w, g))));
  // the survey's frame: a graticule with ticks, and dashed crosshairs
  v = max(v, max(ink(r - 0.93, w, g), ink(r - 0.985, w, g)));
  if (r > 0.93 && r < 0.985) {
    float k = floor(a / TAU * 72.0 + 0.5);
    v = max(v, ink(abs(a - k * TAU / 72.0) * r, w, g) * step(mod(k, 6.0) < 0.5 ? 0.93 : 0.957, r));
  }
  float dash = step(0.5, fract(r * 14.0));
  v = max(v, ink(min(abs(q.x), abs(q.y)), w * 0.7, g) * 0.3 * dash * step(0.15, r) * step(r, 0.93));
  return v;
}
`,
};
