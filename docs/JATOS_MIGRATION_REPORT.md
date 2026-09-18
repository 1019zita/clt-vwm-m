# JATOS Migration Report — Mouse Version

Status: local implementation, JATOS 3.11.1 acceptance, MindProbe deployment, and production smoke test passed.

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

Adapter tests verify that the same mouse trial fields reach Supabase bulk rows and JATOS trial records without changing `responseKey`. The full JATOS browser run produced 20 formal trial records containing the original behavioral fields, including both `left` and `right` response values, plus the required traceability envelope. The run ended with exactly one final record and zero probe-plan violations.

The original Supabase-compatible entry was also loaded independently and reached the unchanged mouse instructions while its placeholder configuration remained local-only. No Supabase table, source implementation, or configuration was removed.

## D. MindProbe

- Study ID/UUID: 28510 / `c4ea1f27-605d-4062-a9c1-1c56863e850b`
- Component ID/UUID: 48853 / `b76b08f7-9484-41f9-a05f-9160e04aee42`
- Default batch ID/UUID: 32283 / `10707cda-c403-4818-8c52-6417f2c5a5e0`
- Test link: `https://jatos.mindprobe.eu/publix/zLEfFBEQ64g` (Personal Multiple)
- Deployment timestamp: `2026-09-17T15:09:54.029Z`
- Release asset Git commit: `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c`

The production debug run completed as Study Result 1247899 / Component Result 1735184. API metadata reports both states as `FINISHED`; the 24.4 kB result contains 26 newline-delimited records: one session start, 20 formal trials, four checkpoints, and one final record. Blocks 1-4 each contain trials 1-5; response keys are evenly split between `left` and `right`; the final record reports 20 trials and zero probe-plan violations. The result records identify version `1.0.0-jatos-m.1` and the release asset commit above.

`JATOS_BASE_URL` and `JATOS_API_TOKEN` were read only from the ignored local process-environment loader. The token was not printed, documented, committed, or copied into an example.

## Local JATOS acceptance evidence

- source instance: study 33, component 33;
- source Study UUID: `c4ea1f27-605d-4062-a9c1-1c56863e850b`;
- component UUID: `b76b08f7-9484-41f9-a05f-9160e04aee42`;
- completed result: 26 NDJSON records and `FINISHED` state;
- early-exit result: session + one formal trial retained, no final record;
- official archive: `release/build/CLT-VWM-Mouse-1.0.0-jatos-m.1.jzip` (Git-ignored);
- clean-instance portability: passed as study 1/component 1 on a second JATOS 3.11.1 instance.

## E. Remaining work

- choose the participant-access strategy for formal collection (the current published test link is Personal Multiple; the imported default batch does not permit General Multiple);
- specify the laboratory-approved cloud directory and retention policy, then run the first result archive export;
- optionally ask the MindProbe administrator to investigate the HTTP 500 returned when managing the unused General Multiple study code;
- review and merge `migration/jatos-mindprobe` only after laboratory acceptance.

Supabase remains intact and must not be decommissioned before acceptance.
