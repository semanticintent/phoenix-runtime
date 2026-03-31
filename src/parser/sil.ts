import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, extname } from 'node:path'

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

// The separator is 41 Unicode box-drawing dashes (─, U+2500), not ASCII hyphens
const SEPARATOR_RE = /^─+$/u
const FIELD_RE = /^([a-z]\w*):\s*(.*)$/

// ─────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────

function parseHeader(
  lines: string[]
): { construct: ConstructType; id: string; version: number; bodyStart: number } {
  const sepIdx = lines.findIndex((l) => SEPARATOR_RE.test(l.trim()))
  if (sepIdx < 3) throw new Error('Invalid .sil file: separator line not found')

  const construct = lines[0].replace(/^CONSTRUCT\s+/, '').trim() as ConstructType
  const id = lines[1].replace(/^ID\s+/, '').trim()
  const version = parseInt(lines[2].replace(/^VERSION\s+/, '').trim(), 10)

  if (!construct) throw new Error('Invalid .sil file: missing CONSTRUCT')
  if (!id) throw new Error('Invalid .sil file: missing ID')
  if (isNaN(version)) throw new Error('Invalid .sil file: missing VERSION')

  return { construct, id, version, bodyStart: sepIdx + 1 }
}

function parseBody(bodyLines: string[]): Record<string, string | string[]> {
  const fields: Record<string, string | string[]> = {}
  let i = 0

  while (i < bodyLines.length) {
    const line = bodyLines[i]

    // Skip blank lines and comments at the top level
    if (!line.trim() || line.trimStart().startsWith('#')) {
      i++
      continue
    }

    // Top-level field: word immediately at column 0
    const fieldMatch = line.match(FIELD_RE)
    if (fieldMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      const key = fieldMatch[1]
      const inlineValue = fieldMatch[2].trim()

      if (inlineValue) {
        // Simple single-line value
        fields[key] = inlineValue
        i++
      } else {
        // Multi-line value — collect all indented lines that follow
        i++
        const valueLines: string[] = []
        while (
          i < bodyLines.length &&
          (bodyLines[i].startsWith('  ') ||
            bodyLines[i].startsWith('\t') ||
            !bodyLines[i].trim())
        ) {
          if (bodyLines[i].trim()) valueLines.push(bodyLines[i])
          i++
        }

        if (valueLines.length === 0) {
          fields[key] = ''
        } else if (valueLines.every((l) => l.trimStart().startsWith('- '))) {
          // Uniform list — store as string[]
          fields[key] = valueLines.map((l) => l.trimStart().replace(/^-\s+/, ''))
        } else {
          // Mixed or prose — store as joined string, trimmed
          fields[key] = valueLines.map((l) => l.trim()).join('\n')
        }
      }
    } else {
      // Non-field line at top level (e.g. SCREEN blocks in screen constructs)
      // Absorbed into raw; skip here
      i++
    }
  }

  return fields
}

// ─────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────

const SEPARATOR = '─'.repeat(41)

function serializeFields(fields: Record<string, string | string[]>): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`)
      for (const item of value) lines.push(`  - ${item}`)
    } else if (value.includes('\n')) {
      lines.push(`${key}:`)
      for (const l of value.split('\n')) lines.push(`  ${l}`)
    } else {
      lines.push(`${key}: ${value}`)
    }
  }
  return lines.join('\n')
}

// ─────────────────────────────────────────
// Public API
// ─────────────────────────────────────────

export function parseSil(raw: string): SilConstruct {
  const lines = raw.split('\n')
  const { construct, id, version, bodyStart } = parseHeader(lines)
  const fields = parseBody(lines.slice(bodyStart))
  return { construct, id, version, fields, raw }
}

export function readSil(filePath: string): SilConstruct {
  const raw = readFileSync(filePath, 'utf-8')
  return parseSil(raw)
}

export function writeSil(filePath: string, construct: SilConstruct): void {
  const header = [
    `CONSTRUCT  ${construct.construct}`,
    `ID         ${construct.id}`,
    `VERSION    ${construct.version}`,
    SEPARATOR,
  ].join('\n')
  const body = serializeFields(construct.fields)
  writeFileSync(filePath, `${header}\n${body}\n`, 'utf-8')
}

export function readSilDir(dirPath: string): SilConstruct[] {
  return readdirSync(dirPath)
    .filter((f) => extname(f) === '.sil')
    .map((f) => readSil(join(dirPath, f)))
}

export function readMissionBrief(projectPath: string): SilConstruct {
  return readSil(join(projectPath, '_mission.sil'))
}

export function getConfidence(
  construct: SilConstruct
): 'high' | 'medium' | 'low' | null {
  const val = construct.fields['confidence']
  if (val === 'high' || val === 'medium' || val === 'low') return val
  return null
}
