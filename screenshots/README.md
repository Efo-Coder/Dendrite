# Screenshots

Regenerates the images in `docs/screenshots/` that the main
[README](../README.md) shows. Drives the **local** stack in headless Chromium —
never point this at production.

## Why a demo account

The local database is normally full of load-test fixtures (`Load Tester 28`,
`garten projekt 1512`) and whatever debris the last verification run left
behind. Neither photographs well. `seed.js` writes a small, self-contained
workspace instead: eight notes, three spaces, four bookmarks, and six published
pieces from three other authors for Explore.

Everything it writes carries a `demo-` id. It is additive and idempotent — real
data is never touched, and the seed can be removed again with a prefix match.

## Prerequisites

- Local stack running: `docker compose up -d` (frontend `:5173`, backend `:3000`)
- `npm install` in this folder, then `npx playwright install chromium`

## Workflow

```powershell
# 1. Seed the demo workspace. Runs inside the backend container, which is where
#    JWT_SECRET and Prisma live. Prints a login token valid for two hours.
docker cp seed.js dendrite-backend:/tmp/seed.js
docker cp demo-content.js dendrite-backend:/tmp/demo-content.js
docker exec -e NODE_PATH=/app/node_modules dendrite-backend node /tmp/seed.js

# 2. Shoot. Writes straight into ../docs/screenshots/.
$env:TOKEN = "<token from step 1>"
node shoot.js

# A single view, for iterating:
$env:ONLY = "editor"; node shoot.js
```

## Options

| Variable | Default | Meaning |
|---|---|---|
| `TOKEN` | — | required; the JWT printed by `seed.js` |
| `ONLY` | all | comma-separated shot names |
| `THEME` | `light` | `light` or `dark` |
| `OUT` | `../docs/screenshots` | output directory |
| `SCALE` | `2` | device pixel ratio |
| `FORMAT` | `jpeg` | `jpeg` or `png` |
| `QUALITY` | `88` | JPEG quality |
| `NOTE` | `demo-note-1` | note opened for the editor shot |
| `BASE` | `http://localhost:5173` | app URL |

Shot names: `landing`, `home`, `editor`, `spaces`, `library`, `explore`,
`arbor`, `reflection`. The main README currently uses six of them — `spaces`
and `reflection` are shot but unused.

## The parts that are not obvious

- **There is no URL to navigate to.** The dashboard has a single route (`/*`);
  its views are component state. `shoot.js` writes the view into
  `sessionStorage['dendrite:nav']` before the app boots, and the app restores
  it. The editor is an overlay, opened through the same object's `openNoteId`.
- **Login needs no password.** A JWT signed with the container's `JWT_SECRET`,
  placed in `localStorage['token']`, is enough — the app calls `getMe()` on
  boot and is signed in.
- **The cookie banner** sits dead centre in every shot unless
  `localStorage['dendrite-cookie-consent']` is set beforehand.
- **Theme and `activeLine`** live inside the zustand-persisted
  `dendrite-settings` store, not in keys of their own. If that store's
  `version` is ever bumped past the one in `shoot.js`, zustand discards the
  injected state and the shots come back in the default theme.
- **Timing decides whether a view is painted.** `networkidle` never settles
  while the collaboration socket is open, so the waits are fixed: about five
  seconds for the card views, twelve for the Arbor, which is still black
  before that.
- **Explore is fixed by ranking, not deletion.** Featured sorts by
  `likeCount`; the demo pieces carry 176–412 against the fixtures' 8–9, which
  pushes the noise out of frame.
- **JPEG, not PNG.** At 2x the cover photos make PNG four to five times
  larger for no visible gain.
