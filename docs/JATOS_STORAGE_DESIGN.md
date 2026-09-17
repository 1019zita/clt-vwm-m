# JATOS Storage Design — Mouse Version

The task uses one facade:

```text
initializeStorage(context)
saveTrial(row)
saveCheckpoint(checkpoint)
saveFinalResult(payload)
finishExperiment(status)
```

`clt.html` remains the Supabase-compatible source entry. Its URL/key stay as placeholders and it therefore preserves the original local-XLSX-only behavior. `scripts/build_study_assets.py` generates a JATOS-specific `clt.html` that loads exactly `jatos.js`, `src/storage/jatos-storage.js`, and the shared storage facade. Both variants run the same mouse task code.

JATOS result data is newline-delimited JSON and is appended through a serialized promise queue. Record types are `session_start`, one `trial` after each completed formal response, one `checkpoint` after each block, and one `final` record. Every record carries participant/session identifier, experiment version, Git commit, timestamp, JATOS identifiers, and the original mouse-trial fields. `responseKey` remains `left` or `right`.

`jatos.appendResultData` is used because repeated `submitResultData` calls would overwrite earlier component data. No result file upload is needed. At normal completion the queue is flushed and `jatos.endStudyWithoutRedirect` ends the Study while preserving the experiment completion page.

Trial writes are not awaited by the 50 ms task transition, so server latency does not alter trial timing. Completion waits for all queued writes. A first write failure is retained and prevents a falsely successful finish.

The adapter enables JATOS' unload warning during an active run. Refresh/exit may leave a partial JATOS result but does not resume the task; this matches the original behavioral flow. The participant-device XLSX remains a separate convenience copy.
