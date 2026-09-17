# JATOS Migration Audit — CLT-VWM Mouse

## Scope and baseline

- Repository: `1019zita/clt-vwm-m`
- Audited commit: `9f96517315ecbc97638ea967d5ceb7f2c27f6937`
- Migration branch: `migration/jatos-mindprobe`
- Audit date: 2026-09-17

This document describes the pre-migration mouse version. No scientific behavior was changed during the audit.

## 1. Entry HTML

`index.html` immediately redirects to `clt.html` while retaining query and hash. `clt.html` is the experiment entry and contains setup, instructions, canvas, block break, upload, and completion screens.

## 2. JavaScript and CSS structure

- `clt.js`: all task, randomization, drawing, response, scoring, export, and pre-migration persistence logic.
- `style.css`: layout for all six screens and the canvas.
- `vendor/xlsx.full.min.js`: browser-local XLSX generation.

There was no module/build framework before migration.

## 3. Stimuli and assets

There is no image/audio/video stimulus directory. Stimuli are drawn on the canvas; the instruction diagram is inline SVG in `clt.html`. The only bundled third-party asset is SheetJS under `vendor/`.

## 4. Supabase initialization

Pre-migration constants were in `clt.js` and both values were placeholders. Client creation occurred after participant setup only when the URL was not the placeholder, with `persistSession: false`. The mouse repository therefore did not connect to Supabase at the audited commit.

## 5. Supabase calls

Only `public.vwm_data` inserts existed:

- one full-row bulk `insert(stimData)` at experiment completion;
- one fallback bulk insert restricted to the base columns if the first insert failed.

No `update`, `upsert`, `select`, RPC, Auth operation, or Storage operation existed.

## 6. Write timing

- Practice trial: stored only in the in-memory `practiceData`; never persisted.
- Formal trial: appended only to in-memory `stimData` after the first valid square click.
- Block: no server write/checkpoint.
- Experiment end: one Supabase bulk insert if configured, then browser-local XLSX generation.
- Early exit/refresh: no save handler.

## 7. Database fields/schema

No SQL migration or server schema exists in the repository. The client attempts full rows containing:

`subjectID, subName, block, trial, setSize, isChange, experimentType, itemLocs, itemColors, changeItem, origColorIdx, probeColorIdx, labelMap, trialLabels, labelChars, correctResponse, rt, response, responseKey, accuracy, subGender, subAge, subIdCard, subPhone, rndSeed`.

The fallback schema is:

`subjectID, subName, subGender, subAge, subIdCard, subPhone, block, trial, setSize, isChange, experimentType, rt, response, accuracy, correctResponse, rndSeed`.

The ID card value is masked before persistence; phone and name remain as originally saved. Actual server constraints/RLS cannot be established from this repository.

## 8. Participant ID

`subjectID` is string concatenation of the last six ID-card characters and last four phone characters. It is never parsed for storage or filename generation, so leading zeroes are preserved. Numeric conversion is used only to derive the PRNG seed. When ID construction fails, the fallback is a timestamp string. Debug mode forces ID/seed `1111`.

## 9. Condition generation

There is no between-participant group assignment. Formal trials comprise 70 set-size-4 and 70 set-size-6 change trials. The full 140-item set-size list is seeded and shuffled, then sliced into four blocks of 35; balance is global, not guaranteed within each block. Debug mode keeps four blocks but uses five trials per block (20 total; ten per set size).

## 10. Resume/checkpoint behavior

There was no checkpoint, resume, `localStorage`, `sessionStorage`, or server-side recovery. Adding resume would change exposure/order semantics and therefore requires an explicit research decision. The JATOS migration records progress but does not resume it.

## 11. Refresh/data-loss risk

Refreshing, closing, or navigating away before normal completion loses the original in-memory formal data. The migrated JATOS adapter appends completed trials, so the server can retain a partial result, but the browser task still restarts instead of resuming. This preserves the original task behavior while improving forensic recovery.

## 12. External and absolute resources

- Google Fonts absolute HTTPS URL.
- Supabase JavaScript CDN absolute HTTPS URL.
- SheetJS CDN fallback absolute HTTPS URL; the primary SheetJS file is local.
- All experiment-owned paths are relative.

The JATOS build removes the Supabase CDN dependency. Google Fonts and the SheetJS fallback remain nonessential external dependencies and must be observed during smoke testing; local SheetJS is authoritative for export.

## Scientific baseline and pre-existing discrepancies

- Practice: 10 trials; one comment incorrectly says 20.
- Formal: 140 trials, four blocks, all change trials.
- Timing: ITI 500 ms, study 250 ms, retention 1000 ms, response unlimited, 50 ms inter-trial transition, block break at least 30 seconds.
- Mouse mapping: left `left` = certain, right `right` = uncertain; certainty does not affect accuracy.
- Each trial changes exactly one square and the new color is excluded from every memory-array color.
- K: `(Acc * N * N - N) / (N - 1)` per set size.
- The code draws a retention fixation point, while the instruction SVG comment says no fixation. This migration records but does not change that discrepancy.
