import { PageHeaderSkeleton, CardRowSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function StaffLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-10 w-full rounded-lg" />
      <CardRowSkeleton rows={6} />
    </div>
  )
}
