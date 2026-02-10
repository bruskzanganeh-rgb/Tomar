import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type ActivityEventType =
  | 'invoice_sent'
  | 'invoice_downloaded'
  | 'invoice_created'
  | 'invoice_deleted'
  | 'invoice_paid'
  | 'gig_created'
  | 'gig_updated'
  | 'gig_deleted'
  | 'client_created'
  | 'client_updated'
  | 'client_deleted'
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'receipt_scanned'
  | 'settings_changed'
  | 'tier_changed'
  | 'user_login'
  | 'user_logout'
  | 'onboarding_completed'
  | 'expenses_exported'
  | 'user_created'
  | 'user_deleted'
  | 'invoice_reminder_sent'

export type LogActivityParams = {
  userId: string
  eventType: ActivityEventType
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('activity_events').insert({
      user_id: params.userId,
      event_type: params.eventType,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    console.error('Activity logging error:', err)
  }
}
