import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export const name = 'dsh-workflow-commands'
export const inject = ['commands', 'dshWorkflow']

const RUN_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const HELP = [
  'Usage: /workflow [list|show <runId>|resume <runId>]',
  '',
  '  list            List workflow runs for this session',
  '  show <runId>    Show the archived script, meta and status',
  '  resume <runId>  Resume the archived script in this session',
].join('\n')

export function parseCommand(rawInput = '') {
  const parts = String(rawInput).trim().split(/\s+/).filter(Boolean)
  const verb = parts[0]?.toLowerCase() ?? 'list'
  if (verb === 'list') return { verb: 'list' }
  if ((verb === 'show' || verb === 'resume') && parts.length === 2 && parts[1].length > 0) {
    return { verb, id: parts[1] }
  }
  return { verb: 'help' }
}

export function formatRuns(runs) {
  if (runs.length === 0) return 'Workflow runs (0)\nNo runs recorded for this session.'
  const lines = runs.map(run => `  ${run.id.padEnd(38)} ${String(run.name).padEnd(24)} ${run.status}`)
  return [`Workflow runs (${runs.length})`, '  Run ID                                 Name                     Status', ...lines].join('\n')
}

function sessionKey(sessionId) {
  return createHash('sha256').update(String(sessionId)).digest('hex')
}

function storeRoot(ctx) {
  const dir = ctx.dshWorkflow?.store?.dir
  if (typeof dir !== 'string' || dir.length === 0) throw new Error('workflow store is unavailable')
  return dir
}

function sessionDirectory(ctx, sessionId) {
  return join(storeRoot(ctx), 'workflows', sessionKey(sessionId))
}

function runDirectory(ctx, sessionId, id) {
  if (!RUN_ID.test(id)) throw new Error(`invalid workflow run id: ${id}`)
  return join(sessionDirectory(ctx, sessionId), id)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function readStatus(directory) {
  try {
    const text = await readFile(join(directory, 'journal.jsonl'), 'utf8')
    const lines = text.trim().split('\n')
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const event = JSON.parse(lines[index])
      if (event.type === 'end') return event.outcome?.stopReason ?? event.outcome?.status ?? 'completed'
    }
    return 'running'
  } catch {
    return 'unknown'
  }
}

async function listRuns(ctx, sessionId, limit = 20) {
  const directory = sessionDirectory(ctx, sessionId)
  let names
  try { names = await readdir(directory) } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
  const runs = []
  for (const name of names) {
    if (!RUN_ID.test(name)) continue
    const dir = join(directory, name)
    try {
      const record = await readJson(join(dir, 'run.json'))
      runs.push({ id: record.id, name: record.meta?.name ?? 'workflow', status: await readStatus(dir), dir })
    } catch {
      // A torn or foreign directory is not a run; skip it rather than failing the list.
    }
  }
  return runs.slice(0, limit)
}

async function findRun(ctx, sessionId, id) {
  const directory = runDirectory(ctx, sessionId, id)
  const record = await readJson(join(directory, 'run.json'))
  if (record.sessionId !== sessionId) throw new Error(`workflow run ${id} belongs to another session`)
  return { directory, record }
}

async function showRun(ctx, sessionId, id) {
  const { directory, record } = await findRun(ctx, sessionId, id)
  const status = await readStatus(directory)
  return [
    `Workflow ${record.meta?.name ?? 'workflow'} (${id})`,
    `Status:  ${status}`,
    `Script:  ${join(directory, 'script.js')}`,
    `Journal: ${join(directory, 'journal.jsonl')}`,
    '',
    'Meta:',
    JSON.stringify(record.meta ?? {}, null, 2),
  ].join('\n')
}

async function resumeRun(ctx, invocation, id) {
  const { record } = await findRun(ctx, invocation.agent.session.id, id)
  const run = ctx.workflowEngine.start({
    script: record.script,
    meta: record.meta,
    ...record.args === undefined ? {} : { args: record.args },
    resumeFromRunId: id,
    parent: invocation.agent,
    ...invocation.signal === undefined ? {} : { signal: invocation.signal },
  })
  try {
    const result = await run.result
    if (result.stopReason !== 'completed') throw new Error(result.error ?? `workflow stopped: ${result.stopReason}`)
    return [
      `Workflow ${record.meta?.name ?? 'workflow'} resumed (${run.id}).`,
      `Agents: ${result.agentsStarted ?? 0}`,
      `Result: ${JSON.stringify(result.value)}`,
    ].join('\n')
  } finally {
    if (typeof run.dispose === 'function') await run.dispose()
  }
}

export function apply(ctx) {
  ctx.commands.register({
    name: 'workflow',
    description: 'List, inspect or resume workflow runs in this session',
    input: { hint: '[list|show <runId>|resume <runId>]' },
    async handler(invocation) {
      const command = parseCommand(invocation.rawInput)
      try {
        if (command.verb === 'list') return { kind: 'success', text: formatRuns(await listRuns(ctx, invocation.agent.session.id)) }
        if (command.verb === 'show') return { kind: 'success', text: await showRun(ctx, invocation.agent.session.id, command.id) }
        if (command.verb === 'resume') return { kind: 'success', text: await resumeRun(ctx, invocation, command.id) }
        return { kind: 'error', text: HELP }
      } catch (error) {
        return { kind: 'error', text: `workflow: ${error instanceof Error ? error.message : String(error)}` }
      }
    },
  })
}
