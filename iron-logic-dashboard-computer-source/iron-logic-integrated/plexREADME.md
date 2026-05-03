# Iron Logic — Integrated Static Build

Workout Logger (the existing Iron Logic app) plus a feature-prioritization
dashboard, packaged as a single static folder ready to deploy at
`nickwalther.me/workout/`.

## URL structure (when deployed at `/workout/`)

| Path                       | Source file                              | Notes                                          |
| -------------------------- | ---------------------------------------- | ---------------------------------------------- |
| `/workout/`                | `index.html`                             | Iron Logic Workout Logger (entry point).       |
| `/workout/manifest.json`   | `manifest.json`                          | PWA manifest, scope `/workout/`.               |
| `/workout/sw.js`           | `sw.js`                                  | Service worker, network-first within scope.    |
| `/workout/icons/*`         | `icons/`                                 | App icons referenced by manifest.              |
| `/workout/iron-logic/*`    | `iron-logic/`                            | Generator + schema reference (unchanged).      |
| `/workout/dashboard/`      | `dashboard/index.html`                   | Iron Logic — Roadmap (feature prioritization). |
| `/workout/dashboard/assets/` | `dashboard/assets/`                    | Hashed JS + CSS bundle for the dashboard.      |

All cross-links inside the bundle are **relative**, so the same folder also
works under any other prefix without changes.

- App → Dashboard: `<a href="./dashboard/index.html">Roadmap</a>` in the picker header.
- Dashboard → App: `<a href="../index.html">Back to App</a>` in the dashboard header.
- Dashboard JS/CSS: `./assets/...` (Vite `base: "./"`).

## What changed vs. the previous state

### `index.html` (Workout Logger)

- Added a `Roadmap` button to the program picker's sticky header, next to
  `History` and the Drive sync `☁` button. It is an `<a class="btn-sm
  btn-outline" href="./dashboard/index.html">` styled inline so it matches the existing
  Iron Logic outline button at the same height and weight.

### `sw.js` (Service Worker)

- Bumped `CACHE_NAME` from `IRON_LOGIC_V1` → `IRON_LOGIC_V2` so any client
  with the previous app installed drops the V1 cache on activate. The V2
  network-first strategy already covers the new `dashboard/` subtree
  correctly: it caches the dashboard HTML and hashed assets after first load,
  but always tries the network first when online. No code logic changed.
- The fetch handler still falls back to `caches.match('/workout/')` for
  navigation failures, which is fine — that returns the app shell, not the
  dashboard, but only when both network and the dashboard's own cached entry
  are unavailable.

### `dashboard/` (Feature Priority Dashboard, rebuilt)

Source lives in `/home/user/workspace/workout-priority-dashboard`. The
visual layer was rebuilt from scratch on top of the Iron Logic design
language so the dashboard reads as native to the app, not as a separate
product.

Key source changes:

- `client/src/index.css`
  - Replaced both `:root` (light) and `.dark` palettes with HSL conversions
    of the Iron Logic CSS variables (background `#0b0f1a`, surfaces
    `#111827` / `#1a2235` / `#212d42` / `#2a3750`, accent volt `#d4f500`,
    text `#eef2ff` / muted `#8b9ab8`, destructive `#f05050`).
  - Switched font tokens to `Barlow` (body) and `Barlow Condensed` (display).
  - Tightened `--radius` to `0.625rem` to match Iron Logic's `--r 10px`.

- `client/index.html`
  - Replaced the Fontshare Satoshi/Cabinet Grotesk import with the same
    Google Fonts request the app uses (Barlow + Barlow Condensed).
  - Updated `<title>` to "Iron Logic — Roadmap" and added a `theme-color`
    meta matching the app shell.

- `client/src/pages/dashboard.tsx`
  - Replaced the marketing-style header (`nickwalther.me/workout` →
    `Feature Priority Dashboard`) with `IRON LOGIC` / `ROADMAP` set in
    Barlow Condensed uppercase, paired with a barbell-mark logo built
    inline as SVG that inherits the volt primary tint.
  - Added a `Back to App` button as the leftmost header action, using
    `<a href="../index.html">` so it works under any deploy prefix and on static preview hosts that do not auto-resolve directory indexes.
  - Forced the initial theme to `dark` regardless of OS preference, so the
    canonical Iron Logic surface always loads first; the toggle still works.
  - Re-skinned all section titles, badges, and labels to the app's
    `font-serif text-sm font-bold uppercase tracking-[0.08em]` Barlow
    Condensed treatment, with `tabular-nums` everywhere a number appears.
  - Re-skinned cost-band badges from generic emerald/sky/amber/red to a
    monochromatic Iron Logic ladder: volt (S, the gym-floor wins), muted
    slate (M and L), destructive red (XL).
  - Highlighted the #1 ranked feature row with a volt-tinted rank chip so
    the chart highlight and backlog highlight reinforce each other.
  - Promoted the priority score to a larger Barlow Condensed numeral in
    volt for instant scanning.
  - "Recommended next move" surface changed from a solid primary slab to a
    volt-tinted card, matching the "session in progress" callout pattern in
    the Workout Logger picker.

Build step:

```bash
cd /home/user/workspace/workout-priority-dashboard
npx vite build
```

`vite.config.ts` is already set to `base: "./"` and `outDir: dist/public`,
so the build emits a relocatable static bundle. The contents of
`dist/public` are copied into this project's `dashboard/` directory.

## Local validation performed

Served `/home/user/workspace/iron-logic-integrated` as `/workout/` from a
Python static server (`python3 -m http.server 5000 --directory
/tmp/iron-logic-preview`) and exercised the bundle with Playwright:

- `GET /workout/` → 200, title `Workout Logger`, Roadmap button visible.
- Click Roadmap → URL becomes `/workout/dashboard/#/`, title `Iron Logic —
  Roadmap`, no console errors.
- Click `Back to App` → URL becomes `/workout/`, app shell re-renders.
- Desktop (1280×900) and mobile (375×812) screenshots saved at
  `qa-app-picker-2.png`, `qa-dashboard-desktop.png`, `qa-app-mobile.png`,
  `qa-dashboard-mobile.png`, `qa-dashboard-mobile-top.png`,
  `qa-dashboard-light.png` in the workspace root.
- Light/dark theme toggle round-trips cleanly in the dashboard.

## Deploy notes

- Deploy the contents of this folder to whatever serves `/workout/` on
  `nickwalther.me`. No build step is required at the deploy host; the
  dashboard is already a static bundle.
- The service worker's `scope` is `/workout/` and its precache list only
  contains `/workout/`, so installing this version will not affect any
  other paths on the domain.
- If Cloudflare Access continues to gate `/workout/`, the dashboard inherits
  the same gate automatically (same origin, same prefix). No additional
  ACL change is needed.
- After deploy, the first visit per browser will fetch the dashboard JS/CSS
  cold; subsequent navigations are served from the SW network-first cache.
- To deploy a future update of either app or dashboard, bump
  `CACHE_NAME` in `sw.js` to `IRON_LOGIC_V3` (etc.) so the activate handler
  drops stale entries.
