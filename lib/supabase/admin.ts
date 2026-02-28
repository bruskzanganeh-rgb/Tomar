import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/supabase'

/**
 * Creates a Supabase admin client with the service role key.
 * Throws if SUPABASE_SERVICE_ROLE_KEY is not configured.
 * Only use in server-side API routes.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)
}
