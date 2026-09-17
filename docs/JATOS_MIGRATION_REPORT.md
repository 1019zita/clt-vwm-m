# JATOS Migration Report — Mouse Version

Status: local implementation in progress; MindProbe API/deployment intentionally pending.

## A. File changes

New: `VERSION`, `CHANGELOG.md`, migration/deployment/smoke/storage/report docs, `src/storage/*`, `scripts/*`, and `tests/*`.

Modified: `.gitignore`, `README.md`, `clt.html`, and `clt.js`.

Deleted: none.

## B. Scientific logic

| Item | Status |
|---|---|
| Formal trials 140 / debug 20 | Preserved |
| Practice trials 10 | Preserved |
| SS4/SS6 conditions and all-change design | Preserved |
| Seed and randomization | Preserved |
| Stimuli, locations, palette, exactly-one-change rule | Preserved |
| Timing and block breaks | Preserved |
| Mouse left/right certainty mapping | Preserved |
| Accuracy and K formula | Preserved |
| Participant ID/grouping | Preserved; no grouping existed |
| Browser-local XLSX | Preserved |
| Supabase source implementation/placeholders | Preserved |

## C. Data comparison

Adapter tests verify that the same mouse trial fields reach Supabase bulk rows and JATOS trial records without changing `responseKey`. A full browser run and final field-by-field fixture report are still pending.

## D. MindProbe

- Study ID/UUID: pending
- Component IDs: pending
- Test link: pending
- Deployment timestamp: pending
- Git commit: pending release commit

No MindProbe API call has been made. `JATOS_BASE_URL` and `JATOS_API_TOKEN` will be requested only when the read-only health check is ready; the token must be configured outside chat/repository.

## E. Remaining work

- full corrected mouse-version local JATOS smoke test;
- early-exit/refresh and preserved-source checks;
- official JZIP export and clean-instance import;
- commit/push only the migration branch;
- read-only MindProbe health check after environment configuration;
- first import, production smoke, recorded IDs/link/commit;
- first result export to an approved lab cloud directory.

Supabase remains intact and must not be decommissioned before acceptance.
