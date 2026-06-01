'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
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
import { X, ClockCheck, CircleCheckBig } from 'lucide-react'
import { formatINR, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

export type JobRow = {
  id: string
  date: string
  machineName: string
  machineId: string
  trackingUnit: 'hours' | 'trips' | 'km'
  partyName: string
  siteName: string
  siteId: string
  mode: 'bucket' | 'breaking' | null
  quantity: number
  rateType: 'per_hour' | 'per_trip'
  actualRate: number
  amount: number
  batha: number
  bathaPaidBy: 'party' | 'company'
  isReviewed: boolean
  staffName: string
  staffId: string
}

export type FilterOption = {
  id: string
  name: string
}

type JobsListClientProps = {
  jobs: JobRow[]
  machines: FilterOption[]
  staffList: FilterOption[]
  siteList: FilterOption[]
  currentMachineId?: string
  currentStaffId?: string
  currentSiteId?: string
  currentFrom?: string
  currentTo?: string
  currentStatus?: string
}

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }
const MODE_LABEL: Record<string, string> = { bucket: 'Bucket', breaking: 'Breaking' }

// ── Mobile job card ──────────────────────────────────────────────────────────

type JobCardProps = {
  job: JobRow
  onToggle: (id: string, currentStatus: boolean) => void
  isUpdating: boolean
}

function JobCard({ job, onToggle, isUpdating }: JobCardProps) {
  return (
    <Link
      href={`/dashboard/jobs/${job.id}`}
      className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-card-foreground truncate">{job.machineName}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {job.partyName} · {job.siteName}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(job.date)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg transition-all",
              job.isReviewed 
                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
            )}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggle(job.id, job.isReviewed)
            }}
            disabled={isUpdating}
          >
            {job.isReviewed ? (
              <CircleCheckBig className="h-4 w-4" />
            ) : (
              <ClockCheck className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-3">
        {job.mode && (
          <Badge variant="secondary" className="text-xs">{MODE_LABEL[job.mode] ?? job.mode}</Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {job.quantity.toLocaleString('en-IN')} {UNIT_LABEL[job.trackingUnit]}
        </span>
        <span className="ml-auto font-semibold text-sm text-foreground">{formatINR(job.amount)}</span>
        {job.batha > 0 && (
          <span className={job.bathaPaidBy === 'company' ? 'text-xs text-destructive font-semibold' : 'text-xs text-chart-5'}>
            +{formatINR(job.batha)} batha
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">Operator: {job.staffName}</p>
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function JobsListClient({
  jobs,
  machines,
  staffList,
  siteList,
  currentMachineId = '',
  currentStaffId = '',
  currentSiteId = '',
  currentFrom = '',
  currentTo = '',
  currentStatus = '',
}: JobsListClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Controlled local state for filter inputs (synced from URL)
  const [machineId, setMachineId] = React.useState(currentMachineId)
  const [staffId, setStaffId] = React.useState(currentStaffId)
  const [siteId, setSiteId] = React.useState(currentSiteId)
  const [from, setFrom] = React.useState(currentFrom)
  const [to, setTo] = React.useState(currentTo)
  const [status, setStatus] = React.useState(currentStatus)

  // Local state for optimistic updates
  const [jobsList, setJobsList] = React.useState(jobs)
  const [updatingIds, setUpdatingIds] = React.useState<Set<string>>(new Set())

  React.useEffect(() => {
    setJobsList(jobs)
  }, [jobs])

  const toggleReviewed = async (jobId: string, currentStatus: boolean) => {
    if (updatingIds.has(jobId)) return
    
    // Optimistic UI update
    setJobsList(prev => prev.map(j => j.id === jobId ? { ...j, isReviewed: !currentStatus } : j))
    setUpdatingIds(prev => {
      const next = new Set(prev)
      next.add(jobId)
      return next
    })

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
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
      setJobsList(prev => prev.map(j => j.id === jobId ? { ...j, isReviewed: currentStatus } : j))
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = { machineId, staffId, siteId, from, to, status, ...overrides }
    if (vals.machineId) params.set('machineId', vals.machineId)
    if (vals.staffId) params.set('staffId', vals.staffId)
    if (vals.siteId) params.set('siteId', vals.siteId)
    if (vals.from) params.set('from', vals.from)
    if (vals.to) params.set('to', vals.to)
    if (vals.status) params.set('status', vals.status)
    return `${pathname}?${params.toString()}`
  }

  function applyFilter(key: string, value: string) {
    router.push(buildUrl({ [key]: value }))
  }

  function clearFilters() {
    setMachineId('')
    setStaffId('')
    setSiteId('')
    setFrom('')
    setTo('')
    setStatus('')
    router.push(pathname)
  }

  const hasFilters = !!(currentMachineId || currentStaffId || currentSiteId || currentFrom || currentTo || currentStatus)

  // DataTable columns
  const columns: ColumnDef<JobRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'machineName',
      header: 'Machine',
      cell: ({ row }) => (
        <Link href={`/dashboard/jobs/${row.original.id}`} className="hover:underline">
          <span className="font-medium text-foreground">{row.original.machineName}</span>
        </Link>
      ),
    },
    {
      id: 'party',
      header: 'Party · Site',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm text-foreground truncate">{row.original.partyName}</p>
          <p className="text-xs text-muted-foreground truncate">{row.original.siteName}</p>
        </div>
      ),
    },
    {
      accessorKey: 'mode',
      header: 'Mode',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v ? <Badge variant="secondary" className="text-xs">{MODE_LABEL[v] ?? v}</Badge> : <span className="text-muted-foreground text-xs">—</span>
      },
    },
    {
      id: 'qty',
      header: 'Qty',
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.quantity.toLocaleString('en-IN')}{' '}
          <span className="text-xs text-muted-foreground">{UNIT_LABEL[row.original.trackingUnit]}</span>
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ getValue }) => (
        <span className="font-semibold text-sm">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'batha',
      header: 'Batha',
      cell: ({ row }) => {
        const v = Number(row.original.batha)
        return v > 0 ? (
          <span className={row.original.bathaPaidBy === 'company' ? 'text-xs text-destructive font-semibold' : 'text-xs text-chart-5 font-medium'}>
            {formatINR(v)}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'staffName',
      header: 'Operator',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{String(getValue())}</span>
      ),
    },
    {
      id: 'action',
      header: '',
      cell: ({ row }) => {
        const job = row.original
        const isReviewed = job.isReviewed
        const isUpdating = updatingIds.has(job.id)

        return (
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/dashboard/jobs/${job.id}`}
              className="text-xs text-primary hover:underline"
            >
              View
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-all",
                isReviewed 
                  ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" 
                  : "text-muted-foreground hover:text-amber-600 hover:bg-amber-50"
              )}
              onClick={() => toggleReviewed(job.id, isReviewed)}
              disabled={isUpdating}
              title={isReviewed ? "Reviewed" : "Pending Review"}
            >
              {isReviewed ? (
                <CircleCheckBig className="h-4 w-4" />
              ) : (
                <ClockCheck className="h-4 w-4" />
              )}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex flex-wrap gap-2 items-center">
        <Select
          value={machineId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setMachineId(val)
            applyFilter('machineId', val)
          }}
        >
          <SelectTrigger className="w-40" id="filter-machine">
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
          value={siteId || '_all'}
          onValueChange={(v) => {
            const val = v === '_all' ? '' : v
            setSiteId(val)
            applyFilter('siteId', val)
          }}
        >
          <SelectTrigger className="w-36" id="filter-site">
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All sites</SelectItem>
            {siteList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
          className="w-36 h-8"
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
          className="w-36 h-8"
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

      {/* Mobile: card list */}
      <div className={cn('space-y-3 md:hidden', jobsList.length === 0 && 'hidden')}>
        {jobsList.map((job) => (
          <JobCard 
            key={job.id} 
            job={job} 
            onToggle={toggleReviewed}
            isUpdating={updatingIds.has(job.id)}
          />
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={jobsList} />
      </div>
    </div>
  )
}
