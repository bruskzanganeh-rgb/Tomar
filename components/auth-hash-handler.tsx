'use client'

import { useEffect } from 'react'

export function AuthHashHandler() {
  useEffect(() => {
    if (window.location.hash.includes('access_token=')) {
      window.location.replace('/auth/confirm' + window.location.hash)
    }
  }, [])

  return null
}
