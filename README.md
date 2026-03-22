# Nick Walther – Portfolio

> Static HTML portfolio showcasing AI engineering projects and educational technology work.  
> Live at **[nwalther02.github.io](https://nwalther02.github.io)** via GitHub → Cloudflare Pages.

---

## About

I'm Nick Walther — AI Engineer, EdTech educator, and creative technologist based in Hobe Sound, FL. This repo is the source for my personal portfolio, built as a deliberately simple, fast, and CDN-friendly static site.

---

## Project Structure

```
nwalther02.github.io/
├── index.html                  # Main portfolio page (HTML + CSS + JS, all embedded)
├── projects/
│   └── ai-teacher-dashboard.html
├── docs/
│   ├── llms.txt                # AI agent orientation file
│   ├── ARCHITECTURE.md         # Site architecture overview
│   └── decisions/
│       ├── README.md           # ADR index
│       ├── 001-cloudflare-pages-hosting.md
│       └── 002-static-html-portfolio-structure.md
├── CHANGELOG.md
├── DOCS_STANDARDS.md
└── README.md                   # ← you are here
```

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Hosting | Cloudflare Pages | Free tier, edge CDN, GitHub auto-deploy |
| Structure | Static HTML/CSS/JS | No build step, no dependencies, maximum portability |
| Deployment | `main` branch → auto-deploy | Push to merge = live in ~30s |

---

## Workflow

1. **All work happens on feature branches.** The `main` branch is production.
2. **No build step.** Edit files directly — what you write is what ships.
3. **Docs are first-class.** Every behavior change must have a matching doc update (see `DOCS_STANDARDS.md`).
4. **Changelog-driven.** All notable changes are recorded in `CHANGELOG.md` under `[Unreleased]` until a version tag is cut.

### Local Preview

Open `index.html` directly in a browser, or use any static file server. Per the repo architecture docs, Node/npm is **not** part of the required dev workflow; the Node-based option below is purely optional for contributors who already have it installed.

```bash
# Python (primary supported option)
python -m http.server 8080

# Optional: if you already use Node locally (not required or expected by this repo)
npx serve .
```

---

## Documentation

| File | Purpose |
|---|---|
| `docs/llms.txt` | Orients AI coding agents to this repo |
| `docs/ARCHITECTURE.md` | Site structure and design decisions |
| `docs/decisions/` | Architecture Decision Records (ADRs) |
| `DOCS_STANDARDS.md` | Required sections, formatting, and PR gates |
| `CHANGELOG.md` | History of all notable changes |

---

## Contributing / Editing

This is a personal portfolio. Direct contributions aren't expected, but if you're an AI agent working in this repo, start with `docs/llms.txt` for orientation, then `DOCS_STANDARDS.md` for required doc hygiene.

---

## License

Personal portfolio — all rights reserved. Code patterns may be freely studied.
