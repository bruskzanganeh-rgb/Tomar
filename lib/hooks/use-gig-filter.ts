'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/lib/hooks/use-company'
import { useSubscription } from '@/lib/hooks/use-subscription'

export function useGigFilter() {
  const { company, members } = useCompany()
  const { isTeam } = useSubscription()
  const [showOnlyMine, setShowOnlyMine] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [loaded, setLoaded] = useState(false)
  const supabase = createClient()

  const isSharedMode = isTeam && company?.gig_visibility === 'shared' && members.length > 1

  useEffect(() => {
    let cancelled = false

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('company_settings')
        .select('show_only_my_data')
        .eq('user_id', user.id)
        .single()

      if (!cancelled) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setShowOnlyMine((data as any)?.show_only_my_data ?? false)
        setLoaded(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleShowOnlyMine() {
    const newValue = !showOnlyMine
    setShowOnlyMine(newValue)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('company_settings')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ show_only_my_data: newValue } as any)
      .eq('user_id', user.id)
  }

  // Whether filtering should be applied: only in shared mode with the toggle on
  const shouldFilter = isSharedMode && showOnlyMine

  return {
    showOnlyMine,
    isSharedMode: !!isSharedMode,
    shouldFilter,
    currentUserId,
    toggleShowOnlyMine,
    loaded,
  }
}
