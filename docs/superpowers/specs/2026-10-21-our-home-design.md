# Our Home — Design

A wedding-night gift for Sneha ("Gulu") from Maruf. Third site in a series:
`~/Projects/bday` (birthday garden) and `~/Projects/gulu-marriage` (scrapbook love letter).
It must feel like the same family, but be a broad, multi-page, interactive journey.

## Goals

- Opened on her phone on the wedding night (22 Oct 2026); works on desktop too.
- Recognisably "ours": reuses site two's paper-craft identity, site one's twilight glow, both sites' nicknames and in-jokes.
- Each chapter is a different kind of toy (different verb), so nothing feels repeated.
- Stays alive after tonight: revisitable, and the garden tree grows every anniversary.
- Bilingual Bengali / English, as site two.

## Non-goals

Backend, accounts, sharing, analytics, voice recording, new memories beyond one new photo.

## Concept

The wedding night is the first night of a home, so the site *is* the house. It opens on a
plain front door. Inside is a paper-cutout cross-section of a house at night with every window
dark. Each window is a room = a chapter. Finishing a room leaves its window lit. All six lit →
she hangs the nameplate on the door.

## Flow

1. **Door** (`#/door`) — the unsuspecting intro. Answer the lock → reveal the house.
2. **House hub** (`#/house`) — navigation. Tap a window → zoom into the room.
3. **Six rooms** — `#/living`, `#/kitchen`, `#/garden`, `#/rooftop`, `#/desk`, `#/empty`.
   Free roam. The living room is suggested first. The empty room is locked (taped window)
   until the other five are complete.
4. **Finale** (`#/finale`) — unlocks when all six are complete.
4b. **Reception card** (`#/card`) — unlocks with the finale; lives in the letterbox.
5. **After tonight** — hub is the home screen; every room is replayable; door is skipped once
   seen (`?door` replays it; `?skip` jumps to the hub; `?reset` clears progress).

## Visual language: paper craft at night

- Fonts: Fraunces (display), Caveat (hand), DM Sans (body), Hind Siliguri (Bengali). Google Fonts.
- Site two tokens: `--paper #fbf3e4`, `--ink #2b1d1a`, `--berry #c2254d`, `--mustard #f2b134`,
  `--butter #fbe3a4`, `--blush`, `--pink`, `--sage`, `--sky`; `--line: 2.5px solid var(--ink)`;
  `--pop: 5px 5px 0 var(--ink)`; `--bounce` easing.
- Night additions: `--night #2a1f3d` (plum), `--night-deep #1a1430`, `--indigo #3b3470`,
  `--lamp #ffcf73` (warm window light), `--lamp-glow rgba(255, 196, 92, .55)`, `--moon #fff4d6`.
- Everything is flat paper cut-outs with ink outlines and slight layered depth (parallax
  offsets, drop shadows), each scene lit by one warm light source.
- Ambient: fireflies (replace butterflies; drift, gather gently near the pointer), slow
  twinkling stars, occasional drifting star-petals. Paused in background tabs, off for
  reduced motion.
- Art is inline SVG authored in code (no image assets except photos and icons).

## Scenes

Every scene: enter → one interaction → reward → mark complete (window lights) → back to hub
via a door-icon button (top-left) or browser back. Re-entering a completed room replays it
from its start; completion is never lost.

### Door
Night paper wall, door, doormat, unlit porch lamp, blank nameplate. Line: *"who's there?"*
Below: a small brass clock-face lock with draggable hour and minute hands (snapping to
5-minute steps). Correct: **4:30** (`content.door.answer`, configurable). Wrong settings on
"try" get escalating hints from content (`door.hints[]`), never a lockout. Correct → lock
click, porch lamp flickers on, door swings inward onto warm light, camera pulls back and up,
transition to hub. First touch unlocks audio. Door is marked seen in state.

### House (hub)
Portrait composition, house fills the width; works landscape by centring with more sky.
Layout: ground floor living room (left) + kitchen (right); upper floor desk/study (left) +
empty room (right); rooftop terrace with railing and fairy lights on top; garden to the right
behind a little gate (lantern on the gate is its "window"). Sky: plum gradient, moon, stars,
fireflies.

Window states: `dark` → `suggested` (soft flicker; the first incomplete room in order
living, kitchen, garden, rooftop, desk) → `lit` (steady warm glow). Empty room shows tape
across its window until five are lit, then becomes `suggested`. Caption: *"3 of 6 lights on"*.
World reacts to progress: chimney smokes after kitchen; tree visible in garden after garden;
constellations faintly drawn in the hub sky after rooftop; desk window extra-warm after desk.
When all six are lit, the hub shows a glowing nameplate on the door and a prompt to the finale.

Transition in: house scales/translates toward the tapped window (GSAP), room fades in
behind. Out: reverse. Reduced motion: crossfade only.

### Living room — the clock (verb: scrub)
Sofa, wall of three frames, a plant, a window, a big wall clock showing live time + a date
plate. She drags the minute hand anticlockwise (pointer angle tracking, with fling momentum);
each full anticlockwise turn rewinds 1/14 of the span from now back to `togetherSince`
(20 Apr 2022, 04:30) — linear, ≈ 4 months per turn; clockwise winds forward again. Fling
momentum decays over ~1.5 s so a few flicks cross years. Time is clamped to [togetherSince, now].
While rewinding: the date plate shows the current scrubbed date; frames swap to photos whose
filename date ≤ the scrubbed date (latest three); the plant shrinks; the window sky shifts
season tint; event cards from `content.living.events[]` (date + line) pop as she passes them.
At the start (within the first 1% of the span): room dims, frames empty (photos dated at or
before `togetherSince` are excluded from the frames), a phone glows on the sofa. Tap → the
phone shows the very first photo (`content.living.firstPhoto`, the screenshot of the text) and
a message bubble *"I love you toooo"* (`content.living.firstText`). Then the clock spins forward to now
(GSAP), room relights, counter shows *"{days} days. and tonight."* → complete.

### Kitchen — recipe for us (verb: drag & stir)
Counter, stove, pot, shelf of labelled jars from `content.kitchen.ingredients[]`
(`{label, note, color}`; ~7). Drag a jar onto the pot (tap also adds). Each: plop, splash,
broth colour blends toward the ingredient colour, its `note` appears as a one-liner. All in →
a spoon appears; she stirs (circular drag; progress ring fills over ~3 turns). Then bubbles,
steam forms a heart, lid pops, a plate slides out: *"Us. Serves 2. Forever."*
(`content.kitchen.dish`) → complete.

### Garden — the birthday garden, grown (verb: hold)
Night garden behind the house: callback flowers, mushrooms and lanterns from the birthday
site, now overgrown and glowing. Fireflies gather near the pointer. A patch of soil with a
small sign. Tap soil → seed drops in. Hold (pointer down) → watering can tilts and pours while
held; growth progresses while held (~2.5 s total), pauses when released. Sapling sprouts and
a wooden tag swings on it: `content.garden.tag` ("Maruf & Sneha"). Then the sign offers
*"what will it look like?"* → ~15 s time-lapse: tree grows large, gains a swing, two chairs,
lanterns, blossoms; then eases back to the current-age tree with *"we'll get there. one year
at a time."* → complete.

Tree age is real: `years = full years since weddingDate`. Tree stage = min(years, 5) rings;
each anniversary adds a branch; during anniversary week it blossoms and shows
*"happy anniversary"*. Before the wedding date: sapling.

### Rooftop — the night sky (verb: connect)
Railing, fairy lights, water tanks, city rooftops silhouette, star field. Memory
constellations from `content.rooftop.memories[]` (`{shape, photo, date, title, text}`, 6–8).
Shapes are predefined star layouts: `flowers` (bouquet), `rickshaw`, `teacup`, `phone`,
`ring`, `cake`, `heart`, `house`. Each group's stars are brighter. Tap the group's stars in any
order; lines connect them in sequence; when a group completes, its outline drawing fades in
and a polaroid drifts up with photo, date, title, text (dismiss to continue). A memory with
`photo: null` shows the constellation's outline drawn on the polaroid's paper instead of a
photo; `date: null` omits the date line. All complete →
a shooting star crosses (repeats every ~4 s until caught; generous hitbox). Tap → *"make a
wish"*; hold while it glows (~2 s) → sparkle burst, *"it's yours. I won't ask."* → complete.

### Desk — the letter (verb: read)
Dark study, desk, lamp with pull-chain, sealed envelope, pen, inkpot. Pull the chain (drag
down) → light. Tap envelope → opens, letter unfolds. Paragraphs from `content.letter.paragraphs`
appear behind a gliding pen nib (CSS clip reveal per line, ~35 ms/char), with a pen-scratch
loop. Tap = hurry the current paragraph; long-press = show all. Sign-off then the heart
stamp: each press adds the next `content.letter.ps[]` line (last one stays). Completes when the
sign-off is shown.

### Empty room — ours to fill (verb: write)
Locked until five rooms are complete (hub shows tape; direct URL redirects to hub with a
gentle toast *"not yet — light the others first"*). Bare room, bulb, ladder, paint tray, box.
Pick a wall colour from 5 swatches → roller paints the wall (wipe animation). Then a marker
input: prompt *"things we'll do"* (`content.empty.prompt`). Each submitted note lands as a
tilted handwritten line at a free spot on the wall (simple non-overlapping placement grid).
Two or three starter notes from `content.empty.starters[]` in Maruf's ink colour; hers in
berry. Notes (≤ 140 chars, ≤ 30 notes) and wall colour persist in state. Completes the
moment the wall is painted (writing is optional).

### Finale — the nameplate
Reachable when all six are complete. Camera on the front door at night with the whole house
glowing above. A blank nameplate on the doormat and a hook on the door. She drags the plate
onto the hook (snap zone); it swings and settles; the names engrave in (stroke reveal):
`content.finale.plate` ("Maruf & Sneha") and `est. {weddingDate}`. A HELLO-my-name-is slip
slides from the letterbox: **Bou** (`content.finale.sticker`). She drags it onto the plate.
Then: every window flares, fairy lights chase, chimney puffs hearts, fireworks (ported from
bday) over the roof, music swells to the chorus. Card: *"welcome home."* + `content.finale.line`
+ *"come see the tree every year."* Button: *"back to our house"*. Finale completion is stored;
hub then stays fully lit with the nameplate showing.

### The reception card (`#/card`)
A real, formal Bangladeshi reception
card that lives in the house's letterbox. It deliberately looks *printed*, not paper-craft —
sharper, gilded, traditional — so it reads as a keepsake object inside the paper house.

Availability: unlocks with the finale. After the "welcome home" card, the letterbox in the
finale scene holds an ivory envelope (`[data-letterbox]`); afterwards the hub's front door
shows the envelope peeking from the letterbox forever, tap → `#/card`. Not a room: does not
count toward the six lights. Route guard: requires `done.finale` (toast `locked.card`).

Flow:
1. **Envelope** — ivory envelope, wax seal (berry), her name in `--card-script`. Tap/drag the
   seal → it cracks (two halves), flap opens, the card slides up out of the envelope.
2. **Gatefold** — the classic double-door, laser-cut card. Left and right doors meet in the
   middle over a jali (lattice) cut-out pattern. Swipe outward (or tap) → each door swings open
   on its hinge (CSS 3D, `rotateY`, shadowed edge). Doors' inner faces show a rose-vine border.
3. **Card face** (centre panel, portrait ~ 5:7):
   - top: optional invocation line (`card.invocation`, default none); a gold alpana medallion
     that draws itself (SVG stroke reveal, ~2 s);
   - headline: Bangla calligraphy (`card.titleBn`, `--card-bn-display`) and English caps
     beneath (`card.titleEn`, `--card-caps`);
   - host line (`card.hosts`), invitation line (`card.invite`), "to meet & bless the newlyweds";
   - names: **Maruf** ❀ **Sneha** large in `--card-script`, inside an arch of rose vines and
     lotus; the families' lines beneath (`card.groomOf`, `card.brideOf`);
   - details block: date, time, venue (`card.date`, `card.time`, `card.venue`, `card.address`)
     in `--card-serif` with small-caps labels;
   - footer: "with best compliments from" + names (`card.compliments[]`).
   Bangla and English are both on the card regardless of the site language (traditional cards
   are bilingual); the site language only changes the surrounding UI.
4. **Gold** — foil effect: a moving specular highlight across gold elements following pointer
   position, and `deviceorientation` tilt on phones (with the iOS permission prompt only after
   a tap, and silently skipped if denied). Reduced motion: static gold gradient.
5. **Optional note** — if `card.note` is set, it appears under the card in `--hand`. Default: none.
   The card is presented simply as the reception card — no framing about it not being printed.
6. **Save the card** — button renders the card face to a 1080×1512 PNG (SVG
   `foreignObject` → canvas, with local fonts inlined as data URLs) and triggers download /
   `navigator.share({ files })` where supported.
7. Flip (tap "back of the card") → back side: map link (`card.mapUrl`, optional) and a small
   alpana. 

Palette (reception style, decided default): ivory `--card-ivory #fbf6ec`, dusty pink
`--card-rose #e8b9b5`, champagne gold `--card-gold #c9a96a` / `--card-gold-hi #f3e2b3`, deep
rose text `--card-ink #6b2b3a`. Ink outlines thin (1px gold), no pop shadows — print, not paper.
Fonts (self-hosted): Galada, Tiro Bangla, Noto Serif Bengali, Pinyon Script, Cinzel,
Cormorant Garamond.

Content placeholders in `config.js` → `card` (event name, date, time, venue, hosts, families,
compliments, invocation) are clearly marked `// ← fill in` until Maruf supplies them.

## Content & i18n

- `src/content/config.js` — everything personal, English. `src/content/config.bn.js` — Bengali
  mirror (lists matched by position, missing keys fall back to English).
- `src/content/strings.js` / `strings.bn.js` — shared UI strings. Each scene keeps its own
  under `src/scenes/<id>/strings.js` + `strings.bn.js`, auto-collected under the scene id, so
  `t('kitchen.stir')` reads the kitchen's file. Scenes never edit the shared files.
- Tokens in text: `{nickname}`, `{partnerName}`, `{myName}`, `{days}`, `{weddingDate}`,
  `{sinceDate}`.
- Bengali numerals and month names for dates/numbers in `bn`.
- Language pill top-right; switching reloads into the same route. `?lang=bn|en` forces;
  choice remembered.
- Content defaults are drafted from site two's `config.js` (names, dates, nicknames, story,
  letter, P.S. list). The rooftop memories are built from existing story cards and dated
  photos, plus one new entry for the flower-bucket day (photo to be added by Maruf;
  placeholder until then). Maruf edits `config.js` and the Bengali at the end.

## Photos

`public/photos/` (+ `thumbs/`), copied from site two. `scripts/add-photos.sh` and
`scripts/make-thumbs.py` ported. A Vite virtual module (`virtual:photos`, in
`vite.config.js`) lists the folder at build/dev time; `src/photos.js` wraps it. Adding photos
means a dev-server reload locally and a rebuild (git push) in production. Dates parse from
camera-style filenames (`IMG_YYYYMMDD_…`).

## Sound

Port site two's synthesized engine (Web Audio, no files) as an ES module. House theme: a slow
music-box arrangement of the theme in `sound/theme.js` (a note table — the verse plays from the
hub onward; the chorus is reserved for the finale). Theme: *A Thousand Years* (decided — the site
is private). Per-scene layers: clock tick that speeds with scrub velocity (living), bubbles/plops
(kitchen), crickets + water (garden), wind pad + a pitched ting per connected star (rooftop),
pen scratch + lamp click (desk), marker squeak + roller (empty), bells + fireworks (finale),
door lock click + creak (door). Mode button 🎶 → 🔊 → 🔇, remembered. Audio unlocks on first
gesture (iOS-safe).

## Architecture

Vite + vanilla JS ES modules + GSAP. pnpm. No framework.

```
index.html
src/
  main.js            boot: i18n, sound, chrome (lang pill, sound button, back button), router
  router.js          hash routes, guards (door seen, empty locked, finale locked), transitions
  state.js           localStorage-backed store with subscribe(); the only module touching storage
  i18n.js            t(key), c(path) content lookup with fallback, tokens, bn numerals/dates
  photos.js          manifest, date parsing, queries
  content/           config.js · config.bn.js · strings.js · strings.bn.js
  scenes/<name>/     index.js (+ art.js, scene.css) for door, house, living, kitchen, garden,
                     rooftop, desk, empty, finale, card
  fx/                fireflies.js · stars.js · fireworks.js (from bday) · confetti.js · toast.js
  sound/             index.js (API + EFFECTS/LAYERS names) · engine.js · theme.js · layers.js
  ui/                drag.js (pointer drag/rotate/hold helpers) · polaroid.js
  styles/            tokens.css · base.css · chrome.css
public/photos/, public/icons, manifest.webmanifest, og.jpg
scripts/             add-photos.sh · make-thumbs.py · gen-photo-manifest.mjs
tests/               Playwright specs
```

### Scene contract

```js
export default {
  id: 'kitchen',
  mount(root, ctx) {},   // build DOM into root, start animations (may be async)
  unmount() {},          // kill timelines, listeners, rAF; must leave no globals behind
}
```

`ctx` (built in `src/router.js`, the source of truth):

| field | meaning |
|---|---|
| `id`, `root` | scene id, its `<section class="scene">` |
| `t(key, vars)`, `c(path, vars)` | UI string / content, tokens filled, language applied |
| `raw()`, `lang()`, `num()`, `date(d, style)`, `days()`, `fill()` | i18n helpers |
| `state` | the state module (read `get()`, `isDone()`, `suggested()`…; write via `update`, `setWall`, `addNote`) |
| `sound`, `fx`, `photos` | the APIs in `src/sound/index.js`, `src/fx/index.js`, `src/photos.js` |
| `reduced` | `prefers-reduced-motion` boolean, sampled at mount |
| `params` | `URLSearchParams` of the page |
| `from` | id of the scene we came from, or `null` (house uses it to zoom out of the right window) |
| `go(id)`, `back()` | navigate; `back()` = house |
| `complete(roomId = id)` | mark done (idempotent); first time toasts + chimes; sets `data-done` on root |
| `onCleanup(fn)` | run after `unmount()` |

The router owns a plain crossfade between scenes. The *zoom-through-window* lives in the house
scene: on tap it zooms its own art toward the window (~0.6 s) then calls `go(room)`; when
mounted with `from` = a room, it starts zoomed on that window and zooms out.

`ctx.complete()` marks the room done in state (idempotent) and plays the shared "window lit"
reward toast; the scene decides when to offer "back to the house". Scenes never call
localStorage directly; scenes do not import each other.

### State shape (`localStorage['our-home']`, JSON)

```js
{ v: 1, doorSeen: false, done: { living, kitchen, garden, rooftop, desk, empty, finale },
  empty: { wall: null, notes: [] }, lang: 'en', sound: 'all' }
```

### Resilience

`prefers-reduced-motion` → crossfades, no ambient, instant reveals. Background tab pauses rAF
loops. Private mode → in-memory state fallback. PWA: manifest + precache service worker
(built asset list + photos) so it loads offline after first visit. OG image of the dark door;
nginx fills the domain into OG tags like site two.

### Deploy

Multi-stage Dockerfile: node:24-alpine + pnpm build → nginx:stable-alpine with site two's
hardened config (security headers, gzip, `/healthz`, SPA-safe, cache headers for hashed
assets). `docker-compose.yml` (prod: no host ports, read-only, healthcheck; works on Dokploy
and Coolify), `docker-compose.override.yml` for local dev (Vite dev server with HMR, port
published). Dev commands use `exec` so containers stop instantly.

## Verification

Playwright (Chromium, mobile viewport 390×844 + desktop 1280×800):
- Door rejects 4:15 with a hint, accepts 4:30, lands on hub; second visit skips the door.
- Every route mounts without console errors.
- Each room has a test hook `?debug` exposing `window.__home.complete(id)`; tests also drive
  each room's real interaction at least once (scrub, drags, hold, star taps, chain, swatch +
  note, plate + sticker drags).
- Completing a room lights its hub window; empty room locked until five; finale until six.
- Language switch preserves route and renders Bengali.
- Reduced-motion run renders every scene.
- Screenshots of every scene at mobile size for visual review.
- `docker compose -f docker-compose.yml build` succeeds and `/healthz` returns 200.
Manual: real Android + iPhone, including sound unlock on iOS.
