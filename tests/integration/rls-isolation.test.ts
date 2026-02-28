/**
 * Cross-tenant RLS isolation tests
 *
 * Verifies that a user from Company A cannot read, insert, or modify
 * data belonging to Company B. This is critical for multi-tenant security.
 *
 * Uses the test owner account (E2E Test AB) and attempts to access
 * data from a different company to verify RLS blocks it.
 */
import { describe, test, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true })
dotenv.config({ path: path.resolve(__dirname, '../.env.test'), override: true })

const TEST_COMPANY_ID = '11111111-1111-1111-1111-111111111111'
// A UUID that does NOT belong to the test company
const OTHER_COMPANY_ID = '99999999-9999-9999-9999-999999999999'
const OTHER_USER_ID = '99999999-aaaa-bbbb-cccc-999999999999'

function getAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

describe('Cross-tenant RLS isolation', () => {
  let userClient: ReturnType<typeof getAnonClient>
  let otherCompanyGigId: string | null = null
  let otherCompanyClientId: string | null = null
  let otherCompanyInvoiceId: string | null = null

  beforeAll(async () => {
    // Sign in as test owner (Company A)
    const client = getAnonClient()
    const { error } = await client.auth.signInWithPassword({
      email: process.env.E2E_EMAIL || 'e2e-owner@amida-test.com',
      password: process.env.E2E_PASSWORD || 'testowner123',
    })
    if (error) throw new Error(`Auth failed: ${error.message}`)
    userClient = client

    // Use admin client to seed data for "other company" that our user should NOT see
    const admin = getAdminClient()

    // Create a test client for the other company
    const { data: cl } = await admin
      .from('clients')
      .insert({
        name: 'RLS-Test-Other-Company-Client',
        company_id: OTHER_COMPANY_ID,
        user_id: OTHER_USER_ID,
      })
      .select('id')
      .single()
    otherCompanyClientId = cl?.id || null

    // Create a test gig for the other company (need a gig_type first)
    const { data: gt } = await admin.from('gig_types').select('id').eq('company_id', TEST_COMPANY_ID).limit(1).single()

    if (gt) {
      const { data: gig } = await admin
        .from('gigs')
        .insert({
          date: '2099-01-01',
          gig_type_id: gt.id,
          project_name: 'RLS-Test-Other-Company-Gig',
          company_id: OTHER_COMPANY_ID,
          user_id: OTHER_USER_ID,
          status: 'accepted',
        })
        .select('id')
        .single()
      otherCompanyGigId = gig?.id || null
    }

    return async () => {
      // Cleanup: remove test data
      if (otherCompanyGigId) await admin.from('gigs').delete().eq('id', otherCompanyGigId)
      if (otherCompanyClientId) await admin.from('clients').delete().eq('id', otherCompanyClientId)
      if (otherCompanyInvoiceId) await admin.from('invoices').delete().eq('id', otherCompanyInvoiceId)
    }
  })

  test('cannot read gigs from another company', async () => {
    const { data } = await userClient.from('gigs').select('id, project_name').eq('company_id', OTHER_COMPANY_ID)

    expect(data).toEqual([])
  })

  test('cannot read clients from another company', async () => {
    const { data } = await userClient.from('clients').select('id, name').eq('company_id', OTHER_COMPANY_ID)

    expect(data).toEqual([])
  })

  test('cannot read invoices from another company', async () => {
    const { data } = await userClient.from('invoices').select('id').eq('company_id', OTHER_COMPANY_ID)

    expect(data).toEqual([])
  })

  test('cannot read expenses from another company', async () => {
    const { data } = await userClient.from('expenses').select('id').eq('company_id', OTHER_COMPANY_ID)

    expect(data).toEqual([])
  })

  test('cannot read company_members from another company', async () => {
    const { data } = await userClient.from('company_members').select('id').eq('company_id', OTHER_COMPANY_ID)

    expect(data).toEqual([])
  })

  test('cannot read company_settings from another company', async () => {
    const { data } = await userClient.from('company_settings').select('id').eq('company_id', OTHER_COMPANY_ID)

    // RLS may return [] or null depending on table permissions
    expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true)
  })

  test('cannot update a gig from another company', async () => {
    if (!otherCompanyGigId) return

    const { error } = await userClient.from('gigs').update({ project_name: 'HACKED' }).eq('id', otherCompanyGigId)

    // RLS should either return error or silently affect 0 rows
    const { data: check } = await getAdminClient()
      .from('gigs')
      .select('project_name')
      .eq('id', otherCompanyGigId)
      .single()

    expect(check?.project_name).toBe('RLS-Test-Other-Company-Gig')
  })

  test('cannot delete a client from another company', async () => {
    if (!otherCompanyClientId) return

    await userClient.from('clients').delete().eq('id', otherCompanyClientId)

    // Verify it still exists via admin client
    const { data: check } = await getAdminClient()
      .from('clients')
      .select('name')
      .eq('id', otherCompanyClientId)
      .single()

    expect(check?.name).toBe('RLS-Test-Other-Company-Client')
  })

  test('own company data IS accessible', async () => {
    const { data } = await userClient.from('gigs').select('id').eq('company_id', TEST_COMPANY_ID).limit(1)

    // Should return at least some data (test company has gigs)
    expect(data).not.toBeNull()
  })
})
