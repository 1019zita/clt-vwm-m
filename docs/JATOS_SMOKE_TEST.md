# JATOS Smoke Test — Mouse Version

Status: pending full local browser run on the corrected mouse repository.

## Automated preflight (2026-09-17)

| Check | Result |
|---|---|
| JavaScript syntax | Pass |
| Storage adapter tests | Pass |
| Scientific invariant test | Pass |
| 500 generated plans for SS4 and 500 for SS6 | Pass, zero violations |
| JATOS asset build | Pass |
| Generated entry loads `jatos.js` | Pass |
| Generated entry excludes Supabase adapter/config | Pass |
| Build metadata says `response_mode=mouse` | Pass |

## Required interactive checks

- entry page and all JS/CSS/assets load with no critical console error;
- instructions retain left-click certain/right-click uncertain wording;
- practice and formal trials accept square clicks only;
- randomization, stimulus color rules, timing, four-block flow, and breaks match baseline;
- JATOS Results contain 1 session, one record per formal trial, four checkpoints, and one final record;
- each trial retains `responseKey=left|right` plus every original behavioral field;
- Study ends `FINISHED` and browser-local XLSX remains downloadable;
- refresh/early exit leaves partial JATOS data but does not resume;
- original Supabase-compatible source entry still starts and remains local-only with placeholders;
- JATOS-exported JZIP imports into a clean second instance.

MindProbe checks remain pending until the two environment variables are supplied outside the repository. Do not remove Supabase before all items pass.
