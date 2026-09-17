# JATOS Smoke Test — Mouse Version

Status: local migration smoke test passed on the corrected mouse repository. Production MindProbe checks are pending.

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

MindProbe checks remain pending until `JATOS_BASE_URL` and `JATOS_API_TOKEN` are supplied through the process environment. Do not remove Supabase before production import and result-export acceptance pass.
