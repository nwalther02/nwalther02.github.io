# Documentation Standards

This file defines the required structure, formatting, and quality gates for all documentation in this repository. Every agent and contributor must follow these standards before changes are merged to `main`.

---

## Core Principle

**Documentation is a first-class artifact.** A code or content change is not complete until its matching documentation is written or updated. "Ship the doc with the diff" is the rule.

---

## Required Documents

The following files must always be accurate and up to date:

| File | Owner | Updated When |
|---|---|---|
| `README.md` | Any contributor | Project structure, workflow, or tech stack changes |
| `CHANGELOG.md` | Any contributor | Any notable change (feature, fix, removal, doc) |
| `DOCS_STANDARDS.md` | Any contributor | Doc process or quality bar changes |
| `docs/ARCHITECTURE.md` | Any contributor | Site structure or deployment changes |
| `docs/decisions/README.md` | Any contributor | New ADR is added |
| `docs/decisions/*.md` | ADR author | Decision is made or revisited |
| `docs/llms.txt` | Any contributor | Agent orientation needs updating |

---

## Changelog Format

Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions inside `CHANGELOG.md`.

```markdown
## [Unreleased]

### Added
- Description of new feature or file.

### Changed
- Description of modified behavior or content.

### Fixed
- Description of bug or error corrected.

### Removed
- Description of deleted feature, file, or behavior.
```

- Use present tense, imperative mood: "Add card component" not "Added" or "Adding".
- One bullet per logical change; group related bullets under one heading.
- Move `[Unreleased]` entries to a version block (e.g., `## v1.1.0 — YYYY-MM-DD`) when a release tag is cut.

---

## ADR Format

Each Architecture Decision Record lives in `docs/decisions/NNN-short-title.md` and must contain these sections:

```markdown
# ADR-NNN: Title

**Status:** Proposed | Accepted | Superseded | Deprecated  
**Date:** YYYY-MM-DD

## Context
What problem or situation prompted this decision?

## Decision
What was decided?

## Consequences
What are the trade-offs, benefits, and risks of this decision?
```

- Keep ADRs immutable once Accepted; create a new ADR to supersede one.
- Link the new ADR back to the old one in its Context section.
- Add every new ADR to `docs/decisions/README.md`.

---

## Markdown Style

- Use ATX-style headings (`#`, `##`, `###`), not underline style.
- Use fenced code blocks with a language hint (` ```html `, ` ```bash `, etc.).
- Use tables for structured comparisons; keep them narrow (≤ 4 columns is ideal).
- One blank line between paragraphs and between a heading and its first paragraph.
- No trailing whitespace; files end with a single newline.
- Prefer relative links between docs (`./ARCHITECTURE.md`, `../CHANGELOG.md`).

---

## PR Gates

Before any pull request may be merged to `main`, confirm:

- [ ] `CHANGELOG.md` has been updated under `[Unreleased]`.
- [ ] Any new architectural decision has an ADR in `docs/decisions/`.
- [ ] `README.md` is accurate (structure table, tech stack, workflow).
- [ ] `docs/ARCHITECTURE.md` reflects the current state if the site structure changed.
- [ ] `docs/llms.txt` is updated if agent orientation needs to change.
- [ ] No secrets, API keys, or credentials are present in any file.
- [ ] All Markdown files pass the formatting rules above.

---

## Documentation Review Cadence

A documentation review should be performed:

1. **On every PR** – check the gates above before merging.
2. **Monthly** – skim all docs for staleness; open a `docs:` branch to refresh anything out of date.
3. **After any significant change** – if a project is added, a decision is revisited, or the deployment setup changes, treat the docs update as part of the same task.

The documentation-specialist agent (`docs-agent`) is the designated tool for regular doc review and refinement sessions.
