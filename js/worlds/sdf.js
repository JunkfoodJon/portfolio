/**
 * sdf.js — the GLSL every world is drawn with: distance primitives and the
 * engraving that turns them into white line work.
 *
 * The primitives are the generic ones from the Choir of Souls renderer
 * (Inigo Quilez's reference forms, smooth min/max, an integer hash and value
 * noise) plus a few 2D shapes for flat plates, the standard chamfer, groove and
 * pipe blends, and small 2D effects for the words' distance field (warp, bevel
 * light, rings, dissolve). No creature or model code from
 * the game is shipped here: every world is authored for this site.
 *
 * The look is "isoline engraving": scratchboard, white on black. Brightness is
 * never painted as grey — it is the WIDTH of engraved lines, and the lines
 * follow a field's own isolines. Line spacing is chosen per pixel in octaves,
 * so as you zoom the lines split and new, finer ones appear: the engraving
 * never runs out of detail and never shimmers below a few pixels.
 */

export const SDF_GLSL = /* glsl */ `
#define PI  3.14159265
#define TAU 6.28318531

float sat(float x) { return clamp(x, 0.0, 1.0); }

// ── 3D primitives ────────────────────────────────────────────────────────────
float sdSphere(vec3 p, float r) { return length(p) - r; }
float sdEllipsoid(vec3 p, vec3 r) { float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / k1; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) { vec3 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h) - r; }
// tapered capsule: radius r1 at a, r2 at b
float sdRound(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a; float l2 = dot(ba, ba); float rr = r1 - r2; float a2 = l2 - rr * rr; float il2 = 1.0 / l2;
  vec3 pa = p - a; float y = dot(pa, ba); float z = y - l2; vec3 xv = pa * l2 - ba * y; float x2 = dot(xv, xv);
  float y2 = y * y * l2; float z2 = z * z * l2; float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float sdBox(vec3 p, vec3 b, float r) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r; }
float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
float smax(float a, float b, float k) { return -smin(-a, -b, k); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec2 rotAt(vec2 p, vec2 c, float a) { return c + rot(a) * (p - c); }       // p turned as rot(a) turns, about c
float spinAngle(float rpm, float t) { return t * rpm * (TAU / 60.0); }     // the angle turned in t seconds at rpm revolutions a minute
// gears whose teeth sit at ph + k·TAU/n: one of n2 teeth driven by one of n1 turns gearRatio(n1, n2) as fast (the
// other way), and meshPhase is its phase when it sits in direction phi from the driver, so the teeth interlock
float gearRatio(float n1, float n2) { return -n1 / n2; }
float meshPhase(float ph1, float n1, float n2, float phi) { return phi + PI - PI / n2 - (phi - ph1) * gearRatio(n1, n2); }

// ── hashing and noise (exact integer hash: the same grain on every GPU) ─────
float hashMix(uint h) {
  h ^= h >> 15u; h *= 0x2c1b3c6du; h ^= h >> 12u;
  return float(h >> 8u) * (1.0 / 16777216.0);
}
float hash3(vec3 p) {
  uvec3 q = uvec3(ivec3(floor(p * 1024.0 + 0.5)));
  return hashMix(q.x * 73856093u ^ q.y * 19349663u ^ q.z * 83492791u);
}
// The same as hashing its eight corners one by one, bit for bit, at a third of the multiplies: a corner one step on is
// 1024 further on hash3's grid, so each axis's term for it is the near corner's plus 1024 times that axis's constant
// (wrapping as the products themselves do). Exact while the lattice stays within ±16384 (the grid then holds every step)
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  uvec3 q = uvec3(ivec3(floor(i * 1024.0 + 0.5)));
  uint x0 = q.x * 73856093u, y0 = q.y * 19349663u, z0 = q.z * 83492791u;
  uint x1 = x0 + 1024u * 73856093u, y1 = y0 + 1024u * 19349663u, z1 = z0 + 1024u * 83492791u;
  return mix(mix(mix(hashMix(x0 ^ y0 ^ z0), hashMix(x1 ^ y0 ^ z0), f.x), mix(hashMix(x0 ^ y1 ^ z0), hashMix(x1 ^ y1 ^ z0), f.x), f.y),
             mix(mix(hashMix(x0 ^ y0 ^ z1), hashMix(x1 ^ y0 ^ z1), f.x), mix(hashMix(x0 ^ y1 ^ z1), hashMix(x1 ^ y1 ^ z1), f.x), f.y), f.z);
}
// (a loop the compiler cannot unroll, as ShadowMan's windows: unrolled at every call, Windows' D3D compiler took
// seconds more over a world's first compile, Choir's nearly half of it; the pixels are the same)
float fbm3(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4 + int(min(uTime, 0.0)); i++) { s += a * noise3(p); p *= 2.03; a *= 0.5; } return s; }

// ── 2D shapes ────────────────────────────────────────────────────────────────
float sdCircle(vec2 p, float r) { return length(p) - r; }
float sdBox2(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// vertical vesica (an almond): two circles of radius r centred at (±d, 0)
float sdVesica(vec2 p, float r, float d) {
  p = abs(p); float b = sqrt(r * r - d * d);
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0.0, b)) : length(p - vec2(-d, 0.0)) - r;
}
// a pointed (equilateral) gothic arch: |x| < w from the sill up to the spring line, then two arcs of radius 2w
float sdArch(vec2 p, float w, float spring, float sill) {
  float rect = max(abs(p.x) - w, max(sill - p.y, p.y - spring));
  float top = max(max(length(p - vec2(w, spring)), length(p - vec2(-w, spring))) - 2.0 * w, spring - p.y);
  return min(rect, top);
}

// ── blends (the standard forms: chamfer, groove and pipe joins) ─────────────
float opChamfer(float a, float b, float r) { return min(min(a, b), (a + b - r) * 0.70710678); }   // a 45° bevel r wide where a and b meet
float opGroove(float a, float b, float ra, float rb) { return max(a, min(a + ra, rb - abs(b))); }  // cut ra deep, rb half-wide, along b = 0
float opPipe(float a, float b, float r) { return length(vec2(a, b)) - r; }                        // a tube of radius r where a and b cross

// ── 2D effects on a distance field (the words' shapes: see world.js) ─────────
// A drifting domain warp: an offset of about ±1 that flows slowly with t.
vec2 warp2(vec2 p, float t) { return vec2(noise3(vec3(p, t)), noise3(vec3(p + 17.3, t + 4.1))) * 2.0 - 1.0; }
// The normal of a bevel w wide raised inside d < 0, from d and its gradient (per unit of d); slope scales its height.
vec3 bevelNormal(float d, vec2 grad, float w, float slope) {
  float x = sat(-d / w);
  return normalize(vec3(grad * 6.0 * x * (1.0 - x) / w * slope, 1.0));
}
// Light on a raised surface: wrapped diffuse from l plus a rim where it turns away from the viewer.
float shade(vec3 n, vec3 l, float rimPow) { return 0.5 + 0.5 * dot(n, normalize(l)) + 0.35 * pow(1.0 - n.z, rimPow); }
// Rings along a distance field every h, travelling outward by phase; half-width w, anti-aliased over g (all in d's units).
float rings(float d, float h, float phase, float w, float g) {
  float f = abs(fract((d - phase) / h + 0.5) - 0.5) * h;
  return 1.0 - smoothstep(w - g, w + g, f);
}
// A dissolve by noise n (0–1) as p runs 1 → 0: x = how much is kept, y = the glowing edge e wide where it is going.
vec2 dissolve(float n, float p, float e) {
  float th = (1.0 - p) * (1.0 + e) - e, x = smoothstep(th, th + e * 0.5, n);
  return vec2(x, x * (1.0 - smoothstep(th + e * 0.5, th + e * 1.5, n)) * sat((1.0 - p) * 10.0));
}

// ── engraving ────────────────────────────────────────────────────────────────
// A cut line along d = 0, half-width w (plate units), anti-aliased over one pixel g.
float ink(float d, float w, float g) { return 1.0 - smoothstep(w - g, w + g, abs(d)); }
// A line's half-width: its drawn size, but never under ~1.4 px nor over ~3.6 px wide, so zooming never fattens it.
float lw(float w, float g) { return clamp(w, 0.7 * g, 1.8 * g); }

// Halftone lines: isolines of f every h, each as wide as lum asks (0 none, 1 solid); g = f per pixel.
float hatchAt(float f, float lum, float h, float g) {
  float tri = abs(fract(f / h + 0.5) - 0.5) * 2.0;
  float c = clamp((lum - tri) * h * 0.5 / g + 0.5, 0.0, 1.0) * min(1.0, lum * h / g);   // a line thinner than a pixel dims, never stays half lit
  return mix(lum, c, smoothstep(2.0 * g, 4.0 * g, h));
}
// The same, with the spacing chosen in octaves of h0 so lines stay 7–28 px apart at any zoom.
float engrave(float f, float lum, float g, float h0) {
  float lev = clamp(log2(g * 14.0 / h0), -24.0, 24.0);
  float il = floor(lev), t = lev - il;
  float h = h0 * exp2(il);
  return mix(hatchAt(f, lum, h, g), hatchAt(f, lum, 2.0 * h, g), smoothstep(0.0, 1.0, t));
}
// Plain isolines of a field (constant width), finer ones fading in as you zoom.
float isolines(float f, float h0, float g, float w) {
  float lev = clamp(log2(g * 18.0 / h0), -24.0, 24.0);
  float il = floor(lev), t = lev - il;
  float h = h0 * exp2(il);
  float d1 = abs(fract(f / h + 0.5) - 0.5) * h;
  float d2 = abs(fract(f / (2.0 * h) + 0.5) - 0.5) * 2.0 * h;
  float ww = max(w, g * 0.7);
  return max(ink(d1, ww, g) * (1.0 - t), ink(d2, ww, g));
}
`;
