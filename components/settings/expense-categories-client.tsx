'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { EmptyState } from '@/components/ui/empty-state'
import { ExpenseCategoryDialog } from '@/components/settings/expense-category-dialog'
import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type Category = {
  id: string
  name: string
  appliesTo: 'machine' | 'staff' | 'other' | null
  isActive: boolean
  isGlobal: boolean
}

type Props = { categories: Category[]; isAdmin: boolean }

const APPLIES_BADGE: Record<string, string> = {
  machine: 'bg-primary/15 text-primary',
  staff: 'bg-chart-5/15 text-chart-5',
  other: 'bg-muted text-muted-foreground',
}

function AppliesToBadge({ value }: { value: string | null }) {
  if (!value) return <Badge variant="outline" className="text-xs">Any</Badge>
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', APPLIES_BADGE[value] ?? 'bg-muted text-muted-foreground')}>
      {value}
    </span>
  )
}

function CategoryRow({ category, isAdmin }: { category: Category; isAdmin: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleToggle() {
    setPending(true)
    await fetch(`/api/settings/expense-categories/${category.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !category.isActive }),
    })
    setPending(false)
    router.refresh()
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl border border-border',
      category.isGlobal ? 'bg-muted/50' : 'bg-card'
    )}>
      {category.isGlobal && <Lock className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
      <p className={cn('flex-1 text-sm font-medium', category.isGlobal && 'text-muted-foreground')}>
        {category.name}
      </p>
      <AppliesToBadge value={category.appliesTo} />
      {!category.isGlobal && isAdmin && (
        <div className="flex items-center gap-2">
          <Switch
            checked={category.isActive}
            onCheckedChange={handleToggle}
            disabled={pending}
            id={`toggle-category-${category.id}`}
          />
          <ExpenseCategoryDialog defaultValues={category} />
        </div>
      )}
    </div>
  )
}

export function ExpenseCategoriesClient({ categories, isAdmin }: Props) {
  const globals = categories.filter((c) => c.isGlobal)
  const custom = categories.filter((c) => !c.isGlobal)

  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No expense categories"
        description="Add a category to start logging expenses."
        action={isAdmin ? <ExpenseCategoryDialog /> : undefined}
      />
    )
  }

  return (
    <div className="space-y-6">
      {globals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Default Categories</h3>
          <div className="space-y-1.5">
            {globals.map((c) => <CategoryRow key={c.id} category={c} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
      {globals.length > 0 && custom.length > 0 && <Separator />}
      {custom.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Custom Categories</h3>
          <div className="space-y-1.5">
            {custom.map((c) => <CategoryRow key={c.id} category={c} isAdmin={isAdmin} />)}
          </div>
        </div>
      )}
    </div>
  )
}
