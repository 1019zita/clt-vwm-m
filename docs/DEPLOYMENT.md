# Deployment and Long-Term Handover

## Authority and retention

GitHub is the sole source-code master. MindProbe/JATOS runs the experiment and collects participant results; it is not the place to edit source. An approved laboratory cloud directory outside this repository is the long-term backup. Participant results must never be committed to GitHub.

The default branch is not edited directly. Work is reviewed on `migration/jatos-mindprobe`, then merged/tagged only after acceptance. The original Supabase-compatible entry remains until JATOS acceptance is complete.

## Build and test

```text
node --check clt.js
node --check src/storage/index.js
node --check src/storage/supabase-storage.js
node --check src/storage/jatos-storage.js
node tests/storage-adapters.test.js
node tests/scientific-invariants.test.js
python -m compileall -q scripts
python scripts/build_study_assets.py
```

Confirm `build/study-assets/build-info.json` names the reviewed commit and `response_mode` is `mouse`. Verify `MANIFEST.sha256`.

## Local JATOS Study

Use a separate local JATOS 3.11.1 development instance. Create a Study titled `CLT-VWM Mouse`, a component titled `CLT-VWM Mouse Experiment`, and set component HTML to `clt.html`. Copy the contents of `build/study-assets/` to the Study assets directory and complete `JATOS_SMOKE_TEST.md`.

Use JATOS' own Export function to create a `.jzip`; never hand-construct JZIP metadata. Save it under ignored `release/build/`, then import it into a clean second local JATOS instance to prove portability. The release archive must contain no participant result, private configuration, environment file, or token.

## MindProbe connection and first import

The scripts read only the process environment variables named `JATOS_BASE_URL` and `JATOS_API_TOKEN`. Keep values in the operating-system/CI secret store. Never put the token value in source, README, examples, commits, issues, screenshots, logs, or terminal output.

First run the read-only check:

```text
python scripts/jatos_healthcheck.py
```

On any non-2xx response, stop and report only status, endpoint, and sanitized message.

First import is a dry-run unless `--apply` is present:

```text
python scripts/jatos_deploy.py import --jzip release/build/CLT-VWM-Mouse.jzip --expected-title "CLT-VWM Mouse"
```

The importer refuses a known UUID, applies non-overwriting conflict flags, and accepts only HTTP 201 for creation. Record Study ID/UUID, component IDs, deployment time, title, test link, and commit—but never the token.

## Incremental deployment

Preview changes against an exact Study identity and title:

```text
python scripts/jatos_deploy.py assets --study-id STUDY_ID --expected-title "CLT-VWM Mouse" --assets-dir build/study-assets
```

Review the target and file list, then repeat with `--apply`. Only changed/new assets are uploaded; remote assets are never deleted. Property/component changes use a reviewed Study Archive workflow.

## Rollback

Before rollback, export current results and Study. Check out the last approved tag/commit, rebuild, run all tests, verify the target Study, apply only reviewed assets, and rerun smoke tests. Never edit MindProbe as an untracked source copy.

## Result export and cloud backup

Choose the approved lab cloud path explicitly; it must be outside Git:

```text
python scripts/jatos_export_results.py --study-id STUDY_ID --expected-title "CLT-VWM Mouse" --output-dir APPROVED_LAB_CLOUD_DIRECTORY
```

Keep the ZIP, JSON manifest, and SHA-256 file together and verify the checksum after synchronization. JATOS is not the only backup. The participant-side XLSX download still lands on the participant's device and is not authoritative.

Export a verified Study with:

```text
python scripts/jatos_export_study.py --study-id STUDY_ID --expected-title "CLT-VWM Mouse" --output release/build/CLT-VWM-Mouse-export.jzip
```

## Token rotation

Obtain/rotate the token through the authorized MindProbe/JATOS workflow, replace it only in the external secret environment, restart the operator job/shell, run the read-only health check, then revoke the old token. Successors receive permission to obtain a fresh token, not a token written into handover material.

## Successor checklist

- GitHub access and protected-default-branch rules;
- approved release tag/commit and matching JZIP;
- MindProbe Study ID/UUID, component IDs, title, and test link;
- location/retention policy of the approved result-backup directory;
- last smoke-test report and backup checksum manifest;
- open items in `JATOS_MIGRATION_REPORT.md`;
- explicit instruction not to remove Supabase until formal acceptance.

## Official references

- <https://www.jatos.org/jatos.js-Reference.html>
- <https://www.jatos.org/JATOS-API.html>
- <https://github.com/JATOS/JATOS/blob/v3.11.1/jatos-api.yaml>
- <https://www.jatos.org/Installation.html>
