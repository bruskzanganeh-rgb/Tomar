'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    if (window.location.hash.includes('access_token=')) {
      router.replace('/auth/confirm' + window.location.hash)
    }
  }, [router])

  return null
}
