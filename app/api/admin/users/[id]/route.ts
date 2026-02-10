import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'
import { logActivity } from '@/lib/activity'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { userId, supabase } = auth

  // Prevent self-deletion
  if (targetUserId === userId) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  }

  // Log before deletion
  await logActivity({
    userId,
    eventType: 'user_deleted',
    entityType: 'user',
    entityId: targetUserId,
    metadata: { deleted_by: userId },
  })

  // Delete user data in correct order (foreign key constraints)
  // 1. gig_dates (references gigs)
  const { data: userGigs } = await supabase
    .from('gigs')
    .select('id')
    .eq('user_id', targetUserId)
  const gigIds = (userGigs || []).map(g => g.id)
  if (gigIds.length > 0) {
    await supabase.from('gig_dates').delete().in('gig_id', gigIds)
    await supabase.from('gig_attachments').delete().in('gig_id', gigIds)
  }

  // 2. invoice_lines (references invoices)
  const { data: userInvoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('user_id', targetUserId)
  const invoiceIds = (userInvoices || []).map(i => i.id)
  if (invoiceIds.length > 0) {
    await supabase.from('invoice_lines').delete().in('invoice_id', invoiceIds)
  }

  // 3. Delete main tables
  await Promise.all([
    supabase.from('gigs').delete().eq('user_id', targetUserId),
    supabase.from('invoices').delete().eq('user_id', targetUserId),
    supabase.from('expenses').delete().eq('user_id', targetUserId),
    supabase.from('clients').delete().eq('user_id', targetUserId),
    supabase.from('gig_types').delete().eq('user_id', targetUserId),
    supabase.from('positions').delete().eq('user_id', targetUserId),
    supabase.from('user_instruments').delete().eq('user_id', targetUserId),
    supabase.from('user_sessions').delete().eq('user_id', targetUserId),
    supabase.from('activity_events').delete().eq('user_id', targetUserId),
    supabase.from('usage_tracking').delete().eq('user_id', targetUserId),
    supabase.from('organization_members').delete().eq('user_id', targetUserId),
    supabase.from('sponsor_impressions').delete().eq('user_id', targetUserId),
  ])

  // 4. Delete subscription and company settings
  await supabase.from('subscriptions').delete().eq('user_id', targetUserId)
  await supabase.from('company_settings').delete().eq('user_id', targetUserId)

  // 5. Delete auth user
  const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId)
  if (authError) {
    console.error('Error deleting auth user:', authError)
    return NextResponse.json({ error: 'Failed to delete auth user' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
