'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
import { X, Banknote } from 'lucide-react'
import { formatINR, formatDate } from '@/lib/utils'
import { GlobalPartyAdvanceDialog, type PartyOption, type AccountOption } from './global-party-advance-dialog'

export type PartyAdvanceRow = {
  id: string
  date: string
  partyId: string
  partyName: string
  amount: number
  accountName: string
  notes: string | null
}

export type FilterOption = { id: string; name: string }

type PartyAdvancesListClientProps = {
  advances: PartyAdvanceRow[]
  parties: PartyOption[]
  accounts: AccountOption[]
  currentPartyId?: string
  currentFrom?: string
  currentTo?: string
  isAdmin: boolean
}

function AdvanceCard({ advance }: { advance: PartyAdvanceRow }) {
  return (
    <div className="block rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-card-foreground truncate">
            {advance.partyName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{advance.accountName}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
          {formatDate(advance.date)}
        </span>
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
  isAdmin,
}: PartyAdvancesListClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [partyId, setPartyId] = React.useState(currentPartyId)
  const [from, setFrom] = React.useState(currentFrom)
  const [to, setTo] = React.useState(currentTo)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = { partyId, from, to, ...overrides }
    if (vals.partyId) params.set('partyId', vals.partyId)
    if (vals.from) params.set('from', vals.from)
    if (vals.to) params.set('to', vals.to)
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
    router.push(pathname)
  }

  const hasFilters = !!(currentPartyId || currentFrom || currentTo)

  const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0)

  const columns: ColumnDef<PartyAdvanceRow>[] = [
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
            {advances.map((advance) => (
              <AdvanceCard key={advance.id} advance={advance} />
            ))}
          </div>

          {/* Desktop: data table */}
          <div className="hidden md:block">
            <DataTable columns={columns} data={advances} />
          </div>

          {/* Total Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Total ({advances.length})
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
