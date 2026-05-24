import { PageHeaderSkeleton, CardRowSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function MachinesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />
      <CardRowSkeleton rows={6} />
    </div>
  )
}
