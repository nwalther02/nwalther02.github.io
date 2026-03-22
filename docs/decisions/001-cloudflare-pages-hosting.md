# ADR-001: Cloudflare Pages Hosting

**Status:** Accepted  
**Date:** 2026-03-20

---

## Context

The portfolio needs a hosting platform that is:

- Free (or very low cost) at personal-portfolio scale.
- Automatically deployed from the GitHub repository without manual steps.
- Fast globally (CDN-backed) to present a professional, snappy experience.
- Simple to manage — no servers, no ops, no certificates to renew manually.

Options considered:

| Option | Notes |
|---|---|
| GitHub Pages | Free, native GitHub integration, but limited CDN and fewer edge locations |
| Netlify | Free tier, good DX, but introduces another vendor account |
| Vercel | Free tier, excellent DX, but optimized for JS frameworks |
| **Cloudflare Pages** | Free tier, global edge network, native GitHub integration, no build required for static files |
| Self-hosted VPS | Full control but operational overhead, cost, and cert management |

---

## Decision

Use **Cloudflare Pages** as the hosting platform, connected directly to the `main` branch of `nwalther02/nwalther02.github.io` on GitHub.

- Auto-deploy on every push to `main`.
- No build command — static files are served directly.
- Custom domain support via Cloudflare DNS if needed later.

---

## Consequences

**Benefits:**

- Zero-configuration deployment: push to `main` = live in ~30 seconds.
- Cloudflare's global edge network provides fast load times worldwide.
- No monthly cost for a personal portfolio with modest traffic.
- PR preview deployments are available if enabled in Cloudflare Pages settings.

**Trade-offs:**

- The site is tightly coupled to Cloudflare Pages for deployment; migrating would require updating the deploy pipeline.
- Cloudflare Pages build minutes and bandwidth limits apply at scale (not a concern at portfolio scale).
- Dynamic server-side features (databases, APIs) are not available without Cloudflare Workers (which would require a new ADR).

**Constraints locked in:**

- `main` is always the production branch.
- No manual deploy steps; the only deploy mechanism is a push to `main`.
