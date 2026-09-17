# Changelog

## [1.0.0-jatos-m.1] - Unreleased

### Added

- Supabase/JATOS storage adapter boundary.
- Append-only JATOS trial, block-checkpoint, and final records.
- Versioned JATOS study-asset build and environment-only deployment/export scripts.
- Audit, deployment, smoke-test, and handover documentation.
- JZIP identity validation for current wrapped and legacy flat JATOS study metadata.

### Verified

- Full debug run persisted 20 mouse-response trials, four checkpoints, and one final record.
- Early exit retained partial append-only data without creating a final record.
- Official JATOS export imported and loaded successfully in a second clean JATOS 3.11.1 instance.

### Preserved

- Mouse response: left button = certain, right button = uncertain.
- Trial counts, conditions, randomization, stimuli, timing, scoring, participant-ID rules, task flow, and device-local XLSX export.
- Original Supabase-compatible source entry and placeholder configuration.
