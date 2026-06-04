'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Receipt, Pencil, ClockCheck, CircleCheckBig } from 'lucide-react'
import { formatINR, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type ExpenseRow = {
  id: string
  date: string
  amount: number
  categoryId: string
  categoryName: string
  machineId: string | null
  machineName: string | null
  staffId: string | null
  staffName: string | null
  accountId: string
  accountName: string
  notes: string | null
  recordedBy: string | null
  recorderName: string | null
  isReviewed: boolean
}

export type FilterOption = {
  id: string
  name: string
}

type ExpensesListClientProps = {
  expenses: ExpenseRow[]
  categories: FilterOption[]
  machines: FilterOption[]
  staffList: FilterOption[]
  currentCategoryId?: string
  currentMachineId?: string
  currentStaffId?: string
  currentFrom?: string
  currentTo?: string
  currentStatus?: string
  isAdmin: boolean
}

function ExpenseCard({
  expense,
  onToggle,
  isUpdating,
  isAdmin,
}: {
  expense: ExpenseRow
  onToggle: (id: string, currentStatus: boolean) => void
  isUpdating: boolean
  isAdmin: boolean
}) {
  return (
    <div className="block rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-card-foreground truncate">{expense.categoryName}</p>
          {(expense.machineName || expense.staffName) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {expense.machineName && <span>{expense.machineName}</span>}
              {expense.machineName && expense.staffName && <span> &middot; </span>}
              {expense.staffName && <span>{expense.staffName}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(expense.date)}
          </span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-lg transition-all",
                expense.isReviewed 
                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                  : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
              )}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggle(expense.id, expense.isReviewed)
              }}
              disabled={isUpdating}
            >
              {expense.isReviewed ? (
                <CircleCheckBig className="h-4 w-4" />
              ) : (
                <ClockCheck className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" asChild>
            <Link href={`/dashboard/expenses/${expense.id}/edit`}>
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">{expense.accountName}</span>
        <span className="font-bold text-base text-destructive">{formatINR(expense.amount)}</span>
      </div>

      {expense.notes && (
        <p className="text-xs text-muted-foreground mt-2 italic truncate">"{expense.notes}"</p>
      )}
      
      {expense.recorderName && (
        <p className="text-[10px] text-muted-foreground mt-2">Recorded by: {expense.recorderName}</p>
      )}
    </div>
  )
}

export function ExpensesListClient({
  expenses,
  categories,
  machines,
  staffList,
  currentCategoryId = '',
  currentMachineId = '',
  currentStaffId = '',
  currentFrom = '',
  currentTo = '',
  currentStatus = '',
  isAdmin,
}: ExpensesListClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [categoryId, setCategoryId] = React.useState(currentCategoryId)
  const [machineId, setMachineId] = React.useState(currentMachineId)
  const [staffId, setStaffId] = React.useState(currentStaffId)
  const [from, setFrom] = React.useState(currentFrom)
  const [to, setTo] = React.useState(currentTo)
  const [status, setStatus] = React.useState(currentStatus)

  const [expensesList, setExpensesList] = React.useState(expenses)
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setExpensesList(expenses)
  }, [expenses])

  const toggleReviewed = async (expenseId: string, currentStatus: boolean) => {
    if (updatingIds.has(expenseId)) return
    
    // Optimistic UI update
    setExpensesList(prev => prev.map(e => e.id === expenseId ? { ...e, isReviewed: !currentStatus } : e))
    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.add(expenseId)
      return next
    })

    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReviewed: !currentStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update status')
      }
    } catch (err) {
      console.error(err)
      // Revert optimistic update
      setExpensesList(prev => prev.map(e => e.id === expenseId ? { ...e, isReviewed: currentStatus } : e))
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(expenseId)
        return next
      })
    }
  }

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = { categoryId, machineId, staffId, from, to, status, ...overrides }
    if (vals.categoryId) params.set('categoryId', vals.categoryId)
    if (vals.machineId) params.set('machineId', vals.machineId)
    if (vals.staffId) params.set('staffId', vals.staffId)
    if (vals.from) params.set('from', vals.from)
    if (vals.to) params.set('to', vals.to)
    if (vals.status) params.set('status', vals.status)
    return `${pathname}?${params.toString()}`
  }

  function applyFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value }))
  }

  function clearFilters() {
    setCategoryId('')
    setMachineId('')
    setStaffId('')
    setFrom('')
    setTo('')
    setStatus('')
    router.push(pathname)
  }

  const hasFilters = !!(currentCategoryId || currentMachineId || currentStaffId || currentFrom || currentTo || currentStatus)

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'machineName',
      header: 'Machine',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? <span className="text-sm">{val}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'staffName',
      header: 'Staff',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? <span className="text-sm">{val}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-semibold text-sm text-destructive">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'accountName',
      header: 'Account',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? <span className="text-sm text-muted-foreground max-w-[200px] truncate block">{val}</span> : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const expense = row.original
        const isReviewed = expense.isReviewed
        const isUpdating = updatingIds.has(expense.id)
        return (
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  isReviewed 
                    ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                    : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                )}
                onClick={() => toggleReviewed(expense.id, isReviewed)}
                disabled={isUpdating}
                title={isReviewed ? "Reviewed" : "Pending Review"}
              >
                {isReviewed ? (
                  <CircleCheckBig className="h-4 w-4" />
                ) : (
                  <ClockCheck className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/dashboard/expenses/${expense.id}/edit`}>
                <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          </div>
        )
      },
    },
  ]

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={categoryId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setCategoryId(val)
            applyFilter('categoryId', val)
          }}
        >
          <SelectTrigger className="w-36" id="filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={machineId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setMachineId(val)
            applyFilter('machineId', val)
          }}
        >
          <SelectTrigger className="w-36" id="filter-machine">
            <SelectValue placeholder="All machines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All machines</SelectItem>
            {machines.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={staffId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setStaffId(val)
            applyFilter('staffId', val)
          }}
        >
          <SelectTrigger className="w-36" id="filter-staff">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setStatus(val)
            applyFilter('status', val)
          }}
        >
          <SelectTrigger className="w-40" id="filter-status">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All status</SelectItem>
            <SelectItem value="unreviewed">Pending Review</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          id="filter-from"
          type="date"
          className="w-36 h-9"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            applyFilter('from', e.target.value)
          }}
          placeholder="From"
        />
        <Input
          id="filter-to"
          type="date"
          className="w-36 h-9"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            applyFilter('to', e.target.value)
          }}
          placeholder="To"
        />

        {hasFilters && (
          <Button
            id="filter-clear-btn"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </Button>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Receipt className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No expenses found</p>
          <p className="text-sm text-muted-foreground">Adjust your filters or log a new expense.</p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {expensesList.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                onToggle={toggleReviewed}
                isUpdating={updatingIds.has(expense.id)}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <DataTable columns={columns} data={expensesList} />
          </div>

          {/* Total Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total ({expenses.length})</span>
            <span className="font-bold text-destructive text-lg">{formatINR(totalAmount)}</span>
          </div>
        </>
      )}
    </div>
  )
}
