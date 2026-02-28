import { describe, it, expect, vi } from 'vitest'

// Mock Anthropic SDK — the module creates a client at import time which
// fails in jsdom because it detects a browser-like environment.
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      constructor() {
        // no-op
      }
    },
  }
})

// Mock the usage logger to avoid Supabase admin client import
vi.mock('@/lib/ai/usage-logger', () => ({
  logAiUsage: vi.fn(),
}))

import { sessionsToText, SessionSchema } from '@/lib/schedule/parser'
import type { Session } from '@/lib/schedule/parser'

describe('sessionsToText', () => {
  it('formats a single session with label and end time', () => {
    const sessions: Session[] = [{ start: '10:00', end: '12:00', label: 'Rep' }]
    expect(sessionsToText(sessions)).toBe('rep 10:00-12:00')
  })

  it('formats a session without label', () => {
    const sessions: Session[] = [{ start: '10:00', end: '12:00' }]
    expect(sessionsToText(sessions)).toBe('10:00-12:00')
  })

  it('formats a session without end time', () => {
    const sessions: Session[] = [{ start: '19:00', end: null }]
    expect(sessionsToText(sessions)).toBe('19:00')
  })

  it('formats a session with label but no end time', () => {
    const sessions: Session[] = [{ start: '19:00', end: null, label: 'Konsert' }]
    expect(sessionsToText(sessions)).toBe('konsert 19:00')
  })

  it('joins multiple sessions with comma and space', () => {
    const sessions: Session[] = [
      { start: '10:00', end: '12:00', label: 'Rep' },
      { start: '15:00', end: '17:00', label: 'Rep' },
    ]
    expect(sessionsToText(sessions)).toBe('rep 10:00-12:00, rep 15:00-17:00')
  })

  it('handles mixed sessions (with/without label and end)', () => {
    const sessions: Session[] = [
      { start: '10:00', end: '12:00', label: 'Rep' },
      { start: '19:00', end: null },
    ]
    expect(sessionsToText(sessions)).toBe('rep 10:00-12:00, 19:00')
  })

  it('returns empty string for empty array', () => {
    expect(sessionsToText([])).toBe('')
  })
})

describe('SessionSchema', () => {
  it('parses a valid session with all fields', () => {
    const result = SessionSchema.parse({
      start: '10:00',
      end: '12:00',
      label: 'Rep',
    })
    expect(result).toEqual({ start: '10:00', end: '12:00', label: 'Rep' })
  })

  it('parses a valid session with null end', () => {
    const result = SessionSchema.parse({
      start: '19:00',
      end: null,
    })
    expect(result).toEqual({ start: '19:00', end: null })
  })

  it('parses a valid session without label (optional)', () => {
    const result = SessionSchema.parse({
      start: '10:00',
      end: '12:00',
    })
    expect(result).toEqual({ start: '10:00', end: '12:00' })
  })

  it('rejects invalid start time format', () => {
    expect(() => SessionSchema.parse({ start: '10', end: '12:00' })).toThrow()
  })

  it('rejects start time with invalid characters', () => {
    expect(() => SessionSchema.parse({ start: '10.00', end: '12:00' })).toThrow()
  })

  it('rejects null start time', () => {
    expect(() => SessionSchema.parse({ start: null, end: '12:00' })).toThrow()
  })

  it('rejects missing start time', () => {
    expect(() => SessionSchema.parse({ end: '12:00' })).toThrow()
  })

  it('rejects invalid end time format', () => {
    expect(() => SessionSchema.parse({ start: '10:00', end: '12' })).toThrow()
  })

  it('accepts end time matching HH:MM pattern', () => {
    const result = SessionSchema.parse({ start: '09:30', end: '23:59' })
    expect(result.end).toBe('23:59')
  })

  it('rejects completely invalid start', () => {
    expect(() => SessionSchema.parse({ start: 'abc', end: null })).toThrow()
  })
})
