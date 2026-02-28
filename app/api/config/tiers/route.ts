import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TIER_DEFAULTS, buildTier } from '@/lib/subscription-utils'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('platform_config')
      .select('key, value')
      .or('key.like.free_%,key.like.pro_%,key.like.team_%')

    const config: Record<string, string> = {}
    data?.forEach(d => { config[d.key] = d.value })

    return NextResponse.json({
      free: buildTier('free', config, TIER_DEFAULTS.free),
      pro: buildTier('pro', config, TIER_DEFAULTS.pro),
      team: buildTier('team', config, TIER_DEFAULTS.team),
    })
  } catch {
    return NextResponse.json({
      free: buildTier('free', {}, TIER_DEFAULTS.free),
      pro: buildTier('pro', {}, TIER_DEFAULTS.pro),
      team: buildTier('team', {}, TIER_DEFAULTS.team),
    })
  }
}
