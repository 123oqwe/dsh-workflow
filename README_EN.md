# DSH Workflow

[简体中文](README.md) · [Usage](docs/workflow.md) · [Architecture](docs/architecture.md) · [Release notes](docs/releases.md)

Saved, nested and resumable JavaScript workflows for **DeepSeek Harness 0.2.1-rc.2**, with native subagents, background Jobs, workflow panels, shared output token targets and Git worktree isolation.

This standalone module comes from OMD's Workflow implementation. It enhances the current profile's native `workflow` capability while using the host's models, sessions and permissions. It does not include Ultra, the OMD persona or Computer Use.

## Install

Requires **DSH 0.2.1-rc.2** and **Node.js ≥22.19**. Other host versions are outside this release's compatibility scope. Use your actual Web or desktop profile; this example uses `web`:

```bash
dsh plugin --profile web add "https://github.com/gulagala001/dsh-workflow/releases/download/v0.1.0-dsh.0.2.1-rc.2/dsh-workflow-plus-0.1.0-dsh.0.2.1-rc.2.tgz"
```

Restart that profile after installation. The package is named `dsh-workflow-plus` and is distributed only through this repository's pinned GitHub Releases; it is not published to npm. The npm package `dsh-workflow` belongs to another author's project.

**Users of previously released OMD versions should keep using their bundled Workflow.** Co-installation with those older releases is not supported by this release. New OMD builds using this same module can share its runtime components. Existing sessions need no migration or deletion.

To update, use the pinned package URL for the target release. To remove, run `dsh plugin --profile web remove dsh-workflow-plus` and restart that profile. Removal does not proactively delete saved scripts, run records or worktrees.

## Get started

Explicitly ask your agent to use a workflow, for example:

> Use workflow to review auth and storage in parallel, then summarize the findings. Do not edit files.

The agent submits JavaScript through the `workflow` tool:

```js
export const meta = {
  name: 'review-modules',
  description: 'Review two modules and collect findings',
  phases: [{ title: 'Review' }],
};
phase('Review');
return await parallel([
  () => agent('Review auth for correctness without editing files', { label: 'auth' }),
  () => agent('Review storage for correctness without editing files', { label: 'storage' }),
]);
```

The session header opens the workflow's phases, members and status; individual agents use native DSH child sessions. `run_in_background: true` uses native Jobs; inspect it with `job_output` and stop it with `job_kill`.

## Features

- Supply `script` directly, or reuse a saved script through `scriptPath` or `.omd/workflows/<name>.js`.
- Compose work with `parallel()`, `pipeline()`, `phase()` and `log()`. Agents inherit the parent model; model and reasoning effort can be set explicitly.
- One nested workflow level shares concurrency, total calls, cancellation and the budget.
- `resumeFromRunId` reuses the unchanged successful call prefix within the same session, retaining failure details and journals.
- `agent(..., { isolation: 'worktree' })` creates an isolated workspace from the current Git HEAD and retains changed worktrees for inspection and merging.
- A trailing `+500k` or `+1m` in a human message sets a shared output token target for that turn and its descendants.

Resume reruns calls after the reusable prefix, so check existing artifacts and side effects first. Reaching a token target stops new dispatches; running calls may finish above the target. Missing trustworthy usage stops further dispatches. Host permissions, model requests and network access remain governed by DSH and each tool provider.

## Data and development

Standalone budget state lives in `$DSH_HOME/dsh-workflow/sessions/`; scripts and run records live in `$DSH_HOME/dsh-workflow/workflows/`. `DSH_HOME` defaults to `~/.dsh`. Project scripts and worktrees retain the `.omd/workflows/` and `.omd/worktrees/` paths. Embedded OMD uses its existing storage. See [Usage](docs/workflow.md).

```bash
pnpm install --frozen-lockfile
pnpm build
```

The source pins the DSH rc.2 Workflow foundation. Built modules resolve actual service identities through the host Loader. Licensed under [MIT](LICENSE); upstream notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
