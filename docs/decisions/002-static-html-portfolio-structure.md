# ADR-002: Static HTML Portfolio Structure

**Status:** Accepted  
**Date:** 2026-03-20

---

## Context

The portfolio is a personal site showcasing AI engineering work. The structure question was: how should the site be built?

Options considered:

| Option | Notes |
|---|---|
| **Plain HTML/CSS/JS** | Maximum simplicity, zero dependencies, no build step |
| Static Site Generator (Jekyll, Hugo, Eleventy) | Templating and markdown, but adds a build step and dependency chain |
| React / Next.js | Rich interactivity, but massive overhead for a portfolio |
| WordPress / CMS | Easy content editing, but backend, database, and security surface |
| Webflow / Squarespace | No-code, but no version control, no code ownership |

The primary constraints were:

1. The site is primarily a showcase, not a content-heavy blog or app.
2. Deployment is via Cloudflare Pages (see ADR-001), which supports zero-build-step static files natively.
3. Maintenance should be minimal; the owner is an AI Engineer, not primarily a web developer.
4. AI coding agents (Claude, Copilot, etc.) should be able to safely edit the site without needing a local dev environment.

---

## Decision

Use **plain, hand-written HTML/CSS/JavaScript** with all assets embedded directly in each HTML file.

- `index.html` contains all CSS in a `<style>` block and all JS in a `<script>` block.
- Project pages in `projects/` follow the same self-contained convention.
- No CSS frameworks, no JavaScript frameworks, no package managers, no build tools.
- All custom classes use the `nw-` prefix for namespacing.

---

## Consequences

**Benefits:**

- Zero build step — files are edited and deployed as-is.
- No dependency chain to audit, update, or break.
- Any text editor or AI agent can edit the site safely with no environment setup.
- The site is fully inspectable: view source = the full source.
- Extremely fast — a single HTML file loads in one request with no render-blocking resources.

**Trade-offs:**

- Shared styles must be duplicated across pages (no shared CSS file, by design choice for simplicity — reconsidering this is a valid future ADR).
- No templating means structural changes (header, footer) require editing each file.
- Heavy interactivity (e.g., a dynamic project filter) would require verbose vanilla JS; if that becomes a need, a new ADR should evaluate lightweight options.

**Constraints locked in:**

- No Node.js, npm, bundlers, or build tools without a new ADR.
- No CSS frameworks or JavaScript frameworks without a new ADR.
- The `nw-` class prefix convention must be maintained.
- JavaScript must remain minimal and vanilla — no large libraries.
