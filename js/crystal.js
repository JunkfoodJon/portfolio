/**
 * crystal.js — the scene: one white, glowing octahedron in a black void.
 *
 * Nothing else is in the scene. From afar the crystal is a glow; as the camera
 * approaches a face its "reveal" rises, the glow drains out of the glass and the
 * panel (emblem, then the information wall) resolves.
 *
 * The crystal is built by hand (6 vertices, 8 faces) with the same winding as
 * three's OctahedronGeometry. Every face maps its textures the same way:
 *
 *        v2 (apex)  (0.50, 0.916)
 *       /          \
 *      v0 ———————— v1
 *   (0.02,0.085)  (0.98,0.085)
 *
 * The triangle is mapped isometrically; its incircle is centred at (0.5, 0.362)
 * with radius 0.277. emblems.js and wall.js author to that circle.
 */

import * as THREE from 'three';
import { Post } from './post.js';

export const R           = 2.0;
export const OCTA_Y      = 0.05;
export const FOV         = 50;
export const FACE_PLANE  = R / Math.sqrt(3);                 // origin → face centre
export const TRI_EDGE    = R * Math.SQRT2;
export const TRI_HEIGHT  = TRI_EDGE * Math.sqrt(3) / 2;
export const INRADIUS    = TRI_HEIGHT / 3;                   // 1 wall unit, in world units
const K_FOV = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// Quality: the scene is drawn at MAX_RATIO × the CSS pixels: on a desktop the screen's own density × 1.25 (a
// little supersampling), at most 2 (a 1080p screen at DPR 1.1 gets 1.4, a 4K or Retina one 2), and the
// frame-time governor in main.js steps down from there. Plates go up to 3072 only where a face can fill a
// screen of 1440 device pixels or more (2048 still covers a 1080p one at full approach); ?ultra lets them
// grow larger still (PlateRenderer.resize)
// A phone or tablet (a mobile browser, iPadOS posing as a Mac, or a coarse pointer on a small screen) has a fraction
// of a desktop's GPU and memory: plates up to 1536 (1024 where Android reports ≤ 4 GB), and no large emblem targets
// (emblems.js). Close to a face a plate is drawn straight onto the screen's pixels (PlateRenderer.render), fewer than its
// square target held, and that buys a phone its screen's own density up to 2 (most are 2–3; the letters read sharp
// there), from 1.5 before; 1 where Android reports ≤ 4 GB
const UA = navigator.userAgent;
export const MOBILE    = /Android|iPhone|iPad|iPod|Mobile/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1)
                      || (matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820);
const LOW              = MOBILE && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4;
const DPR              = Math.max(window.devicePixelRatio || 1, 1);
export const MAX_RATIO = MOBILE ? (LOW ? 1 : Math.min(2, Math.max(1.5, DPR))) : Math.min(2, Math.round(DPR * 1.25 * 20) / 20);
export const PLATE_CAP = MOBILE ? (LOW ? 1024 : 1536) : Math.max(screen.height, innerHeight) * DPR >= 1440 ? 3072 : 2048;
export const ULTRA     = new URLSearchParams(location.search).has('ultra');

const VERTS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map((v) => v.map((c) => c * R));
const FACES = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]];
const FACE_UV = [[0.02, 0.085], [0.98, 0.085], [0.5, 0.916]];
const UV_C = [0.5, (0.085 * 2 + 0.916) / 3];                   // the incircle's centre in uv
const BARY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

// ─── shaders ────────────────────────────────────────────────────────────────

// The focused face may grow in its own plane about its centre (uGrow, see setFocus); its uv grows with
// it, so the larger triangle shows more of the picture rather than a stretched one.
const FACE_VERT = /* glsl */ `
  attribute vec3 bary;
  uniform float uGrow; uniform vec3 uCen;
  varying vec2 vUv; varying vec3 vBary; varying vec3 vN; varying vec3 vView;
  void main() {
    const vec2 C = vec2(${UV_C[0]}, ${UV_C[1]});
    vUv = C + uGrow * (uv - C); vBary = bary;
    vec4 wp = modelMatrix * vec4(uCen + uGrow * (position - uCen), 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FACE_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap; uniform sampler2D uInfo;
  uniform float uHover; uniform float uFocus; uniform float uDim; uniform float uIntro;
  uniform float uTime; uniform float uBack; uniform float uReveal; uniform float uEmblem; uniform float uInfoOn;
  uniform float uGrow; uniform float uHide; uniform vec3 uInfoMap;
  uniform float uMasked;       // the info texture is a plate, whose alpha masks its resting words out of the glow
  uniform float uWait;        // a side still being prepared, held at: the face breathes with light, as the loader's did
  uniform float uScreen;      // the info texture is the plate drawn straight onto the screen: read a pixel for a pixel
  varying vec2 vUv; varying vec3 vBary; varying vec3 vN; varying vec3 vView;

  void main() {
    float edge  = min(min(vBary.x, vBary.y), vBary.z);          // 0 on the border, 1/3 at the centre
    float reveal = clamp(max(uReveal, uHover * 0.5), 0.0, 1.0);
    float rim   = 1.0 - smoothstep(0.0, mix(0.09, 0.02, reveal), edge * uGrow);   // (a grown face keeps its bevel's width)
    float haze  = 1.0 - smoothstep(0.0, 0.33, edge);
    float facing = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);


    vec3 art  = texture2D(uMap, vUv).rgb * uEmblem;
    vec4 inf  = uScreen > 0.5 ? texelFetch(uInfo, ivec2(gl_FragCoord.xy), 0)
                              : texture2D(uInfo, (vUv - uInfoMap.xy) / uInfoMap.z);   // (the info texture's square of the face)
    vec3 info = inf.rgb * uInfoOn;

    // Frosted, lit-from-within glass: bright and washed out far away, then it
    // drains to near-black so the lines on it read as light.
    float fill = mix(0.58, 0.028, reveal);
    vec3 glass = vec3(fill) * (0.58 + 0.42 * haze) + vec3(0.06 * pow(1.0 - facing, 2.0));

    vec3 col = glass
             + art  * mix(0.5, 1.55, reveal)
             + info * 1.9
             + vec3(rim) * (0.30 + 0.6 * max(uHover * 0.8, uFocus))
             + vec3(0.16 * uWait * (0.55 + 0.45 * sin(uTime * 1.9635)) * (0.4 + 0.6 * haze));   // (the loader's 3.2 s breath)

    col *= uIntro * mix(1.0, 0.1, uDim * (1.0 - uFocus)) * (1.0 - uHide);

    if (uBack > 0.5) { gl_FragColor = vec4(col * 0.22, 1.0); return; }
    // alpha is what may glow (the scene target's alpha, read by Post's bright pass): all of it but a plate's resting
    // words (the plate's alpha); the face itself is drawn at 0.9 by a constant blend (frontMats)
    gl_FragColor = vec4(col, 1.0 - (1.0 - inf.a) * uInfoOn * uMasked);
  }
`;

// A border is drawn as a strip of thin quads, not as GL lines: each is uLine pixels wide and carries its own coverage
// (that width seen through a pixel: full across its middle, falling to nothing over a pixel either side), so it is
// smooth with no multisampling. A quad corner is its segment's end `position` pushed sideways on screen (aSide, by
// half the width and a half pixel) across the segment toward aOther (aEnd: +1 at the start, −1 at the end)
const BORDER_VERT = /* glsl */ `
  attribute float aAlong; attribute float aFace;
  attribute vec3 aN1; attribute vec3 aN2;   // the normals of the two faces that meet on this edge (its own first)
  attribute vec3 aOther; attribute float aSide; attribute float aEnd;
  uniform float uHover[8]; uniform float uFocus; uniform float uDim; uniform float uTime; uniform float uIntro;
  uniform float uGrow; uniform vec3 uCen; uniform float uHide; uniform float uWait;
  uniform float uWidth;        // buffer pixels per screen pixel: a line is one buffer pixel wide, so it is that much brighter
  uniform vec2 uRes;           // the drawing buffer, in pixels
  uniform float uLine;         // a line's width, in buffer pixels
  varying float vLvl; varying float vD;
  void main() {
    int f = int(aFace + 0.5);
    float h = uHover[f];
    float foc = abs(uFocus - aFace) < 0.5 ? 1.0 : 0.0;
    float chase = pow(0.5 + 0.5 * sin(aAlong * 6.2831853 * 2.0 - uTime * (0.9 + h * 2.5) + aFace * 0.8), 4.0);
    float lvl = 1.5 + 1.0 * max(h, foc) + chase * (0.8 + 1.2 * max(h, foc));
    lvl *= mix(1.0, 0.25, uDim * (1.0 - foc)) * (1.0 - uHide * (1.0 - foc));
    lvl *= 1.0 + foc * uWait * (0.5 + 0.5 * sin(uTime * 1.9635));
    vLvl = lvl * uIntro * uWidth;
    vec3 p = foc > 0.5 ? uCen + uGrow * (position - uCen) : position;    // the focused face's border grows with it
    // the crystal is convex, so there is no depth buffer: an edge shows while either face that meets on it is
    // turned toward the camera, and is behind the crystal once both are turned away (as a depth test would have it)
    vec3 to = cameraPosition - (modelMatrix * vec4(p, 1.0)).xyz;
    vLvl *= step(0.0, max(dot(mat3(modelMatrix) * aN1, to), dot(mat3(modelMatrix) * aN2, to)));
    vec3 q = foc > 0.5 ? uCen + uGrow * (aOther - uCen) : aOther;
    vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0), o = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    vec2 dir = normalize((o.xy / o.w - c.xy / c.w) * uRes);
    float reach = 0.5 * (uLine + 1.0);
    c.xy += vec2(-dir.y, dir.x) * aSide * aEnd * reach * (2.0 / uRes) * c.w;
    vD = aSide * reach;
    gl_Position = c;
  }
`;
const BORDER_FRAG = /* glsl */ `precision highp float; uniform float uLine; varying float vLvl; varying float vD;
  void main() { gl_FragColor = vec4(vec3(vLvl * clamp(0.5 * (uLine + 1.0) - abs(vD), 0.0, 1.0)), 1.0); }`;

/** The 8 unknowns of a projective map from its 8 equations (Gaussian elimination, partial pivoting). */
function solve8(A, b) {
  const M = A.map((row, i) => [...row, b[i]]), n = 8;
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[best][c])) best = r;
    [M[c], M[best]] = [M[best], M[c]];
    for (let r = c + 1; r < n; r++) {
      const k = M[r][c] / M[c][c];
      for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j]; x[r] = s / M[r][r]; }
  return x;
}

// ─── Crystal ────────────────────────────────────────────────────────────────

export class Crystal {
  constructor(canvas) {
    this.canvas = canvas;
    this.time = 0;
    this.hover = -1;
    this.hoverAmt = new Float32Array(8);
    this.intro = 0;
    this.warp = 0;
    this.pixelRatio = MAX_RATIO;
    this.focus = { face: -1, depth: 0, emblem: 1, info: 0, grow: 1, hide: 0 };
    this._focusAmt = new Float32Array(8);
    this.waitFace = -1; this.waiting = false; this.waitAmt = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.05, 100);
    this.camera.position.set(0, 0, 9);

    this._buildCrystal();
    this.post = new Post(this.renderer);
    this.resize();
  }

  _buildCrystal() {
    const pos = [], uv = [], bary = [], face = [];
    FACES.forEach((tri, f) => tri.forEach((vi, k) => {
      pos.push(...VERTS[vi]); uv.push(...FACE_UV[k]); bary.push(...BARY[k]); face.push(f);
    }));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('bary', new THREE.Float32BufferAttribute(bary, 3));
    geo.setAttribute('aFace', new THREE.Float32BufferAttribute(face, 1));
    geo.computeVertexNormals();
    geo.clearGroups();
    for (let i = 0; i < 8; i++) geo.addGroup(i * 3, 3, i);

    this.blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    this.blank.needsUpdate = true;

    const U = () => ({
      uMap: { value: null }, uInfo: { value: this.blank },
      uHover: { value: 0 }, uFocus: { value: 0 }, uDim: { value: 0 }, uIntro: { value: 0 }, uTime: { value: 0 },
      uBack: { value: 0 }, uReveal: { value: 0 }, uEmblem: { value: 1 }, uInfoOn: { value: 0 },
      uGrow: { value: 1 }, uHide: { value: 0 }, uInfoMap: { value: new THREE.Vector3(0, 0, 1) }, uWait: { value: 0 }, uMasked: { value: 0 },
      uScreen: { value: 0 },
    });
    this.cens = FACES.map((tri) => tri.reduce((c, v) => c.add(new THREE.Vector3(...VERTS[v])), new THREE.Vector3()).multiplyScalar(1 / 3));
    this.frontMats = []; this.backMats = [];
    for (let i = 0; i < 8; i++) {
      // (drawn at 0.9 over what is behind by a constant blend, so the alpha it writes is free to say what may glow)
      this.frontMats.push(new THREE.ShaderMaterial({
        vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { ...U(), uCen: { value: this.cens[i] } }, transparent: true, depthWrite: true, side: THREE.FrontSide,
        blending: THREE.CustomBlending, blendSrc: THREE.ConstantAlphaFactor, blendDst: THREE.OneMinusConstantAlphaFactor, blendAlpha: 0.9,
        blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.ZeroFactor,
      }));
      const b = new THREE.ShaderMaterial({ vertexShader: FACE_VERT, fragmentShader: FACE_FRAG, uniforms: { ...U(), uCen: { value: this.cens[i] } }, transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending });
      b.uniforms.uBack.value = 1;
      this.backMats.push(b);
    }

    this.group = new THREE.Group();
    this.group.position.y = OCTA_Y;
    this.back = new THREE.Mesh(geo, this.backMats); this.back.renderOrder = 0;
    this.mesh = new THREE.Mesh(geo, this.frontMats); this.mesh.renderOrder = 1;
    this.group.add(this.back, this.mesh);

    // borders: one draw call, light chases the edges
    const bp = [], other = [], side = [], end = [], along = [], bf = [], n1 = [], n2 = [], index = [];
    const PIECES = 48;
    const unit = FACES.map((_, f) => this._localNormal(f, new THREE.Vector3()));
    FACES.forEach((tri, f) => {
      const a0 = new THREE.Vector3(...VERTS[tri[0]]), a1 = new THREE.Vector3(...VERTS[tri[1]]), a2 = new THREE.Vector3(...VERTS[tri[2]]);
      const n = new THREE.Vector3().crossVectors(a1.clone().sub(a0), a2.clone().sub(a0)).normalize().multiplyScalar(0.004);
      const P = [a0, a1, a2];
      for (let e = 0; e < 3; e++) {
        const a = P[e], b = P[(e + 1) % 3];
        const g = FACES.findIndex((t, k) => k !== f && t.includes(tri[e]) && t.includes(tri[(e + 1) % 3]));   // the face across this edge
        for (let p = 0; p < PIECES; p++) {
          const s0 = p / PIECES, s1 = (p + 1) / PIECES;
          const p0 = a.clone().lerp(b, s0).add(n), p1 = a.clone().lerp(b, s1).add(n), k = bp.length / 3;
          for (const [at, to, s, u] of [[p0, p1, 1, s0], [p1, p0, -1, s1]]) {   // each end, a corner either side
            for (const sd of [-1, 1]) {
              bp.push(...at.toArray()); other.push(...to.toArray()); side.push(sd); end.push(s);
              along.push((e + u) / 3); bf.push(f); n1.push(...unit[f].toArray()); n2.push(...unit[g].toArray());
            }
          }
          index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bg.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    bg.setAttribute('aFace', new THREE.Float32BufferAttribute(bf, 1));
    bg.setAttribute('aN1', new THREE.Float32BufferAttribute(n1, 3));
    bg.setAttribute('aN2', new THREE.Float32BufferAttribute(n2, 3));
    bg.setAttribute('aOther', new THREE.Float32BufferAttribute(other, 3));
    bg.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
    bg.setAttribute('aEnd', new THREE.Float32BufferAttribute(end, 1));
    bg.setIndex(index);
    this.borderMat = new THREE.ShaderMaterial({
      vertexShader: BORDER_VERT, fragmentShader: BORDER_FRAG,
      uniforms: {
        uHover: { value: Array.from(this.hoverAmt) }, uFocus: { value: -1 }, uDim: { value: 0 }, uTime: { value: 0 }, uIntro: { value: 0 },
        uGrow: { value: 1 }, uCen: { value: new THREE.Vector3() }, uHide: { value: 0 }, uWidth: { value: 1 }, uWait: { value: 0 },
        uRes: { value: new THREE.Vector2(1, 1) }, uLine: { value: 1 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.borders = new THREE.Mesh(bg, this.borderMat);
    this.borders.frustumCulled = false;
    this.borders.renderOrder = 2;
    this.group.add(this.borders);

    // six vertex lights
    const vg = this.vertGeo = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(VERTS.flat(), 3));
    vg.setAttribute('color', new THREE.Float32BufferAttribute(new Array(18).fill(1), 3));      // each light's own fade (see update)
    this.vertMat = new THREE.PointsMaterial({ color: new THREE.Color(3, 3, 3), vertexColors: true, size: 7 * this.pixelRatio, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.normals = FACES.map((_, i) => this._localNormal(i, new THREE.Vector3()));
    this._camL = new THREE.Vector3(); this._inv = new THREE.Matrix4(); this._to = new THREE.Vector3();
    this.group.add(new THREE.Points(vg, this.vertMat));

    this.geo = geo;
    this.scene.add(this.group);
  }

  // ── public API ─────────────────────────────────────────────────────────────

  get quaternion() { return this.group.quaternion; }

  setHover(i) { this.hover = i; }
  setIntro(v) { this.intro = v; }
  setWarp(v)  { this.warp = v; }
  /** A side held at because it is still being prepared (-1: none): its face breathes with light until it is ready. */
  setWaiting(face) { this.waiting = face >= 0; if (face >= 0) this.waitFace = face; }

  applyFaceTextures(textures) {
    textures.forEach((t, i) => { this.frontMats[i].uniforms.uMap.value = t; this.backMats[i].uniforms.uMap.value = t; });
  }

  /**
   * What the director is doing: which face is being entered, how deep, what's visible on it. Closing in,
   * the face grows in its own plane by `grow` (border, bevel and uv with it) while the others fade by
   * `hide`; `map` is the square of face uv the info texture covers ({ x0, y0, span }, or the whole).
   */
  setFocus(face, depth, emblem, info, infoTexture, grow = 1, hide = 0, map = null) {
    const prev = this.focus.face;
    this.focus.face = face; this.focus.depth = depth; this.focus.emblem = emblem; this.focus.info = info;
    this.focus.grow = face >= 0 ? grow : 1; this.focus.hide = face >= 0 ? hide : 0;
    if (prev !== face) {
      if (prev >= 0) { this.frontMats[prev].uniforms.uInfo.value = this.blank; this.frontMats[prev].uniforms.uScreen.value = 0; }
      // (no depth buffer: the focused face is drawn last, so as it grows in its own plane it covers the faces it
      // grows across, as it is in front of them all: the crystal lies wholly behind any face's plane)
      this.geo.groups.sort((a, b) => (a.materialIndex === face) - (b.materialIndex === face) || a.materialIndex - b.materialIndex);
    }
    if (face >= 0) {
      this.frontMats[face].uniforms.uInfo.value = infoTexture;
      this.frontMats[face].uniforms.uMasked.value = infoTexture?.isRenderTargetTexture ? 1 : 0;
      this.frontMats[face].uniforms.uInfoMap.value.set(map ? map.x0 : 0, map ? map.y0 : 0, map ? map.span : 1);
    }
  }

  /** The focused face's info texture as the plate was just drawn: `screen`, straight onto the screen (see PlateRenderer.render). */
  setInfo(texture, screen) {
    const m = this.frontMats[this.focus.face];
    if (!m) return;
    m.uniforms.uInfo.value = texture;
    m.uniforms.uScreen.value = screen ? 1 : 0;
  }

  /**
   * For the focused face: the projective map from drawing-buffer pixels (gl_FragCoord) to face uv, as the face's own
   * perspective-correct uv runs over it (its grown corners, and its centre for the fourth point such a map needs), as
   * H; and how much face uv a pixel spans at the centre of the screen, perPx. Null without a focused face.
   */
  faceScreenMap() {
    const f = this.focus, i = f.face;
    if (i < 0) return null;
    const v = this.renderer.getDrawingBufferSize(this._buf || (this._buf = new THREE.Vector2()));
    const cen = this.cens[i], E = f.grow, eqs = [], rhs = [], p = new THREE.Vector3();
    const point = (w, u) => {                                   // w: a point of the face's plane, u: its uv
      p.copy(w).applyMatrix4(this.group.matrixWorld).project(this.camera);
      const x = (p.x + 1) / 2, y = (p.y + 1) / 2;               // (the buffer, scaled to 0–1: better conditioned)
      eqs.push([x, y, 1, 0, 0, 0, -u[0] * x, -u[0] * y], [0, 0, 0, x, y, 1, -u[1] * x, -u[1] * y]);
      rhs.push(u[0], u[1]);
    };
    FACES[i].forEach((vi, k) => point(new THREE.Vector3(...VERTS[vi]).sub(cen).multiplyScalar(E).add(cen),
      [UV_C[0] + E * (FACE_UV[k][0] - UV_C[0]), UV_C[1] + E * (FACE_UV[k][1] - UV_C[1])]));
    point(cen, UV_C);
    const h = solve8(eqs, rhs);
    const H = (this._H || (this._H = new THREE.Matrix3())).set(h[0] / v.x, h[1] / v.y, h[2], h[3] / v.x, h[4] / v.y, h[5], h[6] / v.x, h[7] / v.y, 1);
    const at = (x, y) => { const e = H.elements, z = e[2] * x + e[5] * y + e[8]; return [(e[0] * x + e[3] * y + e[6]) / z, (e[1] * x + e[4] * y + e[7]) / z]; };
    const c = at(v.x / 2, v.y / 2), dx = at(v.x / 2 + 1, v.y / 2), dy = at(v.x / 2, v.y / 2 + 1);
    return { H, perPx: Math.max(Math.hypot(dx[0] - c[0], dx[1] - c[1]), Math.hypot(dy[0] - c[0], dy[1] - c[1])) };
  }

  /** Hit test: { face, u, v } under a client point, or null. */
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.camera.updateMatrixWorld();
    this.group.updateMatrixWorld(true);
    this.raycaster.setFromCamera({ x, y }, this.camera);
    const f = this.focus;
    if (f.face >= 0 && f.grow > 1) {
      // the grown face is not in the geometry: hit its triangle as drawn, its uv grown the same way
      const cen = this.cens[f.face], E = f.grow;
      const [a, b, c] = FACES[f.face].map((v) => new THREE.Vector3(...VERTS[v]).sub(cen).multiplyScalar(E).add(cen).applyMatrix4(this.group.matrixWorld));
      const p = this.raycaster.ray.intersectTriangle(a, b, c, false, new THREE.Vector3());
      if (p) {
        const w = THREE.Triangle.getBarycoord(p, a, b, c, new THREE.Vector3()).toArray();
        const uv = [0, 1].map((j) => UV_C[j] + E * (w.reduce((t, wk, k) => t + wk * FACE_UV[k][j], 0) - UV_C[j]));
        return { face: f.face, u: uv[0], v: uv[1] };
      }
    }
    const hit = this.raycaster.intersectObject(this.mesh, false)[0];
    if (hit && hit.faceIndex !== f.face && f.hide > 0.999) return null;     // (faded out behind the grown face)
    return hit ? { face: Math.floor(hit.faceIndex), u: hit.uv.x, v: hit.uv.y } : null;
  }

  _localNormal(i, out) {
    const [a, b, c] = FACES[i].map((v) => new THREE.Vector3(...VERTS[v]));
    return out.crossVectors(b.sub(a), c.sub(a)).normalize();
  }

  /** Faces turned toward the camera (their emblems are the only ones worth redrawing). */
  facing(out) {
    this.group.updateMatrixWorld(true);
    const n = new THREE.Vector3(), c = new THREE.Vector3();
    const q = this.group.quaternion;
    for (let i = 0; i < 8; i++) {
      this._localNormal(i, n).applyQuaternion(q);
      c.copy(this._localNormal(i, new THREE.Vector3())).multiplyScalar(FACE_PLANE).applyMatrix4(this.group.matrixWorld);
      out[i] = n.dot(this.camera.position.clone().sub(c).normalize()) > -0.2;
    }
    return out;
  }

  /** Most camera-facing face for a quaternion. */
  frontFace(quat) {
    const n = new THREE.Vector3();
    let best = 0, bestDot = -2;
    for (let i = 0; i < 8; i++) {
      this._localNormal(i, n).applyQuaternion(quat);
      if (n.z > bestDot) { bestDot = n.z; best = i; }
    }
    return best;
  }

  /** Quaternion that squares face i to the camera, apex up. */
  focusQuaternion(i) {
    const n = this._localNormal(i, new THREE.Vector3());
    const q1 = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, 0, 1));
    const [a, b, c] = FACES[i].map((v) => new THREE.Vector3(...VERTS[v]));
    const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const apex = c.clone().sub(centroid).applyQuaternion(q1);
    const phi = Math.atan2(apex.x, apex.y);
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), phi).multiply(q1);
  }

  /** Camera z for "the whole triangle fits" and "the incircle fills the view". */
  framing() {
    const W = window.innerWidth, H = window.innerHeight;
    const fitDist = Math.max(TRI_EDGE / (W * 0.8), TRI_HEIGHT / (H * 0.72)) * H / K_FOV;
    const closePx = Math.min(0.42 * H, 0.46 * W);
    const closeDist = (INRADIUS / closePx) * H / K_FOV;
    return { fitZ: fitDist + FACE_PLANE, closeZ: closeDist + FACE_PLANE };
  }

  /** World units per screen pixel on a face plane at camera z. */
  worldPerPx(camZ) { return K_FOV * (camZ - FACE_PLANE) / window.innerHeight; }

  /** Compile the crystal's programs and the bloom's up front, each for the target it draws into; resolves once all are linked. */
  prepare() {
    const r = this.renderer, P = this.post, all = [];
    const compile = (scene, cam, target) => { r.setRenderTarget(target); all.push(r.compileAsync(scene, cam)); };
    compile(this.scene, this.camera, P.target);
    for (const [m, target] of [[P.brightMat, P.brightRT], [P.blurMat, P.brightRT], [P.compMat, null]]) { P.quad.material = m; compile(P.scene, P.cam, target); }
    r.setRenderTarget(null);
    return Promise.all(all).catch(() => {});
  }

  // ── per frame ──────────────────────────────────────────────────────────────

  update(dt, t) {
    this.time = t;
    this.group.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    const f = this.focus;
    const dim = THREE.MathUtils.smoothstep(f.depth, 0.25, 0.85);
    const cam = this.camera.position;
    const c = new THREE.Vector3(), n = new THREE.Vector3();
    this.waitAmt += ((this.waiting ? 1 : 0) - this.waitAmt) * (1 - Math.exp(-dt * 4));

    for (let i = 0; i < 8; i++) {
      const want = this.hover === i && f.face < 0 ? 1 : 0;
      this.hoverAmt[i] += (want - this.hoverAmt[i]) * (1 - Math.exp(-dt * 9));
      this._focusAmt[i] += ((f.face === i ? 1 : 0) - this._focusAmt[i]) * (1 - Math.exp(-dt * 7));

      this._localNormal(i, n);
      c.copy(n).multiplyScalar(FACE_PLANE).applyMatrix4(this.group.matrixWorld);
      const dist = cam.distanceTo(c);
      const reveal = THREE.MathUtils.smoothstep(8.4 - dist, 0, 3.0);   // 0 at 8.4 away, 1 at 5.4
      const li = THREE.MathUtils.clamp((this.intro - i * 0.07) / 0.45, 0, 1);

      for (const m of [this.frontMats[i], this.backMats[i]]) {
        const u = m.uniforms;
        u.uHover.value = this.hoverAmt[i];
        u.uFocus.value = this._focusAmt[i];
        u.uDim.value = dim;
        u.uIntro.value = li;
        u.uTime.value = t;
        u.uReveal.value = f.face === i ? Math.max(reveal, f.depth) : reveal;
        u.uEmblem.value = f.face === i ? f.emblem : 1;
        u.uInfoOn.value = f.face === i ? f.info : 0;
        u.uGrow.value = f.face === i ? f.grow : 1;
        u.uHide.value = f.face === i ? 0 : f.hide;
        u.uWait.value = this.waitFace === i ? this.waitAmt : 0;
        m.visible = f.face === i || f.hide < 0.999;
      }
      this.borderMat.uniforms.uHover.value[i] = this.hoverAmt[i];
    }
    const bu = this.borderMat.uniforms;
    bu.uFocus.value = f.face; bu.uDim.value = dim; bu.uTime.value = t;
    bu.uIntro.value = THREE.MathUtils.clamp(this.intro * 1.6, 0, 1);
    bu.uGrow.value = f.grow; bu.uHide.value = f.hide; bu.uWait.value = this.waitFace === f.face ? this.waitAmt : 0;
    if (f.face >= 0) bu.uCen.value.copy(this.cens[f.face]);
    this.vertMat.opacity = bu.uIntro.value * (1 - dim * 0.8) * (1 - f.hide);
    // the vertex lights ride the grown face's corners
    const vp = this.vertGeo.attributes.position;
    for (let v = 0; v < 6; v++) {
      const E = f.face >= 0 && FACES[f.face].includes(v) ? f.grow : 1, cen = f.face >= 0 ? this.cens[f.face] : null;
      for (let j = 0; j < 3; j++) vp.array[v * 3 + j] = E === 1 ? VERTS[v][j] : cen.getComponent(j) + E * (VERTS[v][j] - cen.getComponent(j));
    }
    vp.needsUpdate = true;
    // a corner is hidden by the crystal itself when every face that meets there is turned away from the camera
    // (it is convex): each light fades as its corner passes behind the silhouette, so none shows through a face
    const camL = this._camL.copy(cam).applyMatrix4(this._inv.copy(this.group.matrixWorld).invert());
    const vc = this.vertGeo.attributes.color;
    for (let v = 0; v < 6; v++) {
      this._to.fromArray(vp.array, v * 3).subVectors(camL, this._to).normalize();
      let toward = -1;
      for (let i = 0; i < 8; i++) if (FACES[i].includes(v)) toward = Math.max(toward, this.normals[i].dot(this._to));
      vc.array.fill(THREE.MathUtils.smoothstep(toward, -0.1, 0.06), v * 3, v * 3 + 3);
    }
    vc.needsUpdate = true;
  }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.post.target);
    r.setClearColor(0x000000, 1);
    r.clear();
    r.render(this.scene, this.camera);
    // (less glow still once inside a world's face, reading: hide rises as it grows past the screen)
    this.post.composite({ time: this.time, warp: this.warp, strength: (1.0 - 0.5 * this.focus.depth) * (1.0 - 0.4 * this.focus.hide), threshold: 0.8 });
  }

  setPixelRatio(pr) {
    this.pixelRatio = pr;
    this.renderer.setPixelRatio(pr);
    this.vertMat.size = 7 * pr;
    this.resize();
  }

  /** Buffer pixels per screen pixel (the screen counted at up to 2×). */
  _perScreen() { return this.pixelRatio / Math.min(Math.max(window.devicePixelRatio || 1, 1), 2); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.borderMat.uniforms.uWidth.value = this._perScreen();
    const v = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.borderMat.uniforms.uRes.value.copy(v);
    // (1.4 px where the scene used to be multisampled, below ratio 1.5 off a phone: Direct3D draws a multisampled
    // line 1.4 px wide, and the glow round the crystal was made with those)
    this.borderMat.uniforms.uLine.value = !MOBILE && this.pixelRatio < 1.5 ? 1.2 : 1;
    this.post.setSize(v.x, v.y, this.pixelRatio, this._perScreen());
  }
}
