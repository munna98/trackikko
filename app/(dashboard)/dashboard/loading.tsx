import { StatCardsSkeleton, PageHeaderSkeleton } from '@/components/ui/page-skeletons'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>

      {/* Stat cards */}
      <StatCardsSkeleton />

      {/* Bottom two cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="rounded-xl bg-muted h-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
