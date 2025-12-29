import { Skeleton } from '@/components/ui/skeleton'

type ChartSkeletonProps = {
  height?: number
  bars?: number
}

export function ChartSkeleton({ height = 160, bars = 12 }: ChartSkeletonProps) {
  return (
    <div className="flex items-end gap-2 justify-around px-4" style={{ height }}>
      {Array.from({ length: bars }).map((_, i) => {
        // Skapa varierande höjder för realistiskt utseende
        const randomHeight = 30 + Math.sin(i * 0.8) * 30 + Math.random() * 20
        return (
          <Skeleton
            key={i}
            className="w-5 rounded-t"
            style={{ height: `${randomHeight}%` }}
          />
        )
      })}
    </div>
  )
}
