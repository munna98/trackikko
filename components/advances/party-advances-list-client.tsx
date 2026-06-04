'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Banknote, Pencil, ClockCheck, CircleCheckBig } from 'lucide-react'
import { formatINR, formatDate, cn } from '@/lib/utils'
import { GlobalPartyAdvanceDialog, type PartyOption, type AccountOption } from './global-party-advance-dialog'

export type PartyAdvanceRow = {
  id: string
  date: string
  partyId: string
  partyName: string
  amount: number
  accountName: string
  notes: string | null
  isReviewed: boolean
}

export type FilterOption = { id: string; name: string }

type PartyAdvancesListClientProps = {
  advances: PartyAdvanceRow[]
  parties: PartyOption[]
  accounts: AccountOption[]
  currentPartyId?: string
  currentFrom?: string
  currentTo?: string
  currentStatus?: string
  isAdmin: boolean
}

function AdvanceCard({
  advance,
  isAdmin,
  onToggle,
  isUpdating,
}: {
  advance: PartyAdvanceRow
  isAdmin: boolean
  onToggle: (id: string, currentStatus: boolean) => void
  isUpdating: boolean
}) {
  return (
    <div className="block rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-card-foreground truncate">
            {advance.partyName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{advance.accountName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(advance.date)}
          </span>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 rounded-lg transition-all",
                advance.isReviewed 
                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                  : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
              )}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggle(advance.id, advance.isReviewed)
              }}
              disabled={isUpdating}
            >
              {advance.isReviewed ? (
                <CircleCheckBig className="h-4 w-4" />
              ) : (
                <ClockCheck className="h-4 w-4" />
              )}
            </Button>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" asChild>
              <Link href={`/dashboard/party-advances/${advance.id}/edit`}>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="sr-only">Edit</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">Advance received</span>
        <span className="font-bold text-base text-emerald-600 dark:text-emerald-400">
          {formatINR(advance.amount)}
        </span>
      </div>

      {advance.notes && (
        <p className="text-xs text-muted-foreground mt-2 italic truncate">
          &ldquo;{advance.notes}&rdquo;
        </p>
      )}
    </div>
  )
}

export function PartyAdvancesListClient({
  advances,
  parties,
  accounts,
  currentPartyId = '',
  currentFrom = '',
  currentTo = '',
  currentStatus = '',
  isAdmin,
}: PartyAdvancesListClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [partyId, setPartyId] = React.useState(currentPartyId)
  const [from, setFrom] = React.useState(currentFrom)
  const [to, setTo] = React.useState(currentTo)
  const [status, setStatus] = React.useState(currentStatus)

  const [advancesList, setAdvancesList] = React.useState(advances)
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setAdvancesList(advances)
  }, [advances])

  const toggleReviewed = async (advanceId: string, currentStatus: boolean) => {
    if (updatingIds.has(advanceId)) return
    
    // Optimistic UI update
    setAdvancesList(prev => prev.map(a => a.id === advanceId ? { ...a, isReviewed: !currentStatus } : a))
    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.add(advanceId)
      return next
    })

    try {
      const res = await fetch(`/api/party-advances/${advanceId}`, {
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
      setAdvancesList(prev => prev.map(a => a.id === advanceId ? { ...a, isReviewed: currentStatus } : a))
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(advanceId)
        return next
      })
    }
  }

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = { partyId, from, to, status, ...overrides }
    if (vals.partyId) params.set('partyId', vals.partyId)
    if (vals.from) params.set('from', vals.from)
    if (vals.to) params.set('to', vals.to)
    if (vals.status) params.set('status', vals.status)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function applyFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value }))
  }

  function clearFilters() {
    setPartyId('')
    setFrom('')
    setTo('')
    setStatus('')
    router.push(pathname)
  }

  const hasFilters = !!(currentPartyId || currentFrom || currentTo || currentStatus)

  const totalAmount = advancesList.reduce((sum, a) => sum + a.amount, 0)

  const columns: ColumnDef<PartyAdvanceRow>[] = React.useMemo(() => {
    const baseCols: ColumnDef<PartyAdvanceRow>[] = [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
        ),
      },
      {
        accessorKey: 'partyName',
        header: 'Party',
        cell: ({ getValue }) => (
          <span className="font-medium text-foreground">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
            {formatINR(Number(getValue()))}
          </span>
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
          return val ? (
            <span className="text-sm text-muted-foreground max-w-[200px] truncate block">{val}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
    ]

    if (isAdmin) {
      baseCols.push({
        id: 'actions',
        cell: ({ row }) => {
          const advance = row.original
          const isReviewed = advance.isReviewed
          const isUpdating = updatingIds.has(advance.id)
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-lg transition-all",
                  isReviewed 
                    ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                    : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
                )}
                onClick={() => toggleReviewed(advance.id, isReviewed)}
                disabled={isUpdating}
                title={isReviewed ? "Reviewed" : "Pending Review"}
              >
                {isReviewed ? (
                  <CircleCheckBig className="h-4 w-4" />
                ) : (
                  <ClockCheck className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/dashboard/party-advances/${advance.id}/edit`}>
                  <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  <span className="sr-only">Edit</span>
                </Link>
              </Button>
            </div>
          )
        },
      })
    }

    return baseCols
  }, [isAdmin])

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={partyId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setPartyId(val)
            applyFilter('partyId', val)
          }}
        >
          <SelectTrigger className="w-40" id="filter-party">
            <SelectValue placeholder="All Parties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Parties</SelectItem>
            {parties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
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

      {advances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-dashed border-border">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Banknote className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium">No advances found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFilters
              ? 'Adjust your filters or clear them to see all advances.'
              : isAdmin
              ? 'Record a party advance using the button above.'
              : 'No party advances have been recorded yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {advancesList.map((advance) => (
              <AdvanceCard
                key={advance.id}
                advance={advance}
                isAdmin={isAdmin}
                onToggle={toggleReviewed}
                isUpdating={updatingIds.has(advance.id)}
              />
            ))}
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <DataTable columns={columns} data={advancesList} />
          </div>

          {/* Total Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total ({advancesList.length})
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
              {formatINR(totalAmount)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
