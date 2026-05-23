import React from 'react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      'rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-14'
    )}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
