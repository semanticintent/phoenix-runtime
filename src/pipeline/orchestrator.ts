// Phase 2 — Orchestrator
// Checks prerequisites, loads prompt, injects episode context.
// Produces the final prompt ready to paste into Claude Code.
// Does NOT call an AI API — model-agnostic by design.

export interface RunResult {
  agentId: string
  ready: boolean
  reason?: string
  prompt?: string
  episodeCount: number
  prerequisitesMet: string[]
}

export async function prepareRun(
  agentId: string,
  projectPath: string
): Promise<RunResult> {
  throw new Error('Not implemented')
}
