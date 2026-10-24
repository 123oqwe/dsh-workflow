import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

function block(id) {
  const start = patch.indexOf(`\n- id: ${id}\n`)
  if (start === -1) return ''
  const rest = patch.slice(start + 1)
  const next = rest.slice(1).search(/\n- id: /)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

test('the bundle ships a Standard preset without the native workflow engine or tool', () => {
  const preset = block('preset-standard')
  assert.ok(preset, 'cordis.patch.yml must replace preset-standard')
  assert.match(preset, /config:\n\s+id: standard/)
  for (const row of ['workflow-worker-thread', 'workflow-filesystem', 'workflow-ptc', 'tool-workflow']) {
    assert.doesNotMatch(preset, new RegExp(`- id: ${row}\\b`), `preset-standard must not mount ${row}`)
  }
  for (const row of ['tool-bash', 'tool-fs', 'tool-subagent', 'tool-ask-user', 'tool-todo']) {
    assert.match(preset, new RegExp(`- id: ${row}\\b`), `preset-standard must keep ${row}`)
  }
  assert.doesNotMatch(preset, /workflowEngine: true/, 'the delegation realm must not hide the plugin workflow engine')
})

test('the bundle still inserts its own runtime, spawn, engine and tool', () => {
  for (const row of ['dsh-workflow-runtime', 'dsh-workflow-spawn', 'dsh-workflow-engine', 'dsh-workflow-tool']) {
    assert.match(patch, new RegExp(`- id: ${row}\\b`))
  }
  assert.match(patch, /name: dsh-workflow-plus\/engine/)
  assert.match(patch, /name: dsh-workflow-plus\/tool/)
})

test('the bundle ships a PTC preset without the native workflow engine or tool', () => {
  const preset = block('preset-ptc')
  assert.ok(preset, 'cordis.patch.yml must replace preset-ptc')
  assert.match(preset, /config:\n\s+id: ptc/)
  for (const row of ['workflow-worker-thread', 'workflow-filesystem', 'workflow-ptc', 'tool-workflow']) {
    assert.doesNotMatch(preset, new RegExp(`- id: ${row}\\b`), `preset-ptc must not mount ${row}`)
  }
  for (const row of ['tool-bash', 'tool-fs', 'tool-subagent', 'tool-ask-user', 'tool-todo']) {
    assert.match(preset, new RegExp(`- id: ${row}\\b`), `preset-ptc must keep ${row}`)
  }
  assert.doesNotMatch(preset, /workflowEngine: true/, 'the PTC delegation realm must not hide the plugin workflow engine')
})
