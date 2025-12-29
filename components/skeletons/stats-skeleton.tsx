import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type StatsSkeletonProps = {
  count?: number
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-1 pt-3 px-4">
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <Skeleton className="h-7 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
