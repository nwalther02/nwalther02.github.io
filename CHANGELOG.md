# Changelog

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
