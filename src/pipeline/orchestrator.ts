import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { AGENTS, getAgent } from './agents.js'
import { readState, canRun, type PipelineState } from './state.js'
import { readOpenEpisodes, episodesForAgent, buildEpisodeContext } from '../episodes/manager.js'
import { loadPrompt, runtimeRoot } from '../prompts/loader.js'
import type { ConstructType } from '../parser/sil.js'

export interface RunResult {
  agentId: string
  ready: boolean
  reason?: string
  prompt?: string
  episodeCount: number
  prerequisitesMet: string[]
}

export interface ArtifactValidation {
  agentId: string
  expected: ConstructType[]
  found: Record<ConstructType, number>
  missing: ConstructType[]
  lowConfidence: string[]
}

// ─────────────────────────────────────────
// Directory layout for construct types
// ─────────────────────────────────────────

const CONSTRUCT_DIRS: Partial<Record<ConstructType, string>> = {
  signal: 'signals',
  workflow: 'workflows',
  screen: 'screens',
  spec: 'specs',
  episode: 'episodes',
  architecture: 'architecture',
  blueprint: 'architecture',
  build: 'build',
  certification: 'certification',
}

function artifactDir(projectPath: string, construct: ConstructType): string {
  return join(projectPath, CONSTRUCT_DIRS[construct] ?? construct)
}

function countArtifacts(projectPath: string, construct: ConstructType): number {
  const dir = artifactDir(projectPath, construct)
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((f) => f.endsWith('.sil')).length
}

// ─────────────────────────────────────────
// Pipeline summary — used in context block and status command
// ─────────────────────────────────────────

const STATUS_ICON: Record<string, string> = {
  complete: '✓',
  running: '⟳',
  waiting: '○',
}

export function pipelineSummary(state: PipelineState, projectPath: string): string {
  const lines: string[] = []
  const line = '─'.repeat(51)

  lines.push(`PROJECT: ${state.project}`)
  lines.push(`PATH:    ${state.path}`)
  lines.push(line)
  lines.push('')
  lines.push('PIPELINE')

  for (const agent of AGENTS) {
    const run = state.agents[agent.id]
    const check = canRun(agent.id, state)

    let statusLabel: string
    let confidenceLabel: string
    let detail: string

    if (run) {
      statusLabel = STATUS_ICON.complete
      confidenceLabel = run.confidence.padEnd(6)
      const count = run.outputCount
      const produces = agent.produces[0]
      detail = `${count} ${produces}${count !== 1 ? 's' : ''}`
    } else if (check.can) {
      statusLabel = STATUS_ICON.running
      confidenceLabel = '—     '
      detail = 'ready to run'
    } else {
      statusLabel = STATUS_ICON.waiting
      confidenceLabel = '—     '
      detail = `prereq: ${check.reason}`
    }

    lines.push(
      `  ${agent.id.toUpperCase()}  ${statusLabel}  ${confidenceLabel}  ${detail}`
    )
  }

  lines.push('')
  lines.push('HUMAN GATES')

  const allGates = [
    'a-04-approved',
    'pass-1',
    'pass-2',
    'pass-3',
    'pass-4',
    'pass-5',
    'pass-6',
  ]

  for (const gateId of allGates) {
    const gate = state.gates[gateId]
    const icon = gate?.status === 'approved' ? '✓' : gate?.status === 'returned' ? '✗' : '○'
    const label = gate?.status ?? 'pending'
    lines.push(`  ${gateId.padEnd(20)} ${icon}  ${label}`)
  }

  if (state.openEpisodes.length > 0) {
    lines.push('')
    lines.push('OPEN EPISODES')
    for (const epId of state.openEpisodes) {
      lines.push(`  ${epId}`)
    }
  }

  lines.push('')
  lines.push('ARTIFACT COUNTS')

  const constructs: ConstructType[] = [
    'signal', 'workflow', 'screen', 'spec', 'architecture', 'build', 'certification',
  ]
  for (const c of constructs) {
    const count = countArtifacts(projectPath, c)
    lines.push(`  /${CONSTRUCT_DIRS[c]}/`.padEnd(20) + `${count} files`)
  }

  lines.push(line)

  // Next action hint
  const nextAgent = AGENTS.find((a) => !state.agents[a.id] && canRun(a.id, state).can)
  if (nextAgent) {
    lines.push(`Next: phoenix run ${nextAgent.id} --project .`)
  }

  return lines.join('\n')
}

// ─────────────────────────────────────────
// Project context block injected into every prompt
// ─────────────────────────────────────────

function buildProjectContext(
  agentId: string,
  state: PipelineState,
  projectPath: string
): string {
  const agent = getAgent(agentId)!
  const line = '─'.repeat(42)

  const readDirs = agent.requires.constructs.map((c) => {
    const count = countArtifacts(projectPath, c)
    return `  ${artifactDir(projectPath, c)}     (${count} .sil files)`
  })

  // Mission brief is always readable if it exists
  const missionPath = join(projectPath, '_mission.sil')
  if (existsSync(missionPath) && !readDirs.some((l) => l.includes('_mission'))) {
    readDirs.unshift(`  ${missionPath}`)
  }

  const writeDirs = agent.produces.map((c) => `  ${artifactDir(projectPath, c)}/`)

  const lines = [
    'PROJECT CONTEXT',
    line,
    `Project: ${state.project}`,
    `Path:    ${state.path}`,
    '',
    'READ FROM:',
    ...readDirs,
    '',
    'WRITE TO:',
    ...writeDirs,
    '',
    'PIPELINE STATE:',
    pipelineSummary(state, projectPath),
  ]

  return lines.join('\n')
}

// ─────────────────────────────────────────
// prepareRun — the main orchestrator entry point
// ─────────────────────────────────────────

export async function prepareRun(
  agentId: string,
  projectPath: string
): Promise<RunResult> {
  const agent = getAgent(agentId)
  if (!agent) {
    return { agentId, ready: false, reason: `Unknown agent: ${agentId}`, episodeCount: 0, prerequisitesMet: [] }
  }

  // Load state
  const state = readState(projectPath)

  // Check prerequisites
  const check = canRun(agentId, state)
  if (!check.can) {
    return { agentId, ready: false, reason: check.reason, episodeCount: 0, prerequisitesMet: [] }
  }

  const prerequisitesMet = [
    ...agent.requires.agents.map((a) => `${a} complete`),
    ...agent.requires.gates.map((g) => `gate ${g} approved`),
  ]

  // Load open episodes for this agent
  const allEpisodes = readOpenEpisodes(projectPath)
  const relevantEpisodes = episodesForAgent(agentId, allEpisodes)
  const episodeContext = buildEpisodeContext(relevantEpisodes)

  // Load agent prompt
  const agentPrompt = loadPrompt(agent.promptFile, runtimeRoot())

  // Build project context
  const projectContext = buildProjectContext(agentId, state, projectPath)

  // Assemble final prompt:
  // 1. Episode context (if any) — agent reads this first
  // 2. Project context — where to read from, write to, current state
  // 3. Agent prompt — the full agent instructions
  const parts: string[] = []

  if (episodeContext) parts.push(episodeContext)
  parts.push(projectContext)
  parts.push(agentPrompt)

  const prompt = parts.join('\n\n' + '─'.repeat(42) + '\n\n')

  return {
    agentId,
    ready: true,
    prompt,
    episodeCount: relevantEpisodes.length,
    prerequisitesMet,
  }
}

// ─────────────────────────────────────────
// validateArtifacts — used by `phoenix validate <agent>`
// ─────────────────────────────────────────

export function validateArtifacts(
  agentId: string,
  projectPath: string
): ArtifactValidation {
  const agent = getAgent(agentId)
  if (!agent) throw new Error(`Unknown agent: ${agentId}`)

  const found: Partial<Record<ConstructType, number>> = {}
  const missing: ConstructType[] = []

  for (const construct of agent.produces) {
    const count = countArtifacts(projectPath, construct)
    found[construct] = count
    if (count === 0) missing.push(construct)
  }

  return {
    agentId,
    expected: agent.produces,
    found: found as Record<ConstructType, number>,
    missing,
    lowConfidence: [], // populated in Phase 4 with full .sil scan
  }
}
