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
 *
 * `deeper` holds the chapters the zoom reads on its later loops: each gives a new summary, highlights,
 * inside cards and figures, set in the same places as the project's own (so each string keeps close to
 * the length of the one it stands in for). The first loop reads the project, the second its first
 * chapter, and so on round again.
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
      'Arachnia runs and manages AI language models on your own PC, tuned to the hardware it finds there. ' +
      'It is a native Windows application built so that the model, the tools and your data ' +
      'all stay under your control.',
    highlights: [
      'Guessing a few words ahead keeps a 27-billion-part model at 65 tokens a second, even 49,000 tokens into a chat',
      'When a model is too big for the graphics card, parking its specialist layers on the processor runs it up to twice as fast',
      'It installs its own AI engine for your graphics card (NVIDIA, AMD, Intel or none), then test-drives it before trusting it',
      'Pairs a small look-ahead helper file with compressed models that ship without one',
    ],
    inside: [
      { title: 'One home for local models', text: 'Ollama, LM Studio, llama.cpp and vLLM sit behind one window, and a governor sizes memory to your hardware before a model loads.' },
      { title: 'Kept in order', text: 'The code is split into 122 modules in three layers; the build refuses to finish if a lower layer reaches up into a higher one.' },
      { title: 'Memory', text: 'Amber keeps snapshots of a project that you can search by meaning, on a Memory page of its own.' },
      { title: 'Quick to open', text: 'Startup work cut the time to the first frame from 3.5 s to 0.62 s, and typing suggestions run on your own PC too.' },
    ],
    stack: [
      ['Language', ['Rust 2024']],
      ['UI', ['egui / eframe']],
      ['Runtime', ['tokio', 'reqwest', 'sled']],
      ['Crypto', ['ed25519']],
      ['Models', ['llama.cpp', 'Ollama', 'OpenAI-compatible']],
    ],
    stats: [
      { value: 78, suffix: ' tok/s', label: 'dense 27B in 20 GB VRAM' },
      { value: 370, suffix: 'K', label: 'lines of Rust' },
      { value: 4.0, suffix: 'K', label: 'automated tests', decimals: 1 },
      { value: 122, suffix: '', label: 'modules, all mapped' },
    ],
    deeper: [
      {
        summary:
          'It sets the model up for you: it recommends the version that best fits your machine and only lists downloads from trusted uploaders. ' +
          'Updates are checked only when you click, and a download is thrown away unless its fingerprint matches.',
        highlights: [
          'Simple questions get short thinking: one quick answer went from 1,613 thinking tokens to 33',
          'Only one AI job runs at a time, and your own requests jump ahead of background work',
          'Forcing everything onto the graphics card read prompts 18 times slower; now it places the pieces itself',
          'It can make images on your own PC too, showing your place in the queue while you wait',
        ],
        inside: [
          { title: 'Fits what you have', text: 'A 35B model that on paper doesn’t fit the card runs at about 83 tokens a second once Arachnia places its pieces itself.' },
          { title: 'A newer model, sooner', text: 'Moving to a newer model gave answers 1.5 times sooner at the same raw speed, because it thinks less before answering.' },
          { title: 'Caught before launch', text: 'A memory setting that would make reading 18 times slower is spotted before launch, without loading anything.' },
          { title: 'A map of your code', text: 'It maps your code and can share that map with other AI tools; one fix removed 96% of the false links in it.' },
        ],
        stats: [
          { value: 83, suffix: ' tok/s', label: 'a 35B on a 20 GB card' },
          { value: 49, suffix: '×', label: 'shorter thinking' },
          { value: 1.5, suffix: '×', label: 'sooner to an answer', decimals: 1 },
          { value: 11, suffix: ' MB', label: 'the installer' },
        ],
      },
      {
        summary:
          'Its speed meters are not allowed to flatter: each says exactly what it measures, and a missing reading shows as a dash. ' +
          'Under 50 tokens a second is treated as a problem to fix, never as fast enough.',
        highlights: [
          'The guess-ahead trick changes nothing in the answer: it keeps only words it would have written anyway',
          'With look-ahead on, the same model writes 1.67 times faster than without it',
          'It got better by getting smaller: cloud services and experiments were cut to focus on your own PC',
          'It can write a project timeline from your past chats, and it never overwrites an existing file',
        ],
        inside: [
          { title: 'The floor', text: '50 tokens a second is the floor, and it may not be reached by cutting corners: no shrinking memory, no skipped thinking.' },
          { title: 'Up to 78', text: 'The 78 is a best case on a quiet machine; with other work running, the app’s own median has been about 52.' },
          { title: 'Tested', text: 'About 4,000 automated tests run against the app, and the build checks its own structure every time.' },
          { title: 'A calmer layout', text: 'The window went from 12 unlabelled buttons to a sidebar built around your sessions.' },
        ],
        stats: [
          { value: 50, suffix: ' tok/s', label: 'the floor, not the goal' },
          { value: 1.67, suffix: '×', label: 'faster with look-ahead', decimals: 2 },
          { value: 65, suffix: ' tok/s', label: '49K tokens deep' },
          { value: 0.62, suffix: ' s', label: 'to the first frame', decimals: 2 },
        ],
      },
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
      'Running an AI model at home usually means guessing what will fit your graphics card. ' +
      'Tessera treats a model as labelled parts and works out its memory before launch, to the megabyte. ' +
      'Every rearrangement is checked, like grammar, before anything runs.',
    highlights: [
      'Its memory forecast matched the server’s own report to the megabyte on every launch checked',
      'Each part is labelled five ways, so a move that doesn’t fit is refused before it runs',
      'A new version of a model is made in 0.4 s by reference, with no data copied',
      'Every number says how it is known: measured here, worked out, or reported by others',
    ],
    inside: [
      { title: 'Bricks and blueprints', text: 'Tiles are the bricks, lattices the blueprints for a family of models, and a fold is one finished model; a written spec defines them.' },
      { title: 'Built and run', text: 'Models are written out in the standard ONNX format: 25 of 36 run as they are, and the other 11 only work inside a larger whole.' },
      { title: 'Mid-chat switch', text: 'A model changes its settings mid-conversation in about 5 s instead of 30 s re-reading; sizes are known for 851 of 851 pieces.' },
      { title: 'Failures kept', text: 'Predictions are written down before each test. One search method failed, and it stays on record as failed, method and all.' },
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
      { value: 12, suffix: '/12', label: 'exact launches' },
      { value: 13.5, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
    deeper: [
      {
        summary:
          'The same forecast worked on models it was never built for, from a 35-billion-part model of specialists to a 70-billion one. ' +
          'It held on a gaming graphics card, a built-in chip and a plain processor. ' +
          'Along the way it built a model file no publisher offers.',
        highlights: [
          'A model file nobody ships: one group of parts upgraded, about 19% closer to the original',
          'How the parts were mixed barely mattered; how precisely each was stored mattered far more',
          'A surprise: the built-in graphics chip ran slower than the plain processor beside it',
          'Two downloads shared a 546 MB piece, byte for byte; the store keeps just one copy',
        ],
        inside: [
          { title: 'A careful governor', text: 'When memory runs short it gives up speed first, and asks before doing anything that would lower quality.' },
          { title: 'Short chats', text: 'For a short chat, re-reading is quicker; switching pays off past about 3,000 tokens, the word pieces a model reads.' },
          { title: 'A hidden slowdown', text: 'One server setting left at its default slowed the reading of a prompt from about 550 tokens a second to 24.' },
          { title: 'Smarter rounding', text: 'A heavily compressed small model went from three times worse at predicting text to within 0.1% of the original.' },
        ],
        stats: [
          { value: 19, suffix: '%', label: 'closer to full' },
          { value: 3, suffix: '', label: 'devices' },
          { value: 546, suffix: ' MB', label: 'kept once' },
          { value: 23, suffix: '×', label: 'faster prompt reading' },
        ],
      },
      {
        summary:
          'Every test has its prediction written down before it runs. ' +
          'When an idea fails, the failure is published with its method. ' +
          'A real GPT-2 model, assembled from these parts, gives the same answers as an independent copy.',
        highlights: [
          'It tried to beat an expert’s hand-tuned file at the same size, failed four times, and said so',
          'Of 3.9 billion possible arrangements, 113 were tried; most single-part gains were noise',
          'A real GPT-2 built from these parts gives the same answers as an independent copy',
          '253 freshly generated models were assembled from parts with zero faults',
        ],
        inside: [
          { title: 'Written first', text: 'Each experiment states its pass and fail line in advance, so a result can’t be bent to fit afterwards.' },
          { title: 'The winner’s curse', text: '38 of 54 single-part improvements were within measurement noise, so none of them was claimed as a gain.' },
          { title: 'Checked twice', text: 'A model built from parts is compared, number by number, with the same model built by other software.' },
          { title: 'Guarded', text: '204 automated tests guard the language, its checker and the code that writes models out.' },
        ],
        stats: [
          { value: 204, suffix: '', label: 'tests' },
          { value: 253, suffix: '', label: 'models' },
          { value: 113, suffix: '', label: 'tried' },
          { value: 3.9, suffix: 'B', label: 'possible arrangements', decimals: 1 },
        ],
      },
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
      'ThoughtSlayer runs 33 checks on every connection your PC makes and explains each in plain ' +
      'words: which program, who made it, where it is going and whether it should. Its verdicts come from lists kept ' +
      'on your own PC, so its own traffic is just name lookups and the downloads you start.',
    highlights: [
      'Once armed, it sets out decoy names unique to your PC; anything that looks one up sets off a red alert',
      'Each program’s traffic, live: the country, the network’s owner and the speed, on a 24-hour world map',
      'Catches malware checking in with its owner, data smuggled out in web names, swapped programs and more',
      'Responses start as rehearsals with an off switch, and nearly every one can be undone',
    ],
    inside: [
      { title: 'Sees', text: 'It reads Windows’ own event and connection records directly to tie each connection to a program and its publisher.' },
      { title: 'Judges', text: 'Lists on your PC, plus your own, give a verdict along with the clue that produced it and how sure it is.' },
      { title: 'Connects', text: 'Warnings from one program and those it started join one story, labelled from the MITRE ATT&CK catalogue of attacks.' },
      { title: 'Acts', text: 'Nearly every action can be undone from its history. The retro screen is hand-drawn, with a built-in guide to every term.' },
    ],
    stack: [
      ['Language', ['Rust 2021']],
      ['UI', ['egui 0.28']],
      ['System', ['ETW', 'Win32 FFI', 'Windows Firewall']],
      ['Data', ['maxminddb', 'serde', 'ipnet']],
      ['Ship', ['NSIS installer', 'SHA-256 sums']],
    ],
    stats: [
      { value: 33, suffix: '', label: 'checks, each explained' },
      { value: 3, suffix: '', label: 'ways it goes online, 2 on request' },
      { value: 440, suffix: '', label: 'automated tests' },
      { value: 50.8, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
    deeper: [
      {
        summary:
          'It notices when a remote-control app starts sending your screen to someone and asks whether you started it, because scammers use real, legitimate tools. ' +
          'It warns when a hidden program uses your microphone or camera and sends data out at the same time.',
        highlights: [
          'A program that slips into your browser to steal your logged-in sessions is caught in the act',
          'A brand-new program is watched quietly at first, then you get one card on everything it did',
          'A fake copy of a known program, sitting in the wrong folder, never inherits the real one’s trust',
          'A suspicious program can be frozen and cut off without losing its work, then thawed later',
        ],
        inside: [
          { title: 'Thieves', text: 'You copy a crypto wallet address and malware swaps in its own; it flags the swap so you can check before you paste.' },
          { title: 'Heartbeats', text: 'Malware calls home on a steady timer, like a heartbeat, and that rhythm is what gives it away.' },
          { title: 'Redirects', text: 'If a setting that steers all your traffic changes, such as your DNS or proxy, it tells you once, with before and after.' },
          { title: 'Check-up', text: 'Ask “is my PC OK?” and get five plain lines, never a green light it hasn’t earned.' },
        ],
        stats: [
          { value: 112, suffix: '', label: 'guide entries in plain words' },
          { value: 7, suffix: '', label: 'sections in the guide' },
          { value: 25, suffix: '', label: 'kinds of attack it can name' },
          { value: 5, suffix: '', label: 'lines in one check-up' },
        ],
      },
      {
        summary:
          'The tool that watches for leaks must never become one. It is a free, one-person project, used every day by the person who wrote it, ' +
          'and it began as a Python prototype before being rewritten entirely in Rust.',
        highlights: [
          'Related warnings join one incident, ranked by how serious it is, instead of fifty separate alarms',
          'When nothing changes it does no work at all: no redrawing, no polling, no busy waiting',
          'It refuses to turn off Remote Desktop while you are connected through it',
          'Every firewall rule it makes carries its name, so you can always find it and take it out',
        ],
        inside: [
          { title: 'Decoys', text: 'Decoy files skip folders that sync to the cloud, and decoy names can never reach the internet.' },
          { title: 'Small', text: 'The installer is about 11 MB, and it leans on only 11 outside libraries, all freely licensed.' },
          { title: 'Built in', text: 'File fingerprints use the cryptography already built into Windows, not an added library.' },
          { title: 'Explained', text: 'Over 100 guide entries explain each warning: what it means, what is innocent and what to do.' },
        ],
        stats: [
          { value: 11, suffix: ' MB', label: 'the installer' },
          { value: 11, suffix: '', label: 'outside libraries' },
          { value: 1, suffix: '', label: 'person who made it' },
          { value: 440, suffix: '', label: 'automated tests' },
        ],
      },
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
      'Real-time battles between Heaven and Hell, with 30 creature families and 146 moves to learn, on a campaign ' +
      'that descends into Hell or climbs into Heaven. Every creature and stage is a 3D shape written as maths ' +
      'and drawn by the graphics card: no hand-drawn art at all. Formerly Aether & Ash.',
    highlights: [
      'To evolve a creature you play its family’s own melody on an organ of eight keys',
      'Two attacks due within a quarter second clash; a timing ring decides which one lands',
      'A rival warlord grows alongside your team and picks creatures to beat your favourite types',
      'Lose a run and your fallen creatures join the choir that sings as the game opens',
    ],
    inside: [
      { title: 'Gauges, not turns', text: 'Each creature fills a tempo gauge. Quick blows are light; heavy blows wind up in plain sight and can be Broken. Stances, swaps and hazards reward reading the fight.' },
      { title: 'Everything is maths', text: 'Creatures, bosses and arenas are shapes written as formulas and drawn ray by ray, the same picture on either graphics system; a workbench and review tools check them.' },
      { title: 'Tuned by simulation', text: 'A tuner adjusts each species until it wins about half its simulated duels and 3v3 fights; 624 tests guard the rest.' },
      { title: 'A composed score', text: 'Each creature family has a hand-written theme that music theory develops as it evolves, played live in the browser (in progress).' },
    ],
    stack: [
      ['Render', ['WebGPU', 'WebGL2', 'raymarched SDF']],
      ['Audio', ['WebAudio', 'procedural score']],
      ['Language', ['JavaScript', 'ts-check']],
      ['Tooling', ['Node', 'Playwright', 'Python tools']],
    ],
    stats: [
      { value: 50, suffix: '%', label: 'win rate, tuned by sim' },
      { value: 146, suffix: '', label: 'moves to learn' },
      { value: 624, suffix: '', label: 'automated tests' },
      { value: 110, suffix: 'K', label: 'lines of JavaScript' },
    ],
    deeper: [
      {
        summary:
          'Heaven above, Hell below and the burning mortal world in between: each side’s campaign crosses it one way, three layers deep. ' +
          'The light of every scene shows who is winning, cold holy light from above and hellfire from below.',
        highlights: [
          'The whole score turns on one note: the light’s music uses B natural, the fire’s B flat',
          'The ground fights too: vents, fissures and falling stars erupt on the beat, warned ahead',
          'Thirty named Champions guard the layers, each with a title, a legend and a signature move',
          'Each boss waits behind a seal of three iron plates, broken one climb at a time',
        ],
        inside: [
          { title: 'Two campaigns', text: 'The Covenant descends through three circles of Hell; the Legion climbs three choirs of Heaven, mapped on a great stained-glass window.' },
          { title: 'The parry', text: 'Guard at the last instant before a blow lands, and you take no damage and strike back harder.' },
          { title: 'Vows', text: 'Six optional vows make a run harder for a bigger reward, such as no merchants, or every foe starting ahead.' },
          { title: 'Confessions and pacts', text: 'The Covenant’s shrines take confessions; the Legion’s roads offer pacts whose debt comes due three stops later.' },
        ],
        stats: [
          { value: 12, suffix: '', label: 'creature types' },
          { value: 84, suffix: '', label: 'creatures to meet' },
          { value: 30, suffix: '', label: 'champions' },
          { value: 6, suffix: '', label: 'vows to take' },
        ],
      },
      {
        summary:
          'A creature is a recipe of maths: for any point in space, a formula says how far it is from the creature’s skin. ' +
          'To draw it, the graphics card sends a ray through each pixel and steps it forward until it touches that skin. ' +
          'There are no image files at all.',
        highlights: [
          'The organ is tuned so nothing you play can sound wrong; improvising is part of the reward',
          'Every family’s theme grows as the creature evolves, and you hear it again on the organ',
          'Speed was tuned down after early versions let fast creatures win 70 to 80% of fights',
          'The game opens straight from its files, with no build step, on two graphics systems',
        ],
        inside: [
          { title: 'Balanced by simulation', text: 'Each species is adjusted, all six of its stats together, until it wins about half its simulated duels and team fights.' },
          { title: 'Champions tuned', text: 'Each Champion is tuned so that a prepared warband beats it about 78% of the time.' },
          { title: 'A living bestiary', text: 'Every creature you meet is engraved on a page that fills in as you master it, 84 pages in all.' },
          { title: 'Remembered', text: 'An optional Ironsoul mode makes every death final, and the game remembers the fallen by name.' },
        ],
        stats: [
          { value: 624, suffix: '', label: 'automated tests' },
          { value: 134, suffix: '', label: 'musical themes' },
          { value: 78, suffix: '%', label: 'wins against champions' },
          { value: 42, suffix: '', label: 'pieces to build a keep' },
        ],
      },
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
      'from 20 activities and builds a personality and a bond with you over time. Offline, nothing sent anywhere, and its whole ' +
      'body is drawn by code.',
    highlights: [
      'Your pet pushes, tidies and, if you let it, eats your real icons, and puts them back even after a crash',
      'It chooses from 20 activities by what it wants: fishing, juggling, dancing to your music, parkour',
      'It knows a ball that rolls behind a window is still there, and waits where it will come out',
      'Anything your pet builds folds out of the way of where you are typing',
    ],
    inside: [
      { title: 'Your desktop is its world', text: 'It lives in a see-through window redrawn every frame; the tops of your windows become ledges, and it hides behind whatever is really in front.' },
      { title: 'Moods, not scripts', text: 'What it does comes from its mood, the time of day and how close you two are; that bond is saved and unlocks new behaviour.' },
      { title: 'Drawn by code', text: 'Its body and every outfit are drawn by maths while it runs, with a home-made image encoder; text uses the free fonts Silkscreen and Pixelify Sans.' },
      { title: 'Polite by design', text: 'No internet, no meddling with other programs, nothing hidden. It counts your key presses, never what they are.' },
    ],
    stack: [
      ['Language', ['Rust 2024']],
      ['Platform', ['windows crate', 'DirectComposition', 'D3D11']],
      ['Input', ['UI Automation', 'WASAPI']],
      ['Ship', ['Inno Setup', 'portable zip']],
    ],
    stats: [
      { value: 13.7, suffix: 'K', label: 'animation frames checked', decimals: 1 },
      { value: 140, suffix: '', label: 'outfit pieces, all in code' },
      { value: 333, suffix: '', label: 'self-tests, no screen needed' },
      { value: 170.7, suffix: 'K', label: 'lines of Rust', decimals: 1 },
    ],
    deeper: [
      {
        summary:
          'Your pet gets bored of doing one thing and rotates through everything it enjoys. Drop it from a height and it turns timid; ' +
          'click it and it turns clingy. Its day follows your clock, from a morning stretch to sleep at night.',
        highlights: [
          'As your friendship grows it brings you fish, comes when you wiggle the cursor, and welcomes you home',
          'Asleep, it has a thought bubble that replays something it really did that day',
          'Lock your PC and your pet waves goodbye; unlock and it greets you, more warmly the longer you were away',
          'On a laptop it is sleepy on battery, peppy when plugged in and anxious when the battery runs low',
        ],
        inside: [
          { title: 'Seasons on your windows', text: 'Snow, autumn leaves, blossom and butterflies settle on the tops of your windows, never on your work, and flip for the southern hemisphere.' },
          { title: 'It climbs your apps', text: 'On a full-screen app it climbs the app’s own panels and toolbars as if they were shelves.' },
          { title: 'It notices', text: 'It sees that you copied or pasted, never what; when you type hard it tiptoes out of your way.' },
          { title: 'Out of sight, not gone', text: 'A minimised window isn’t gone to your pet: it glances at the taskbar and cheers when the window comes back.' },
        ],
        stats: [
          { value: 20, suffix: '', label: 'things it wants to do' },
          { value: 4, suffix: '', label: 'stages of friendship' },
          { value: 21, suffix: '', label: 'kinds of fish to catch' },
          { value: 10, suffix: '', label: 'friends who visit' },
        ],
      },
      {
        summary:
          'Your pet starts with no coins, so everything is earned: about half an hour to its first hundred. Fishing has 21 kinds of fish and 5 rods, ' +
          'and ten friends, unique to your install, drop by to visit.',
        highlights: [
          'A shiny catch is 1 in 2,400; catch all 21 kinds of fish and you earn a pufferfish body',
          'A gumball machine fills with keycaps as you type; every 40 presses become a coin',
          'Toss a coin in its fountain and it wishes for what it is missing: a fish, a friend, a rare bird',
          'Now and then a UFO beams it up; it comes back flat on its back with spiral eyes',
        ],
        inside: [
          { title: 'Friends of its own', text: 'Every install gets its own ten friends, each with a name, an outfit and a bond with your pet that grows.' },
          { title: 'Every frame checked', text: 'An audit of 13,740 animation frames found 1,044 where your pet was cut off at the edges; now there are none.' },
          { title: 'Nothing to fear', text: 'It was rebuilt so it never reads other programs’ memory, is never packed and installs the ordinary way.' },
          { title: 'Small', text: 'The whole pet downloads as a 4 MB zip.' },
        ],
        stats: [
          { value: 30, suffix: ' min', label: 'to its first 100 coins' },
          { value: 5, suffix: '', label: 'fishing rods' },
          { value: 4, suffix: ' MB', label: 'the whole pet, zipped' },
          { value: 1044, suffix: '', label: 'cut-off frames, now 0' },
        ],
      },
    ],
  },
  {
    id: 'lightify',
    name: 'Lightify',
    tagline: 'Your Spotify library in one small, fast program.',
    kind: 'Desktop music player',
    status: 'Released',
    version: 'v2.2.3 · source available',
    platform: 'Windows · Rust · Slint',
    music: '“Chill lofi inspired” by omfgdude · CC0',
    tint: '#2fd49a',
    summary:
      'Lightify shows up in your list of Spotify devices like a speaker, so your library, queue and stations ' +
      'play in a window that opens in about a seventh of a second and uses about 80 MB of memory. ' +
      'Not affiliated with Spotify; a Premium account is required.',
    highlights: [
      'Opens about seven times faster than the official desktop app: 0.13 s against 0.94 s',
      'Opens on the song you left, paused at the same spot, and never starts playing by itself',
      'Moves the music from speakers to headphones mid-song in 248 ms, without restarting it',
      'Press Ctrl+K to jump to any playlist or action; built-in tests check the sound path',
    ],
    inside: [
      { title: 'One program', text: 'Everything runs as a single program. An earlier version, built around an embedded web browser, needed nine.' },
      { title: 'Measured side by side', text: 'On the same PC as the official desktop app: about 65 MB in one program against 1,177 MB in seven.' },
      { title: 'An honest queue', text: 'The queue shows what will really play next, in the order you see, and it survives a restart.' },
      { title: 'Quiet when idle', text: 'Sitting idle it uses the processor for 16–47 ms every 30 seconds; the official app uses 609–1,984 ms.' },
    ],
    stack: [
      ['Language', ['Rust']],
      ['UI', ['Slint', 'winit']],
      ['Audio', ['librespot 0.8', 'cpal']],
      ['Runtime', ['tokio', 'reqwest']],
      ['Ship', ['Inno Setup']],
    ],
    stats: [
      { value: 134, suffix: ' ms', label: 'to open, vs 940 ms' },
      { value: 65, suffix: ' MB', label: 'memory, vs 1,177 MB' },
      { value: 1, suffix: '', label: 'program, vs 7' },
      { value: 6, suffix: ' MB', label: 'when minimised' },
    ],
    deeper: [
      {
        summary:
          'The whole window takes its colour from the album that is playing, and your library is on screen ' +
          'the moment it opens, refreshed quietly behind the scenes. ' +
          'It keeps nothing about you: no tracking, no ads and no crash reports.',
        highlights: [
          'Track and cover show in the Windows media panel and on the lock screen; media keys just work',
          'Three mini-players that stay on top: a square, a bar and a tiny 240-pixel nano',
          'Search works out the popular artist from who is credited on the top songs',
          'No text smaller than 10 pixels, and quieter text kept easy to read against the dark',
        ],
        inside: [
          { title: 'Colour from the cover', text: 'Play button, progress bar, glow and highlights all take their tint from the album art; grey covers stay neutral.' },
          { title: 'Part of Windows', text: 'The taskbar preview has its own play and skip buttons, drawn to match a light or a dark taskbar.' },
          { title: 'Ready at once', text: 'It shows the last copy of your library the moment it opens, then refreshes it quietly behind.' },
          { title: 'Nothing kept', text: 'No analytics, crash reports, ads or update checks; your settings stay in your own Windows profile.' },
        ],
        stats: [
          { value: 40, suffix: '×', label: 'less work when idle' },
          { value: 3, suffix: '', label: 'mini-player sizes' },
          { value: 40.9, suffix: ' MB', label: 'the whole app', decimals: 1 },
          { value: 10, suffix: ' px', label: 'smallest text' },
        ],
      },
      {
        summary:
          'The first version ran inside an embedded web browser: nine programs and 759 MB, about 640 MB of it the browser alone. ' +
          'So every screen was rebuilt natively, one element at a time.',
        highlights: [
          'Before the rewrite began, a test window drew the whole look in just 31.6 MB',
          'About 6,200 lines of web code and 1,900 of styling were rebuilt by hand, screen by screen',
          'Changing speakers used to take 15 seconds or hang; now a short buffer carries the song across',
          'The tray icon used to wake the app seven times a second; now it rests until you need it',
        ],
        inside: [
          { title: 'Element by element', text: 'Every button and panel of the old version was ticked off in a ledger until the new one matched it.' },
          { title: 'Fewer moving parts', text: 'Capping the playback engine’s helpers cut its background threads from 59 to 43.' },
          { title: 'Asleep when hidden', text: 'Minimised, the seek bar stops redrawing and the app uses 0–16 ms of processor every 30 seconds.' },
          { title: 'Why light matters', text: 'Less memory and less waking up mean cooler laptops, quieter fans and room for older PCs.' },
        ],
        stats: [
          { value: 9, suffix: '', label: 'programs, at first' },
          { value: 759, suffix: ' MB', label: 'the first version' },
          { value: 31.6, suffix: ' MB', label: 'the first test window', decimals: 1 },
          { value: 248, suffix: ' ms', label: 'to change speakers' },
        ],
      },
    ],
  },
  {
    id: 'doppelstream',
    name: 'DoppelStream',
    tagline: 'Live streaming where viewers can play, about 10 ms from frame drawn to frame shown.',
    kind: 'Low-latency streaming platform',
    status: 'Live service',
    version: 'v1.0.17',
    platform: 'Python · WebRTC',
    music: '“Ephemera” by Scott Buckley · CC BY 4.0',
    tint: '#ff6a2b',
    summary:
      'The streamer’s PC encodes and serves the stream, viewers watch in a browser with nothing to install, and they can press ' +
      'buttons that play the game on the streamer’s machine. One encoding is passed straight on to every viewer, never ' +
      're-encoded, and an on-screen timing rig keeps every speed claim honest.',
    highlights: [
      'Found that a video tool’s AMD encoder held each frame back until one setting was on: 14.2 ms',
      'Encoder settings scored for picture quality; on a test clip, AV1 at half the data came close to H.264',
      'Viewers’ button presses arrive as a virtual controller, and the streamer picks which buttons they get',
      'Each idea is tested in turns, 6 runs against 6, and ideas that made it worse stay on record',
    ],
    inside: [
      { title: 'Passed on, never re-encoded', text: 'The encoder’s own packets are relabelled for each viewer and sent straight on, with a hint that tells browsers to show them at once.' },
      { title: 'Timed, not guessed', text: 'A timecode painted on screen is read back in the viewer’s page. A typical frame takes 10.3 ms; 95 in 100 within 14.9 ms, on one PC.' },
      { title: 'Viewers play', text: 'Up to four viewers each get their own virtual controller, and a panic button blocks them all at once.' },
      { title: 'A whole platform', text: 'Its own server finds streams and shows who is online; accounts have email codes, friends and messages; seven site themes.' },
    ],
    stack: [
      ['Core', ['Python 3.13', 'aiortc', 'PyAV']],
      ['Media', ['FFmpeg', 'NVENC / AMF / x264']],
      ['App', ['PySide6', 'Velopack']],
      ['Web', ['Vanilla JS', 'PWA']],
      ['Server', ['aiohttp', 'coturn', 'systemd']],
    ],
    stats: [
      { value: 10.3, suffix: ' ms', label: 'a typical frame, drawn to shown', decimals: 1 },
      { value: 14.9, suffix: ' ms', label: '95 in 100 frames within', decimals: 1 },
      { value: 42, suffix: 'K', label: 'lines of Python in the app' },
      { value: 14.2, suffix: ' ms', label: 'found in one encoder setting', decimals: 1 },
    ],
    // (each chapter's first figure stays the measured median: the screens' hop stamp multiplies it)
    deeper: [
      {
        summary:
          'Viewers just open a link: nothing to install, and up to four of them can play at once, each on their own virtual Xbox controller. ' +
          'The streamer stays in charge, with a panic button that blocks every viewer’s input instantly, a controller lock and a ban list.',
        highlights: [
          'Controllers appear only when a viewer first presses a button, and vanish when the last one leaves',
          'Switching tabs releases every button, and typing in chat never presses one by accident',
          'From a button press to the picture: about 63 ms at a 50 ms ping, before the game’s own delay',
          'Also stream to Twitch, YouTube or Kick while viewers play, at up to 1080p and 60 frames a second',
        ],
        inside: [
          { title: 'No phantom controllers', text: 'The game never sees an empty controller, and the streamer’s own mouse and keyboard are never locked out.' },
          { title: 'A test before going live', text: 'A few seconds of the real capture are encoded first, to catch a stalling encoder or a stream that overshoots its data rate.' },
          { title: 'Playtests', text: 'Game developers can let testers play a build in a browser while the build and its saves stay on their own PC.' },
          { title: 'Small updates', text: 'An update to the app is a 5.7 MB patch instead of the 158 MB full package.' },
        ],
        stats: [
          { value: 10.3, suffix: ' ms', label: 'under one frame at 60 fps', decimals: 1 },
          { value: 4, suffix: '', label: 'viewers playing at once' },
          { value: 63, suffix: ' ms', label: 'button to picture, 50 ms ping' },
          { value: 5.7, suffix: ' MB', label: 'an update', decimals: 1 },
        ],
      },
      {
        summary:
          'A timecode painted on the streamer’s screen is read back in the viewer’s page, so every frame’s trip is timed rather than guessed. ' +
          'The first day of testing alone took about 154 runs and nearly three and a half hours of machine time.',
        highlights: [
          'The rig caught a bug in itself: the taskbar covered the timecode in 8 of 25 runs, so they were redone',
          'Capturing at 120 frames a second sounded faster but measured 19.5 ms slower, so it was dropped',
          'On a real game at 6 Mb/s, tuned AMD settings raised the picture-quality score from 60.7 to 68.8',
          'A baseline of 7,233 frames: every one of them decoded, and none lost',
        ],
        inside: [
          { title: 'The wrong queue', text: 'Putting controls first fixes the wrong queue: input and video travel opposite ways, and input adds only about 2.5 ms over the ping.' },
          { title: 'Not faster on the GPU', text: 'On the test PC, encoding on the graphics card was not faster than on the processor, so the processor encoder ships.' },
          { title: 'A faster screen', text: 'If your display can refresh faster, the viewer page says so, since switching saves a few milliseconds.' },
          { title: 'Encrypted', text: 'Video and controls are encrypted on their way between the streamer and every viewer.' },
        ],
        stats: [
          { value: 10.3, suffix: ' ms', label: 'the shipped default, one PC', decimals: 1 },
          { value: 154, suffix: '', label: 'test runs on the first day' },
          { value: 7.2, suffix: 'K', label: 'frames measured, none lost', decimals: 1 },
          { value: 19.5, suffix: ' ms', label: 'slower at 120 fps, dropped', decimals: 1 },
        ],
      },
    ],
  },
  {
    id: 'isoline',
    name: 'Isoline',
    tagline: 'A studio for shaping creatures out of maths, where every change is written as one line.',
    kind: 'SDF modelling studio',
    status: 'In development',
    version: 'Private',
    platform: 'Native · Rust',
    music: 'Original score, after Steve Reich',
    tint: '#9145ff',
    summary:
      'Isoline is the workshop behind Choir of Souls: it draws the game’s creatures exactly as the game does, ' +
      'edits them as data and can prove one stays in bounds in all 90 of its battle poses. Every change is one line in a log that is both the undo history and ' +
      'a replay, so a person, a script or an AI helper can drive the same session.',
    highlights: [
      'Pull on the skin and it works out which one or two numbers to change, so only that spot moves',
      'Proven in bounds in all 90 battle poses; the stored proof re-checks in 67 ms as it loads',
      'Proven between frames: the legs never cut into the body at rest (48 of 48), and the feet never skate',
      'No screen needed: scripts and AI helpers send the same commands and get back pictures and measures',
    ],
    inside: [
      { title: 'Same as the game', text: 'What you see matches the game pixel for pixel, its motion matches all 156 models, and weight and balance are measured with two million tiny cubes per pose.' },
      { title: 'The timeline', text: 'Animation is laid out as tracks with keys, layers, events and goals; 154 of the 156 creatures go in and come back out unchanged.' },
      { title: 'Sculpting as edits', text: 'Add, carve, studs, inflate, pinch, smear and flatten: a 41-point brush stroke becomes 2–5 smooth capsules, undone in one step.' },
      { title: 'Room mode', text: 'Whole halls, drawn by their own shaders, are checked for holes you could see through and for pieces floating free of the floor.' },
    ],
    stack: [
      ['Language', ['Rust 2021']],
      ['GPU', ['wgpu', 'naga', 'WGSL']],
      ['UI', ['eframe', 'egui']],
      ['Maths', ['Fidget', 'interval arithmetic', 'JIT']],
    ],
    stats: [
      { value: 90, suffix: '', label: 'poses proven' },
      { value: 43, suffix: 'K', label: 'lines of Rust' },
      { value: 233, suffix: '', label: 'tests' },
      { value: 9, suffix: '', label: 'code modules' },
    ],
    deeper: [
      {
        summary:
          'It caught real problems in the game: a creature whose idle animation pushed a hand into the floor, and two fire braziers one graphics system silently dropped. ' +
          'Across the game’s halls it raised 97 findings; 88 were fixed and 9 kept on purpose.',
        highlights: [
          'Hold a key and move the mouse while an animation plays, and the motion becomes clean keyframes',
          'It refused a tail-whip setting that would have swung the tail out of bounds in 3 of 90 poses',
          'Walking is built from where each foot lands, so the feet cannot slide across the ground',
          'One key jumps straight into the game, standing in the hall or fighting the creature you edit',
        ],
        inside: [
          { title: 'Every light has a source', text: 'In 57 seconds it checked 23 halls and found 50 lights with no torch or window to explain them.' },
          { title: 'The player’s view', text: 'It opens on the camera the player will see, and checks each creature as a tiny 56-pixel silhouette too.' },
          { title: 'Heavier trails more', text: 'Heavier parts swing behind more, worked out from each part’s own weight, so tails and wings move naturally.' },
          { title: 'Taste stays human', text: 'The tool measures and proves, but whether a design is right is always the artist’s own yes or no.' },
        ],
        stats: [
          { value: 97, suffix: '', label: 'findings' },
          { value: 88, suffix: '', label: 'fixed' },
          { value: 23, suffix: '', label: 'halls checked' },
          { value: 57, suffix: ' s', label: 'to check them all' },
        ],
      },
      {
        summary:
          'The name comes from the contour lines on a map: an isoline joins points of equal value, and a creature’s skin is one of them. ' +
          'Before it was built, every shape editor that could be found was studied; none shared one working log between a person and an AI.',
        highlights: [
          'From written plan to working core in one day; the animation studio followed the next day',
          'Of 163 hand-made creature models in the game, 113 already open mostly as editable parts',
          'Two research ideas were dropped when they failed the pass-or-fail line set before testing',
          'Running two test windows at once cut the full test run from about 15 minutes to under 5',
        ],
        inside: [
          { title: 'Pixel for pixel', text: 'Across 8 test frames, 99.1 to 100% of the pixels match what the game itself draws.' },
          { title: 'A transit map', text: 'The timeline is drawn like a train map: each frame is a station, and the playhead is the train.' },
          { title: 'Two million cubes', text: 'Weight is found by filling a creature with tiny cubes; the graphics card and a separate check agree on 24,264 of 24,266.' },
          { title: 'Helpers welcome', text: 'AI helpers get 32 tools over the same command log, and the artist can replay exactly what a helper did.' },
        ],
        stats: [
          { value: 1, suffix: ' day', label: 'plan to core' },
          { value: 113, suffix: '', label: 'models opened' },
          { value: 32, suffix: '', label: 'helper tools' },
          { value: 99.1, suffix: '%', label: 'pixels matched', decimals: 1 },
        ],
      },
    ],
  },
];
