import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const name = 'dsh-workflow-ultracode'
export const inject = ['commands', 'dshWorkflow']

const SECTION = 'workflow-ultracode'
const POLICY = `ULTRA CODE IS ARMED for this session.

Before answering, classify the request:
- Substantive work (design, audit, migration, research, multi-file change, review, investigation across many inputs) MUST use the \`workflow\` tool. Do not answer it with a single pass or one subagent.
- Trivial work (one fact, one command, a tiny edit) may be answered directly.

When a workflow is warranted:
- Write an inline script with \`export const meta\` and explicit \`phase()\` labels.
- Prefer \`pipeline()\` for independent items and \`parallel()\` only where a barrier is genuinely needed.
- Give writers \`isolation: 'worktree'\`; use \`schema\` for machine-checkable results.
- Add adversarial verification for claims and synthesize evidence, not just agent summaries.
- Use \`effort: 'high'\` for demanding agents when it is supported.
- Report failures and coverage honestly; a completed script is not proof that every child succeeded.`

function statePath(ctx) {
  const dir = ctx.dshWorkflow?.store?.dir
  if (typeof dir !== 'string' || dir.length === 0) throw new Error('workflow store is unavailable')
  const stateDir = join(dir, 'ultracode')
  mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  return join(stateDir, 'sessions.json')
}

function load(ctx) {
  try {
    const value = JSON.parse(readFileSync(statePath(ctx), 'utf8'))
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return new Map()
    return new Map(Object.entries(value).filter(([, armed]) => armed === true))
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw error
  }
}

function save(ctx, states) {
  const path = statePath(ctx)
  const temporary = path + '.tmp'
  writeFileSync(temporary, JSON.stringify(Object.fromEntries([...states].filter(([, armed]) => armed))) + '\n', { mode: 0o600 })
  renameSync(temporary, path)
}

function parse(rawInput) {
  const value = String(rawInput ?? '').trim().toLowerCase()
  if (value === 'on' || value === 'off' || value === 'status') return value
  return value.length === 0 ? 'status' : 'help'
}

export function apply(ctx) {
  const states = load(ctx)
  const sessionId = invocation => invocation?.agent?.session?.id
  const isOn = id => typeof id === 'string' && states.has(id)
  const set = (id, armed) => {
    if (armed) states.set(id, true)
    else states.delete(id)
    save(ctx, states)
  }

  ctx.commands.register({
    name: 'ultracode',
    description: 'Arm or disarm workflow-first mode for this session',
    input: { hint: '[on|off|status]' },
    handler(invocation) {
      const id = sessionId(invocation)
      if (typeof id !== 'string') return { kind: 'error', text: 'ultracode: no active session' }
      const action = parse(invocation.rawInput)
      if (action === 'on') {
        set(id, true)
        return { kind: 'success', text: 'ULTRA CODE: ON. Substantive tasks will be routed through the workflow tool.' }
      }
      if (action === 'off') {
        set(id, false)
        return { kind: 'success', text: 'ULTRA CODE: OFF.' }
      }
      if (action === 'status') {
        return { kind: 'success', text: isOn(id) ? 'ULTRA CODE: ON.' : 'ULTRA CODE: OFF.' }
      }
      return { kind: 'error', text: 'Usage: /ultracode [on|off|status]' }
    },
  })

  const systemPrompt = ctx.get?.('systemPrompt')
  if (systemPrompt === undefined) return
  const register = () => systemPrompt.section({
    name: SECTION,
    order: 2650,
    text: context => isOn(context?.agent?.session?.id) ? POLICY : '',
  })
  if (typeof ctx.effect === 'function') ctx.effect(register)
  else register()
}
