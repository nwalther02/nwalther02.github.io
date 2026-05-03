# Changelog

---

## [Unreleased] — 2026-05-03 · Workout PWA: UI Upgrade + Functional Patches

### Changed

**PWA visual and layout upgrade (Android + desktop Chrome)**
- CSS now uses an `oklch` token layer behind `@supports`, with hex fallback values for older browsers — no visual change in supported browsers, full compatibility retained elsewhere
- `min-height: 100dvh` replaces `100vh` throughout, eliminating address-bar resize jank on Android Chrome
- Safe-area tokens `--safe-t`, `--safe-l`, `--safe-r` added alongside the existing `--safe-b` for full notch/island coverage on iOS and Android
- View-transition keyframes added (120ms fade-out / 180ms fade-in) — view switches now animate via `document.startViewTransition`; fires only on actual view changes, not on every input or persist call
- `--green` CSS token replaces the hardcoded `#4ade80` value used in the Drive sync badge

**Desktop layout (≥ 900px breakpoint)**
- Fixed 220 px left navigation rail: wordmark, Programs, History, and Drive nav items rendered as a persistent sidebar
- Body `padding-left` matches the rail width; `#app` widens to 720 px, left-aligned
- Bottom sheet becomes a centered 480 px modal at this breakpoint (CSS only — no JS change)
- Rail buttons receive `.rail-active` class to highlight the active view; updated after each `render()` call

### Fixed

**T1 — Data integrity**
- `submitExToSession()`: `equipment` field is now included when saving custom exercises to the `wl3_exercises` library key; previously, exercises saved without it silently defaulted to `dumbbell` on re-read
- `hydrate()`: session drafts with exercises are now restored even when `startedAt` is not yet set; unstarted drafts that already contained exercise entries were previously silently lost on page refresh

**T2 — Slug standardization**
- `normalizeExerciseName()` rewritten as a single-pass function: preserves hyphens within words, strips non-word/non-hyphen characters, then slugifies — `'Chin-up'` → `'chin-up'`, `'DB Row (One-Arm)'` → `'db-row-one-arm'`. All existing exercise names verified against the new path

**T3 — Progression rounding trap**
- `computeProgression()`: after the ceiling check, the snapped new virtual weight is now compared to the snapped current weight; `isRepTarget: true` is set when the suggestion snaps flat (sub-20 lb dumbbell accessories were previously showing an identical weight as the suggestion with no indication)
- `rSuggestionHint()`: renders `"Hold ~X lb — target +1 rep"` when `isRepTarget` is true

**T4 — Suggestion UI placement**
- `rExercise()`: suggestion hint removed from the exercise header; re-injected directly between the column-label row and the first set row inside the set grid — the `border-bottom` moves to the hint wrapper when a hint is present

**T5 — Migration retry guard**
- `runMigration()` catch block: `LS_SCHEMA_V1` is now set to `'error'` on failure, preventing the migration from re-running on every boot when corrupted `localStorage` causes a throw

### Files changed
- `workout/index.html` — CSS token layer, dynamic viewport units, safe-area tokens, view transitions, desktop rail layout, bottom-sheet modal, T1–T5 patches

---

## v1.4.0 — 2026-05-02 · Iron Logic PWA Integration + Home-Gym Conversion

### Added

**Iron Logic progression engine ported to browser PWA**
- Full workout generator ported into `workout/index.html` — eliminates the previous manual "generate with Claude → type into app" workflow
- On every program session the engine reads last logged sets from `wl3_history`, applies a +2.5% virtual-weight step through the RPE gate, detects the 40 lb dumbbell ceiling, and displays a `"Suggested: ~X lb"` hint on each exercise card
- Rotation tracker: the program picker now shows an "Up Next" banner indicating which template (Upper A/B, Lower A/B) is due next; starting a session advances the rotation pointer in `localStorage`

**Dry-run migration**
- `runMigration()` prints a `console.table()` showing every historical exercise's name → slug match before writing anything, then applies and sets a one-time guard flag (`wl3_schema_v1`)

**Backup / Restore**
- History view gains an **Export** button (full JSON download) and an **Import** button (merge by session ID, prefers newer `savedAt` timestamp)

**PWA installability**
- `workout/manifest.json` — Web App Manifest enabling "Add to Home Screen" on Android
- `workout/sw.js` — network-first service worker with cache fallback for offline app-shell loading
- `workout/icons/` — PNG icons derived from Iron Logic badge artwork (192 × 192 and 512 × 512)

**Exercise library UI**
- Users can create named exercises from within a session via a bottom-sheet creation panel; custom exercises are saved to `localStorage` and immediately available in the session

**Iron Logic backend module (`workout/iron-logic/`)**
- `schema.sql` — normalized SQLite V1 schema: `techniques`, `equipment_types`, `exercises`, `workout_templates`, `template_slots`, `sessions`, `set_log`; includes `virtual_weight_lbs` lineage column and `mds_fallback_id` chain for dumbbell ceiling logic
- `generator.py` — pure Python, deterministic progressive overload engine: anchor lift rule (+2.5% when RPE ≤ 8, hold + rep-target when > 8), ceiling resolver (gap → Tempo / Myo-reps / MDS), accessory rotation scorer (Novelty + Angle_Variance + Equipment_Fit)
- `README.md` — full documentation of the schema tables, generator constants, progression rules, gap-to-technique mapping, and rotation scorer formula

### Changed

**Home-gym exercise replacement (PR #31)**

All 6 machine-tagged exercises removed from program templates and replaced with barbell, dumbbell, and bodyweight alternatives compatible with the available home gym (rack, bench, pull-up bar, dumbbells):

| Day | Removed | Replaced with | Equipment | Rep Range |
|---|---|---|---|---|
| Upper A | Lat Pulldown | Chin-up | bodyweight (pull-up bar, underhand) | 6–10 |
| Upper A | Tricep Pushdown | DB Overhead Tricep Extension | dumbbell | 10–15 |
| Upper B | Cable Row | DB Row (One-Arm) | dumbbell + bench | 8–12 |
| Upper B | Face Pull | DB Rear Delt Fly | dumbbell | 15–20 |
| Lower A | Leg Press | Barbell Front Squat | barbell (rack) | 6–10 |
| Lower A | Leg Curl (Machine) | Lying DB Leg Curl | dumbbell + bench | 10–15 |

`STARTING_WEIGHTS` entries added for all 6 new exercises so the progression engine can seed them on first use:
- `chin-up`: 0 lb (bodyweight)
- `db-overhead-tricep-extension`: 20 lb
- `db-row` (one-arm): 35 lb
- `db-rear-delt-fly`: 15 lb
- `barbell-front-squat`: 65 lb
- `lying-db-leg-curl`: 15 lb

**Schema and README sync (PR #32)**
- `schema.sql`: exercises 19–21 added (`Barbell Front Squat`, `DB Rear Delt Fly`, `Lying DB Leg Curl`); Chin-up metadata enriched with drive-elbows cue and `add_load_at_top_of_range` flag; all four template slot blocks realigned to current program
- `README.md`: exercise count updated 18 → 21 (4 → 5 barbell accessories, 10 → 12 dumbbell accessories); per-template slot listing added so program structure is readable without parsing SQL

### Files changed
- `workout/index.html` — progression engine, rotation tracker, migration, backup/restore, exercise library, PWA links, home-gym exercises, `STARTING_WEIGHTS`
- `workout/manifest.json` — created
- `workout/sw.js` — created
- `workout/icons/icon-192.png`, `workout/icons/icon-512.png` — created
- `workout/iron-logic/schema.sql` — created, then updated with exercises 19–21 and slot realignment
- `workout/iron-logic/generator.py` — created
- `workout/iron-logic/README.md` — created

---

## v1.3.0 — 2026-05-01 · Google Drive Sync + Workout Logger

### Added

**Google Drive appdata sync (PR #27)**
- Full Drive appdata persistence module added to `workout/index.html`
- Silent token restore on page load — if a valid Drive token exists the app re-authenticates without prompting
- Debounced 2 s save to Drive on every history change — never blocks the UI
- Merge-on-load: Drive history and local history are reconciled on first sign-in, preferring the newer `savedAt` timestamp for each session
- Sync badge indicator cycling through `Local` / `Syncing…` / `Synced ✓` / error states

**Workout logger foundation**
- Initial `workout/index.html` created (commit `fec7042`) — a barebones progressive web logger for tracking sets, reps, and RPE
- `localStorage` keys `wl3_session` (in-progress session) and `wl3_history` (saved sessions) established; history entries receive a `savedAt` ISO timestamp on save

### Notes
- Before deploying, `https://nickwalther.me` must be added as an **Authorized JavaScript origin** in Google Cloud Console → APIs & Services → Credentials for the OAuth client; without this the ☁ Drive button silently fails in production

### Files changed
- `workout/index.html` — created (initial logger), then replaced with full Drive-sync version (+306 lines / −6 lines)

---

## v1.2.0 — 2026-03-24 · CSS Token Reference Sync

### Changed

**CSS token documentation sync (PRs #23, #26)**
- Documentation and token references brought into alignment with the actual CSS custom properties used in `index.html`
- Stale or mismatched token names corrected in supporting docs

### Files changed
- `index.html` — reviewed and confirmed stable; no behavior changes
- Documentation files updated to match actual token names

---

## v1.1.0 — 2026-03-22 · Milestone 2: Second Code Push (Refinement)

This milestone marks the second code push following the initial Now Playing cards launch. It captures the polish pass applied after the v1.0.0 release and locks in the current site state as a stable, reviewed baseline.

### Refined

**Hero section**
- Typewriter now cycles through four role labels: `AI Engineer_`, `Software Developer_`, `Technology Educator_`, `Curriculum Designer_`
- Role erase/retype loop runs indefinitely with smooth erase at 45ms/char and type at 80ms/char

**Project cards (`.nw-card`)**
- Staggered reveal on scroll via `IntersectionObserver` (80ms delay per card index)
- 3-D tilt on `mousemove` using `perspective(1000px) rotateX/Y` clamped to ±10°
- `mousedown`/`mouseup` press-in effect (`scale(0.985)` → `scale(1.01)`)
- Cards enter from `translateY(28px)` opacity-0 and land at natural position

**Now Playing cards (`.nw-np-card`)**
- `--loop-w` CSS custom property now set via `offsetWidth` measurement at page-load for pixel-perfect marquee alignment
- Typewriter phrase (`NOW PLAYING`, 40 ms/char) and marquee correctly reset on mouse-leave with no residual animation state

**Contact / footer**
- Footer copy, philosophy quote, and open-to-collaborations label present and styled

### Added

- `docs/llms.txt` — agent orientation file describing repo purpose, constraints, doc standards, and safe operation rules for AI coding agents (Claude, Copilot, Cursor, Perplexity)
- `CHANGELOG.md` — this file; all future behavior changes must be logged here before merging

### Files changed
- `index.html` — hero typewriter, card interactions, and NP-card JS all reviewed and confirmed stable
- `docs/llms.txt` — created as v1.1.0 documentation artifact
- `CHANGELOG.md` — milestone 2 entry added

---

## v1.0.0 — 2026-03-20

### Currently Section — Now Playing Cards Redesign

The Currently section has been redesigned from a plain list into a 2×2 grid of interactive Now Playing cards, inspired by the Spotify and Apple Music widget aesthetic.

#### What changed

**Resting state**
- Dim green dot in the top-left corner
- Title and subtitle at reduced opacity
- Progress bar faded

**On hover** (all transitions unified)
- Dot brightens with a green glow
- NOW PLAYING types out letter by letter (440ms for the full 11-character phrase at 40ms/char)
- Title lifts to full white
- Subtitle lifts to full brightness and begins a seamless infinite marquee
- A white scrubber dot appears on the progress bar at the playhead position
- Card lifts with `translateY(-3px)`, green border glow, and a green top-edge accent line

**On mouse-leave**
- Everything resets instantly: typewriter clears, dot dims, text returns to resting opacity, marquee pauses

#### Removed
- SVG icon squares / emoji-style boxes that previously sat on the left of each list item
- Old list styles: `.nw-bio-currently li`, `.nw-bio-currently li::before`, `.nw-li-label`, `.nw-li-meta`

#### New classes added

| Class | Purpose |
|---|---|
| `nw-np-card` | Card shell — replaces `li` styles |
| `nw-np-header` | Row containing dot + typewriter |
| `nw-np-dot` | Small green indicator dot |
| `nw-np-typewriter` | NOW PLAYING typewriter target span |
| `nw-np-title` | Bold activity title |
| `nw-np-sub` | Clipping container for subtitle marquee |
| `nw-np-track` | Animating inner track (holds two text copies) |
| `nw-np-copy` | One copy of the subtitle text |
| `nw-np-sep` | Separator between copies |
| `nw-np-progress` | Progress bar wrapper |
| `nw-np-bar` | Track background of the progress bar |
| `nw-np-fill` | Green filled portion of the progress bar |
| `nw-np-scrubber` | White dot at the playhead position |

#### New CSS custom property

| Property | Set by | Used by |
|---|---|---|
| `--loop-w` | JavaScript at runtime (per card) | `@keyframes nwLoop` marquee translate distance |

#### Current card content

| Title | Subtitle | Fill |
|---|---|---|
| Teaching Robotics, CS & AI Dev | The Pine School · Hobe Sound, FL | 20% |
| Teaching How To Operate | Windows 11 · MacOS · ChromeOS | 38% |
| Exploring ChatGPT, Gemini, Claude & Perplexity | AI Tools for Students and Teachers | 56% |
| Writing JavaScript & Python | Education Technology | 74% |

#### Final polish

- Removed pipe character from page title for cleaner browser tab display
- Changed scroll-snap behavior from `mandatory` to `proximity` for smoother, more natural scrolling

#### Files changed
- `index.html` — HTML, CSS, and JS all embedded
