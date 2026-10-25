import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { apply } from '../src/commands.mjs'

test('the workflow console is available as /workflow and /workflows and can save a run', async t => {
  const root = await mkdtemp(join(tmpdir(), 'workflow-command-save-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const workspace = join(root, 'workspace')
  await mkdir(workspace, { recursive: true })
  const sessionId = 'session-save'
  const runId = '22222222-2222-4222-8222-222222222222'
  const directory = join(root, 'workflows', createHash('sha256').update(sessionId).digest('hex'), runId)
  await mkdir(directory, { recursive: true })
  const script = 'export const meta = { name: "saved", description: "saved" };\nreturn 1;\n'
  await writeFile(join(directory, 'run.json'), JSON.stringify({ version: 1, id: runId, sessionId, script, meta: { name: 'saved' } }) + '\n')
  await writeFile(join(directory, 'journal.jsonl'), JSON.stringify({ type: 'end', outcome: { stopReason: 'completed' } }) + '\n')
  const definitions = []
  apply({
    dshWorkflow: { store: { dir: root } },
    commands: { register(value) { definitions.push(value) } },
  })
  assert.deepEqual(definitions.map(value => value.name).sort(), ['workflow', 'workflows'])
  const command = definitions.find(value => value.name === 'workflows')
  const result = await command.handler({
    rawInput: 'save saved-flow',
    agent: { session: { id: sessionId, header: { cwd: workspace } } },
  })
  assert.equal(result.kind, 'success')
  const saved = await readFile(join(workspace, '.omd', 'workflows', 'saved-flow.js'), 'utf8')
  assert.equal(saved, script)
})
