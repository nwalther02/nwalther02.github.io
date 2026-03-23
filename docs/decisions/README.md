# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the portfolio site. Each ADR documents a significant technical or structural decision, its context, and its trade-offs.

For the ADR format and standards, see [`DOCS_STANDARDS.md`](../../DOCS_STANDARDS.md).

---

## Index

| # | Title | Status | Date |
|---|---|---|---|
| [ADR-001](./001-cloudflare-pages-hosting.md) | Cloudflare Pages Hosting | Accepted | 2026-03-20 |
| [ADR-002](./002-static-html-portfolio-structure.md) | Static HTML Portfolio Structure | Accepted | 2026-03-20 |

---

## How to Add an ADR

1. Copy the template from `DOCS_STANDARDS.md`.
2. Name the file `NNN-short-title.md` using the next sequential number.
3. Add a row to the index table above.
4. Update `docs/llms.txt` to reference the new ADR under **Key Docs** if it affects agent orientation.
5. Note the ADR in `CHANGELOG.md` under `[Unreleased]`.
