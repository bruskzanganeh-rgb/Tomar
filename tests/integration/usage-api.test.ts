import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { authFetch, resetUsageTracking, setTestPlan } from './helpers'

describe('POST /api/usage/increment', () => {
  beforeAll(async () => {
    await resetUsageTracking()
    await setTestPlan('free') // Free tier: 5 invoices, 3 scans
  })

  afterAll(async () => {
    await resetUsageTracking()
    await setTestPlan('pro') // Restore to pro for other tests
  })

  it('returns 401 without auth', async () => {
    const res = await fetch('http://localhost:3000/api/usage/increment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invoice' }),
    })
    expect(res.status).toBe(401)
  })

  it('increments invoice count', async () => {
    const res = await authFetch('/api/usage/increment', {
      method: 'POST',
      body: JSON.stringify({ type: 'invoice' }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('returns 400 for invalid type', async () => {
    const res = await authFetch('/api/usage/increment', {
      method: 'POST',
      body: JSON.stringify({ type: 'invalid' }),
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 when free tier limit reached', async () => {
    // Reset and fill up to the limit (5 invoices for free tier)
    await resetUsageTracking()
    for (let i = 0; i < 5; i++) {
      await authFetch('/api/usage/increment', {
        method: 'POST',
        body: JSON.stringify({ type: 'invoice' }),
      })
    }

    // 6th should be blocked
    const res = await authFetch('/api/usage/increment', {
      method: 'POST',
      body: JSON.stringify({ type: 'invoice' }),
    })
    expect(res.status).toBe(403)
  })
})
