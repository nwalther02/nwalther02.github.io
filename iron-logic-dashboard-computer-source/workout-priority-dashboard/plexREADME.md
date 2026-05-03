# Workout feature prioritization dashboard

## Purpose

This project is an interactive feature prioritization dashboard for the workout logger app at `nickwalther.me/workout`. The live workout page is protected by Cloudflare Access, so this build is a standalone preview that can be integrated into the protected app or deployed alongside it after approval.

## User intent

Nick asked for a dashboard that ranks the top 10 workout logger features, including AI coaching, RPE tracking, supersets, wearable sync, and a plate calculator. The dashboard needs sliders for user ratings, rough development cost estimates, 2026 trend alignment scores, ranking, and filtering.

## Prioritization model

The score is a weighted blend of:

- User value
- 2026 fitness technology trend alignment
- Strategic fit for a strength-training workout logger
- Cost efficiency based on rough implementation effort

Weights are adjustable in the sidebar. Feature-level user ratings are adjustable on each feature card.

## Design direction

The interface is designed as a strength-training command center: compact, high-contrast, dark-mode friendly, and data-forward. The accent palette uses forest green and iron/rust tones instead of generic blue-purple SaaS gradients.

## Integration notes

- The React app uses hash routing for sandbox-safe deployment.
- No browser storage is used.
- All state is transient React state.
- The dashboard is currently front-end only, so it can be integrated into an existing app without backend migration.
