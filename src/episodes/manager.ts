import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readSil, writeSil, readSilDir } from '../parser/sil.js'
import type { SilConstruct } from '../parser/sil.js'

export interface Episode {
  id: string
  date: string
  trigger: string
  status: 'open' | 'active' | 'resolved'
  change: string
  reason: string
  affects: Record<string, string> // agentId → instruction
  skip: string[]
}

const EPISODES_DIR = 'episodes'

// Parse the affects field from .sil lines into a Record<agentId, instruction>
// Each line looks like: "A-01  → add guest.checkout workflow"
function parseAffects(raw: string | string[]): Record<string, string> {
  const lines = Array.isArray(raw) ? raw : raw.split('\n')
  const result: Record<string, string> = {}
  for (const line of lines) {
    const match = line.trim().match(/^(A-\d{2})\s+→\s+(.+)$/)
    if (match) result[match[1].toLowerCase().replace('-', '-')] = match[2].trim()
  }
  return result
}

// Parse the skip field from .sil lines into string[]
// Each line looks like: "A-00  → brief unchanged"
function parseSkip(raw: string | string[]): string[] {
  const lines = Array.isArray(raw) ? raw : raw.split('\n')
  return lines
    .map((l) => {
      const match = l.trim().match(/^(A-\d{2})/)
      return match ? match[1].toLowerCase() : null
    })
    .filter((v): v is string => v !== null)
}

function episodeFromConstruct(construct: SilConstruct): Episode {
  const f = construct.fields
  return {
    id: construct.id,
    date: String(f['date'] ?? ''),
    trigger: String(f['trigger'] ?? ''),
    status: (f['status'] as Episode['status']) ?? 'open',
    change: String(f['change'] ?? ''),
    reason: String(f['reason'] ?? ''),
    affects: f['affects'] ? parseAffects(f['affects']) : {},
    skip: f['skip'] ? parseSkip(f['skip']) : [],
  }
}

function episodeToConstruct(episode: Episode): SilConstruct {
  const affectsLines = Object.entries(episode.affects).map(
    ([agentId, instruction]) => `${agentId.toUpperCase()}  → ${instruction}`
  )
  const skipLines = episode.skip.map((agentId) => `${agentId.toUpperCase()}  → (skipped)`)

  return {
    construct: 'episode',
    id: episode.id,
    version: 1,
    fields: {
      date: episode.date,
      trigger: episode.trigger,
      status: episode.status,
      change: episode.change,
      reason: episode.reason,
      affects: affectsLines,
      skip: skipLines,
    },
    raw: '',
  }
}

export function readOpenEpisodes(projectPath: string): Episode[] {
  const dir = join(projectPath, EPISODES_DIR)
  if (!existsSync(dir)) return []
  return readSilDir(dir)
    .filter((c) => c.construct === 'episode')
    .map(episodeFromConstruct)
    .filter((e) => e.status === 'open' || e.status === 'active')
}

export function episodesForAgent(agentId: string, episodes: Episode[]): Episode[] {
  // Normalize to a-01, a-02 etc for matching
  const normalId = agentId.toLowerCase()
  return episodes.filter((e) => normalId in e.affects)
}

export function buildEpisodeContext(episodes: Episode[]): string {
  if (episodes.length === 0) return ''

  const line = '─'.repeat(42)
  const header = `OPEN EPISODES — READ BEFORE PROCEEDING\n${line}`

  const blocks = episodes.map((e) => {
    const instruction = Object.values(e.affects).join(', ')
    return `${e.id} (${e.date}) — ${e.change.split('\n')[0]}\n  Your attention: ${instruction}`
  })

  return [header, ...blocks, line].join('\n')
}

export function writeEpisode(projectPath: string, episode: Episode): void {
  const dir = join(projectPath, EPISODES_DIR)
  const filePath = join(dir, `${episode.id}.sil`)
  writeSil(filePath, episodeToConstruct(episode))
}

export function resolveEpisode(episodeId: string, projectPath: string): void {
  const filePath = join(projectPath, EPISODES_DIR, `${episodeId}.sil`)
  const construct = readSil(filePath)
  construct.fields['status'] = 'resolved'
  writeSil(filePath, construct)
}
