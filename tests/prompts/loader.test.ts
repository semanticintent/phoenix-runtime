import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadPrompt } from '../../src/prompts/loader.js'

let testDir: string

afterEach(() => {
  if (testDir) rmSync(testDir, { recursive: true, force: true })
})

describe('loadPrompt', () => {
  it('loads a prompt file from the given root', () => {
    testDir = join(tmpdir(), `phoenix-loader-test-${Date.now()}`)
    mkdirSync(join(testDir, 'agents'), { recursive: true })
    writeFileSync(
      join(testDir, 'agents', 'A-01-BUSINESS-LOGIC-EXTRACTOR.md'),
      '# Business Logic Extractor\nYou are the extraction agent.'
    )
    const content = loadPrompt('agents/A-01-BUSINESS-LOGIC-EXTRACTOR.md', testDir)
    expect(content).toContain('Business Logic Extractor')
  })

  it('throws a clear error when prompt file is missing', () => {
    testDir = join(tmpdir(), `phoenix-loader-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    expect(() => loadPrompt('agents/A-01-BUSINESS-LOGIC-EXTRACTOR.md', testDir)).toThrow(
      'Agent prompt not found'
    )
  })
})
