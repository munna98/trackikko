import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type Status = 'active' | 'inactive' | 'overdue' | 'due_soon' | 'ok' | 'closed'

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  overdue: {
    label: 'Overdue',
    className: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20',
  },
  due_soon: {
    label: 'Due Soon',
    className:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/30',
  },
  ok: {
    label: 'OK',
    className:
      'bg-chart-5/10 text-chart-5 border-chart-5/20 dark:bg-chart-5/20',
  },
  active: {
    label: 'Active',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground border-border',
  },
  closed: {
    label: 'Closed',
    className: 'bg-transparent text-muted-foreground border-border',
  },
}

type StatusBadgeProps = {
  status: Status
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
