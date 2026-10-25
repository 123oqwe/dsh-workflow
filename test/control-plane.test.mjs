import test from 'node:test'
import assert from 'node:assert/strict'
import { RunRegistry } from '../src/run-registry.mjs'
import { apply } from '../src/commands.mjs'

function fakeRun(id, name) {
  let cancelled = false
  let stoppedAgent
  let paused = false
  return {
    id,
    meta: { name },
    get cancelled() { return cancelled },
    get stoppedAgent() { return stoppedAgent },
    cancel(reason) { cancelled = reason ?? true },
    cancelAgent(seq) { stoppedAgent = seq; return true },
    pause() { paused = true },
    resume() { paused = false },
    get paused() { return paused },
    result: new Promise(() => {}),
  }
}

test('the live run registry lists and stops a run', () => {
  const registry = new RunRegistry()
  const run = fakeRun('11111111-1111-4111-8111-111111111111', 'alpha')
  registry.register(run)
  assert.deepEqual(registry.list().map(item => item.id), [run.id])
  assert.equal(registry.stopAgent(run.id, 3), true)
  assert.equal(run.stoppedAgent, 3)
  assert.equal(registry.pause(run.id), true)
  assert.equal(run.paused, true)
  assert.equal(registry.resume(run.id), true)
  assert.equal(run.paused, false)
  assert.equal(registry.stop(run.id), true)
  assert.match(String(run.cancelled), /stopped/)
  assert.equal(registry.stop('22222222-2222-4222-8222-222222222222'), false)
})

test('/workflows stop routes to the live registry', async () => {
  const registry = new RunRegistry()
  const run = fakeRun('33333333-3333-4333-8333-333333333333', 'beta')
  registry.register(run)
  const definitions = []
  apply({
    dshWorkflow: { store: { dir: '/tmp/unused-workflow-store' } },
    workflowRuns: registry,
    commands: { register(value) { definitions.push(value) } },
  })
  const command = definitions.find(value => value.name === 'workflows')
  const pause = await command.handler({ rawInput: `pause ${run.id}`, agent: { session: { id: 'session-a' } } })
  assert.equal(pause.kind, 'success')
  assert.equal(run.paused, true)
  const resume = await command.handler({ rawInput: `resume ${run.id}`, agent: { session: { id: 'session-a' } } })
  assert.equal(resume.kind, 'success')
  assert.equal(run.paused, false)
  const stopAgent = await command.handler({ rawInput: `stop-agent ${run.id} 2`, agent: { session: { id: 'session-a' } } })
  assert.equal(stopAgent.kind, 'success')
  assert.equal(run.stoppedAgent, 2)
  const result = await command.handler({
    rawInput: `stop ${run.id}`,
    agent: { session: { id: 'session-a', header: { cwd: '/tmp' } } },
  })
  assert.equal(result.kind, 'success')
  assert.match(result.text, /stopped/i)
  assert.match(String(run.cancelled), /stopped/)
})

test('/workflows restart replays an archived script with resumeFromRunId', async t => {
  const { mkdtemp } = await import('node:fs/promises')
  const { join: joinPath } = await import('node:path')
  const { tmpdir } = await import('node:os')
  const temp = await mkdtemp(joinPath(tmpdir(), 'workflow-restart-'))
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(temp, { recursive: true, force: true }) })
  const { mkdir, writeFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  const { createHash } = await import('node:crypto')
  const sessionId = 'session-restart'
  const runId = '44444444-4444-4444-8444-444444444444'
  const dir = join(temp, 'workflows', createHash('sha256').update(sessionId).digest('hex'), runId)
  await mkdir(dir, { recursive: true })
  const script = 'export const meta = { name: "restart", description: "restart" };\nreturn 1;\n'
  await writeFile(join(dir, 'run.json'), JSON.stringify({ version: 1, id: runId, sessionId, script, meta: { name: 'restart' } }) + '\n')
  const definitions = []
  let request
  apply({
    dshWorkflow: { store: { dir: temp } },
    commands: { register(value) { definitions.push(value) } },
    workflowEngine: { start(value) {
      request = value
      return { id: runId, result: Promise.resolve({ stopReason: 'completed', agentsStarted: 0, value: 1 }), async dispose() {} }
    } },
  })
  const command = definitions.find(value => value.name === 'workflows')
  const result = await command.handler({ rawInput: `restart ${runId}`, agent: { session: { id: sessionId } } })
  assert.equal(result.kind, 'success')
  assert.equal(request.resumeFromRunId, runId)
  assert.match(request.script, /export const meta/)
})
