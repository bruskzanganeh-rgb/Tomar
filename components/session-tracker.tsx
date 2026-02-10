'use client'

import { useEffect, useRef } from 'react'

const HEARTBEAT_INTERVAL = 60_000 // 60 seconds

export function SessionTracker() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function sendHeartbeat() {
      fetch('/api/session/heartbeat', { method: 'POST' }).catch(() => {})
    }

    // Initial heartbeat
    sendHeartbeat()

    // Regular interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)

    // Pause when tab hidden, resume when visible
    function handleVisibility() {
      if (document.hidden) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      } else {
        sendHeartbeat()
        intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}
