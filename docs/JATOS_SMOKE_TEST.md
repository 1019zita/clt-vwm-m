# JATOS Smoke Test — Mouse Version

Status: local and production MindProbe migration smoke tests passed on the corrected mouse repository.

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

## Interactive local test (2026-09-17)

Environment: JATOS 3.11.1 with its bundled Windows JRE.

| Check | Result |
|---|---|
| Study/component setup | Pass: study 33 / component 33 |
| Entry and relative assets | Pass: `jatos.js`, local SheetJS, both storage scripts, CSS, and task JS loaded |
| Console | Pass with one non-blocking JATOS-owned `showOverlay` warning; no task/storage error |
| Mouse instructions | Pass: left-click certain/right-click uncertain retained |
| Practice and formal progression | Pass |
| Debug formal trials | Pass: 20 trials across four blocks |
| Randomization/stimulus invariants | Pass; `probe_plan_violations=0` |
| Result record counts | Pass: 1 session + 20 trials + 4 checkpoints + 1 final = 26 |
| Mouse response field | Pass: both `responseKey=left` and `responseKey=right` observed |
| Result traceability | Pass: all records identify experiment version and Git commit `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c` |
| Normal completion | Pass: Study Result 33 is `FINISHED`, message `CLT mouse completed` |
| Browser-local XLSX | Pass: `1111.xlsx`, 26,061 bytes, three worksheets |
| Early exit | Pass: Study Result 34 retained one `session_start` and one formal `trial`, had no final record, and remained incomplete (`DATA_RETRIEVED`) |
| Resume behavior | Preserved: there is no checkpoint resume; reopening starts a new run |
| Supabase-compatible source entry | Pass: source `clt.html` starts with placeholders and retains mouse guidance |
| Official JZIP export | Pass: exported by JATOS's `/jatos/api/v1/studies/33` export route, not hand-built |
| Clean-instance import | Pass: imported as study 1/component 1 into a second clean JATOS 3.11.1 instance and loaded the entry/assets |

Local source Study UUID: `c4ea1f27-605d-4062-a9c1-1c56863e850b`.
Component UUID: `b76b08f7-9484-41f9-a05f-9160e04aee42`.

The release archive is `release/build/CLT-VWM-Mouse-1.0.0-jatos-m.1.jzip` (ignored by Git), SHA-256
`5E7F05F8BB33FC7AB7E25C1E083D63EE674174FFCE636C9AE54DFE7971F25662`. Its filename and content scans found no participant results, secrets, token, `.env`, or Supabase configuration.

## Production MindProbe test (2026-09-17 to 2026-09-18)

Environment: `https://jatos.mindprobe.eu`, authenticated only through process environment variables.

| Check | Result |
|---|---|
| Read-only API health check | Pass: study-properties endpoint returned successfully before import |
| Official Study import | Pass: study 28510 / component 48853 / default batch 32283 |
| Production entry and assets | Pass: HTTP 200, `jatos.js` present, build `20260917mj1` |
| Mouse instructions | Pass: left-click certain/right-click uncertain |
| Practice and formal progression | Pass: 10 practice trials and 20 debug formal trials |
| Block structure and breaks | Pass: four blocks of five trials with the unchanged 30-second minimum breaks |
| Browser console | Pass: no error; one expected debug-ID fallback warning only |
| Normal completion page | Pass: thank-you page and device-local `1111.xlsx` download link shown |
| JATOS completion metadata | Pass: Study Result 1247899 / Component Result 1735184 are `FINISHED`, duration `00:07:21` |
| Production result count | Pass: 1 session + 20 trials + 4 checkpoints + 1 final = 26 records |
| Mouse response field | Pass: 10 `left` and 10 `right` formal responses |
| Trial/block identity | Pass: blocks 1-4 each contain trials 1-5 |
| Result traceability | Pass: version `1.0.0-jatos-m.1`, Git commit `350900bfbf2c5a8cfd09d4e3e64322e2f686d10c` |
| Scientific invariant | Pass: final record reports `probe_plan_violations=0` |
| Participant result files | Pass: no JATOS result files required; behavioral data stored as append-only result data |

Production identifiers:

- Study: 28510 / `c4ea1f27-605d-4062-a9c1-1c56863e850b`
- Component: 48853 / `b76b08f7-9484-41f9-a05f-9160e04aee42`
- Default batch: 32283 / `10707cda-c403-4818-8c52-6417f2c5a5e0`
- Personal Multiple test link: `https://jatos.mindprobe.eu/publix/zLEfFBEQ64g`
- Import time: `2026-09-17T15:09:54.029Z`
- Completed smoke result time: `2026-09-18T03:03:53.560Z`

Two non-completed test results are intentionally retained as diagnostic evidence: Study Result 1247566 (`STARTED`, zero data) and Study Result 1247567 (`DATA_RETRIEVED`, 13.1 kB partial data). They are not participant data and were not deleted because result deletion was outside the authorized deployment scope.

The imported default batch accepts Personal Single/Personal Multiple workers. A General Multiple code therefore could not run. MindProbe also returned HTTP 500 when the unused General Multiple code was queried/deactivated through its API, so it was left untouched and is not the published test link.

Do not remove Supabase. The remaining acceptance item is the first archive export to a laboratory-approved cloud directory chosen by the researcher.
