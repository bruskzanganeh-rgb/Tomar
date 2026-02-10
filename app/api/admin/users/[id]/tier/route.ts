import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin'
import { logActivity } from '@/lib/activity'
import { changeTierSchema } from '@/lib/schemas/admin'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetUserId } = await params
  const auth = await verifyAdmin()
  if (auth instanceof NextResponse) return auth
  const { userId, supabase } = auth

  const body = await request.json()
  const parsed = changeTierSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { plan } = parsed.data

  const { data } = await supabase.rpc('admin_set_user_tier', {
    admin_uid: userId,
    target_user_id: targetUserId,
    new_plan: plan,
  })

  if (!data) {
    return NextResponse.json({ error: 'Failed to update tier' }, { status: 500 })
  }

  await logActivity({
    userId: targetUserId,
    eventType: 'tier_changed',
    entityType: 'subscription',
    entityId: targetUserId,
    metadata: { new_plan: plan, changed_by: userId },
  })

  return NextResponse.json({ success: true, plan })
}
