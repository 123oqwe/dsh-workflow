import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../src/ultracode.mjs'

async function harness(t, root) {
  root ??= await mkdtemp(join(tmpdir(), 'workflow-ultracode-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  let definition
  let section
  const systemPrompt = { section(value) { section = value; return () => {} } }
  const ctx = {
    dshWorkflow: { store: { dir: join(root, 'dsh-workflow') } },
    commands: { register(value) { definition = value } },
    systemPrompt,
    get(name) { return name === 'systemPrompt' ? systemPrompt : undefined },
    on() { return () => {} },
  }
  apply(ctx)
  return { root, ctx, command: () => definition, policy: () => section }
}

test('ultracode toggles per session and contributes a workflow-first section only when armed', async t => {
  const h = await harness(t)
  const definition = h.command()
  assert.equal(definition.name, 'ultracode')
  const invocation = rawInput => ({ rawInput, agent: { session: { id: 'session-a' } } })
  const initial = await definition.handler(invocation('status'))
  assert.equal(initial.kind, 'success')
  assert.match(initial.text, /OFF/)
  assert.equal(h.policy().text({ agent: { session: { id: 'session-a' } } }), '')
  const on = await definition.handler(invocation('on'))
  assert.match(on.text, /ON/)
  const policy = h.policy().text({ agent: { session: { id: 'session-a' } } })
  assert.match(policy, /ULTRA CODE/)
  assert.match(policy, /workflow/)
  assert.equal(h.policy().text({ agent: { session: { id: 'session-b' } } }), '')
  const off = await definition.handler(invocation('off'))
  assert.match(off.text, /OFF/)
  assert.equal(h.policy().text({ agent: { session: { id: 'session-a' } } }), '')
})

test('ultracode persists the armed session across a host restart', async t => {
  const first = await harness(t)
  await first.command().handler({ rawInput: 'on', agent: { session: { id: 'session-persist' } } })
  const second = await harness(t, first.root)
  const status = await second.command().handler({ rawInput: 'status', agent: { session: { id: 'session-persist' } } })
  assert.match(status.text, /ON/)
  assert.match(second.policy().text({ agent: { session: { id: 'session-persist' } } }), /ULTRA CODE/)
  await second.command().handler({ rawInput: 'off', agent: { session: { id: 'session-persist' } } })
})
