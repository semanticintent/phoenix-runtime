// Phase 1 — Pipeline State
// State lives in .phoenix/state.json at the project root.
// Human readable. Git diffable. No external store needed.

export interface AgentRun {
  agentId: string
  completedAt: string
  outputCount: number
  confidence: 'high' | 'medium' | 'low'
  summary: string
}

export interface GateRecord {
  gateId: string
  status: 'pending' | 'approved' | 'returned'
  reviewedAt?: string
  reviewer?: string
  notes?: string
}

export interface PipelineState {
  project: string
  path: string
  createdAt: string
  updatedAt: string
  agents: Record<string, AgentRun>
  gates: Record<string, GateRecord>
  openEpisodes: string[]
}

export function readState(projectPath: string): PipelineState {
  throw new Error('Not implemented')
}

export function writeState(projectPath: string, state: PipelineState): void {
  throw new Error('Not implemented')
}

export function canRun(
  agentId: string,
  state: PipelineState
): { can: boolean; reason?: string } {
  throw new Error('Not implemented')
}

export function markAgentComplete(
  agentId: string,
  run: AgentRun,
  state: PipelineState
): PipelineState {
  throw new Error('Not implemented')
}

export function approveGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState {
  throw new Error('Not implemented')
}

export function returnGate(
  gateId: string,
  notes: string,
  state: PipelineState
): PipelineState {
  throw new Error('Not implemented')
}
