/**
 * Security Headers Tests — Verifies CSP and security headers are present.
 *
 * No auth required — headers are set globally in next.config.ts.
 * Catches issues like missing frame-src for Supabase (PDF previews blocked).
 */
import { test, expect } from '@playwright/test'

test.describe('Security Headers', () => {
  test('CSP allows Supabase in frame-src (PDF previews)', async ({ request }) => {
    const response = await request.get('/login')
    const csp = response.headers()['content-security-policy'] ?? ''

    expect(csp).toContain('frame-src')
    expect(csp).toMatch(/frame-src[^;]*\*\.supabase\.co/)
  })

  test('CSP allows Supabase in img-src (receipt images)', async ({ request }) => {
    const response = await request.get('/login')
    const csp = response.headers()['content-security-policy'] ?? ''

    expect(csp).toContain('img-src')
    expect(csp).toMatch(/img-src[^;]*\*\.supabase\.co/)
  })

  test('CSP allows Supabase in connect-src (API calls)', async ({ request }) => {
    const response = await request.get('/login')
    const csp = response.headers()['content-security-policy'] ?? ''

    expect(csp).toContain('connect-src')
    expect(csp).toMatch(/connect-src[^;]*\*\.supabase\.co/)
  })

  test('all security headers present', async ({ request }) => {
    const response = await request.get('/login')
    const headers = response.headers()

    expect(headers['content-security-policy']).toBeTruthy()
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['strict-transport-security']).toContain('max-age=')
  })
})
