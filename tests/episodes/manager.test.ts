import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, cpSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  readOpenEpisodes,
  episodesForAgent,
  buildEpisodeContext,
  writeEpisode,
  resolveEpisode,
} from '../../src/episodes/manager.js'
import type { Episode } from '../../src/episodes/manager.js'

const FIXTURES = join(import.meta.dirname, '../fixtures')

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `phoenix-ep-test-${Date.now()}`)
  mkdirSync(join(testDir, 'episodes'), { recursive: true })
  // Copy fixture episode into test project
  cpSync(join(FIXTURES, 'ep-042.sil'), join(testDir, 'episodes', 'ep-042.sil'))
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

const mockEpisode = (): Episode => ({
  id: 'ep-099',
  date: '2026-03-31',
  trigger: 'client requirement change',
  status: 'open',
  change: 'Add bulk export to CSV',
  reason: 'Operations team request',
  affects: {
    'a-03': 'add export.bulk spec',
    'a-05': 'add export route and background job',
  },
  skip: ['a-00', 'a-01', 'a-02', 'a-04'],
})

describe('readOpenEpisodes', () => {
  it('reads open episodes from the episodes directory', () => {
    const episodes = readOpenEpisodes(testDir)
    expect(episodes).toHaveLength(1)
    expect(episodes[0].id).toBe('ep-042')
    expect(episodes[0].status).toBe('open')
  })

  it('returns empty array when no episodes directory exists', () => {
    const emptyDir = join(tmpdir(), `phoenix-empty-${Date.now()}`)
    mkdirSync(emptyDir)
    expect(readOpenEpisodes(emptyDir)).toEqual([])
    rmSync(emptyDir, { recursive: true })
  })

  it('parses affects correctly', () => {
    const episodes = readOpenEpisodes(testDir)
    const ep = episodes[0]
    expect(ep.affects['a-01']).toBe('add guest.checkout workflow')
    expect(ep.affects['a-03']).toBe('update spec — guest vs authenticated intent')
  })

  it('parses skip correctly', () => {
    const episodes = readOpenEpisodes(testDir)
    expect(episodes[0].skip).toContain('a-00')
    expect(episodes[0].skip).toContain('a-04')
  })
})

describe('episodesForAgent', () => {
  it('returns episodes that affect the given agent', () => {
    const episodes = readOpenEpisodes(testDir)
    const forA01 = episodesForAgent('a-01', episodes)
    expect(forA01).toHaveLength(1)
    expect(forA01[0].id).toBe('ep-042')
  })

  it('returns empty when agent is not in affects', () => {
    const episodes = readOpenEpisodes(testDir)
    const forA00 = episodesForAgent('a-00', episodes)
    expect(forA00).toHaveLength(0)
  })
})

describe('buildEpisodeContext', () => {
  it('returns empty string when no episodes', () => {
    expect(buildEpisodeContext([])).toBe('')
  })

  it('includes episode id, date, and change in context block', () => {
    const episodes = readOpenEpisodes(testDir)
    const context = buildEpisodeContext(episodesForAgent('a-01', episodes))
    expect(context).toContain('OPEN EPISODES')
    expect(context).toContain('ep-042')
    expect(context).toContain('2026-03-15')
    expect(context).toContain('guest checkout')
  })
})

describe('writeEpisode / resolveEpisode', () => {
  it('writes a new episode .sil file', () => {
    const ep = mockEpisode()
    writeEpisode(testDir, ep)
    const episodes = readOpenEpisodes(testDir)
    const found = episodes.find((e) => e.id === 'ep-099')
    expect(found).toBeDefined()
    expect(found?.change).toContain('bulk export')
  })

  it('resolves an episode by updating its status', () => {
    resolveEpisode('ep-042', testDir)
    const episodes = readOpenEpisodes(testDir)
    // resolved episodes are filtered out of readOpenEpisodes
    expect(episodes.find((e) => e.id === 'ep-042')).toBeUndefined()
  })
})
