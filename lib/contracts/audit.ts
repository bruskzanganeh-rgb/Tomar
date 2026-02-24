import { SupabaseClient } from '@supabase/supabase-js'
import type { ContractAuditEvent } from './types'

/**
 * Log an immutable event to the contract_audit table.
 * Uses service role client to bypass RLS.
 */
export async function logContractEvent(
  supabase: SupabaseClient,
  params: {
    contract_id: string
    event_type: ContractAuditEvent
    actor_email?: string | null
    ip_address?: string | null
    user_agent?: string | null
    document_hash_sha256?: string | null
    metadata?: Record<string, unknown>
  }
) {
  const { error } = await supabase
    .from('contract_audit')
    .insert({
      contract_id: params.contract_id,
      event_type: params.event_type,
      actor_email: params.actor_email || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
      document_hash_sha256: params.document_hash_sha256 || null,
      metadata: params.metadata || {},
    })

  if (error) {
    console.error('Failed to log contract audit event:', error)
  }
}
