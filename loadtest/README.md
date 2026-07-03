# Load testing

k6 scenarios that drive the **local** stack (Docker backend on `:3000`) with
realistic and hostile traffic. Never point these at production.

## Prerequisites

- Local stack running: `docker compose up -d` (backend `:3000`, db `:5432`)
- [k6](https://k6.io) installed (`winget install GrafanaLabs.k6`)

## Workflow

```powershell
# 1. Seed the fixture population (30 users, ~2700 notes, publications, likes).
#    Destructive only for its own @loadtest.dendrite users; reseed before every
#    comparison run so all runs start from identical data.
docker exec dendrite-backend npx tsx scripts/loadtest-seed.ts

# 2. Baseline: realistic mixed traffic with pass/fail thresholds.
cd loadtest/k6
k6 run baseline.js --summary-export ../results/baseline-before.json

# 3. Focused stress scenarios (each hunts one suspected bottleneck):
k6 run stress-autosave.js   # write path: update pipeline + versioning
k6 run stress-search.js     # ILIKE scans + unpaginated power-user list
k6 run stress-login.js      # bcrypt on the event loop
k6 run stress-pdf.js        # Puppeteer: one Chromium per request
k6 run stress-ws.js         # collab socket flood (hot doc + spread)
k6 run stress-payload.js    # multi-MB notes near the 10 MB body limit
```

After a performance change: reseed, rerun the affected scenario with
`--summary-export ../results/<scenario>-after.json`, and compare p95/throughput
against the `-before` export.

## Browser journeys (errors under load)

While a k6 scenario runs, real browser sessions surface what raw HTTP metrics
miss (console errors, broken saves, WS drops):

```powershell
# One-time: playwright in a temp workdir (Chromium cache is global)
$work = "$env:TEMP\dendrite-journeys"; New-Item -ItemType Directory -Force $work | Out-Null
Copy-Item loadtest\browser\journey.js $work
Push-Location $work; npm init -y | Out-Null; npm i playwright | Out-Null; npx playwright install chromium; Pop-Location

# Run sessions as different fixture users (parallel shells or background jobs)
$env:USER_INDEX = '1'; node $work\journey.js
```

Each run prints a JSON report of everything suspicious and exits non-zero on
page errors / 5xx responses.

## Files

- `../backend/scripts/loadtest-seed.ts` — fixture generator (runs in the
  backend container; writes `backend/loadtest-seed.json`, gitignored because it
  contains valid JWTs)
- `k6/lib.js` — shared config, fixture loading, auth helpers
- `k6/baseline.js` — the reference mix (browse / edit / social)
- `k6/stress-*.js` — one file per bottleneck hypothesis
- `results/` — summary exports (gitignored)
