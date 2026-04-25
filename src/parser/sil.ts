// Thin shim — all parsing logic lives in @semanticintent/ember.
// phoenix-runtime re-exports under the original SilConstruct / parseSil names
// for backward compatibility, and adds readMissionBrief (phoenix-specific).

import { join } from 'node:path'
import {
  parse,
  read,
  write,
  readDir,
  getConfidence as _getConfidence,
} from '@semanticintent/ember'

export type { ConstructType } from '@semanticintent/ember'
export type { EmberConstruct as SilConstruct } from '@semanticintent/ember'

export const parseSil = parse
export const readSil = read
export const writeSil = write
export const readSilDir = readDir
export const getConfidence = _getConfidence

export function readMissionBrief(projectPath: string) {
  return read(join(projectPath, '_mission.sil'))
}
