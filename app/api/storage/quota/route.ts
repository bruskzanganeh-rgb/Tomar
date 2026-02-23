import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkStorageQuota } from '@/lib/usage'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const quota = await checkStorageQuota(user.id)

    return NextResponse.json({
      usedBytes: quota.usedBytes,
      limitBytes: quota.limitBytes,
      plan: quota.plan,
    })
  } catch (error) {
    console.error('Storage quota error:', error)
    return NextResponse.json(
      { error: 'Could not fetch storage quota' },
      { status: 500 }
    )
  }
}
