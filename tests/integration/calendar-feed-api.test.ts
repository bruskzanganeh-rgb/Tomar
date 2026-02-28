import { describe, it, expect, beforeAll } from 'vitest'
import { getAdminClient, TEST_OWNER_ID } from './helpers'

const BASE_URL = 'http://localhost:3000'
let calendarToken: string | null = null

beforeAll(async () => {
  // Get the test owner's calendar token
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('company_settings')
    .select('calendar_token')
    .eq('user_id', TEST_OWNER_ID)
    .single()

  calendarToken = data?.calendar_token || null
})

describe('GET /api/calendar/feed', () => {
  it('returns 400 without user and token params', async () => {
    const res = await fetch(`${BASE_URL}/api/calendar/feed`)
    expect(res.status).toBe(400)
  })

  it('returns 403 with invalid token', async () => {
    const res = await fetch(`${BASE_URL}/api/calendar/feed?user=${TEST_OWNER_ID}&token=invalid-token`)
    expect(res.status).toBe(403)
  })

  it('returns valid iCalendar with correct token', async () => {
    if (!calendarToken) {
      console.warn('No calendar token found for test owner — skipping')
      return
    }

    const res = await fetch(`${BASE_URL}/api/calendar/feed?user=${TEST_OWNER_ID}&token=${calendarToken}`)
    expect(res.status).toBe(200)

    const text = await res.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('END:VCALENDAR')
    expect(text).toContain('PRODID')
  })

  it('content-type is text/calendar', async () => {
    if (!calendarToken) return

    const res = await fetch(`${BASE_URL}/api/calendar/feed?user=${TEST_OWNER_ID}&token=${calendarToken}`)
    const contentType = res.headers.get('content-type')
    expect(contentType).toContain('text/calendar')
  })
})
