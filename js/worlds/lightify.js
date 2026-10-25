/**
 * lightify.js — Lightify as a world: sound becomes landscape becomes light.
 *
 *   0 The Record   a record on its platter, the tonearm resting on it; the
 *                  label carries the name, the run-out the small print
 *   1 The Groove   under the needle, magnified: the groove's two walls carry
 *                  the waveform, and the stylus's diamond sits in it
 *   2 The Range    inside the diamond the sound stands up as mountains, ridge
 *                  behind ridge, their peaks the bars of a spectrum; a star above;
 *                  the figures in its sky and on its water
 *   3 The Light    the star, close: one point of light whose rays are the
 *                  spectrum turned round it, what is inside between them — and
 *                  in its core, the Record again
 *
 * Same engraving as every world: the darkness is the canvas, line width is the
 * only brightness, and the light is spent on the needle, the diamond and the star.
 */

export const LIGHTIFY = {
  id: 'lightify',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — a spectrum: indigo to green to gold, magenta
  palette: ['#120c4a', '#2fd49a', '#f6ff8a', '#ff4fa8'],
  // its words are painted (world.js): titles and figures with a brush, the rest in a loose hand, brushed in
  // along each line as you come in, on a wash
  fonts: { title: ['Kaushan Script', 400], body: ['Kalam', 400] },
  // at rest its wash is liquid light, swelling with the music
  wash: { scale: 60, speed: 0.07, flow: [0, -2], warp: 1.6, ripple: 0.22, bands: 3, music: 1 },
  reveal: 'paint',

  // portal / medal: [x, y, r] in the plate's own units; home: [x, y, s] (default [0, 0, 1])
  plates: [
    { title: 'The Record', note: 'A record on its platter, the needle in the groove. Scroll into the light under the needle.', portal: [0, -0.42, 0.08], medal: [0, 0.05, 1.2] },
    { title: 'The Groove', note: 'Magnified, the groove’s two walls carry the waveform. Scroll into the diamond.', portal: [0, 0, 0.1], medal: [0, 0, 1] },
    { title: 'The Range', note: 'The sound stands up as mountains, their peaks a spectrum. Scroll into the star.', portal: [0, 0.42, 0.08], medal: [0, 0, 1] },
    { title: 'The Light', note: 'One point of light, its rays the spectrum. In its core, the Record again.', portal: [0, 0, 0.09], medal: [0, 0, 1] },
  ],

  inscriptions(p) {
    const out = [];
    const sentences = (p.summary.match(/[^.]+\.\s*/g) || [p.summary]).map((s) => s.trim());

    // 0 · the label carries the name and the kind; the run-out the version and the small print;
    //     the plinth the tagline, and beside the platter what it does
    out.push({ plate: 0, text: p.name, x: 0, y: 0.1, size: 0.05, track: 0.3, upper: true, arc: { r: 0.172, a: Math.PI / 2 } });
    out.push({ plate: 0, text: p.kind, x: 0, y: 0.1, size: 0.02, track: 0.22, upper: true, alpha: 0.75, arc: { r: 0.19, a: -Math.PI / 2 } });
    out.push({ plate: 0, text: 'Side A', x: -0.105, y: 0.1, size: 0.018, track: 0.2, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: '33⅓', x: 0.105, y: 0.1, size: 0.018, track: 0.1, alpha: 0.6 });
    out.push({ plate: 0, text: p.version, x: 0, y: 0.1, size: 0.017, track: 0.2, upper: true, alpha: 0.65, arc: { r: 0.307, a: Math.PI / 2 } });
    if (sentences.length > 1) {
      out.push({ plate: 0, text: sentences.slice(1).join(' '), x: 0, y: 0.1, size: 0.017, track: 0.04, alpha: 0.65, arc: { r: 0.307, a: -Math.PI / 2 } });
    }
    //     (what it does runs round the platter's rim, the small print kept to the middle: past one loop the
    //     Record shows through a circle that cuts the plinth's corners)
    const words = sentences[0].split(' '), half = words.findIndex((_, i) => words.slice(0, i + 1).join(' ').length >= sentences[0].length / 2) + 1;
    [words.slice(0, half), words.slice(half)].forEach((line, i) => {
      out.push({ plate: 0, text: line.join(' '), x: 0, y: 0.1, size: 0.021, alpha: 0.82, arc: { r: 0.93 - i * 0.045, a: Math.PI / 2 } });
    });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.8, size: 0.032, face: 'title', alpha: 0.85 });
    out.push({ plate: 0, text: [p.status, p.platform].join('   ·   '), x: 0, y: -0.86, size: 0.018, track: 0.16, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.9, size: 0.015, track: 0.06, alpha: 0.5 });

    // 1 · the highlights are cut into the lands between the grooves (arcs about the record's centre)
    [0.65, 0.39, -0.39, -0.65].forEach((v, i) => {
      if (p.highlights[i]) out.push({ plate: 1, text: p.highlights[i], x: 0, y: 6.5, size: 0.024, alpha: 0.85, arc: { r: 6.5 - v, a: -Math.PI / 2 } });
    });

    // 2 · the range is measured: its figures in the night sky either side of the star, and on the water
    const spots = [[-0.5, 0.6], [0.5, 0.6], [-0.46, -0.52], [0.46, -0.52]];
    p.stats.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 2, text: v, count: s, x, y, size: 0.1, weight: 200, track: 0.02 });
      out.push({ plate: 2, text: s.label, x, y: y - 0.095, size: 0.022, track: 0.16, upper: true, alpha: 0.75 });
    });

    // 3 · what is inside, between the light's rays; its makings round the rim
    const corners = [[-0.47, 0.44], [0.47, 0.44], [-0.47, -0.22], [0.47, -0.22]];
    p.inside.forEach((s, i) => {
      const [x, y] = corners[i % 4];
      out.push({ plate: 3, text: s.title, x, y, size: 0.034, face: 'title' });
      out.push({ plate: 3, text: s.text, x, y: y - 0.06, size: 0.026, w: 0.44, lh: 1.4, alpha: 0.85, hang: true });
    });
    p.stack.forEach(([g, items], i) => {
      out.push({ plate: 3, text: `${g}  ·  ${items.join('  ·  ')}`, x: 0, y: 0, size: 0.022, track: 0.12, upper: true, alpha: 0.7, arc: { r: 0.877, a: Math.PI / 2 + (i * 2 * Math.PI) / p.stack.length } });
    });
    return out;
  },

  // on top of the paint (world.js): while it is wet, the words lie on a turning record (about the plate's
  // centre: the Record's spindle, the Groove's far centre), fine grooves cutting through them and a streak of
  // light sweeping round them; as the paint dries the grooves fill and the streak dies. Their glow pulses with
  // this side's music, steady when it is off or muted
  textFx: /* glsl */ `
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float em = max(w0.w, 8.0);
  if (w0.x > 1.6 * em) return;                               // (nothing reaches this far from a word)
  float a = paintAge(uv, w0);
  float wet = (1.0 - smoothstep(0.05, 0.9, a)) * smoothstep(0.0, 0.05, a);
  float beat = uMusic < 0.0 ? 0.5 : uMusic;                  // (steady without music)
  vec2 C = gPlate == 0 ? vec2(0.0, 0.1) : gPlate == 1 ? vec2(0.0, 6.5) : vec2(0.0);
  vec2 d = (q - C) * kpx;                                    // canvas px from the spindle
  float r = length(d);
  // the grooves: fine rings round the spindle, cutting through the wet letters
  float gr = rings(r, 0.17 * em, 0.0, 0.025 * em + 0.3, 0.7);
  txt *= 1.0 - 0.55 * gr * wet;
  // the record's broader grooves round the words, lit by a streak that sweeps round as it turns
  float ang = atan(d.y, d.x) - uTime * 0.9;
  float streak = pow(0.5 + 0.5 * cos(2.0 * ang), 10.0);
  float gw = rings(r, 0.24 * em, 0.0, 0.03 * em + 0.4, 0.7);
  float sheen = gw * (1.0 - smoothstep(0.3 * em, 1.5 * em, w0.x)) * step(0.0, w0.x) * wet * (0.06 + 0.8 * streak);
  // the glow: the letters swell a little on the beat; while wet, a halo pulsing with the music, clear of them
  float h0 = max(0.4 * em, 9.0);
  float halo = (1.0 - smoothstep(h0, h0 + 0.7 * em, w0.x)) * smoothstep(h0 - 3.0, h0, w0.x) * wet;
  txt = max(txt, sheen) * (0.94 + 0.12 * beat) + halo * (0.06 + 0.3 * beat);
}
`,

  glsl: /* glsl */ `
float lfRBox(vec2 p, vec2 b, float r) { return sdBox2(p, b - r) - r; }

// a tube a → b of radius rad: (along 0..1, across −1..1, distance)
vec3 lfTube(vec2 q, vec2 a, vec2 b, float rad) {
  vec2 ba = b - a; float L = length(ba); vec2 t = ba / L;
  vec2 p = q - a; float u = dot(p, t), s = dot(p, vec2(-t.y, t.x));
  return vec3(u / L, s / rad, max(abs(s) - rad, max(-u, u - L)));
}
// turned metal: lines along it, the lamp caught down one side, a cut outline
void lfMetal(vec3 t, float rad, float lum, float g, float w, inout float v) {
  if (t.z < 0.0) {
    float hi = exp(-pow((t.y - 0.35) * 2.6, 2.0));
    v = engrave(t.y * rad, lum * (0.35 + 0.65 * (1.0 - t.y * t.y)) + 0.5 * hi, g, 0.004);
  }
  v = max(v, ink(t.z, w, g));
}

// ═══ 0 · THE RECORD ════════════════════════════════════════════════════════

const vec2 LF_REC = vec2(0.0, 0.1);          // the record's centre
const vec2 LF_NEEDLE = vec2(0.0, -0.42);     // where the stylus reads: the portal
const vec2 LF_PIVOT = vec2(1.0, -0.3);       // the tonearm's bearing
const vec2 LF_HEAD = vec2(0.3, -0.42);       // where the tube meets the headshell

// the whole arm as one silhouette (for its shadow)
float lfArm(vec2 q) {
  vec2 dir = normalize(LF_PIVOT - LF_HEAD);
  float d = lfTube(q, LF_HEAD, LF_PIVOT + dir * 0.12, 0.014).z;
  d = min(d, lfTube(q, LF_PIVOT + dir * 0.11, LF_PIVOT + dir * 0.23, 0.046).z);
  d = min(d, lfRBox(q - vec2(0.2, -0.42), vec2(0.1, 0.042), 0.012));
  d = min(d, lfTube(q, LF_NEEDLE, vec2(0.11, -0.42), 0.004).z);
  return d;
}

float plate0(vec2 q, float g) {
  float w = lw(0.0026, g);
  vec2 rq = q - LF_REC;
  float r = length(rq), a = atan(rq.y, rq.x);

  // the plinth: dark, only a little light spilt round the platter
  float v = engrave(r, 0.05 * exp(-max(r - 0.84, 0.0) * 14.0), g, 0.01);

  float spin = spinAngle(8.0, uTime);
  if (r < 0.84) {
    float ar = a + spin;                                                 // the record turns (clockwise) under the lamp and the needle
    float beat = uMusic < 0.0 ? 0.5 : uMusic;                            // (steady without music)
    float sheen = pow(abs(cos(a - 2.25)), 6.0 - 4.0 * (beat - 0.5));     // the bow-tie: a lamp caught in the grooves, wider when it plays loud
    if (r > 0.79) {                                                      // the platter's rim: two rows of strobe dots
      v = engrave(r, 0.05, g, 0.006);
      for (int row = 0; row < 2; row++) {
        float o = float(row) * 0.5, rr = row == 0 ? 0.803 : 0.827;
        float m = ar / TAU * 120.0 - o;
        float da = (m - floor(m) - 0.5) * TAU / 120.0 * r;
        v = max(v, (1.0 - smoothstep(-g, g, length(vec2(da, r - rr)) - 0.0042)) * 0.5);
      }
    } else if (r > 0.76) {
      v = engrave(r, 0.025, g, 0.006);                                   // the mat
    } else if (r > 0.335) {                                              // the grooves: tracks, parted by smooth gaps
      float glow = exp(-length(q - LF_NEEDLE) * 16.0 / (0.75 + 0.5 * beat)) * (0.45 + 0.9 * beat);   // the light pooled where the needle reads, swelling on the beat
      float lum = 0.012 + 0.06 * noise3(vec3(r * 40.0, vec2(cos(ar), sin(ar)) * 2.5)) + 0.55 * sheen + 0.3 * glow;   // (the pressing's grain turns with it)
      float gap = min(min(abs(r - 0.69), abs(r - 0.628)), min(abs(r - 0.415), abs(r - 0.372)));
      lum *= smoothstep(0.003, 0.007, gap);
      if (r > 0.744) lum *= 0.3;                                         // the lead-in
      lum *= 0.8 + 0.4 * beat;                                           // the tracks brighten with the music
      vec2 pd = q - gPtr;
      lum += 0.3 * gPtrOn * exp(-dot(pd, pd) / 0.012);                   // and catch the light where the pointer passes
      v = engrave(r, lum, g, 0.005);
    } else if (r > 0.255) {                                              // the run-out: smooth, one spiral to the lock groove
      v = 0.0;
      v = max(v, ink(r - (0.29 + 0.045 * mod(ar + PI, TAU) / TAU), w * 0.5, g) * 0.6);
      v = max(v, ink(r - 0.283, w * 0.5, g) * 0.6);
    } else {                                                             // the label: dark paper, two printed rings
      v = 0.0;
      v = max(v, max(ink(r - 0.255, w, g), ink(r - 0.238, w * 0.5, g) * 0.6));
      float dash = abs(fract(ar / TAU * 6.0) - 0.5) * TAU / 6.0 * r;     // the printed ring by the spindle, broken in six, turning with it
      v = max(v, ink(r - 0.042, w * 0.5, g) * 0.5 * smoothstep(0.004 - g, 0.004 + g, TAU / 12.0 * r - dash));
      v = max(v, ink(r - 0.016, w, g));                                  // the spindle
      if (r < 0.016) v = max(v, engrave(r, 0.45, g, 0.003));
    }
    v = max(v, ink(r - 0.76, w, g));                                     // the record's edge catches the light
    v = max(v, max(ink(r - 0.79, w * 0.6, g), ink(r - 0.84, w, g)));
  }

  // the arm rides the record: a pressing a hair off centre sways it once a turn, about the stylus (the portal
  // never moves; its base on the plinth stays put). The pointer passing close makes the needle quiver in the groove
  float jog = gPtrOn * (1.0 - smoothstep(0.1, 0.4, length(gPtr - LF_NEEDLE))) * min(length(gPtrV) / 0.6, 1.0);
  vec2 aq = rotAt(q, LF_NEEDLE, -0.008 * sin(spin + 0.7) - 0.015 * jog * sin(uTime * 13.0));

  // the arm's shadow falls across the record
  v *= 1.0 - 0.75 * (1.0 - smoothstep(-0.004, 0.014, lfArm(aq - vec2(0.022, -0.03))));

  // the needle's spot: the next plate
  float pd = length(q - LF_NEEDLE) - 0.08;
  if (pd < 0.0) v = 0.3;
  v = max(v, max(ink(pd, w * 1.2, g), ink(pd - 0.014, w * 0.6, g) * 0.6));

  // the tonearm: base, tube and counterweight, bearing, headshell, cartridge, cantilever
  vec2 pq = q - LF_PIVOT; float pr = length(pq);
  if (pr < 0.115) v = engrave(pr, 0.1 + 0.22 * smoothstep(0.08, -0.08, pq.x - pq.y), g, 0.005);
  v = max(v, max(ink(pr - 0.115, w, g), ink(pr - 0.095, w * 0.6, g) * 0.7));
  float apr = length(aq - LF_PIVOT);                                     // (the rest rides with the arm)
  vec2 dir = normalize(LF_PIVOT - LF_HEAD);
  lfMetal(lfTube(aq, LF_HEAD, LF_PIVOT + dir * 0.12, 0.014), 0.014, 0.2, g, w, v);
  vec3 cw = lfTube(aq, LF_PIVOT + dir * 0.11, LF_PIVOT + dir * 0.23, 0.046);
  lfMetal(cw, 0.046, 0.18, g, w, v);
  if (cw.z < 0.0) v *= 1.0 - 0.8 * ink(fract(cw.x * 6.0) - 0.5, 0.04, 0.02);   // turned grooves round the weight
  if (apr < 0.042) v = engrave(apr, 0.34, g, 0.004);
  v = max(v, ink(apr - 0.042, w, g));
  float hs = lfRBox(aq - vec2(0.2, -0.42), vec2(0.1, 0.042), 0.012);
  if (hs < 0.0) v = engrave(aq.y, 0.14 + 0.35 * exp(-pow((aq.y + 0.392) * 70.0, 2.0)), g, 0.004);
  v = max(v, ink(hs, w, g));
  float cb = lfRBox(aq - vec2(0.16, -0.42), vec2(0.05, 0.026), 0.006);
  if (cb < 0.0) v = engrave(aq.x, 0.07, g, 0.004);
  v = max(v, ink(cb, w * 0.8, g));
  v = max(v, ink(min(length(aq - vec2(0.13, -0.42)), length(aq - vec2(0.19, -0.42))) - 0.006, w * 0.7, g));
  lfMetal(lfTube(aq, vec2(0.27, -0.455), vec2(0.31, -0.54), 0.007), 0.007, 0.2, g, w, v);   // the finger lift
  lfMetal(lfTube(aq, LF_NEEDLE, vec2(0.11, -0.42), 0.004), 0.004, 0.3, g, w, v);           // the cantilever, down to the spot
  return v;
}

// ═══ 1 · THE GROOVE ════════════════════════════════════════════════════════

const vec2 LF_C1 = vec2(0.0, 6.5);           // the record's centre, in this plate's units

// a channel of music along the groove (n: which turn of the spiral, ch: left or right wall)
float lfWave(float u, float n, float ch) {
  float s = u + uTime * 0.32;
  float e = 0.6 + 0.4 * sin(s * 1.7 + n * 2.1 + ch);
  return e * (0.6 * sin(s * 8.0 + n * 1.3 + ch * 0.9) + 0.28 * sin(s * 19.0 + n * 3.7 + ch * 2.3) + 0.12 * sin(s * 37.0 + n * 5.1));
}

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  vec2 d = q - LF_C1;
  float vv = 6.5 - length(d), u = 6.5 * atan(d.x, -d.y);                // across and along the grooves
  const float P = 0.26, HW = 0.062;
  vec2 pd = q - gPtr;
  float A = 0.024 * (0.7 + 0.6 * (uMusic < 0.0 ? 0.5 : uMusic))        // the walls cut deeper when it plays loud (steady without music),
          * (1.0 + 0.8 * gPtrOn * exp(-dot(pd, pd) / 0.05));             // and where the pointer is
  float n = floor(vv / P + 0.5), y = vv - n * P;
  float pin = n == 0.0 ? 1.0 : 0.0;                                      // the stylus rides groove 0: it passes through it
  float up = HW + A * (lfWave(u, n, 0.0) - pin * lfWave(0.0, n, 0.0));
  float lo = -HW + A * (lfWave(u, n, 1.7) - pin * lfWave(0.0, n, 1.7));
  float foc = 0.2 + 0.8 * exp(-length(q) * 1.4);                         // the diamond's light, falling off

  // the lands: smooth black vinyl, a few motes of dust
  float v = 0.0;
  vec2 cell = floor(q / 0.09);
  float h = hash3(vec3(cell, 21.0));
  if (h > 0.86) {
    vec2 sp = (cell + 0.5 + 0.4 * (vec2(hash3(vec3(cell, 22.0)), hash3(vec3(cell, 23.0))) - 0.5)) * 0.09;
    v = (1.0 - smoothstep(-g, g, length(q - sp) - 0.003 - 0.005 * (h - 0.86) / 0.14)) * 0.35 * (0.4 + foc);
  }
  // the groove: a V, its lower wall lit, its upper in shade, engraved down each slope
  if (y < up && y > lo) {
    float mid = 0.5 * (up + lo);
    bool lower = y < mid;
    float f = lower ? y - lo : up - y;
    v = engrave(f, (lower ? 0.6 : 0.08) * foc, g, 0.007);
    v *= smoothstep(0.0, 2.0 * g + 0.003, abs(y - mid));                 // the crease, cut dark
  }
  v = max(v, max(ink(y - up, w, g), ink(y - lo, w, g)) * (0.3 + 0.7 * foc));   // its edges catch the light

  // the cantilever comes in from the right; its shadow meets it at the tip
  if (q.x > 0.0) {
    float rad = 0.03 + 0.02 * q.x;
    float sh = abs(q.y + 0.08 * q.x) - rad;
    v *= 1.0 - 0.7 * (1.0 - smoothstep(-0.01, 0.02, sh));
    vec3 t = vec3(q.x, q.y / rad, max(abs(q.y) - rad, 0.06 - q.x));
    lfMetal(t, rad, 0.3, g, w, v);
  }
  // the diamond: a cut cone seen from above, its facets each catching the light differently
  float rp = length(q), ap = atan(q.y, q.x);
  if (rp < 0.15) {
    float k = floor(ap / (TAU / 8.0));
    v = engrave(rp, 0.08 + 0.3 * hash3(vec3(k, 31.0, 0.0)), g, 0.005);
    float edge = abs(ap - (k + 0.5) * TAU / 8.0) - TAU / 16.0;
    v = max(v, ink(edge * rp, w * 0.7, g) * 0.8);
  }
  v = max(v, ink(rp - 0.15, w, g));
  if (rp < 0.1) v = 0.3;                                                 // (the next plate)
  v = max(v, max(ink(rp - 0.1, w * 1.3, g), ink(rp - 0.112, w * 0.6, g) * 0.7));
  return v;
}

// ═══ 2 · THE RANGE ═════════════════════════════════════════════════════════

const vec2 LF_STAR = vec2(0.0, 0.42);

// one bar of the spectrum (i) on one ridge (k), slowly playing
float lfLevel(float i, float k) { return 0.2 + 0.8 * noise3(vec3(i * 0.61 + 3.0, k * 0.43, uTime * 0.2)); }
// ridge k's height at x: a peak per bar, the bars' levels eased between; z: 0 far … 1 near
float lfRidge(float x, float k, float z) {
  float xs = x / (0.075 + 0.06 * z) + k * 0.37;
  float c = xs - 0.5, i = floor(c);
  float lvl = mix(lfLevel(i, k), lfLevel(i + 1.0, k), smoothstep(0.0, 1.0, c - i));
  float peak = 1.0 - abs(fract(xs) - 0.5) * 2.0;
  float h = lvl * (0.22 + 0.78 * pow(peak, 1.7));
  float env = exp(-x * x * (3.2 - 1.4 * z));
  return 0.06 - 0.42 * z + (0.05 + 0.5 * z * z) * env * h + 0.004 * sin(x * 90.0 + k * 2.0) * z;
}

float plate2(vec2 q, float g) {
  float w = lw(0.0022, g);
  vec2 sq = q - LF_STAR;
  float rs = length(sq);

  // the night: lit in rings round the star, a scatter of fainter stars, the star's four spikes
  float v = engrave(rs, 0.3 * exp(-rs * 14.0), g, 0.006);
  vec2 cell = floor(q / 0.07);
  float h = hash3(vec3(cell, 11.0));
  if (h > 0.72) {
    vec2 sp = (cell + 0.5 + 0.35 * (vec2(hash3(vec3(cell, 12.0)), hash3(vec3(cell, 13.0))) - 0.5)) * 0.07;
    float tw = 0.55 + 0.45 * sin(uTime * (1.0 + 2.0 * h) + h * 40.0);
    v = max(v, (1.0 - smoothstep(-g, g, length(q - sp) - 0.002 - 0.004 * (h - 0.72) / 0.28)) * tw);
  }
  float fy = sat(1.0 - abs(sq.y) / 0.3), fx = sat(1.0 - abs(sq.x) / 0.3);
  v = max(v, max(ink(sq.x, lw(0.005 * fy, g), g) * fy, ink(sq.y, lw(0.005 * fx, g), g) * fx));
  vec2 dq = vec2(sq.x + sq.y, sq.x - sq.y) * 0.70710678;
  float fd = sat(1.0 - rs / 0.15);
  v = max(v, max(ink(dq.x, lw(0.003 * fd, g), g), ink(dq.y, lw(0.003 * fd, g), g)) * fd * 0.8);

  // the range: ridge behind ridge, each hiding the ones behind, each drawn as its own isolines
  if (q.y > -0.46 && q.y < 0.26) {
    for (int k = 0; k < 14; k++) {
      float fk = float(k), z = fk / 13.0;
      float y0 = lfRidge(q.x, fk, z);
      float y1 = lfRidge(q.x + 0.004, fk, z);
      float dy = (q.y - y0) / sqrt(1.0 + pow((y1 - y0) / 0.004, 2.0));
      float lit = (0.25 + 0.7 * z) * (0.4 + 0.6 * exp(-q.x * q.x * 3.0));
      if (dy < 0.0) v = engrave(dy, (0.01 + 0.2 * z * exp(dy * 22.0)) * lit, g, 0.006);
      v = max(v, ink(dy, w * (0.55 + 0.5 * z), g) * lit);
    }
  }
  // the water: the star's light broken in a column, the range faintly upside down
  if (q.y < -0.46) {
    float br = noise3(vec3(q.x * 7.0, q.y * 45.0, uTime * 0.35));
    float col = exp(-q.x * q.x * 45.0) * smoothstep(0.3, 0.75, br);
    v = engrave(q.y + 0.004 * sin(q.x * 21.0 + uTime * 0.7), 0.018 + 0.5 * col, g, 0.007);
    float yf = lfRidge(q.x, 13.0, 1.0);
    v = max(v, ink(-0.92 - q.y - yf, w * 0.8, g) * 0.3 * smoothstep(0.35, 0.6, br));
  }
  v = max(v, ink(q.y + 0.46, w * 0.8, g) * 0.5);

  // the star: the next plate
  if (rs < 0.08) v = 0.3;
  v = max(v, max(ink(rs - 0.08, w * 1.4, g), ink(rs - 0.095, w * 0.6, g) * 0.6));
  float r = length(q);
  v = max(v, max(ink(r - 0.965, w * 0.6, g) * 0.5, ink(r - 0.99, w, g) * 0.7));   // the diamond's girdle
  return v;
}

// ═══ 3 · THE LIGHT ═════════════════════════════════════════════════════════

float lfSpec(float i) { return 0.15 + 0.85 * pow(noise3(vec3(i * 0.53, 7.0, uTime * 0.45)), 1.5); }

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q);
  float b = atan(q.x, q.y);                                              // from the top, clockwise

  // the dark, lit by a sunburst of fine rays that fades well before the rim
  float ray = 0.5 + 0.5 * sin(b * 11.0 + 0.8 * sin(b * 4.0 + uTime * 0.13));
  float v = engrave(b, 0.3 * exp(-(r - 0.1) * 5.5) * (0.25 + 0.75 * ray), g / max(r, 1e-3), 0.01);

  // the rays: a spectrum turned round the light, mirrored, longer along the axes; each bar in segments
  const float NB = 36.0;
  float m = abs(b) / PI * NB;
  float i = floor(m);
  float axis = pow(abs(cos(2.0 * (i + 0.5) / NB * PI)), 2.0);
  float L = 0.14 + (0.08 + 0.3 * axis) * lfSpec(i);
  float across = abs(fract(m) - 0.5) * PI / NB * r - 0.28 * PI / NB * r;
  float bar = max(across, max(0.14 - r, r - L));
  float fall = (r - 0.14) / (L - 0.14);
  if (bar < 0.0) v = engrave(r, 0.3 - 0.24 * fall, g, 0.014);
  v = max(v, ink(bar, w * 0.6, g) * (0.3 - 0.22 * sat(fall)));
  v = max(v, ink(r - L, w, g) * step(across, 0.0) * 0.8);   // each bar's cap

  // four long spikes on the axes, four short on the diagonals
  if (r > 0.12) {
    float fade = 1.0 - smoothstep(0.2, 0.7, r);
    float sw = lw(0.006 * sat(1.0 - r / 0.7), g);
    v = max(v, max(ink(q.x, sw, g), ink(q.y, sw, g)) * fade);
    vec2 dq = vec2(q.x + q.y, q.x - q.y) * 0.70710678;
    v = max(v, max(ink(dq.x, sw * 0.8, g), ink(dq.y, sw * 0.8, g)) * (1.0 - smoothstep(0.15, 0.42, r)) * 0.7);
  }
  // the core: its corona, and in it the next plate
  if (r < 0.12) v = engrave(r, 0.4, g, 0.006);
  if (r < 0.09) v = 0.3;
  v = max(v, max(ink(r - 0.09, w * 1.6, g), max(ink(r - 0.105, w * 0.6, g), ink(r - 0.12, w, g))));

  // the rim: a scale of ticks round it
  v = max(v, max(ink(r - 0.845, w * 0.7, g) * 0.6, ink(r - 0.91, w, g)));
  if (r > 0.91 && r < 0.945) {
    float k = floor(b / TAU * 96.0 + 0.5);
    float len = mod(k, 8.0) < 0.5 ? 0.945 : 0.93;
    v = max(v, ink(abs(b - k * TAU / 96.0) * r, w * 0.7, g) * step(r, len) * 0.7);
  }
  return v;
}
`,
};
