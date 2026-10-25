/**
 * content.js — the ONLY file you edit to change portfolio content.
 *
 * Order matters: index i is octahedron face i. Faces 0→7→0 form a ring in which
 * every neighbour shares an edge, so prev/next always hops to an adjacent face.
 * Tints were chosen so neighbouring faces never share a hue.
 *
 * Figures come from each project's own docs as of 2026-10. Where a doc was stale
 * or self-contradictory the more conservative number is used.
 *
 * Deliberately absent: URLs, hostnames, IPs, credentials, personal paths.
 */

export const SITE = {
  name: 'JunkfoodJon',
  role: 'Systems, tools & games',
  // Set to a short string (e.g. an email address) to show a contact line in the
  // dossier footer. Left empty on purpose: no outbound links, nothing invented.
  contact: '',
  asOf: 'Figures from project docs, Oct 2026',
};

export const PROJECTS = [
  {
    id: 'arachnia',
    name: 'Arachnia',
    tagline: 'A local-first AI workbench: a dense 27B at 78 tok/s in 20 GB of VRAM.',
    kind: 'Desktop AI workbench',
    status: 'In active development',
    version: 'v0.2.6',
    platform: 'Windows · Rust',
    music: '“Machina” by Scott Buckley · CC BY 4.0',
    tint: '#9be000',
    summary:
      'Arachnia runs and manages local language models, tuned to the hardware it finds itself on. ' +
      'It is a native Rust application built around the idea that the model, the tools and your data ' +
      'should all stay under your control.',
    highlights: [
      'Speculative decoding keeps a 27B model at 65 tok/s even 49K tokens deep, down from 78 at the start',
      'Mixture-of-experts layers offloaded to the CPU run about twice as fast when a model overflows VRAM',
      'A llama.cpp bootstrap that picks Vulkan, CUDA, HIP or CPU, then checks and probes the binary',
      'Grafts a multi-token-prediction head onto quantised files that ship without one',
    ],
    inside: [
      { title: 'Local-model engine', text: 'Ollama, LM Studio, llama.cpp and vLLM behind one local interface; a governor sizes context and memory to the hardware before a model loads.' },
      { title: 'Layers enforced', text: 'The build itself fails if a lower layer imports a higher one, so 122 modules keep their shape; secrets live in Windows Credential Manager.' },
      { title: 'Memory & evolution', text: 'Amber keeps semantic snapshots of a project; Hivemind evaluates variants against each other and keeps what wins.' },
      { title: 'First frame', text: 'Startup work cut the first painted frame from 3.5 s to 0.62 s; ghost-text completions run locally too.' },
    ],
    stack: [
      ['Language', ['Rust 2024']],
      ['UI', ['egui / eframe']],
      ['Runtime', ['tokio', 'reqwest', 'sled']],
      ['Crypto', ['ed25519', 'ChaCha20-Poly1305', 'Argon2']],
      ['Models', ['llama.cpp', 'Ollama', 'OpenAI-compatible']],
    ],
    stats: [
      { value: 78, suffix: ' tok/s', label: 'dense 27B in 20 GB VRAM' },
      { value: 403, suffix: 'K', label: 'lines of Rust' },
      { value: 4.0, suffix: 'K', label: 'automated tests', decimals: 1 },
      { value: 122, suffix: '', label: 'modules in the atlas' },
    ],
  },
  {
    id: 'openrubixmachina',
    name: 'OpenRubixMachina',
    tagline: 'One box of parts. Many working models.',
    kind: 'Research language & toolchain',
    status: 'Research · early stage',
    version: 'Tessera v0.1',
    platform: 'Rust · Python',
    music: '“Welcome to the machine” by Komiku · CC0',
    tint: '#6fa8ff',
    summary:
      'Tessera treats a model as typed, rearrangeable parts and predicts its llama.cpp memory before launch, ' +
      'exact to the MiB. A quantisation, a precision or a memory layout is not a separate build — it is a legal ' +
      'rearrangement, type-checked before anything runs.',
    highlights: [
      'Memory priced before launch: every llama.cpp buffer predicted, exact to the MiB on 12 of 12',
      'A five-part tensor type (shape, dtype, layout, space, quant) rejects ill-typed moves',
      'A new variant is 16 hardlinks, made in 0.4 s with 0 bytes copied',
      'Every figure carries one of four evidence tiers, from Traced to Asserted',
    ],
    inside: [
      { title: 'Typed parts', text: 'Tiles, folds and lattices form the vocabulary; a normative spec and JSON Schemas define what a legal arrangement is.' },
      { title: 'Emit & verify', text: 'A Rust emitter writes ONNX; 25 of 36 folds emit and run in onnxruntime, and the other 11 refuse on purpose. Two int4 tiles wait on the opset.' },
      { title: 'Rearrange live', text: 'A live move keeps model state bit-identical in about 5 s, against 30 s from cold; GGUF sizes are known for 851 of 851 tensors.' },
      { title: 'Honest results', text: 'Experiments are pre-registered. One search method failed at role granularity and is recorded as failed, with the method kept.' },
    ],
    stack: [
      ['Core', ['Rust 2024', '5-crate workspace']],
      ['Formats', ['YAML manifests', 'ONNX', 'GGUF']],
      ['Verification', ['onnxruntime', 'JSON Schema']],
      ['Bridges', ['Python', 'llama.cpp']],
    ],
    stats: [
      { value: 41, suffix: '', label: 'tiles' },
      { value: 36, suffix: '', label: 'folds' },
      { value: 12, suffix: '/12', label: 'MiB-exact plans' },
      { value: 13.5, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
  },
  {
    id: 'thoughtslayer',
    name: 'ThoughtSlayer',
    tagline: 'A network watchman that never phones home.',
    kind: 'Network monitor & defender',
    status: 'Public release',
    version: 'v0.1.0 · MIT',
    platform: 'Windows · Rust',
    music: '“Shadows and Dust” by Scott Buckley · CC BY 4.0',
    tint: '#ff3347',
    summary:
      'ThoughtSlayer runs 24 local detections over every connection your PC makes and explains each in plain ' +
      'language: which program, which publisher, where it goes and whether it should. Verdicts come from offline ' +
      'lists, so its own traffic is just name lookups and downloads you start.',
    highlights: [
      'Decoy hostnames unique to every install; any process that looks one up is flagged FOE at once',
      'Live monitor per program with country, network owner and byte rate; world map with 24-hour trail',
      'Detects beaconing, DGA and DNS tunnelling, swapped binaries, clipboard wallet swaps and more',
      'Responses start as dry runs with a kill switch, and every one undoes',
    ],
    inside: [
      { title: 'Sees', text: 'Event Tracing for Windows and the extended TCP table through raw Win32 FFI attribute each connection to a program and publisher.' },
      { title: 'Judges', text: 'Offline threat lists and your own lists produce a verdict plus the signal and confidence that produced it.' },
      { title: 'Correlates', text: 'Signals that follow the process tree join one incident instead of a pile of alerts, each labelled with its MITRE ATT&CK technique.' },
      { title: 'Acts', text: 'Every action lands in a history with undo. The CRT-style interface is hand-drawn in egui, with a built-in guide for every term.' },
    ],
    stack: [
      ['Language', ['Rust 2021']],
      ['UI', ['egui 0.28']],
      ['System', ['ETW', 'Win32 FFI', 'Windows Firewall']],
      ['Data', ['maxminddb', 'serde', 'ipnet']],
      ['Ship', ['NSIS installer', 'SHA-256 sums']],
    ],
    stats: [
      { value: 24, suffix: '', label: 'detections, each explained' },
      { value: 3, suffix: '', label: 'network actions, 2 on request' },
      { value: 440, suffix: '', label: 'automated tests' },
      { value: 50.8, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
  },
  {
    id: 'choirofsouls',
    name: 'Choir of Souls',
    tagline: 'A dark-fantasy monster battler, drawn entirely in maths.',
    kind: 'Dark-fantasy game',
    status: 'In development',
    version: 'Proprietary',
    platform: 'WebGPU · WebGL2',
    music: '“The Illusionist” by Scott Buckley · CC BY 4.0',
    tint: '#ffc24a',
    summary:
      'Tempo-gauge battles between two factions, 30 creature lines and 146 moves, played through a campaign ' +
      'that descends and ascends the Great Window. Every creature and stage is a raymarched ' +
      'signed-distance field — there are no sprite sheets and no build step. Formerly Aether & Ash.',
    highlights: [
      'Evolution is a rite: you play the creature line’s own melody on an organ of eight keys',
      'Two attacks due within a quarter second clash; a timing ring decides which one lands',
      'A Rival warlord levels beside your warband and drafts counters to your favourite types',
      'Lose a run and your fallen creatures join the choir on the title screen',
    ],
    inside: [
      { title: 'Gauges, not turns', text: 'Each creature fills a tempo gauge; acting early costs power, waiting risks a Break. Protect, counter, relay and hazard stances reward reading the fight.' },
      { title: 'Everything is a field', text: 'Creatures, bosses and arenas are signed-distance functions raymarched on WebGPU or WebGL2 to the same pixels; one workbench animates, reviews and lints them all.' },
      { title: 'Tuned by simulation', text: 'A tuner adjusts each species until it wins about half its simulated duels and 3v3 fights; 623 tests guard the rest.' },
      { title: 'A score that composes', text: 'WebAudio synthesis plus a theory engine writes music per room and creature (in progress).' },
    ],
    stack: [
      ['Render', ['WebGPU', 'WebGL2', 'raymarched SDF']],
      ['Audio', ['WebAudio', 'procedural score']],
      ['Language', ['JavaScript', 'ts-check']],
      ['Tooling', ['Node', 'Playwright', 'Python tools']],
    ],
    stats: [
      { value: 50, suffix: '%', label: 'win rate, tuned by sim' },
      { value: 146, suffix: '', label: 'moves' },
      { value: 623, suffix: '', label: 'automated tests' },
      { value: 110, suffix: 'K', label: 'lines of JavaScript' },
    ],
  },
  {
    id: 'openshadowman',
    name: 'OpenShadowMan',
    tagline: 'A small round creature who treats your windows as terrain.',
    kind: 'Desktop pet',
    status: 'In development',
    version: 'v0.1.0',
    platform: 'Windows · Rust',
    music: '“Nighum” by cinameng (James Gargette) · CC0',
    tint: '#ff6fb5',
    summary:
      'A white blob lives on your desktop, climbs and peeks from behind your real windows, picks ' +
      'from 20 activities and builds a personality and a bond with you over time. Offline, no telemetry, and his whole ' +
      'body is drawn by code.',
    highlights: [
      'Real desktop icons: he pushes, tidies and eats them, and puts each back after quit or a crash',
      'Want-driven behaviour across 20 activities — fishing, juggling, dancing to system audio, parkour',
      'Object permanence: a ball that rolls behind a window is tracked to the side it comes out',
      'Structures fold out of the way of your typing cursor',
    ],
    inside: [
      { title: 'Desktop as world', text: 'A layered window redrawn each frame keeps him on top; window rectangles become ledges, with occlusion so he hides behind what is actually in front.' },
      { title: 'Wants, not scripts', text: 'A want-driven behaviour AI picks what to do from mood, time and bond; the bond persists and unlocks new behaviour.' },
      { title: 'Art from code', text: 'A custom SDF rasteriser and a hand-rolled PNG/DEFLATE encoder generate the creature and wardrobe at runtime; text uses Silkscreen and Pixelify Sans (OFL).' },
      { title: 'Quiet by design', text: 'No network, no process injection, no packer. Input watching only counts events; nothing is recorded.' },
    ],
    stack: [
      ['Language', ['Rust 2024']],
      ['Platform', ['windows crate', 'DirectComposition', 'D3D11']],
      ['Input', ['UI Automation', 'WASAPI']],
      ['Ship', ['Inno Setup', 'portable zip']],
    ],
    stats: [
      { value: 13.7, suffix: 'K', label: 'animation frames audited', decimals: 1 },
      { value: 126, suffix: '+', label: 'cosmetics, all procedural' },
      { value: 221, suffix: '', label: 'self-test groups, headless' },
      { value: 154.4, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
  },
  {
    id: 'lightify',
    name: 'Lightify',
    tagline: 'A Spotify library player in one small native process.',
    kind: 'Desktop music player',
    status: 'Released',
    version: 'v2.2.3 · source available',
    platform: 'Windows · Rust · Slint',
    music: '“Chill lofi inspired” by omfgdude · CC0',
    tint: '#2fd49a',
    summary:
      'Lightify registers as its own Spotify Connect device, so you get your library, queue and ' +
      'stations in a window that appears in 0.13 s and idles at about 65 MB in one process. ' +
      'Not affiliated with Spotify; a Premium account is required.',
    highlights: [
      'Against the official desktop client: a window in 0.13 s, not 0.94 s',
      'After sleep or a dropped network it resumes the same track and position',
      'Switches the output device mid-song in 248 ms, with no engine restart and no lost audio',
      'Command palette on Ctrl+K and built-in self-test flags for the audio path',
    ],
    inside: [
      { title: 'One process', text: 'The shell, UI and librespot engine share a single native process, replacing a WebView2/Tauri build that ran nine.' },
      { title: 'Measured, not claimed', text: 'On the same PC as the official desktop client: about 65 MB in 1 process against 1,177 MB in 7; 6 MB minimised.' },
      { title: 'Queue truth', text: 'The queue panel is derived from the engine’s actual order rather than a cached idea of it.' },
      { title: 'Quiet at idle', text: 'At idle it spends 16–47 ms of CPU every 30 seconds, where the official client spends 609–1,984 ms.' },
    ],
    stack: [
      ['Language', ['Rust']],
      ['UI', ['Slint', 'winit']],
      ['Audio', ['librespot 0.8', 'cpal']],
      ['Runtime', ['tokio', 'reqwest']],
      ['Ship', ['Inno Setup']],
    ],
    stats: [
      { value: 134, suffix: ' ms', label: 'to a window, vs 940' },
      { value: 65, suffix: ' MB', label: 'vs 1,177 MB' },
      { value: 1, suffix: '', label: 'process, vs 7' },
      { value: 6, suffix: ' MB', label: 'when minimised' },
    ],
  },
  {
    id: 'doppelstream',
    name: 'DoppelStream',
    tagline: 'Live streaming where the viewer can play, 10.3 ms from paint to present.',
    kind: 'Low-latency streaming platform',
    status: 'Live service',
    version: 'v1.0.17',
    platform: 'Python · WebRTC',
    music: '“Ephemera” by Scott Buckley · CC BY 4.0',
    tint: '#ff6a2b',
    summary:
      'The streamer’s PC encodes and serves the stream, viewers watch in a browser, and viewers can send ' +
      'gamepad input back to play on the streamer’s machine. A forwarding unit built for zero transcoding ' +
      'keeps the path short, and a paint-to-present timing rig keeps the claims honest.',
    highlights: [
      'FFmpeg’s AMD encoder held each frame back until one flag was set; setting it saved 14.2 ms',
      'Encoder profiles for AMD, NVIDIA and CPU scored with VMAF; AV1 at 3 Mb/s matches H.264 at 5.9',
      'Viewer gamepad over a data channel to a virtual controller, with per-category blocking',
      'A/B runs are interleaved 6 against 6 with confidence intervals; failed ideas stay recorded',
    ],
    inside: [
      { title: 'Forward, never transcode', text: 'Built on aiortc: per-viewer RTP header templates are patched in place over the encoder’s own packets, with a playout-delay extension.' },
      { title: 'Tuned by measurement', text: 'A timecode painted on screen and read back in the page times each frame from paint to present. The shipped default runs at p50 10.3 ms, p95 14.9 ms on loopback.' },
      { title: 'Viewer plays', text: 'Inputs ride a DataChannel into a virtual gamepad; the streamer decides which button groups viewers may press.' },
      { title: 'A whole platform', text: 'Relay registry, presence, accounts with email 2FA and admin GUI on its own server; seven web themes.' },
    ],
    stack: [
      ['Core', ['Python 3.13', 'aiortc', 'PyAV']],
      ['Media', ['FFmpeg', 'NVENC / AMF / x264']],
      ['App', ['PySide6', 'Velopack']],
      ['Web', ['Vanilla JS', 'PWA']],
      ['Server', ['aiohttp', 'coturn', 'systemd']],
    ],
    stats: [
      { value: 10.3, suffix: ' ms', label: 'paint-to-present p50, loopback', decimals: 1 },
      { value: 14.9, suffix: ' ms', label: 'p95, shipped default', decimals: 1 },
      { value: 43, suffix: 'K', label: 'lines of Python' },
      { value: 14.2, suffix: ' ms', label: 'saved by one encoder flag', decimals: 1 },
    ],
  },
  {
    id: 'isoline',
    name: 'Isoline',
    tagline: 'A native editor for shapes made of distance fields, where every edit is a command.',
    kind: 'SDF modelling studio',
    status: 'In development',
    version: 'Private',
    platform: 'Native · Rust',
    music: 'Original score, after Steve Reich',
    tint: '#9145ff',
    summary:
      'Isoline is the studio behind Choir of Souls: it draws the game’s creatures exactly as the game does, ' +
      'edits them as data and can certify one across 90 battle states. Every change is one command line, kept in a log that is both the undo history and ' +
      'a replay, so a person, a script or an agent can drive the same session.',
    highlights: [
      'Drag to solve: pull a surface and the fewest numbers move, using exact derivatives of the field',
      'Certified: a creature provably stays inside its hull in all 90 battle states, checked in 67 ms',
      'Proven between frames: limbs stay clear of each other (48 of 48 spans) and gaits never slip, to 1e-16',
      'Headless twin: the same commands from a CLI and an MCP server, with renders, judging and meters',
    ],
    inside: [
      { title: 'Byte for byte', text: 'Its shader compile is the game’s own GLSL to the byte, its motion matches 156 models to 1e-9, and weight and balance come from a 128³ voxel pass per pose.' },
      { title: 'The timeline', text: 'Motion as tracks on the game’s own data, with keys, layers, events and goals; every creature imports and bakes back byte for byte.' },
      { title: 'Sculpting as edits', text: 'Add, carve, studs, inflate, pinch, smear and flatten: a 41-point stroke fits to 2–5 capsules, kept as one undoable command.' },
      { title: 'Room mode', text: 'Whole halls drawn by their own shaders, checked for voids where rays escape and for geometry that floats free of the floor.' },
    ],
    stack: [
      ['Language', ['Rust 2021']],
      ['GPU', ['wgpu', 'naga', 'WGSL']],
      ['UI', ['eframe', 'egui']],
      ['Maths', ['Fidget', 'interval arithmetic', 'JIT']],
    ],
    stats: [
      { value: 90, suffix: '', label: 'states certified' },
      { value: 41, suffix: 'K', label: 'lines of Rust' },
      { value: 229, suffix: '', label: 'tests' },
      { value: 9, suffix: '', label: 'crates' },
    ],
  },
];
