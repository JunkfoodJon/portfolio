# Portfolio — Eight Faces

A 3D portfolio built with **Three.js**: eight projects on the eight faces of one glowing white crystal in a black void. There is no HTML interface — the crystal and the information on its faces *are* the interface. No build step, no network: pure ES modules and a vendored copy of three.

## How it behaves

- **Drag** to spin the crystal. Let go mid-motion and it coasts freely, then settles back into a slow idle turn. Dragging down always moves the front down, at any angle.
- **Scroll (or pinch) to approach.** One continuous depth value drives everything: the face under the cursor turns to the camera as you come in (until a face is framed, scrolling over another face turns to that one instead), the glow drains out of the glass and the panel resolves. Scroll the other way and it reverses exactly; nothing snaps.
- **Keep scrolling to go inside the face.** Each project is an engraved picture that never ends: a detail of each plate (a portal) is the next plate, and the last leads back to the first. Scrolling leans toward the cursor while the path carries you on to the next portal, which always stays on screen; dragging pans.
- **Go deeper and colour arrives.** The surface is white light; each plate further down takes on more of that project's palette, full by the end of the first loop, and every loop after swaps the palette round so the zoom never repeats exactly. Motes drift in the dark of the deeper plates, and past the first loop they join into constellations.
- **Click** a face to approach it, click it again to fly to the next plate, and click empty space to come back out one plate at a time.
- **Esc / Backspace** is the easy way out: one smooth reverse zoom, however deep you are, back to the whole face (a second press leaves it). It leaves briskly and glides in; the deeper you were, the longer it takes (up to about six seconds).
- **Words arrive as you reach them.** Once a plate's text is big enough to read it sets itself in the world's own way (typed behind a caret, decoded out of glyphs, or risen line by line), figures count up to their values, and the words take on the world's colours with depth. Every text sits on a soft dark plaque so it reads against the engraving.
- **Words take shape as you scroll in.** Each world plays its own effect on its words, driven by how far you have scrolled into the plate (never by a clock), so scrolling back plays it in reverse; every effect ends as plain readable text. Isoline's text pulls up out of a liquid pool with contour rings and figures standing up as blocks; Arachnia's gathers as dew beads on silk behind a spider caret; Rubix's letters are tiles that flip and lock, figures in turning cogs; ThoughtSlayer's are thoughts being read (ghosts converging under a focus ring, locking with a verdict colour, figures guessing before they settle); Choir's are stained glass lit from behind; ShadowMan's step out of their shadows and bend through the eye's lens; Lightify's are pressed into turning vinyl and glow with the music; DoppelStream's arrive as blocky compression sharpening one hop at a time.
- **Each face has its own music.** Silent at the crystal; it fades in as a face turns to you and reaches full volume by the second plate, never louder. Deeper, the arrangement fills out instead. Sound starts after the first click or key press (browsers don't count a scroll); **M** mutes.
- Keys: **1–8** jump to a project, **← →** spin / previous–next project, **↑ ↓** approach / retreat, **Enter** approaches, **Esc / Backspace** rewind to the whole face, then leave it, **M** sound on / off.

## Project Structure

```
Portfolio/
├── index.html              # Entry point + importmap (three → ./vendor)
├── css/void.css            # Black ground, a hover label, a hint (+ plain-page fallback)
├── vendor/three/           # three.module.js r165 (vendored — runs offline)
└── js/
    ├── content.js          # ← Edit this: project text, figures, status
    ├── main.js             # Boot, WebGL-failure fallback, frame loop, frame-time governor
    ├── crystal.js          # The scene: crystal, face shaders, borders, picking, framing
    ├── pilot.js            # Camera, input, flick physics, the depth value, wall navigation
    ├── wall.js             # The zoomable information picture drawn onto a face (Canvas 2D)
    ├── emblems.js          # The 8 animated emblems → textures, FaceRenderer
    ├── worlds/             # Faces that are paintings you fall into (endless zoom)
    │   ├── world.js        #   plate chain, zoom path + loop, inscriptions, PlateRenderer
    │   ├── sdf.js          #   GLSL distance primitives + the isoline-engraving line work
    │   ├── arachnia.js     #   Arachnia: Web → Dewdrop → Thread → Mind → Web
    │   ├── rubix.js        #   OpenRubixMachina: Box → Machine → Glyphs → Box
    │   ├── thoughtslayer.js #  ThoughtSlayer: Mind → Eye → Thought-stream → Verdict → Mind
    │   ├── choir.js        #   Choir of Souls: Window → Rose → the Choir → the Field → Window
    │   ├── shadowman.js    #   OpenShadowMan: Desktop → the Eye (its reflection) → Desktop
    │   ├── lightify.js     #   Lightify: Record → Groove → Range → Light → Record
    │   ├── doppel.js       #   DoppelStream: Desk → Streamer's screen → Viewer's screen → the Wire → Desk
    │   └── isoline.js      #   Isoline: Studio → Form → Slice → Proof → Studio
    ├── audio.js            # Each world's music: depth → volume, generative scores (or a `track` file)
    ├── post.js             # HDR target → bloom chain → composite
    └── dossier.js          # Plain readable page, used only when WebGL is unavailable
```

## Configuring Your Projects

Edit `js/content.js`. Order is face order (0–7); faces `i` and `i+1` share an edge:

```js
{
  id: 'arachnia',
  name: 'Arachnia',
  tagline: 'One line.',
  kind: 'Desktop AI workbench',
  status: 'In active development',
  version: 'v0.2.6',
  platform: 'Windows · Rust',
  summary: '…',                              // Overview → "In short"
  highlights: ['…'],                         // Overview → one disc each
  inside: [{ title: '…', text: '…' }],       // Inside → one disc each
  stack: [['Language', ['Rust 2024']]],      // Stack → one disc per group
  stats: [{ value: 403, suffix: 'K', label: 'lines of Rust' }],   // Numbers
}
```

The crystal is white light: `tint` is ignored by the 3D view (it is only a fallback hue). There are deliberately no URL fields; `SITE.contact` shows a contact line on the plain page.

To change what a face *looks like*, edit its builder in `js/emblems.js` (`BUILDERS`, same order). Colours there are folded to brightness.

A face can instead be a **world** (`js/worlds/`): a chain of engraved plates, each with a portal that the next plate fills, the last leading back to the first, so scrolling never ends. Its words come from the same `content.js` entry, set into the plates as inscriptions. Every face now has one; a new project's world is registered in `WORLDS` in `world.js`. Portals are circles `[x, y, r]` or rectangles `[x, y, r, aspect]` (a screen inside a screen), and an inscription's text may be a function of how many plates deep it is. A world's optional `textFx` (GLSL) reshapes its words: when the words' canvas redraws, `PlateRenderer` turns it into a distance field (a jump flood), and the effect reads it through `words(uv)` (distance to the nearest letter, that letter's scroll progress, accent mark and size); `js/worlds/sdf.js` holds the shared shape helpers.

## Testing the fallback

`http://localhost:8080/?flat` forces the plain readable page (also used automatically if WebGL cannot start).

## Running Locally

You need a local HTTP server (browsers block ES module loading from `file://`).

**Option A — Python (recommended, zero install):**
```bash
python -m http.server 8080
# then open http://localhost:8080
```

**Option B — Node.js:**
```bash
npx serve .
# or
npx http-server . -p 8080
```

**Option C — VS Code Live Server extension:**  
Right-click `index.html` → "Open with Live Server"

## Browser Support

Any modern browser with WebGL2. Chrome, Edge, Firefox, Safari 15+.

## Notes

- There are no video or image assets: every emblem is generated at runtime as line geometry and rendered to a 1024² multisampled texture. Only faces turned toward the camera are redrawn.
- Three.js is vendored (`vendor/three/three.module.js`, r165) — no CDN, works offline. Bloom and tone mapping are implemented in `js/post.js` with core three only.
- Animation uses real elapsed time, so a slow GPU gets fewer frames rather than slow motion. The site always runs in full motion; it does not follow `prefers-reduced-motion`.
- **Quality tiers.** By default the scene is drawn at pixel ratio 2 whatever the screen: a 1080p screen is supersampled (3840×2160, scaled down by the browser), a 2× screen is drawn natively. From ratio 1.5 up the supersampling is the antialiasing, so MSAA is off; below it the HDR target gets 4× MSAA. Plates (`PlateRenderer`) are sized to the drawing buffer up to 3072² (`?ultra` allows 4096²), while their line work stays sized to the screen's own pixel, so every tier shows the same engraving, drawn more or less finely. Glow and the crystal's border lines are also sized in screen pixels, so they look the same at every ratio. Emblems stay at 1024² with 4× MSAA (at 2048² their 1-pixel lines would come out half as bright), and the words' canvas at 2048² with a 1024² distance field.
- **Governor** (`main.js`): one way only, so it never oscillates. After about 1.5 s under ~45 fps (counted in time, a frame counting for at most 50 ms so a one-off hitch does not trip it) it lowers the pixel ratio 2 → 1.5 → 1 (MSAA comes back below 1.5); after that, under ~26 fps, it shrinks the plates to 0.7, then turns MSAA off. Frames spent redrawing the words' canvas (CPU work that fewer pixels would not speed up) are not counted.
- If a stale page loads after an edit, hard-reload: `python -m http.server` sends no cache headers and browsers cache modules heuristically.
