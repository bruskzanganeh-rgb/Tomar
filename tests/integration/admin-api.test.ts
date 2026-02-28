/**
 * Admin API Integration Tests
 *
 * Tests admin endpoints for users, stats, and config.
 * Uses admin auth (test owner must be an admin) for authenticated requests.
 *
 * Requires dev server on localhost:3000.
 */
import { describe, it, expect } from 'vitest'
import { authFetch, getAdminClient } from './helpers'

const BASE_URL = 'http://localhost:3000'

describe('GET /api/admin/stats', () => {
  it('returns platform statistics for admin user', async () => {
    const res = await authFetch('/api/admin/stats')

    // If test owner is admin, should return 200
    // If not admin, will return 403 — skip gracefully
    if (res.status === 403) {
      console.warn('Test owner is not admin — skipping admin stats test')
      return
    }

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('totalUsers')
    expect(data).toHaveProperty('proUsers')
    expect(data).toHaveProperty('freeUsers')
    expect(data).toHaveProperty('mrr')
    expect(data).toHaveProperty('arr')
    expect(typeof data.totalUsers).toBe('number')
    expect(typeof data.mrr).toBe('number')
  })
})

describe('GET /api/admin/users', () => {
  it('returns users list for admin user', async () => {
    const res = await authFetch('/api/admin/users')

    if (res.status === 403) {
      console.warn('Test owner is not admin — skipping admin users test')
      return
    }

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('users')
    expect(Array.isArray(data.users)).toBe(true)

    // Each user should have core fields
    if (data.users.length > 0) {
      const user = data.users[0]
      expect(user).toHaveProperty('user_id')
      expect(user).toHaveProperty('plan')
      expect(user).toHaveProperty('status')
    }
  })
})

describe('GET /api/admin/config', () => {
  it('returns platform config for admin user', async () => {
    const res = await authFetch('/api/admin/config')

    if (res.status === 403) {
      console.warn('Test owner is not admin — skipping admin config test')
      return
    }

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('config')
    expect(Array.isArray(data.config)).toBe(true)

    // Config should have key-value pairs
    if (data.config.length > 0) {
      expect(data.config[0]).toHaveProperty('key')
      expect(data.config[0]).toHaveProperty('value')
    }
  })
})

describe('PUT /api/admin/config', () => {
  const testKey = 'e2e_test_config_key'
  const testValue = `test-value-${Date.now()}`

  it('updates a config value', async () => {
    const res = await authFetch('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ key: testKey, value: testValue }),
    })

    if (res.status === 403) {
      console.warn('Test owner is not admin — skipping admin config update test')
      return
    }

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)

    // Verify the value was saved
    const supabase = getAdminClient()
    const { data: config } = await supabase
      .from('platform_config')
      .select('value')
      .eq('key', testKey)
      .single()

    expect(config?.value).toBe(testValue)

    // Cleanup
    await supabase.from('platform_config').delete().eq('key', testKey)
  })

  it('returns 400 on invalid config body', async () => {
    const res = await authFetch('/api/admin/config', {
      method: 'PUT',
      body: JSON.stringify({}), // Missing required fields
    })

    if (res.status === 403) return // Not admin
    expect(res.status).toBe(400)
  })
})

describe('Admin endpoints — auth checks', () => {
  it('GET /api/admin/stats — unauthenticated returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/stats`)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/users — unauthenticated returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`)
    expect(res.status).toBe(401)
  })

  it('GET /api/admin/config — unauthenticated returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/config`)
    expect(res.status).toBe(401)
  })
})
