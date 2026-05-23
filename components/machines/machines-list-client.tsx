'use client'

import * as React from 'react'
import Link from 'next/link'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge, type Status } from '@/components/ui/status-badge'
import { DataTable } from '@/components/ui/data-table'
import { MachineSheet } from '@/components/machines/machine-sheet'
import { Gauge, Wrench, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

type MachineRow = {
  id: string
  name: string
  typeName: string
  trackingUnit: 'hours' | 'trips' | 'km'
  identifier?: string
  capacity?: string
  currentMeterReading: number
  oilStatus: Status | null
  activeEmiCount: number
  isActive: boolean
}

type MachineType = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
}

type Props = {
  machines: MachineRow[]
  machineTypes: MachineType[]
  isAdmin: boolean
}

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }

function MachineCard({ machine, machineTypes, isAdmin }: { machine: MachineRow; machineTypes: MachineType[]; isAdmin: boolean }) {
  return (
    <Link
      href={`/dashboard/machines/${machine.id}`}
      className={cn(
        'block rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.98]',
        !machine.isActive && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold text-card-foreground truncate">{machine.name}</p>
          {(machine.capacity || machine.identifier) && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {[machine.capacity, machine.identifier].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="flex-shrink-0 text-xs">{machine.typeName}</Badge>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
        <Gauge className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium text-foreground">
          {machine.currentMeterReading.toLocaleString('en-IN')}
        </span>
        <span className="text-xs">{UNIT_LABEL[machine.trackingUnit] ?? ''}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {machine.oilStatus && <StatusBadge status={machine.oilStatus} />}
        {machine.activeEmiCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            {machine.activeEmiCount} active EMI
          </span>
        )}
        {!machine.isActive && (
          <StatusBadge status="inactive" />
        )}
      </div>
    </Link>
  )
}

export function MachinesListClient({ machines, machineTypes, isAdmin }: Props) {
  const [filterType, setFilterType] = React.useState<string>('all')

  const uniqueTypes = React.useMemo(() => {
    const seen = new Map<string, string>()
    machines.forEach((m) => { if (!seen.has(m.typeName)) seen.set(m.typeName, m.typeName) })
    return Array.from(seen.entries())
  }, [machines])

  const filtered = filterType === 'all' ? machines : machines.filter((m) => m.typeName === filterType)

  const columns: ColumnDef<MachineRow>[] = [
    {
      accessorKey: 'name',
      header: 'Machine',
      cell: ({ row }) => (
        <Link href={`/dashboard/machines/${row.original.id}`} className="hover:underline">
          <span className="font-medium text-foreground">{row.original.name}</span>
          {row.original.identifier && (
            <span className="ml-2 text-xs text-muted-foreground">{row.original.identifier}</span>
          )}
        </Link>
      ),
    },
    {
      accessorKey: 'typeName',
      header: 'Type',
      cell: ({ getValue }) => <Badge variant="secondary">{String(getValue())}</Badge>,
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ getValue }) => <span className="text-muted-foreground text-sm">{String(getValue() ?? '—')}</span>,
    },
    {
      accessorKey: 'currentMeterReading',
      header: 'Reading',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.currentMeterReading.toLocaleString('en-IN')}{' '}
          <span className="text-xs text-muted-foreground">{UNIT_LABEL[row.original.trackingUnit]}</span>
        </span>
      ),
    },
    {
      id: 'oilStatus',
      header: 'Oil Status',
      cell: ({ row }) =>
        row.original.oilStatus ? <StatusBadge status={row.original.oilStatus} /> : <span className="text-muted-foreground text-xs">—</span>,
    },
    {
      id: 'emi',
      header: 'EMI',
      cell: ({ row }) =>
        row.original.activeEmiCount > 0 ? (
          <span className="text-xs text-muted-foreground">{row.original.activeEmiCount} active</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: MachineRow } }) => (
              <MachineSheet
                machineTypes={machineTypes}
                defaultValues={{
                  id: row.original.id,
                  machineTypeId: '',
                  name: row.original.name,
                  identifier: row.original.identifier,
                  capacity: row.original.capacity,
                  currentMeterReading: row.original.currentMeterReading,
                }}
              />
            ),
          } satisfies ColumnDef<MachineRow>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {/* Type filter */}
      {uniqueTypes.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filterType === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            All
          </button>
          {uniqueTypes.map(([name]) => (
            <button
              key={name}
              onClick={() => setFilterType(name)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filterType === name
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Mobile: card grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {filtered.map((machine) => (
          <MachineCard key={machine.id} machine={machine} machineTypes={machineTypes} isAdmin={isAdmin} />
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden md:block">
        <DataTable columns={columns} data={filtered} />
      </div>
    </div>
  )
}
