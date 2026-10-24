import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { apply, parseCommand, formatRuns } from '../src/commands.mjs'

test('the workflow command grammar accepts list, show and resume only', () => {
  assert.deepEqual(parseCommand(''), { verb: 'list' })
  assert.deepEqual(parseCommand('list'), { verb: 'list' })
  assert.deepEqual(parseCommand('show 123'), { verb: 'show', id: '123' })
  assert.deepEqual(parseCommand('resume 123'), { verb: 'resume', id: '123' })
  assert.deepEqual(parseCommand('nope'), { verb: 'help' })
  assert.deepEqual(parseCommand('show'), { verb: 'help' })
})

test('formatRuns keeps newest-first input and labels status', () => {
  const text = formatRuns([
    { id: 'a', name: 'alpha', status: 'completed' },
    { id: 'b', name: 'beta', status: 'running' },
  ])
  assert.match(text, /Workflow runs \(2\)/)
  assert.match(text, /a\s+alpha\s+completed/)
  assert.match(text, /b\s+beta\s+running/)
})

test('the command lists the current session store and resumes by archived script', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-command-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const sessionId = 'session-a'
  const runId = '11111111-1111-4111-8111-111111111111'
  const dir = join(root, 'workflows', createHash('sha256').update(sessionId).digest('hex'), runId)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'run.json'), JSON.stringify({ version: 1, id: runId, sessionId, script: 'export const meta = { name: "x" }; return 1', meta: { name: 'x' } }) + '\n')
  await writeFile(join(dir, 'journal.jsonl'), JSON.stringify({ type: 'end', outcome: { stopReason: 'completed' } }) + '\n')
  let definition
  const calls = []
  const ctx = {
    dshWorkflow: { store: { dir: root } },
    commands: { register(value) { definition = value } },
    workflowEngine: {
      start(request) {
        calls.push(request)
        return { result: Promise.resolve({ stopReason: 'completed', agentsStarted: 0, value: 1 }) }
      },
    },
  }
  apply(ctx)
  assert.equal(definition.name, 'workflow')
  const list = await definition.handler({ rawInput: 'list', agent: { session: { id: sessionId } } })
  assert.equal(list.kind, 'success')
  assert.match(list.text, new RegExp(runId))
  const show = await definition.handler({ rawInput: `show ${runId}`, agent: { session: { id: sessionId } } })
  assert.match(show.text, /x/)
  const resumed = await definition.handler({ rawInput: `resume ${runId}`, agent: { session: { id: sessionId } } })
  assert.equal(resumed.kind, 'success')
  assert.equal(calls.length, 1)
  assert.match(calls[0].script, /export const meta/)
  assert.equal(calls[0].resumeFromRunId, runId)
})
