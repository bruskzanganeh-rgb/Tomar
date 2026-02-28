import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

type ChartSkeletonProps = {
  height?: number
  bars?: number
}

export function ChartSkeleton({ height = 160, bars = 12 }: ChartSkeletonProps) {
  // Pre-compute bar heights to avoid impure Math.random() during render
  const barHeights = useMemo(
    () => Array.from({ length: bars }, (_, i) => 30 + Math.sin(i * 0.8) * 30 + ((i * 17 + 7) % 20)),
    [bars],
  )

  return (
    <div className="flex items-end gap-2 justify-around px-4" style={{ height }}>
      {barHeights.map((barHeight, i) => (
        <Skeleton key={i} className="w-5 rounded-t" style={{ height: `${barHeight}%` }} />
      ))}
    </div>
  )
}
