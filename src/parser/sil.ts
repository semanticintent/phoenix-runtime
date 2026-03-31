// Phase 1 — SIL Parser
// Reads and writes .sil files. Line-oriented text — no PEG grammar needed.
// One construct per file. Header is always three lines + separator.

export type ConstructType =
  | 'signal'
  | 'workflow'
  | 'screen'
  | 'spec'
  | 'episode'
  | 'architecture'
  | 'blueprint'
  | 'build'
  | 'certification'

export interface SilConstruct {
  construct: ConstructType
  id: string
  version: number
  fields: Record<string, string | string[]>
  raw: string
}

export function readSil(path: string): SilConstruct {
  throw new Error('Not implemented')
}

export function writeSil(path: string, construct: SilConstruct): void {
  throw new Error('Not implemented')
}

export function readSilDir(dirPath: string): SilConstruct[] {
  throw new Error('Not implemented')
}

export function readMissionBrief(projectPath: string): SilConstruct {
  throw new Error('Not implemented')
}

export function getConfidence(
  construct: SilConstruct
): 'high' | 'medium' | 'low' | null {
  throw new Error('Not implemented')
}
