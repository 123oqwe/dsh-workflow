import test from 'node:test'
import assert from 'node:assert/strict'
import { RunRegistry } from '../src/run-registry.mjs'
import { apply } from '../src/commands.mjs'

function fakeRun(id, name) {
  let cancelled = false
  let stoppedAgent
  return {
    id,
    meta: { name },
    get cancelled() { return cancelled },
    get stoppedAgent() { return stoppedAgent },
    cancel(reason) { cancelled = reason ?? true },
    cancelAgent(seq) { stoppedAgent = seq; return true },
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
