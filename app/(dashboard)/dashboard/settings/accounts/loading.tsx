import { PageHeaderSkeleton, SettingsRowSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function AccountsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <SettingsRowSkeleton rows={3} />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <SettingsRowSkeleton rows={2} />
      </div>
    </div>
  )
}
