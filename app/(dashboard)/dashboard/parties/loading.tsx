import { PageHeaderSkeleton, CardRowSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function PartiesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full rounded-lg" />
      <CardRowSkeleton rows={7} />
    </div>
  )
}
