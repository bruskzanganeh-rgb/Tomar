/**
 * Integration test helpers — authenticated fetch against localhost:3000
 *
 * Next.js API routes use cookie-based auth via @supabase/ssr.
 * We sign in via Supabase JS, then format the session as the same
 * base64url-chunked cookies that the browser client would set.
 */
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true })
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true })

const BASE_URL = 'http://localhost:3000'

const TEST_COMPANY_ID = '11111111-1111-1111-1111-111111111111'
const TEST_OWNER_ID = 'be0fbfb1-dc14-4512-9d46-90ac0ed69ea2'

export { TEST_COMPANY_ID, TEST_OWNER_ID }

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars')
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Base64url encoding (matches @supabase/ssr format)
// ---------------------------------------------------------------------------
function stringToBase64URL(str: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const BASE64_PREFIX = 'base64-'
const MAX_CHUNK_SIZE = 3180

// ---------------------------------------------------------------------------
// Auth cookie builder
// ---------------------------------------------------------------------------

/** Cache the cookie string to avoid signing in on every request */
let cachedCookie: string | null = null

/** Sign in as test owner and return Cookie header value */
async function getAuthCookie(): Promise<string> {
  if (cachedCookie) return cachedCookie

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(url, anonKey)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.E2E_EMAIL || 'e2e-owner@amida-test.com',
    password: process.env.E2E_PASSWORD || 'testowner123',
  })

  if (error || !data.session) throw new Error(`Auth failed: ${error?.message}`)

  // Build cookie name from project ref
  const projectRef = new URL(url).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  // Encode session as base64url (matches @supabase/ssr default cookieEncoding)
  const sessionJson = JSON.stringify(data.session)
  const encoded = BASE64_PREFIX + stringToBase64URL(sessionJson)

  // Check if chunking is needed (based on URI-encoded length)
  const uriEncoded = encodeURIComponent(encoded)
  if (uriEncoded.length <= MAX_CHUNK_SIZE) {
    cachedCookie = `${cookieName}=${encoded}`
  } else {
    // Split into chunks matching @supabase/ssr chunker logic
    const chunks: string[] = []
    let remaining = uriEncoded
    while (remaining.length > 0) {
      let head = remaining.slice(0, MAX_CHUNK_SIZE)
      // Ensure we don't split a percent-encoded sequence
      const lastPercent = head.lastIndexOf('%')
      if (lastPercent > MAX_CHUNK_SIZE - 3) {
        head = head.slice(0, lastPercent)
      }
      chunks.push(decodeURIComponent(head))
      remaining = remaining.slice(head.length)
    }
    cachedCookie = chunks
      .map((chunk, i) => `${cookieName}.${i}=${chunk}`)
      .join('; ')
  }

  return cachedCookie
}

/** Fetch API route with cookie-based auth */
export async function authFetch(path: string, options: RequestInit = {}) {
  const cookie = await getAuthCookie()
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      ...(options.headers as Record<string, string>),
    },
  })
}

/** Reset usage_tracking for test owner */
export async function resetUsageTracking() {
  const supabase = getAdminClient()
  await supabase.from('usage_tracking').delete().eq('user_id', TEST_OWNER_ID)
}

/** Set test company subscription plan */
export async function setTestPlan(plan: 'free' | 'pro' | 'team') {
  const supabase = getAdminClient()
  await supabase.from('subscriptions')
    .update({ plan, status: 'active' })
    .eq('company_id', TEST_COMPANY_ID)
}
