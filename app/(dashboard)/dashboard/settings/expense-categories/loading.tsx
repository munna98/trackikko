import { PageHeaderSkeleton, SettingsRowSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function ExpenseCategoriesLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <SettingsRowSkeleton rows={5} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <SettingsRowSkeleton rows={3} />
      </div>
    </div>
  )
}
