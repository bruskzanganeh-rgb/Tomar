'use client'

import { useEffect, useRef, useState } from 'react'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Only runs once on mount (or when target changes from 0 → value).
 */
export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0)
  const hasAnimated = useRef(false)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0 || hasAnimated.current) {
      setValue(target)
      return
    }

    hasAnimated.current = true
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = easeOutCubic(progress)

      setValue(Math.round(eased * target))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
