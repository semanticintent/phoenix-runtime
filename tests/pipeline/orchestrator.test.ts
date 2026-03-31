import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { prepareRun, pipelineSummary, validateArtifacts } from '../../src/pipeline/orchestrator.js'
import { initState, writeState, markAgentComplete, approveGate } from '../../src/pipeline/state.js'
import { AGENTS } from '../../src/pipeline/agents.js'
import type { AgentRun } from '../../src/pipeline/state.js'

const FIXTURES = join(import.meta.dirname, '../fixtures')

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `phoenix-orch-test-${Date.now()}`)
  // Create full project directory structure
  for (const dir of ['signals', 'workflows', 'screens', 'specs', 'episodes', 'architecture', 'build', 'certification', 'agents']) {
    mkdirSync(join(testDir, dir), { recursive: true })
  }
  mkdirSync(join(testDir, '.phoenix'), { recursive: true })
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

const mockRun = (agentId: string, outputCount = 3): AgentRun => ({
  agentId,
  completedAt: new Date().toISOString(),
  outputCount,
  confidence: 'high',
  summary: `${agentId} completed`,
})

// Write a minimal agent prompt using the exact filename from the agents registry
function writeAgentPrompt(agentId: string) {
  const agent = AGENTS.find((a) => a.id === agentId)!
  const filePath = join(testDir, agent.promptFile)
  writeFileSync(filePath, `# ${agent.name}\nYou are the ${agent.name} agent. Read your inputs. Produce your outputs.`)
}

// Set up a project with state initialized and a-00 complete
function setupProjectWithA00() {
  let state = initState(testDir, 'test-project')
  state = markAgentComplete('a-00', mockRun('a-00', 5), state)
  writeState(testDir, state)

  // Write a signal .sil file
  cpSync(join(FIXTURES, 'cart.checkout.signal.sil'), join(testDir, 'signals', 'cart.checkout.sil'))
  writeFileSync(join(testDir, '_mission.sil'), [
    'CONSTRUCT  signal',
    'ID         _mission',
    'VERSION    1',
    '─────────────────────────────────────────',
    'project:   test-project',
    'system:    order management system',
  ].join('\n'))
}

describe('prepareRun — not ready', () => {
  it('returns not ready for unknown agent', async () => {
    let state = initState(testDir, 'test-project')
    writeState(testDir, state)
    const result = await prepareRun('a-99', testDir)
    expect(result.ready).toBe(false)
    expect(result.reason).toContain('Unknown agent')
  })

  it('returns not ready when prerequisites not met', async () => {
    let state = initState(testDir, 'test-project')
    writeState(testDir, state)
    const result = await prepareRun('a-01', testDir)
    expect(result.ready).toBe(false)
    expect(result.reason).toContain('a-00')
    expect(result.episodeCount).toBe(0)
    expect(result.prerequisitesMet).toHaveLength(0)
  })
})

describe('prepareRun — ready', () => {
  it('returns ready with prompt when prerequisites are met', async () => {
    setupProjectWithA00()
    writeAgentPrompt('a-01')
    // Patch runtimeRoot to point to testDir so loader finds our agents/
    process.env['PHOENIX_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('a-01', testDir)
    expect(result.ready).toBe(true)
    expect(result.prompt).toBeDefined()
    expect(result.episodeCount).toBe(0)
    expect(result.prerequisitesMet).toContain('a-00 complete')
  })

  it('includes episode context when open episodes affect the agent', async () => {
    setupProjectWithA00()
    writeAgentPrompt('a-01')
    process.env['PHOENIX_RUNTIME_ROOT'] = testDir

    // Drop the ep-042 fixture — affects a-01
    cpSync(join(FIXTURES, 'ep-042.sil'), join(testDir, 'episodes', 'ep-042.sil'))
    let state = initState(testDir, 'test-project')
    state = markAgentComplete('a-00', mockRun('a-00', 5), state)
    state.openEpisodes = ['ep-042']
    writeState(testDir, state)

    const result = await prepareRun('a-01', testDir)
    expect(result.ready).toBe(true)
    expect(result.episodeCount).toBe(1)
    expect(result.prompt).toContain('OPEN EPISODES')
    expect(result.prompt).toContain('ep-042')
  })

  it('prompt includes project context — READ FROM and WRITE TO', async () => {
    setupProjectWithA00()
    writeAgentPrompt('a-01')
    process.env['PHOENIX_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('a-01', testDir)
    expect(result.prompt).toContain('PROJECT CONTEXT')
    expect(result.prompt).toContain('READ FROM')
    expect(result.prompt).toContain('WRITE TO')
    expect(result.prompt).toContain('workflows')
  })

  it('prompt includes agent instructions', async () => {
    setupProjectWithA00()
    writeAgentPrompt('a-01')
    process.env['PHOENIX_RUNTIME_ROOT'] = testDir

    const result = await prepareRun('a-01', testDir)
    expect(result.prompt).toContain('Business Logic Extractor')
  })
})

describe('pipelineSummary', () => {
  it('shows all seven agents', () => {
    let state = initState(testDir, 'test-project')
    const summary = pipelineSummary(state, testDir)
    for (const id of ['A-00', 'A-01', 'A-02', 'A-03', 'A-04', 'A-05', 'A-06']) {
      expect(summary).toContain(id)
    }
  })

  it('shows ✓ for completed agents', () => {
    let state = initState(testDir, 'test-project')
    state = markAgentComplete('a-00', mockRun('a-00', 5), state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('✓')
  })

  it('shows next action hint', () => {
    let state = initState(testDir, 'test-project')
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('phoenix run a-00')
  })

  it('shows gate status', () => {
    let state = initState(testDir, 'test-project')
    state = approveGate('a-04-approved', 'looks good', state)
    const summary = pipelineSummary(state, testDir)
    expect(summary).toContain('a-04-approved')
    expect(summary).toContain('approved')
  })
})

describe('validateArtifacts', () => {
  it('reports missing constructs when directory is empty', () => {
    const result = validateArtifacts('a-01', testDir)
    expect(result.agentId).toBe('a-01')
    expect(result.missing).toContain('workflow')
  })

  it('reports zero missing when files exist', () => {
    cpSync(
      join(FIXTURES, 'cart.checkout.signal.sil'),
      join(testDir, 'workflows', 'cart.checkout.sil')
    )
    const result = validateArtifacts('a-01', testDir)
    expect(result.found['workflow']).toBe(1)
    expect(result.missing).not.toContain('workflow')
  })

  it('throws for unknown agent', () => {
    expect(() => validateArtifacts('a-99', testDir)).toThrow('Unknown agent')
  })
})
