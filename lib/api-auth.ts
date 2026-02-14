import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

export type ApiAuthSuccess = {
  success: true
  userId: string
  scopes: string[]
  keyId: string
}

export type ApiAuthError = {
  success: false
  error: string
  status: number
}

export type ApiAuthResult = ApiAuthSuccess | ApiAuthError

/**
 * Validates an API key from the Authorization header.
 * Uses admin client to bypass RLS for key lookup.
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<ApiAuthResult> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Missing or invalid Authorization header. Expected: Bearer <api_key>',
      status: 401,
    }
  }

  const apiKey = authHeader.substring(7).trim()

  if (!apiKey.startsWith('ak_') || apiKey.length !== 67) {
    return {
      success: false,
      error: 'Invalid API key format',
      status: 401,
    }
  }

  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const supabase = createAdminClient()

  const { data: key, error } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (error || !key) {
    return {
      success: false,
      error: 'Invalid or inactive API key',
      status: 401,
    }
  }

  // Update last_used_at asynchronously
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', key.id)
    .then(() => {})

  return {
    success: true,
    userId: key.user_id,
    scopes: key.scopes || [],
    keyId: key.id,
  }
}

/**
 * Checks if scopes include the required scope.
 * Returns error response if missing.
 */
export function requireScope(
  scopes: string[],
  required: string
): { success: true } | ApiAuthError {
  if (!scopes.includes(required)) {
    return {
      success: false,
      error: `Insufficient permissions. Required scope: ${required}`,
      status: 403,
    }
  }
  return { success: true }
}
