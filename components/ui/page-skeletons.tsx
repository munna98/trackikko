import { Skeleton } from '@/components/ui/skeleton'

/** Reusable page-level skeleton shapes */

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function CardRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 bg-card">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={`h-4 flex-1 ${j === 0 ? 'max-w-[8rem]' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailHeaderSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-6 rounded" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-9 w-40" />
      </div>
    </div>
  )
}

export function TabsSkeleton({ tabs = 4 }: { tabs?: number }) {
  return (
    <div className="space-y-4 mt-2">
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-full">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1 rounded-md" />
        ))}
      </div>
      <CardRowSkeleton rows={4} />
    </div>
  )
}

export function SettingsRowSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
          <Skeleton className="h-4 flex-1 max-w-[10rem]" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
        </div>
      ))}
    </div>
  )
}
