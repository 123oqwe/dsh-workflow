# Fork changes — drop-in workflow bundle

Ordered work for this fork. Tests land before implementation; CI must fail first, then pass.

## Item 1 — preset compatibility (drop-in)

Problem: on DSH 0.2.1-rc.2 the `standard` agent preset mounts its own
`workflow-worker-thread` + `workflow-filesystem` + `tool-workflow`. The bundle
patch only disables top-level rows, so the preset's native tool shadows this
plugin's engine/tool. Result: inline `export const meta` is rejected, `budget`
is absent, `resumeFromRunId`/`scriptPath` are not on the model's tool schema.

Changes:

- Add a `preset-standard` config replacement to `cordis.patch.yml`, copied from
  the DSH 0.2.1-rc.2 Standard composition and stripped of:
  - `workflow-worker-thread`
  - `workflow-filesystem`
  - `workflow-ptc`
  - `tool-workflow`
  - the `delegation` `isolate.workflowEngine`
- Keep every other Standard row (tools, skills, plan/goal, compaction).
- Add a test that parses the patch text and asserts the preset block contains no
  native workflow rows, and that the top-level bundle still inserts the plugin's
  runtime/spawn/engine/tool.
- Acceptance: fresh install + Standard mode accepts inline meta, `budget` is an
  object, and a two-agent `parallel` runs without a manual preset patch.

## Item 2 — resume diagnostics

A run id from another session currently surfaces a raw `ENOENT` for
`<other-session>/<runId>/run.json`. Replace it with a clear error that names the
run id and says it is not part of this session. Same-session resume must keep
working.

## Item 3 — `/workflow` commands

Add `/workflow list` and `/workflow show <runId>` for the current session,
reading the existing `$DSH_HOME/dsh-workflow/workflows/<sessionHash>/` store.
Keep the model-facing tool unchanged.

## Item 4 — CI

Every item is pushed to `feat/drop-in-preset`; GitHub Actions
`Public distribution files` must run `pnpm build`, `npm test`, pack and docs.
Debug until green before the next item.
