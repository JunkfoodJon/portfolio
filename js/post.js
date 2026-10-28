/**
 * post.js — HDR scene target → bloom chain → one composite pass to the screen.
 *
 * Written against core three only (no addons) so the site runs from the vendored
 * copy with no network. The page background is opaque void, which also removes
 * the alpha-through-bloom problem the previous build had.
 *
 * Composite does, in order: radial warp (used during fly-ins), chromatic fringe,
 * additive bloom, vignette, ACES tone map, sRGB encode, film grain.
 */

import * as THREE from 'three';

const LEVELS = 5;
const BLUR_W = [0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216];

const FS_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BRIGHT_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tSrc; uniform float uThreshold; uniform float uKnee;
  varying vec2 vUv;
  void main() {
    vec4 s = texture2D(tSrc, vUv);
    vec3 c = s.rgb;
    float l = max(c.r, max(c.g, c.b));
    float soft = clamp(l - uThreshold + uKnee, 0.0, 2.0 * uKnee);
    soft = soft * soft / (4.0 * uKnee + 1e-4);
    float w = max(soft, l - uThreshold) / max(l, 1e-4);
    gl_FragColor = vec4(c * w * clamp(s.a, 0.0, 1.0), 1.0);     // (the scene's alpha: what may glow, see the face shader)
  }
`;

// The same nine taps in five fetches: each pair of neighbours (1 and 2, 3 and 4 texels out) is read with one linear
// fetch placed between them by their weights, which the texture filter blends back into the two
const PAIRS = [[1, 2], [3, 4]].map(([a, b]) => [(a * BLUR_W[a] + b * BLUR_W[b]) / (BLUR_W[a] + BLUR_W[b]), BLUR_W[a] + BLUR_W[b]]);
const BLUR_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tSrc; uniform vec2 uDir;
  varying vec2 vUv;
  void main() {
    vec3 s = texture2D(tSrc, vUv).rgb * ${BLUR_W[0].toFixed(7)};
    ${PAIRS.map(([o, w]) => `
    s += texture2D(tSrc, vUv + uDir * ${o.toFixed(7)}).rgb * ${w.toFixed(7)};
    s += texture2D(tSrc, vUv - uDir * ${o.toFixed(7)}).rgb * ${w.toFixed(7)};`).join('')}
    gl_FragColor = vec4(s, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D tScene;
  uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tB4;
  uniform float uStrength; uniform float uTime; uniform float uWarp; uniform float uAspect; uniform float uFringe;
  uniform vec3 uGlow;
  varying vec2 vUv;

  float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

  void main() {
    vec2 d = vUv - 0.5;
    vec3 sc;
    // words at rest (the scene's alpha below 1, see the face shader) take neither the fringe nor the vignette:
    // their edges stay one colour and they keep their brightness out to the screen's edge
    float words;
    if (uWarp > 0.002) {
      sc = vec3(0.0);
      for (int i = 0; i < 7; i++) {
        float s = float(i) / 6.0;
        sc += texture2D(tScene, 0.5 + d * (1.0 - uWarp * s)).rgb;
      }
      sc /= 7.0;
      words = 1.0 - clamp(texture2D(tScene, vUv).a, 0.0, 1.0);
    } else {
      float f = uFringe * dot(d, d);
      vec4 r = texture2D(tScene, vUv - d * f), g = texture2D(tScene, vUv), b = texture2D(tScene, vUv + d * f);
      words = 1.0 - clamp(min(g.a, min(r.a, b.a)), 0.0, 1.0);   // (a letter beside this pixel would fringe onto it)
      sc = mix(vec3(r.r, g.g, b.b), g.rgb, words);
    }

    vec3 bloom = texture2D(tB0, vUv).rgb * 0.55 + texture2D(tB1, vUv).rgb * 0.75
               + texture2D(tB2, vUv).rgb * 0.9  + texture2D(tB3, vUv).rgb * 1.0
               + texture2D(tB4, vUv).rgb * 1.1;
    vec3 col = sc + bloom * uStrength;

    // soft pool of the focused hue behind everything
    float pool = exp(-dot(d * vec2(uAspect, 1.0), d * vec2(uAspect, 1.0)) * 5.0);
    col += uGlow * pool * 0.035;

    float vig = 1.0 - smoothstep(0.25, 1.05, length(d * vec2(uAspect * 0.8, 1.0)));
    col *= mix(mix(0.55, 1.0, vig), 1.0, words);

    col = aces(col * 1.05);
    col = pow(col, vec3(1.0 / 2.2));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Post {
  constructor(renderer) {
    this.renderer = renderer;
    this.type = (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'))
      ? THREE.HalfFloatType : THREE.UnsignedByteType;

    this.quad = new THREE.Mesh(new THREE.BufferGeometry());
    // single oversize triangle with uv
    const g = this.quad.geometry;
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad.frustumCulled = false;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    const base = { vertexShader: FS_VERT, depthTest: false, depthWrite: false, toneMapped: false };
    this.brightMat = new THREE.ShaderMaterial({ ...base, fragmentShader: BRIGHT_FRAG, uniforms: { tSrc: { value: null }, uThreshold: { value: 0.9 }, uKnee: { value: 0.5 } } });
    this.blurMat = new THREE.ShaderMaterial({ ...base, fragmentShader: BLUR_FRAG, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } } });
    this.compMat = new THREE.ShaderMaterial({
      ...base, fragmentShader: COMPOSITE_FRAG,
      uniforms: {
        tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, tB4: { value: null },
        uStrength: { value: 0.85 }, uTime: { value: 0 }, uWarp: { value: 0 }, uAspect: { value: 1 }, uFringe: { value: 0.012 },
        uGlow: { value: new THREE.Color(0x000000) },
      },
    });

    this.sceneRT = null;
    this.blurRT = [];
    this.setSize(1, 1);
  }

  _rt(w, h, samples = 0) {
    return new THREE.WebGLRenderTarget(Math.max(1, w | 0), Math.max(1, h | 0), {
      type: this.type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: false, samples,
    });
  }

  /**
   * w,h are drawing-buffer pixels; ratio is the renderer's pixel ratio (from 1.5 the supersampling is the
   * antialiasing) and perScreen the buffer pixels per screen pixel.
   */
  setSize(w, h, ratio = 1, perScreen = 1) {
    this.w = w; this.h = h; this.ratio = ratio; this.perScreen = perScreen;
    this._build();
  }

  _build() {
    this.sceneRT?.dispose();
    this.blurRT.forEach(([a, b]) => { a.dispose(); b.dispose(); });
    // no multisampling and no depth: the crystal's borders antialias themselves, and it is convex (see its borders and
    // setFocus), so the target is the scene's colour alone
    this.sceneRT = this._rt(this.w, this.h);
    // the glow is sized in screen pixels, not the buffer's: supersampled, it starts that much further down
    const k = 2 * Math.max(1, this.perScreen);
    this.brightRT = this._rt(this.w / k, this.h / k);
    this.blurRT = [];
    for (let i = 0; i < LEVELS; i++) {
      const lw = this.w / (k * Math.pow(2, i)), lh = this.h / (k * Math.pow(2, i));
      this.blurRT.push([this._rt(lw, lh), this._rt(lw, lh)]);
    }
  }

  get target() { return this.sceneRT; }

  _pass(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.cam);
  }

  /** Call after the scene has been rendered into this.target. */
  composite({ time = 0, warp = 0, strength = 0.85, glow = null, threshold = 0.9 }) {
    const r = this.renderer;
    this.brightMat.uniforms.tSrc.value = this.sceneRT.texture;
    this.brightMat.uniforms.uThreshold.value = threshold;
    this._pass(this.brightMat, this.brightRT);

    let src = this.brightRT;
    for (let i = 0; i < LEVELS; i++) {
      const [a, b] = this.blurRT[i];
      const lw = a.width, lh = a.height;
      this.blurMat.uniforms.tSrc.value = src.texture;
      this.blurMat.uniforms.uDir.value.set(1 / lw, 0);
      this._pass(this.blurMat, a);
      this.blurMat.uniforms.tSrc.value = a.texture;
      this.blurMat.uniforms.uDir.value.set(0, 1 / lh);
      this._pass(this.blurMat, b);
      src = b;
    }

    const u = this.compMat.uniforms;
    u.tScene.value = this.sceneRT.texture;
    for (let i = 0; i < LEVELS; i++) u['tB' + i].value = this.blurRT[i][1].texture;
    u.uStrength.value = strength;
    u.uTime.value = time % 100;
    u.uWarp.value = warp;
    u.uAspect.value = this.w / this.h;
    if (glow) u.uGlow.value.copy(glow);
    this._pass(this.compMat, null);
    r.setRenderTarget(null);
  }

  dispose() {
    this.sceneRT?.dispose(); this.brightRT?.dispose();
    this.blurRT.forEach(([a, b]) => { a.dispose(); b.dispose(); });
    this.brightMat.dispose(); this.blurMat.dispose(); this.compMat.dispose();
    this.quad.geometry.dispose();
  }
}
