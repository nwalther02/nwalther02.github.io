# Architecture

> **Last updated:** 2026-03-22
> **Status:** Current

This document describes the structure, deployment model, and design constraints of the portfolio site.

---

## Overview

The site is a **single-page-oriented static HTML portfolio**. There is no build step, no framework, and no server-side logic. Every file that ships is a file you can read directly in the repo.

---

## File Layout

```
nwalther02.github.io/
├── index.html                  # Main portfolio (all HTML, CSS, JS embedded)
├── projects/
│   └── ai-teacher-dashboard.html   # Individual project page
├── docs/
│   ├── llms.txt                # AI agent orientation (machine-readable)
│   ├── ARCHITECTURE.md         # ← this file
│   └── decisions/
│       ├── README.md           # ADR index
│       ├── 001-cloudflare-pages-hosting.md
│       └── 002-static-html-portfolio-structure.md
├── CHANGELOG.md
├── DOCS_STANDARDS.md
└── README.md
```

---

## Hosting & Deployment

| Property | Value |
|---|---|
| Host | Cloudflare Pages |
| Source | GitHub (`nwalther02/nwalther02.github.io`) |
| Production branch | `main` |
| Build command | *(none — static files served directly)* |
| Deploy trigger | Push to `main` → auto-deploy |
| CDN | Cloudflare global edge network |

Pushes to `main` deploy to production within ~30 seconds. All other branches are preview-only (Cloudflare Pages preview URLs if configured).

---

## `index.html` — Embedded Architecture

All CSS and JavaScript are embedded directly in `index.html` inside `<style>` and `<script>` tags. This is an intentional design choice (see ADR-002) that:

- Eliminates extra HTTP requests for a single-page portfolio.
- Makes the entire page self-contained and inspectable.
- Avoids a build step or asset pipeline.

**Exceptions:** Two external services are loaded at the top of `<head>`:

- **Google Fonts** — loads `IBM Plex Mono` and `Inter` typefaces via `fonts.googleapis.com`. Removing these would fall back to system fonts and change the visual design.
- **Google Tag Manager / Analytics** — a single async `<script>` tag that loads the GA4 tracking snippet. This is analytics-only and has no effect on page rendering.

These are the only external dependencies; all other CSS and JS remain inline.

### CSS Custom Properties

Global design tokens are defined in `:root` at the top of the `<style>` block:

```css
:root {
  --bg: #111010;
  --bg-card: #1E1C1A;
  --primary: #00E639;                    /* Green accent — brand color */
  --accent: #22d3ee;                     /* Cyan accent */
  --text: #D6D0C8;
  --text-muted: #7A756D;
  --text-dim: rgba(214, 208, 200, 0.35);
  --border: rgba(0, 230, 57, 0.13);
  --border-hover: rgba(0, 230, 57, 0.55);
  --font-mono: 'IBM Plex Mono', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

### Component Classes

All custom classes use the `nw-` prefix (Nick Walther) to avoid conflicts:

| Prefix | Purpose |
|---|---|
| `nw-np-*` | Now Playing card components |
| `nw-card` | Skills/feature cards |
| `nw-bio-*` | Biography and "Currently" section |
| `nw-contact` | Contact/footer row |

### JavaScript

Minimal vanilla JS, embedded in a single `<script>` block at the bottom of `index.html`. Current responsibilities:

- **Typewriter effect** — "NOW PLAYING" text on Now Playing card hover.
- **Marquee width calculation** — Sets `--loop-w` CSS custom property per card for seamless subtitle scroll.
- **Role rotator** — Cycles through role titles in the hero section.

**Exception:** A Google Tag Manager/Analytics snippet (`gtag.js`) is loaded via an external `<script async>` tag in `<head>`. This is the only external JS dependency; it is analytics-only and does not affect page behaviour.

---

## Project Pages

Individual project pages live in `projects/`. They are standalone HTML files that:

- Link back to `index.html` with `← Back to home`.
- Are self-contained (no shared CSS/JS file required).
- Follow the same embedded-style convention as `index.html`.

---

## Constraints

The following constraints are locked in by ADR-001 and ADR-002 and must not be changed without a new ADR and explicit human approval:

1. **No Node.js, npm, or package managers** in the build or dev workflow.
2. **No static site generators** (Jekyll, Hugo, Eleventy, etc.).
3. **No CSS frameworks** (Tailwind, Bootstrap, etc.) — hand-written CSS only.
4. **No JavaScript frameworks** (React, Vue, etc.) — vanilla JS only.
5. **Cloudflare Pages** remains the hosting platform.
6. **`main` is the production branch** — no manual deploy steps.

---

## Related Docs

- [ADR-001: Cloudflare Pages Hosting](./decisions/001-cloudflare-pages-hosting.md)
- [ADR-002: Static HTML Portfolio Structure](./decisions/002-static-html-portfolio-structure.md)
- [Changelog](../CHANGELOG.md)
- [Documentation Standards](../DOCS_STANDARDS.md)
