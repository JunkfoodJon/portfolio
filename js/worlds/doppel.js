/**
 * doppel.js — DoppelStream as a world: a screen inside a screen, forever.
 *
 *   0 The Desk              a monitor with a webcam watching it, the paint-to-present
 *                           probe reading its corner's timecode, a gamepad on the desk
 *   1 The Streamer's Screen the game, the host app's latency trace and figures,
 *                           and a browser window showing the stream
 *   2 The Viewer's Screen   the player, and the chat under it
 *   3 The Wire              the frame taken apart: packets forwarded, never
 *                           transcoded — and one packet is the Desk again
 *
 * Every screen is one hop further down the stream, and stamps how far: the
 * measured paint-to-present median times its depth, counted across every loop.
 * Same engraving as every world: line width is the only brightness.
 */

const SCREEN = 1.7778;                       // 16:9

export const DOPPEL = {
  id: 'doppelstream',
  // the colour that blooms as you go deeper: [deep, mid, light, accent] — screen dark, stream orange, signal blue
  palette: ['#0f1b3d', '#ff6a2b', '#ffd9a0', '#3f8cff'],
  // how its words arrive (world.js): arriving a frame at a time, as the stream does
  reveal: 'type',
  // and painted (world.js): titles and figures in a broadcast face, the rest in a clean screen sans
  fonts: { title: ['Audiowide', 400], body: ['Exo 2', 500] },
  // at rest its wash is signal haze, bands rolling up through it like a scan
  wash: { scale: 50, speed: 0.08, flow: [6, 0], warp: 0.6, ripple: 0.25, bands: 0.9, style: 1 },

  // portal / medal: [x, y, r, aspect] — r is the half height, r·aspect the half width
  plates: [
    { title: 'The Desk', note: 'A monitor, watched by its own camera. Scroll into the screen.', portal: [0, 0.05, 0.405, SCREEN], medal: [0, -0.15, 1.0, SCREEN] },
    { title: 'The Streamer’s Screen', note: 'The game, the host app, and the stream in a browser. Scroll into the browser.', portal: [0.62, -0.53, 0.22, SCREEN], medal: [0, 0, 1, SCREEN] },
    { title: 'The Viewer’s Screen', note: 'The player and its chat. Scroll into the picture.', portal: [0, 0.3, 0.4, SCREEN], medal: [0, 0, 1, SCREEN] },
    { title: 'The Wire', note: 'The frame as packets, forwarded and never transcoded. One of them is the desk again.', portal: [0, 0, 0.09, SCREEN], medal: [0, 0, 1, SCREEN] },
  ],

  inscriptions(p) {
    const out = [];
    const hop = p.stats[0].value;                                       // the measured paint-to-present median
    const stamp = (n) => `LIVE  ·  ${(n * hop).toFixed(1)} ms${n ? `  ·  ${n} ${n === 1 ? 'hop' : 'hops'} deep` : ''}`;

    // 0 · the desk: the name on the desk's edge, the overview either side of the stand
    //     (the small print stacked in the middle, inside the face's bevel)
    out.push({ plate: 0, text: p.name, x: 0, y: -0.745, size: 0.08 });
    out.push({ plate: 0, text: p.tagline, x: 0, y: -0.825, size: 0.03, w: 2.6, alpha: 0.82 });
    out.push({ plate: 0, text: [p.status, p.platform].join('   ·   '), x: 0, y: -0.875, size: 0.019, track: 0.16, upper: true, alpha: 0.6 });
    out.push({ plate: 0, text: `Music: ${p.music}`, x: 0, y: -0.915, size: 0.015, track: 0.06, alpha: 0.5 });
    const sentences = p.summary.match(/[^.]+\.\s*/g) || [p.summary];
    const cut = Math.ceil(sentences.length / 2);
    [sentences.slice(0, cut), sentences.slice(cut)].forEach((part, i) => {
      out.push({ plate: 0, text: part.join(' ').trim(), x: i ? 0.6 : -0.6, y: -0.5, size: 0.022, w: 0.48, lh: 1.45, alpha: 0.85 });
    });
    out.push({ plate: 0, text: stamp, x: -1.12, y: -0.335, size: 0.017, track: 0.14, upper: true, alpha: 0.8 });
    out.push({ plate: 0, text: 'paint to present', x: -1.12, y: -0.64, size: 0.014, track: 0.24, upper: true, alpha: 0.55 });

    // 1 · the streamer's screen: the host app carries the figures, the taskbar the stack
    out.push({ plate: 1, text: 'DoppelStream  ·  host', x: -0.6, y: -0.235, size: 0.022, track: 0.12, alpha: 0.7 });
    out.push({ plate: 1, text: 'Viewer  ·  browser', x: 0.62, y: -0.25, size: 0.022, track: 0.12, alpha: 0.7 });
    p.stats.forEach((s, i) => {
      const x = -1.03 + (i % 2) * 0.5, y = -0.52 - Math.floor(i / 2) * 0.16;
      const v = (s.decimals ? s.value.toFixed(s.decimals) : String(Math.round(s.value))) + s.suffix;
      out.push({ plate: 1, text: v, count: s, x: x + 0.14, y, size: 0.05, weight: 200 });
      out.push({ plate: 1, text: s.label, x: x + 0.14, y: y - 0.052, size: 0.0145, track: 0.08, upper: true, alpha: 0.7, w: 0.44 });
    });
    p.stack.forEach(([g, items], i) => {
      out.push({ plate: 1, text: `${g}: ${items.join(' · ')}`, x: -0.95 + i * 0.48, y: -0.95, size: 0.0165, track: 0.04, alpha: 0.75 });
    });
    out.push({ plate: 1, text: stamp, x: 0, y: -0.855, size: 0.019, track: 0.14, upper: true, alpha: 0.75 });

    // 2 · the viewer's screen: the highlights are the chat
    const who = ['first_frame', 'p95_watcher', 'pad_player', 'night_owl'];
    p.highlights.forEach((t, i) => {
      const x = i % 2 ? 0.58 : -0.58, y = -0.36 - Math.floor(i / 2) * 0.3;
      out.push({ plate: 2, text: who[i % who.length], x: x - 0.28, y: y + 0.085, size: 0.017, track: 0.06, alpha: 0.6 });
      out.push({ plate: 2, text: t, x: x + 0.03, y: y - 0.012, size: 0.0205, w: 0.78, lh: 1.4, alpha: 0.88 });
    });
    out.push({ plate: 2, text: stamp, x: 0, y: -0.93, size: 0.019, track: 0.14, upper: true, alpha: 0.75 });

    // 3 · the wire: what is inside, beside the parts it names
    const spots = [[-0.56, 0.44], [0.56, 0.44], [-0.62, -0.7], [0.62, -0.7]];
    p.inside.forEach((s, i) => {
      const [x, y] = spots[i % 4];
      out.push({ plate: 3, text: s.title, x, y: y + 0.11, size: 0.034, face: 'title' });
      out.push({ plate: 3, text: s.text, x, y: y + 0.05, size: 0.026, w: 0.5, lh: 1.38, alpha: 0.85, hang: true });
    });
    out.push({ plate: 3, text: 'encoder', x: -0.95, y: -0.15, size: 0.016, track: 0.24, upper: true, alpha: 0.6 });
    out.push({ plate: 3, text: 'forwarding unit', x: 0, y: -0.31, size: 0.016, track: 0.24, upper: true, alpha: 0.6 });
    out.push({ plate: 3, text: stamp, x: 0, y: -0.93, size: 0.019, track: 0.14, upper: true, alpha: 0.75 });
    return out;
  },

  // on top of the paint (world.js), the words as a stream: while the paint is wet it lands as blocky compression,
  // macroblocks of averaged ink with their edges showing and their colour channels split, built only from paint
  // already laid; as it dries each step is a hop down the stream that halves the blocks, until the plain words
  textFx: /* glsl */ `
float dsInk(vec2 P, float lod) { vec4 t = textureLod(uText, P / uCanvas, lod); return t.a * t.r * smoothstep(0.0, 0.05, t.b / max(t.r, 1e-3)); }
void textFx(vec2 uv, vec2 q, float kpx, inout float txt, inout vec3 tc, inout float clear) {
  vec4 w0 = words(uv);
  float em = max(w0.w, 8.0);
  if (w0.x > 1.2 * em) return;                               // (nothing reaches this far from a word)
  float p = paintAge(uv, w0), m = 1.0 - p;
  float rest = smoothstep(0.9, 1.0, p);
  if (rest >= 1.0 || p < 0.01) return;
  vec2 P = uv * uCanvas;
  // the hops: four of them, each halving the block, a block a letter wide at first (never finer than a large
  // word's, so the first hops read as blocks)
  float hop = min(floor(p * 4.5), 4.0);
  float B = latticeSize(max(w0.w, 26.0)) * exp2(-hop);
  vec2 bc = (floor(P / B) + 0.5) * B;                        // this block's centre
  float lod = log2(max(B, 1.0));
  // the colour split, closing as it lands: red one way, blue the other
  float s = m * 0.6 * em;
  float iR = dsInk(bc + vec2(s, 0.0), lod), iG = dsInk(bc, lod), iB = dsInk(bc - vec2(s, 0.0), lod);
  float gain = 1.0 + 1.8 * m * smoothstep(4.0, 16.0, B);     // (a big block's averaged ink is faint: lift it)
  float blocky = sat(max(iG, max(iR, iB)) * gain);
  iR = sat(iR * gain); iG = sat(iG * gain); iB = sat(iB * gain);
  vec2 f = abs(fract(P / B) - 0.5) * B;
  float edge = (1.0 - smoothstep(0.0, 0.9, B * 0.5 - max(f.x, f.y))) * step(0.02, blocky) * 0.6 * step(3.0, B);   // block seams
  tc = mix(tc, tc * vec3(iR, iG, iB) / max(blocky, 1e-3), 1.0 - rest);
  txt = mix(max(blocky, edge), txt, rest);
}
`,

  glsl: /* glsl */ `
float dsRBox(vec2 p, vec2 b, float r) { return sdBox2(p, b - r) - r; }

// a gamepad at p (its own units: about 0.3 wide); one face button lights at a time — a viewer is playing
void dsPad(vec2 p, float g, float w, inout float v) {
  float body = smin(dsRBox(p, vec2(0.13, 0.04), 0.035),
                    min(length(p - vec2(-0.1, -0.035)) - 0.05, length(p - vec2(0.1, -0.035)) - 0.05), 0.03);
  if (body < 0.0) v = engrave(-body, 0.16, g, 0.006);
  v = max(v, ink(body, w, g));
  vec2 dp = p - vec2(-0.075, 0.004);
  v = max(v, ink(min(sdBox2(dp, vec2(0.024, 0.007)), sdBox2(dp, vec2(0.007, 0.024))), w * 0.8, g));
  float lit = mod(floor(uTime * 2.3), 4.0);
  for (int i = 0; i < 4; i++) {
    float a = float(i) * PI * 0.5;
    float d = length(p - vec2(0.075, 0.004) - vec2(cos(a), sin(a)) * 0.021) - 0.009;
    v = max(v, abs(float(i) - lit) < 0.5 ? 1.0 - smoothstep(-g, g, d) : ink(d, w * 0.8, g));
  }
}

// frames travelling a lane a → b: distance to the nearest (16:9 boxes, aligned with the lane)
float dsPackets(vec2 q, vec2 a, vec2 b, float spacing, float speed, float size) {
  vec2 d = b - a; float L = length(d); vec2 t = d / L;
  vec2 p = q - a; float u = dot(p, t), s = dot(p, vec2(-t.y, t.x));
  if (u < -size * 2.0 || u > L + size * 2.0) return 9.0;
  float m = mod(u - uTime * speed, spacing) - spacing * 0.5;
  float fade = smoothstep(0.0, size * 3.0, u) * smoothstep(L, L - size * 3.0, u);   // born and absorbed at the ends
  return sdBox2(vec2(m, s), vec2(size * 1.7778, size) * fade) + (1.0 - fade) * 0.02;
}

// a latency stamp's ticker, under its words (c: the stamp's centre, hw: half its width): a tick lights per
// frame of the probe's timecode, stepping along the line
void dsTicker(vec2 q, vec2 c, float hw, float g, float w, inout float v) {
  vec2 p = q - c - vec2(0.0, -0.024);
  if (abs(p.y) > 0.012 || abs(p.x) > hw + 0.01) return;
  float k = floor((p.x + hw) / (2.0 * hw) * 20.0 + 0.5), x = p.x + hw - k * 2.0 * hw / 20.0;
  float on = abs(k - mod(floor(uTime * 6.0), 21.0)) < 0.5 ? 1.0 : 0.0;
  float tick = sdSeg(vec2(x, p.y), vec2(0.0, -0.004 - 0.003 * on), vec2(0.0, 0.004 + 0.003 * on));
  v = max(v, ink(tick, w * (0.6 + 0.6 * on), g) * (0.3 + 0.7 * on) * step(k, 20.0) * step(0.0, k));
}

// a signal pulse that follows the pointer: rings out from it, a few pixels to a few tens (sized on screen, so it
// runs on unbroken from one screen into the next)
void dsPulse(vec2 q, float g, float w, inout float v) {
  if (gPtrOn < 0.01) return;
  float d = length(q - gPtr) / g, ph = fract(uTime * 1.1);                // (in pixels)
  float ring = (1.0 - smoothstep(0.0, 1.6, abs(d - 6.0 - 46.0 * ph))) * (1.0 - ph);
  v = max(v, (0.75 * ring + 0.6 * (1.0 - smoothstep(2.0, 3.5, d))) * gPtrOn);
}

// ═══ 0 · THE DESK ══════════════════════════════════════════════════════════

float plate0(vec2 q, float g) {
  float w = lw(0.0026, g);
  vec2 sq = q - vec2(0.0, 0.05);
  float scr = sdBox2(sq, vec2(0.72, 0.405));
  float bez = dsRBox(sq, vec2(0.775, 0.46), 0.03);

  // the room is lit by the screen alone: its light, engraved along its own isolines, fading out
  float v = engrave(bez, 0.025 + 0.2 * exp(-max(bez, 0.0) * 2.6), g, 0.012);
  if (q.y < -0.655) {                                                    // the desk: its edge carries the name
    v = engrave(q.y + 0.003 * (noise3(vec3(q * 14.0, 2.0)) - 0.5), 0.07 + 0.08 * exp(-abs(q.x) * 1.5), g, 0.01);
    v = max(v, max(ink(q.y + 0.655, w, g), max(ink(q.y + 0.68, w * 0.7, g), ink(q.y + 0.968, w, g))));
  }
  // the stand
  float stand = min(dsRBox(q - vec2(0.0, -0.53), vec2(0.04, 0.095), 0.01), dsRBox(q - vec2(0.0, -0.64), vec2(0.27, 0.015), 0.012));
  if (stand < 0.0) v = engrave(q.x, 0.18 + 0.2 * smoothstep(-0.05, 0.05, -q.x), g, 0.007);
  v = max(v, ink(stand, w, g));
  // the monitor: bezel engraved round the screen (the screen itself is the next plate)
  if (bez < 0.0 && scr > 0.0) v = engrave(-bez, 0.14, g, 0.007);
  if (scr < 0.0) v = 0.25;
  v = max(v, max(ink(bez, w, g), ink(scr, w, g)));
  // the webcam on top, watching its own screen; its light blinks while it records
  vec2 cq = q - vec2(0.0, 0.535);
  float cam = dsRBox(cq, vec2(0.085, 0.032), 0.03), lens = length(cq) - 0.02;
  if (cam < 0.0) v = engrave(-cam, 0.18, g, 0.006);
  v = max(v, max(ink(cam, w, g), max(ink(lens, w, g), ink(lens + 0.01, w * 0.8, g))));
  v = max(v, (1.0 - smoothstep(-g, g, length(cq - vec2(0.058, 0.0)) - 0.006)) * (0.35 + 0.65 * step(0.5, fract(uTime * 0.8))));

  // the paint-to-present probe: the timecode the screen paints in its corner, read back beside it frame by frame
  vec2 rq = q - vec2(-1.12, -0.44);
  float box = dsRBox(rq, vec2(0.105, 0.06), 0.014), face = dsRBox(rq - vec2(0.0, 0.006), vec2(0.084, 0.034), 0.006);
  float post = min(sdSeg(rq, vec2(0.0, -0.06), vec2(0.0, -0.15)), sdSeg(rq, vec2(-0.05, -0.155), vec2(0.05, -0.155)));
  if (box < 0.0 && face > 0.0) v = engrave(-box, 0.2, g, 0.006);
  if (face < 0.0) v = engrave(rq.y, 0.04, g, 0.006);
  v = max(v, max(max(ink(box, w, g), ink(face, w * 0.8, g)), ink(post, w * 0.9, g)));
  // the timecode: a frame counter in eight binary cells, the high bit first; a lit cell is a painted one
  float fr = floor(uTime * 6.0);
  for (int i = 0; i < 8; i++) {
    float cell = sdBox2(rq - vec2(-0.0665 + float(i) * 0.019, 0.006), vec2(0.0065, 0.016));
    float bit = mod(floor(fr / exp2(float(7 - i))), 2.0);
    v = max(v, bit > 0.5 ? 1.0 - smoothstep(-g, g, cell) : ink(cell, w * 0.6, g) * 0.6);
  }
  // the read-back line, dashed, with a flash running from the screen's corner into the probe
  vec2 l0 = vec2(-1.015, -0.42), l1 = vec2(-0.72, -0.355);
  vec2 ld = l1 - l0; float lt = clamp(dot(q - l0, ld) / dot(ld, ld), 0.0, 1.0);
  float sight = sdSeg(q, l0, l1);
  float flash = exp(-pow((lt - 1.0 + fract(uTime * 0.45)) * 9.0, 2.0));
  v = max(v, ink(sight, w * 0.7, g) * (step(0.5, fract(lt * 9.0)) * 0.45 + flash * 0.8));

  // a gamepad on the desk: the viewer's hands
  dsPad(q - vec2(1.08, -0.58), g, w, v);
  dsTicker(q, vec2(-1.12, -0.335), 0.13, g, w, v);
  dsPulse(q, g, w, v);
  return v;
}

// ═══ 1 · THE STREAMER'S SCREEN ═════════════════════════════════════════════

// the game being streamed: a road to a sunset, in window-local units (h = half height)
float dsGame(vec2 p, float g, float h) {
  float hz = 0.12 * h;
  float v;
  if (p.y > hz) {
    float ridge = hz + h * (0.05 + 0.13 * fbm3(vec3(p.x / h * 2.2, 3.0, 0.0)));
    float sun = length(p - vec2(0.32 * h, hz + 0.16 * h)) - 0.1 * h;
    v = engrave(p.y, 0.05 + 0.4 * exp(-(p.y - hz) / h * 4.0), g, 0.006);   // sky: brighter at the horizon
    if (sun < 0.0) v = engrave(-sun, 0.75, g, 0.004);
    if (p.y < ridge) v = engrave(p.x * 0.5 + p.y, 0.06, g, 0.006);       // the mountains, dark against it
    v = max(v, ink(p.y - ridge, g * 0.9, g) * 0.8);
  } else {
    float z = h / (hz - p.y + 0.02 * h);                                 // depth along the ground
    float road = abs(p.x) - (hz - p.y) * 1.15;
    v = engrave(z * 0.02, 0.1, g * 0.02 * z * z / h, 0.006);            // ground ruled in perspective
    if (road < 0.0) {
      v = 0.03;
      float dash = step(0.5, fract(z * 0.35 + uTime * 1.6));
      v = max(v, ink(p.x, g * 1.2 + (hz - p.y) * 0.02, g) * dash);
    }
    v = max(v, ink(road, g * 1.1, g));
    vec2 cq = p - vec2(0.0, -0.72 * h);                                  // the car
    float car = min(dsRBox(cq, vec2(0.13, 0.035) * h, 0.02 * h), dsRBox(cq - vec2(0.0, 0.045 * h), vec2(0.07, 0.03) * h, 0.02 * h));
    if (car < 0.0) v = engrave(cq.y, 0.4, g, 0.003);
    v = max(v, ink(car, g * 1.1, g));
  }
  return v;
}

// a window: frame, title bar and its three buttons; returns the frame's distance
float dsWindow(vec2 p, vec2 b, float g, float w, inout float v) {
  float f = sdBox2(p, b);
  float bar = p.y - (b.y - 0.06);
  if (f < 0.0 && bar > 0.0) {
    v = engrave(p.x, 0.16, g, 0.005);
    for (int i = 0; i < 3; i++) v = max(v, ink(length(p - vec2(b.x - 0.035 - float(i) * 0.035, b.y - 0.03)) - 0.009, w * 0.8, g));
  }
  v = max(v, max(ink(f, w, g), ink(bar, w * 0.7, g) * step(f, 0.0)));
  return f;
}

float plate1(vec2 q, float g) {
  float w = lw(0.0022, g);
  float v = engrave(q.x * 0.7071 + q.y * 0.7071, 0.016, g, 0.012);      // the wallpaper: a dark diagonal
  if (q.y < -0.9) v = engrave(q.y, 0.1, g, 0.006);                       // the taskbar
  v = max(v, ink(q.y + 0.9, w, g));

  // the game, full width behind everything
  vec2 gc = q - vec2(0.0, 0.42);
  if (sdBox2(gc, vec2(1.1, 0.48)) < 0.0) v = dsGame(gc, g, 0.48 - 0.06);
  dsWindow(gc, vec2(1.1, 0.48), g, w, v);

  // the host app: the latency trace, live, over its median
  vec2 hc = q - vec2(-0.6, -0.5);
  float hw = sdBox2(hc, vec2(0.58, 0.3));
  if (hw < 0.0) {
    v = engrave(hc.y, 0.02, g, 0.008);
    vec2 gp = hc - vec2(0.29, -0.02);                                    // the trace, right half
    if (abs(gp.x) < 0.26 && abs(gp.y) < 0.2) {
      float lat = -0.06 + 0.05 * noise3(vec3(gp.x * 18.0 - uTime * 1.5, 1.0, 0.0)) + 0.12 * pow(noise3(vec3(gp.x * 6.0 - uTime * 0.7, 5.0, 0.0)), 7.0) * 3.0;
      v = max(v, ink(gp.y - lat, w * 0.9, g));
      v = max(v, ink(gp.y + 0.06, w * 0.6, g) * step(0.5, fract(gp.x * 30.0)) * 0.6);   // the median, dashed
      if (gp.y < lat) v = max(v, engrave(gp.x, 0.12, g, 0.006));
    }
    v = max(v, ink(hc.x - 0.02, w * 0.6, g) * step(hc.y, 0.24) * 0.5);   // the figures' column
  }
  dsWindow(hc, vec2(0.58, 0.3), g, w, v);

  // the viewer's browser: its page is the next plate
  vec2 bc = q - vec2(0.62, -0.47);
  dsWindow(bc, vec2(0.41, 0.28), g, w, v);
  if (sdBox2(q - vec2(0.62, -0.53), vec2(0.391, 0.22)) < 0.0) v = 0.22;
  v = max(v, ink(sdBox2(q - vec2(0.62, -0.53), vec2(0.391, 0.22)), w, g));

  for (int i = 0; i < 5; i++) v = max(v, ink(dsRBox(q - vec2(-1.62 + float(i) * 0.07, -0.95), vec2(0.024), 0.007), w * 0.7, g));
  dsTicker(q, vec2(0.0, -0.855), 0.17, g, w, v);
  dsPulse(q, g, w, v);
  return v;
}

// ═══ 2 · THE VIEWER'S SCREEN ═══════════════════════════════════════════════

float plate2(vec2 q, float g) {
  float w = lw(0.0022, g);
  float v = engrave(q.y, 0.012, g, 0.012);                               // the page
  // browser chrome: a tab, a toolbar and an address field (left blank: no addresses)
  if (q.y > 0.8) v = engrave(q.y, 0.12, g, 0.006);
  v = max(v, max(ink(q.y - 0.8, w, g), ink(q.y - 0.92, w * 0.7, g)));
  float tab = dsRBox(q - vec2(-0.55, 0.96), vec2(0.3, 0.05), 0.02);
  if (tab < 0.0) v = engrave(q.y, 0.25, g, 0.004);
  v = max(v, ink(tab, w, g));
  vec2 sq = rot(-spinAngle(50.0, uTime)) * (q - vec2(-0.79, 0.96));     // the tab's loading spinner: an arc running round
  float sa = atan(sq.y, sq.x);
  v = max(v, ink(abs(length(sq) - 0.017), w * 1.1, g) * (0.15 + 0.85 * smoothstep(-0.2, 1.8, sa)));
  float addr = dsRBox(q - vec2(0.05, 0.86), vec2(0.62, 0.028), 0.028);
  v = max(v, ink(addr, w, g));
  v = max(v, ink(length(q - vec2(-0.53, 0.86)) - 0.01, w * 0.8, g));

  // the player: the picture is the next plate; under it the controls, live at the edge
  vec2 pq = q - vec2(0.0, 0.3);
  float pic = sdBox2(pq, vec2(0.711, 0.4));
  if (pic < 0.0) v = 0.22;
  v = max(v, ink(pic, w, g));
  float bar = sdSeg(q, vec2(-0.6, -0.15), vec2(0.62, -0.15));
  v = max(v, ink(bar, w * 1.3, g));
  float live = length(q - vec2(0.64, -0.15)) - 0.012;
  v = max(v, (1.0 - smoothstep(-g, g, live)) * (0.5 + 0.5 * step(0.5, fract(uTime * 0.9))));
  vec2 tq = q - vec2(-0.67, -0.15);
  v = max(v, ink(max(abs(tq.y) * 1.7 + tq.x - 0.012, -tq.x - 0.016), w, g));   // play
  dsPad((q - vec2(0.0, -0.205)) * 2.6, g * 2.6, w * 2.6, v);

  // the chat: four bubbles under the player
  for (int i = 0; i < 4; i++) {
    vec2 c = vec2(i == 1 || i == 3 ? 0.58 : -0.58, -0.36 - float(i / 2) * 0.3);
    float bub = dsRBox(q - c, vec2(0.5, 0.125), 0.03);
    if (bub < 0.0) v = engrave(-bub, 0.06, g, 0.008);
    v = max(v, ink(bub, w, g));
    v = max(v, ink(length(q - c - vec2(-0.43, 0.085)) - 0.022, w * 0.8, g));   // the avatar
  }
  dsTicker(q, vec2(0.0, -0.93), 0.17, g, w, v);
  dsPulse(q, g, w, v);
  return v;
}

// ═══ 3 · THE WIRE ══════════════════════════════════════════════════════════

float plate3(vec2 q, float g) {
  float w = lw(0.0018, g);
  float r = length(q);
  // ruled ground, and the forwarding unit's light round the centre
  float v = engrave(q.y, 0.01 + 0.13 * exp(-r * 2.6), g, 0.012);

  // the encoder, its lane in, three lanes out to viewers, and the input lane back
  vec2 enc = q - vec2(-0.95, 0.0);
  float eb = dsRBox(enc, vec2(0.14, 0.1), 0.02);
  if (eb < 0.0) v = engrave(-eb, 0.22, g, 0.006);
  v = max(v, ink(eb, w, g));
  vec2 hubIn = vec2(-0.27, 0.0);
  v = max(v, ink(sdSeg(q, vec2(-0.81, 0.0), hubIn), w * 0.6, g) * 0.5);
  float pk = dsPackets(q, vec2(-0.81, 0.0), hubIn, 0.11, 0.16, 0.022);
  for (int i = 0; i < 3; i++) {
    float y = (float(i) - 1.0) * 0.32;
    vec2 a = vec2(cos((float(i) - 1.0) * 0.6), sin((float(i) - 1.0) * 0.6)) * 0.27, b = vec2(0.78, y);
    v = max(v, ink(sdSeg(q, a, b), w * 0.6, g) * 0.5);
    vec2 ld = normalize(b - a); float lu = dot(q - a, ld), ls = dot(q - a, vec2(-ld.y, ld.x));   // the signal: a carrier wave travelling out
    float env = smoothstep(0.0, 0.06, lu) * smoothstep(length(b - a), length(b - a) - 0.06, lu);
    v = max(v, ink(ls - 0.011 * env * sin(lu * 90.0 - uTime * 7.0), w * 0.5, g) * 0.35 * env);
    pk = min(pk, dsPackets(q, a, b, 0.11, 0.16, 0.022));                 // the same packets, each viewer its own copy
    vec2 vq = q - vec2(0.88, y);
    float mon = sdBox2(vq, vec2(0.1, 0.056));
    v = max(v, max(ink(mon, w, g), ink(sdSeg(vq, vec2(0.0, -0.056), vec2(0.0, -0.085)), w, g)));
    if (mon < 0.0) v = max(v, engrave(vq.y, 0.2, g, 0.004));
  }
  if (pk < 0.0) v = engrave(q.x, 0.4, g, 0.003);
  v = max(v, ink(pk, w, g));
  float back = abs(q.y + 0.46) ;                                        // the input lane, home to the encoder
  if (q.x > -0.95 && q.x < 0.88) {
    v = max(v, ink(back, w * 0.6, g) * step(0.5, fract(q.x * 16.0)) * 0.45);
    float dot2 = length(vec2(mod(q.x + uTime * 0.22, 0.16) - 0.08, q.y + 0.46)) - 0.008;
    v = max(v, 1.0 - smoothstep(-g, g, dot2));
  }
  v = max(v, ink(sdSeg(q, vec2(-0.95, -0.46), vec2(-0.95, -0.1)), w * 0.6, g) * 0.45);
  v = max(v, ink(sdSeg(q, vec2(0.88, -0.46), vec2(0.88, -0.405)), w * 0.6, g) * 0.45);

  // the forwarding unit: rings that turn, ticks, and the frame under inspection (the next plate)
  float a = atan(q.y, q.x);
  v = max(v, max(ink(r - 0.27, w, g), ink(r - 0.2, w * 0.7, g)));
  if (r > 0.2 && r < 0.27) {
    float k = floor((a + uTime * 0.2) / TAU * 48.0 + 0.5);
    float tick = abs(a + uTime * 0.2 - k * TAU / 48.0) * r;
    v = max(v, ink(tick, w * 0.7, g) * step(mod(k, 4.0) < 0.5 ? 0.2 : 0.235, r));
  }
  float la = mod(a - spinAngle(20.0, uTime), TAU);                      // loading: a bright arc running round the outer ring
  v = max(v, ink(r - 0.27, w * 1.8, g) * smoothstep(0.0, 1.4, la) * step(la, 1.6));
  float frame = sdBox2(q, vec2(0.16, 0.09));
  if (frame < 0.0) v = 0.25;
  v = max(v, max(ink(frame, w, g), ink(sdBox2(q, vec2(0.172, 0.102)), w * 0.6, g)));

  // the measuring rig's trace above: a flash, seen
  vec2 sc = q - vec2(0.0, 0.58);
  float scope = sdBox2(sc, vec2(0.24, 0.1));
  if (scope < 0.0) {
    v = engrave(sc.y, 0.03, g, 0.006);
    float x = fract(sc.x / 0.48 + 0.5 - uTime * 0.25);
    float y = mix(-0.05, 0.05, smoothstep(0.45, 0.47, x) * (1.0 - smoothstep(0.75, 0.77, x)));
    v = max(v, ink(sc.y - y, w, g));
    v = max(v, ink(sc.x, w * 0.5, g) * 0.3);
  }
  v = max(v, ink(scope, w, g));
  // the server that holds it all together
  vec2 rq = q - vec2(0.0, -0.64);
  float rack = sdBox2(rq, vec2(0.11, 0.12));
  if (rack < 0.0) {
    v = engrave(rq.x, 0.08, g, 0.005);
    v = max(v, ink(abs(fract(rq.y / 0.06) - 0.5) * 0.06, w * 0.6, g));
    vec2 led = vec2(rq.x - 0.075, (fract(rq.y / 0.06) - 0.5) * 0.06);
    float on = step(0.5, hash3(vec3(floor(rq.y / 0.06), floor(uTime * 3.0), 1.0)));
    v = max(v, (1.0 - smoothstep(-g, g, length(led) - 0.007)) * (0.3 + 0.7 * on));
  }
  v = max(v, ink(rack, w, g));
  dsTicker(q, vec2(0.0, -0.93), 0.17, g, w, v);
  dsPulse(q, g, w, v);
  return v;
}
`,
};
