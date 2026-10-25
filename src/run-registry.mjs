import { Service } from '@deepseek-ai/cordis'

/** In-process handles for workflow runs, used by the human control commands. */
export class RunRegistry {
  constructor() {
    this.runs = new Map()
  }

  register(run) {
    const entry = { id: run.id, meta: run.meta ?? {}, run, startedAt: Date.now() }
    this.runs.set(run.id, entry)
    void run.result.finally(() => {
      if (this.runs.get(run.id) === entry) this.runs.delete(run.id)
    }).catch(() => {})
    return entry
  }

  list() {
    return [...this.runs.values()].map(({ id, meta, startedAt }) => ({ id, meta, startedAt }))
  }

  stop(id, reason = 'stopped via /workflows') {
    const entry = this.runs.get(id)
    if (entry === undefined) return false
    entry.run.cancel(reason)
    this.runs.delete(id)
    return true
  }

  stopAgent(id, seq) {
    const entry = this.runs.get(id)
    if (entry === undefined || typeof entry.run.cancelAgent !== 'function') return false
    return entry.run.cancelAgent(seq) === true
  }

  pause(id) {
    const entry = this.runs.get(id)
    if (entry === undefined || typeof entry.run.pause !== 'function') return false
    entry.run.pause()
    return true
  }

  resume(id) {
    const entry = this.runs.get(id)
    if (entry === undefined || typeof entry.run.resume !== 'function') return false
    entry.run.resume()
    return true
  }
}

export const name = 'dsh-workflow-runs'
export const inject = ['dshWorkflow']

const SHARED = Symbol.for('dsh.workflow.runs')
const shared = globalThis[SHARED] ??= new RunRegistry()

export class WorkflowRuns extends Service {
  constructor(ctx) {
    super(ctx, 'workflowRuns')
    this.registry = shared
  }

  list() { return this.registry.list() }

  stop(id, reason) { return this.registry.stop(id, reason) }

  stopAgent(id, seq) { return this.registry.stopAgent(id, seq) }

  pause(id) { return this.registry.pause(id) }

  resume(id) { return this.registry.resume(id) }
}

export function apply(ctx) {
  new WorkflowRuns(ctx)
}
