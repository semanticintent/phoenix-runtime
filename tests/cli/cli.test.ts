/**
 * CLI integration tests — spawn the compiled binary and verify output.
 * These tests require `npm run build` to have run first (dist/ must exist).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, cpSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const FIXTURES = join(import.meta.dirname, '../fixtures')
const RUNTIME_ROOT = resolve(import.meta.dirname, '../../')
const CLI = `node ${join(RUNTIME_ROOT, 'dist/cli/index.js')}`

function run(cmd: string, cwd?: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(`${CLI} ${cmd}`, {
      cwd: cwd ?? RUNTIME_ROOT,
      encoding: 'utf-8',
      env: { ...process.env, PHOENIX_RUNTIME_ROOT: RUNTIME_ROOT },
    })
    return { stdout, stderr: '', code: 0 }
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      code: err.status ?? 1,
    }
  }
}

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `phoenix-cli-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

// ─────────────────────────────────────────
// phoenix init
// ─────────────────────────────────────────

describe('phoenix init', () => {
  it('creates .phoenix/state.json and directory structure', () => {
    const result = run(`init test-project --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Initialized Phoenix engagement')
    expect(result.stdout).toContain('test-project')

    const { existsSync } = require('node:fs')
    expect(existsSync(join(testDir, '.phoenix', 'state.json'))).toBe(true)
    expect(existsSync(join(testDir, 'signals'))).toBe(true)
    expect(existsSync(join(testDir, 'episodes'))).toBe(true)
    expect(existsSync(join(testDir, '_mission.sil'))).toBe(true)
  })

  it('fails if already initialized', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`init test-project --project ${testDir}`)
    expect(result.code).toBe(1)
    expect(result.stdout).toContain('Already initialized')
  })
})

// ─────────────────────────────────────────
// phoenix status
// ─────────────────────────────────────────

describe('phoenix status', () => {
  it('shows pipeline status after init', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`status --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('A-00')
    expect(result.stdout).toContain('A-06')
    expect(result.stdout).toContain('test-project')
  })

  it('fails gracefully when not initialized', () => {
    const result = run(`status --project ${testDir}`)
    expect(result.code).toBe(1)
    expect(result.stderr + result.stdout).toMatch(/state\.json|not initialized/i)
  })
})

// ─────────────────────────────────────────
// phoenix gate
// ─────────────────────────────────────────

describe('phoenix gate', () => {
  it('approves a gate and records it', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`gate a-04-approved --approve --notes "blueprint looks good" --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Gate approved')
    expect(result.stdout).toContain('a-04-approved')
  })

  it('returns a gate with notes', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`gate pass-1 --return --notes "missing error states" --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('Gate returned')
    expect(result.stdout).toContain('pass-1')
  })

  it('fails without --approve or --return', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`gate a-04-approved --project ${testDir}`)
    expect(result.code).toBe(1)
  })
})

// ─────────────────────────────────────────
// phoenix validate
// ─────────────────────────────────────────

describe('phoenix validate', () => {
  it('reports missing artifacts for an agent', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`validate a-01 --project ${testDir}`)
    expect(result.code).toBe(1)
    const output = result.stdout + result.stderr
    expect(output).toContain('workflow')
    expect(output).toContain('missing')
  })

  it('passes when artifacts exist', () => {
    run(`init test-project --project ${testDir}`)
    // Drop a workflow .sil file
    cpSync(
      join(FIXTURES, 'cart.checkout.signal.sil'),
      join(testDir, 'workflows', 'cart.checkout.sil')
    )
    const result = run(`validate a-01 --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('All expected artifacts present')
  })

  it('fails for unknown agent', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`validate a-99 --project ${testDir}`)
    expect(result.code).toBe(1)
    expect(result.stderr + result.stdout).toContain('Unknown agent')
  })
})

// ─────────────────────────────────────────
// phoenix episode list
// ─────────────────────────────────────────

describe('phoenix episode list', () => {
  it('shows no episodes when directory is empty', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`episode list --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('No episodes')
  })

  it('lists episodes from the episodes directory', () => {
    run(`init test-project --project ${testDir}`)
    cpSync(join(FIXTURES, 'ep-042.sil'), join(testDir, 'episodes', 'ep-042.sil'))
    const result = run(`episode list --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('ep-042')
  })
})

// ─────────────────────────────────────────
// phoenix episode resolve
// ─────────────────────────────────────────

describe('phoenix episode resolve', () => {
  it('resolves an episode', () => {
    run(`init test-project --project ${testDir}`)
    cpSync(join(FIXTURES, 'ep-042.sil'), join(testDir, 'episodes', 'ep-042.sil'))
    const result = run(`episode resolve ep-042 --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('resolved')
    expect(result.stdout).toContain('ep-042')
  })
})

// ─────────────────────────────────────────
// phoenix status --json
// ─────────────────────────────────────────

describe('phoenix status --json', () => {
  it('returns valid JSON after init', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`status --json --project ${testDir}`)
    expect(result.code).toBe(0)
    const json = JSON.parse(result.stdout)
    expect(json.project).toBe('test-project')
    expect(json.nextAgent).toBe('a-00')
    expect(Array.isArray(json.agents)).toBe(true)
    expect(json.agents).toHaveLength(7)
    expect(json.agents[0]).toMatchObject({ id: 'a-00', status: 'ready' })
    expect(json.openEpisodes).toBe(0)
  })

  it('reflects completed agents', () => {
    run(`init test-project --project ${testDir}`)
    run(`complete a-00 --confidence high --outputs 14 --summary "signals done" --project ${testDir}`)
    const result = run(`status --json --project ${testDir}`)
    expect(result.code).toBe(0)
    const json = JSON.parse(result.stdout)
    const a00 = json.agents.find((a: { id: string }) => a.id === 'a-00')
    expect(a00.status).toBe('complete')
    expect(a00.confidence).toBe('high')
    expect(json.nextAgent).toBe('a-01')
  })
})

// ─────────────────────────────────────────
// phoenix export
// ─────────────────────────────────────────

describe('phoenix export', () => {
  it('outputs a markdown summary after init', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`export --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('# Phoenix Engagement: test-project')
    expect(result.stdout).toContain('## Pipeline')
    expect(result.stdout).toContain('A-00')
    expect(result.stdout).toContain('A-06')
  })

  it('writes to file with --output', () => {
    run(`init test-project --project ${testDir}`)
    const outFile = join(testDir, 'summary.md')
    const result = run(`export --output ${outFile} --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('summary.md')
    const { readFileSync, existsSync } = require('node:fs')
    expect(existsSync(outFile)).toBe(true)
    expect(readFileSync(outFile, 'utf-8')).toContain('# Phoenix Engagement')
  })

  it('includes episode data when present', () => {
    run(`init test-project --project ${testDir}`)
    cpSync(join(FIXTURES, 'ep-042.sil'), join(testDir, 'episodes', 'ep-042.sil'))
    const result = run(`export --project ${testDir}`)
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('## Episodes')
    expect(result.stdout).toContain('ep-042')
  })

  it('fails gracefully when not initialized', () => {
    const result = run(`export --project ${testDir}`)
    expect(result.code).toBe(1)
  })
})

// ─────────────────────────────────────────
// phoenix run --clipboard
// ─────────────────────────────────────────

describe('phoenix run --clipboard', () => {
  it('copies prompt to clipboard or falls back gracefully', () => {
    run(`init test-project --project ${testDir}`)
    const result = run(`run a-00 --clipboard --project ${testDir}`)
    expect(result.code).toBe(0)
    // Either copied successfully or fell back — both are acceptable
    const output = result.stdout
    expect(
      output.includes('copied to clipboard') || output.includes('PROJECT CONTEXT')
    ).toBe(true)
  })
})
