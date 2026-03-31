import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { parseSil, readSil, readMissionBrief, getConfidence } from '../../src/parser/sil.js'

const FIXTURES = join(import.meta.dirname, '../fixtures')

describe('parseSil — header', () => {
  it('parses construct type, id, and version', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(result.construct).toBe('signal')
    expect(result.id).toBe('cart.checkout')
    expect(result.version).toBe(1)
  })

  it('throws on missing separator', () => {
    expect(() =>
      parseSil('CONSTRUCT  signal\nID  test\nVERSION  1\nno separator here\n')
    ).toThrow('separator line not found')
  })
})

describe('parseSil — simple fields', () => {
  it('reads inline key-value fields', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(result.fields['type']).toBe('workflow')
    expect(result.fields['entry']).toBe('POST /cart/submit')
    expect(result.fields['source']).toBe('route table, API docs')
  })
})

describe('parseSil — multi-line fields', () => {
  it('reads multi-line prose as a joined string', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.spec.sil'))
    const intent = result.fields['intent'] as string
    expect(intent).toContain('Allow a customer')
    expect(intent).toContain('order confirmation')
  })

  it('reads list fields as string arrays', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.spec.sil'))
    const rules = result.fields['rules'] as string[]
    expect(Array.isArray(rules)).toBe(true)
    expect(rules).toHaveLength(4)
    expect(rules[0]).toBe('Promo applied before total calculated')
    expect(rules[3]).toBe('Guest checkout allowed — login not required')
  })

  it('reads gaps as string array', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.spec.sil'))
    const gaps = result.fields['gaps'] as string[]
    expect(Array.isArray(gaps)).toBe(true)
    expect(gaps[0]).toContain('Partial refund logic not found')
  })
})

describe('getConfidence', () => {
  it('returns confidence from construct fields', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.signal.sil'))
    expect(getConfidence(result)).toBe('high')
  })

  it('returns null when confidence field is absent', () => {
    const result = readSil(join(FIXTURES, 'cart.checkout.spec.sil'))
    expect(getConfidence(result)).toBeNull()
  })
})

describe('parseSil — episode construct', () => {
  it('parses episode header correctly', () => {
    const result = readSil(join(FIXTURES, 'ep-042.sil'))
    expect(result.construct).toBe('episode')
    expect(result.id).toBe('ep-042')
    expect(result.fields['status']).toBe('open')
    expect(result.fields['trigger']).toBe('client requirement change')
  })

  it('stores raw text', () => {
    const result = readSil(join(FIXTURES, 'ep-042.sil'))
    expect(result.raw).toContain('CONSTRUCT  episode')
    expect(result.raw).toContain('ep-042')
  })
})

describe('parseSil — edge cases', () => {
  it('handles an empty multi-line field (key: with no indented lines)', () => {
    const raw = [
      'CONSTRUCT  spec',
      'ID         test.empty',
      'VERSION    1',
      '─────────────────────────────────────────',
      'intent:',
      'rules:',
      '  - one rule',
    ].join('\n')
    const result = parseSil(raw)
    expect(result.fields['intent']).toBe('')
    expect(result.fields['rules']).toEqual(['one rule'])
  })

  it('ignores non-field top-level lines (e.g. SCREEN blocks)', () => {
    const raw = [
      'CONSTRUCT  screen',
      'ID         cart.checkout',
      'VERSION    1',
      '─────────────────────────────────────────',
      'SCREEN 1 — Cart',
      '┌─────────────────────────────────────┐',
      '│  Your Cart                          │',
      '└─────────────────────────────────────┘',
      'on: "Checkout →" → SCREEN 2',
    ].join('\n')
    // Should not throw — non-field lines absorbed into raw
    const result = parseSil(raw)
    expect(result.construct).toBe('screen')
    expect(result.id).toBe('cart.checkout')
  })

  it('reads confidence values: medium and low', () => {
    const medium = parseSil(
      'CONSTRUCT  signal\nID  x\nVERSION  1\n─────────────────────────────────────────\nconfidence: medium\n'
    )
    expect(getConfidence(medium)).toBe('medium')

    const low = parseSil(
      'CONSTRUCT  signal\nID  x\nVERSION  1\n─────────────────────────────────────────\nconfidence: low\n'
    )
    expect(getConfidence(low)).toBe('low')
  })
})

describe('readMissionBrief', () => {
  it('reads _mission.sil from project root', () => {
    const dir = join(tmpdir(), `phoenix-mission-test-${Date.now()}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, '_mission.sil'),
      [
        'CONSTRUCT  signal',
        'ID         _mission',
        'VERSION    1',
        '─────────────────────────────────────────',
        'project:   acme-oms',
        'system:    order management system',
      ].join('\n')
    )
    const result = readMissionBrief(dir)
    expect(result.id).toBe('_mission')
    expect(result.fields['project']).toBe('acme-oms')
    rmSync(dir, { recursive: true })
  })
})
