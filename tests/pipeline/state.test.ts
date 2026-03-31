import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  initState,
  readState,
  writeState,
  canRun,
  markAgentComplete,
  approveGate,
  returnGate,
} from '../../src/pipeline/state.js'
import type { AgentRun } from '../../src/pipeline/state.js'

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `phoenix-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

const mockRun = (agentId: string): AgentRun => ({
  agentId,
  completedAt: new Date().toISOString(),
  outputCount: 3,
  confidence: 'high',
  summary: `${agentId} completed`,
})

describe('readState / writeState', () => {
  it('throws when no state file exists', () => {
    expect(() => readState(testDir)).toThrow('No .phoenix/state.json found')
  })

  it('round-trips state through write and read', () => {
    const state = initState(testDir, 'test-project')
    writeState(testDir, state)
    const loaded = readState(testDir)
    expect(loaded.project).toBe('test-project')
    expect(loaded.path).toBe(testDir)
    expect(loaded.agents).toEqual({})
    expect(loaded.gates).toEqual({})
  })

  it('creates .phoenix directory if missing', () => {
    const state = initState(testDir, 'test-project')
    writeState(testDir, state)
    expect(existsSync(join(testDir, '.phoenix', 'state.json'))).toBe(true)
  })
})

describe('canRun', () => {
  it('allows a-00 with no prerequisites', () => {
    const state = initState(testDir, 'test-project')
    const result = canRun('a-00', state)
    expect(result.can).toBe(true)
  })

  it('blocks a-01 when a-00 has not run', () => {
    const state = initState(testDir, 'test-project')
    const result = canRun('a-01', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('a-00')
  })

  it('allows a-01 after a-00 completes', () => {
    let state = initState(testDir, 'test-project')
    state = markAgentComplete('a-00', mockRun('a-00'), state)
    const result = canRun('a-01', state)
    expect(result.can).toBe(true)
  })

  it('blocks a-05 without gate approval', () => {
    let state = initState(testDir, 'test-project')
    state = markAgentComplete('a-00', mockRun('a-00'), state)
    state = markAgentComplete('a-01', mockRun('a-01'), state)
    state = markAgentComplete('a-02', mockRun('a-02'), state)
    state = markAgentComplete('a-03', mockRun('a-03'), state)
    state = markAgentComplete('a-04', mockRun('a-04'), state)
    const result = canRun('a-05', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('a-04-approved')
  })

  it('allows a-05 after gate is approved', () => {
    let state = initState(testDir, 'test-project')
    state = markAgentComplete('a-00', mockRun('a-00'), state)
    state = markAgentComplete('a-01', mockRun('a-01'), state)
    state = markAgentComplete('a-02', mockRun('a-02'), state)
    state = markAgentComplete('a-03', mockRun('a-03'), state)
    state = markAgentComplete('a-04', mockRun('a-04'), state)
    state = approveGate('a-04-approved', 'looks good', state)
    const result = canRun('a-05', state)
    expect(result.can).toBe(true)
  })

  it('returns error for unknown agent', () => {
    const state = initState(testDir, 'test-project')
    const result = canRun('a-99', state)
    expect(result.can).toBe(false)
    expect(result.reason).toContain('Unknown agent')
  })
})

describe('approveGate / returnGate', () => {
  it('approves a gate with notes', () => {
    let state = initState(testDir, 'test-project')
    state = approveGate('pass-1', 'screens look correct', state)
    expect(state.gates['pass-1'].status).toBe('approved')
    expect(state.gates['pass-1'].notes).toBe('screens look correct')
    expect(state.gates['pass-1'].reviewedAt).toBeTruthy()
  })

  it('returns a gate with notes', () => {
    let state = initState(testDir, 'test-project')
    state = returnGate('pass-2', 'payment screen missing error state', state)
    expect(state.gates['pass-2'].status).toBe('returned')
    expect(state.gates['pass-2'].notes).toBe('payment screen missing error state')
  })
})
