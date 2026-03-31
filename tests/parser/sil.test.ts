import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { parseSil, readSil, getConfidence } from '../../src/parser/sil.js'

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
