'use client'

import * as React from 'react'
import { CheckCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatINR } from '@/lib/utils'
import { cn } from '@/lib/utils'

export type UnpaidBathaJob = {
  id: string
  date: string        // YYYY-MM-DD
  siteName: string
  batha: number
  inPeriod: boolean   // true = within the selected pay period
}

type BathaTileSelectorProps = {
  jobs: UnpaidBathaJob[]
  selectedIds: Set<string>
  onChange: (ids: Set<string>) => void
}

function formatTileDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.getDate(),
    month: d.toLocaleString('en-IN', { month: 'short' }),
    year: d.getFullYear(),
  }
}

export function BathaTileSelector({ jobs, selectedIds, onChange }: BathaTileSelectorProps) {
  const olderJobs = jobs.filter((j) => !j.inPeriod)
  const periodJobs = jobs.filter((j) => j.inPeriod)

  const totalSelected = jobs
    .filter((j) => selectedIds.has(j.id))
    .reduce((sum, j) => sum + j.batha, 0)

  const allSelected = jobs.every((j) => selectedIds.has(j.id))

  function toggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  function selectAll() {
    onChange(new Set(jobs.map((j) => j.id)))
  }

  function clearAll() {
    onChange(new Set())
  }

  if (jobs.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">Batha to Settle</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click tiles to include / exclude
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={selectAll}
            disabled={allSelected}
          >
            <CheckCheck className="h-3 w-3" />
            All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={clearAll}
            disabled={selectedIds.size === 0}
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Older unpaid jobs */}
        {olderJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-400" />
              Older Unpaid
            </p>
            <div className="flex flex-wrap gap-2">
              {olderJobs.map((job) => (
                <BathaTile
                  key={job.id}
                  job={job}
                  selected={selectedIds.has(job.id)}
                  dimmed
                  onToggle={() => toggle(job.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Period jobs */}
        {periodJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              Current Period
            </p>
            <div className="flex flex-wrap gap-2">
              {periodJobs.map((job) => (
                <BathaTile
                  key={job.id}
                  job={job}
                  selected={selectedIds.has(job.id)}
                  dimmed={false}
                  onToggle={() => toggle(job.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer total */}
      <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedIds.size} of {jobs.length} job{jobs.length !== 1 ? 's' : ''} selected
        </p>
        <p className="text-sm font-bold text-foreground">
          Batha Total:{' '}
          <span className="text-primary">{formatINR(totalSelected)}</span>
        </p>
      </div>
    </div>
  )
}

// ── Individual tile ────────────────────────────────────────────

type BathaTileProps = {
  job: UnpaidBathaJob
  selected: boolean
  dimmed: boolean
  onToggle: () => void
}

function BathaTile({ job, selected, dimmed, onToggle }: BathaTileProps) {
  const { day, month, year } = formatTileDate(job.date)
  const currentYear = new Date().getFullYear()

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative w-24 rounded-xl border-2 p-2.5 text-left transition-all duration-150 cursor-pointer select-none',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        selected
          ? 'border-primary bg-primary/10 shadow-sm'
          : dimmed
            ? 'border-border bg-muted/30 opacity-60 hover:opacity-80 hover:border-muted-foreground/40'
            : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5',
      )}
    >
      {/* Check indicator */}
      {selected && (
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <CheckCheck className="w-2.5 h-2.5 text-primary-foreground" />
        </span>
      )}

      {/* Date */}
      <p
        className={cn(
          'text-xl font-bold leading-none',
          selected ? 'text-primary' : 'text-foreground',
        )}
      >
        {day}
      </p>
      <p
        className={cn(
          'text-xs font-medium mt-0.5',
          selected ? 'text-primary/80' : 'text-muted-foreground',
        )}
      >
        {month}{year !== currentYear ? ` '${String(year).slice(2)}` : ''}
      </p>

      {/* Divider */}
      <div className={cn('my-2 h-px', selected ? 'bg-primary/20' : 'bg-border')} />

      {/* Site name */}
      <p className="text-[10px] text-muted-foreground leading-tight truncate" title={job.siteName}>
        {job.siteName}
      </p>

      {/* Amount */}
      <p
        className={cn(
          'text-xs font-semibold mt-1',
          selected ? 'text-primary' : 'text-foreground',
        )}
      >
        {formatINR(job.batha)}
      </p>
    </button>
  )
}
