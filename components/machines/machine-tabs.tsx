'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { addMonths } from 'date-fns'
import { ClipboardList, Receipt, Gauge, Wrench, Pencil } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge, type Status } from '@/components/ui/status-badge'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmiDialog } from '@/components/machines/emi-dialog'
import { OilScheduleForm } from '@/components/machines/oil-schedule-form'
import { OilChangeDialog } from '@/components/machines/oil-change-dialog'
import { formatINR, formatDate } from '@/lib/utils'

type EmiRow = {
  id: string
  financierName: string
  monthlyAmount: number
  totalInstallments: number
  installmentsPaid: number
  startDate: string
  status: string
  isActive: boolean
}

type OilLog = {
  id: string
  date: string
  readingAtChange: number
  oilType?: string
  cost?: number
  accountName?: string
  notes?: string
}

type OilSchedule = {
  id: string
  intervalUnits: number
  lastChangedAtReading: number
  lastChangedDate: string
  alertBeforeUnits: number
  notes?: string
}

type Machine = {
  id: string
  name: string
  currentMeterReading: number
  isActive: boolean
  machineType: { id: string; name: string; trackingUnit: 'hours' | 'trips' | 'km' }
  emis: EmiRow[]
  oilChangeSchedule: OilSchedule | null
  oilChangeLogs: OilLog[]
}

type Account = { id: string; name: string; type: string }

type Props = {
  machine: Machine
  accounts: Account[]
  isAdmin: boolean
}

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }

function getOilStatus(machine: Machine): Status | null {
  const s = machine.oilChangeSchedule
  if (!s) return null
  const remaining = s.lastChangedAtReading + s.intervalUnits - machine.currentMeterReading
  if (remaining <= 0) return 'overdue'
  if (remaining <= s.alertBeforeUnits) return 'due_soon'
  return 'ok'
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ machine, isAdmin }: { machine: Machine; isAdmin: boolean }) {
  const unit = UNIT_LABEL[machine.machineType.trackingUnit] ?? ''
  const oilStatus = getOilStatus(machine)
  const schedule = machine.oilChangeSchedule

  const activeEmis = machine.emis.filter((e) => e.status === 'active')
  const totalMonthly = activeEmis.reduce((s, e) => s + e.monthlyAmount, 0)
  const latestEndDate = activeEmis.length
    ? activeEmis.reduce<Date | null>((latest, e) => {
        const end = addMonths(new Date(e.startDate), e.totalInstallments)
        return !latest || end > latest ? end : latest
      }, null)
    : null

  const nextDueReading = schedule ? schedule.lastChangedAtReading + schedule.intervalUnits : null
  const unitsRemaining = schedule ? nextDueReading! - machine.currentMeterReading : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Card A: Current Reading */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Current Reading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">
            {machine.currentMeterReading.toLocaleString('en-IN')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{unit}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {machine.oilChangeLogs.length > 0
              ? `Last oil change: ${formatDate(machine.oilChangeLogs[0].date)}`
              : 'No jobs logged yet'}
          </p>
        </CardContent>
      </Card>

      {/* Card B: Oil Change Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Oil Change Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!schedule ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">No schedule set</p>
              {isAdmin && (
                <Button size="sm" variant="outline" id="set-oil-schedule-btn"
                  onClick={() => {
                    const el = document.getElementById('oil-schedule-section')
                    el?.scrollIntoView({ behavior: 'smooth' })
                    const tab = document.querySelector('[data-value="oil"]') as HTMLElement | null
                    tab?.click()
                  }}
                >
                  Set Schedule
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {oilStatus && <StatusBadge status={oilStatus} />}
              <p className="text-sm"><span className="text-muted-foreground">Next due at: </span>
                <span className="font-medium">{nextDueReading?.toLocaleString('en-IN')} {unit}</span>
              </p>
              <p className="text-sm"><span className="text-muted-foreground">Units remaining: </span>
                <span className={`font-medium ${(unitsRemaining ?? 0) <= 0 ? 'text-destructive' : ''}`}>
                  {unitsRemaining?.toLocaleString('en-IN')} {unit}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Last changed: {formatDate(schedule.lastChangedDate)} at {schedule.lastChangedAtReading.toLocaleString('en-IN')} {unit}
              </p>
              <p className="text-xs text-muted-foreground">
                Alert when: {schedule.alertBeforeUnits} {unit} remaining
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card C: EMI Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">EMI Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {activeEmis.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active EMIs</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-lg font-bold text-foreground">{activeEmis.length} active EMI{activeEmis.length > 1 ? 's' : ''}</p>
              <p className="text-sm"><span className="text-muted-foreground">Monthly: </span>
                <span className="font-medium">{formatINR(totalMonthly)}</span>
              </p>
              {latestEndDate && (
                <p className="text-xs text-muted-foreground">
                  Est. completion: {formatDate(latestEndDate)}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── EMI Tab ───────────────────────────────────────────────────────────────────

function EmiTab({ machine, isAdmin }: { machine: Machine; isAdmin: boolean }) {
  const router = useRouter()
  const [closingId, setClosingId] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleClose() {
    if (!closingId) return
    setLoading(true)
    await fetch(`/api/machines/${machine.id}/emis/${closingId}`, { method: 'PATCH' })
    setLoading(false)
    setConfirmOpen(false)
    setClosingId(null)
    router.refresh()
  }

  const columns: ColumnDef<EmiRow>[] = [
    { accessorKey: 'financierName', header: 'Financier' },
    {
      accessorKey: 'monthlyAmount',
      header: 'Monthly',
      cell: ({ getValue }) => formatINR(Number(getValue())),
    },
    {
      id: 'total',
      header: 'Total',
      cell: ({ row }) => formatINR(row.original.monthlyAmount * row.original.totalInstallments),
    },
    { accessorKey: 'installmentsPaid', header: 'Paid' },
    {
      id: 'remaining',
      header: 'Remaining',
      cell: ({ row }) => row.original.totalInstallments - row.original.installmentsPaid,
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ getValue }) => formatDate(String(getValue())),
    },
    {
      id: 'estEnd',
      header: 'Est. End',
      cell: ({ row }) => formatDate(addMonths(new Date(row.original.startDate), row.original.totalInstallments)),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status === 'active' ? 'active' : 'closed'} />,
    },
    ...(isAdmin
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: EmiRow } }) =>
              row.original.status === 'active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive text-xs"
                  onClick={() => { setClosingId(row.original.id); setConfirmOpen(true) }}
                >
                  Mark Closed
                </Button>
              ) : null,
          } satisfies ColumnDef<EmiRow>,
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <EmiDialog machineId={machine.id} />
        </div>
      )}
      <DataTable
        columns={columns}
        data={machine.emis}
        emptyState={
          <EmptyState
            icon={Receipt}
            title="No EMIs added"
            description="Add an EMI to track your machine financing."
          />
        }
      />
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Mark EMI as Closed?"
        description="This will mark the EMI as closed and stop tracking it. This cannot be undone."
        confirmLabel="Mark Closed"
        variant="destructive"
        onConfirm={handleClose}
        loading={loading}
      />
    </div>
  )
}

// ── Oil Changes Tab ───────────────────────────────────────────────────────────

function OilChangesTab({
  machine,
  accounts,
  isAdmin,
}: {
  machine: Machine
  accounts: Account[]
  isAdmin: boolean
}) {
  const [showScheduleForm, setShowScheduleForm] = React.useState(false)
  const schedule = machine.oilChangeSchedule

  const columns: ColumnDef<OilLog>[] = [
    { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => formatDate(String(getValue())) },
    {
      accessorKey: 'readingAtChange',
      header: 'Reading',
      cell: ({ getValue }) => `${Number(getValue()).toLocaleString('en-IN')} ${UNIT_LABEL[machine.machineType.trackingUnit] ?? ''}`,
    },
    { accessorKey: 'oilType', header: 'Oil Type', cell: ({ getValue }) => String(getValue() ?? '—') },
    {
      accessorKey: 'cost',
      header: 'Cost',
      cell: ({ getValue }) => (getValue() != null ? formatINR(Number(getValue())) : '—'),
    },
    { accessorKey: 'accountName', header: 'Account', cell: ({ getValue }) => String(getValue() ?? '—') },
  ]

  return (
    <div className="space-y-6" id="oil-schedule-section">
      {/* Section A: Schedule */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-card-foreground">Oil Change Schedule</h3>
          {isAdmin && schedule && !showScheduleForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowScheduleForm(true)}
              id="edit-oil-schedule-btn"
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit Schedule
            </Button>
          )}
        </div>

        {!schedule || showScheduleForm ? (
          <OilScheduleForm
            machineId={machine.id}
            trackingUnit={machine.machineType.trackingUnit}
            defaultValues={
              schedule
                ? {
                    intervalUnits: schedule.intervalUnits,
                    alertBeforeUnits: schedule.alertBeforeUnits,
                    lastChangedAtReading: schedule.lastChangedAtReading,
                    lastChangedDate: new Date(schedule.lastChangedDate),
                    notes: schedule.notes,
                  }
                : undefined
            }
            onSuccess={() => setShowScheduleForm(false)}
          />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Interval</p>
              <p className="font-medium">{schedule.intervalUnits.toLocaleString('en-IN')} {UNIT_LABEL[machine.machineType.trackingUnit]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Alert before</p>
              <p className="font-medium">{schedule.alertBeforeUnits} {UNIT_LABEL[machine.machineType.trackingUnit]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last changed at</p>
              <p className="font-medium">{schedule.lastChangedAtReading.toLocaleString('en-IN')} {UNIT_LABEL[machine.machineType.trackingUnit]}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last changed date</p>
              <p className="font-medium">{formatDate(schedule.lastChangedDate)}</p>
            </div>
            {schedule.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Notes</p>
                <p className="font-medium">{schedule.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section B: History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Oil Change History</h3>
          {isAdmin && (
            <OilChangeDialog
              machineId={machine.id}
              trackingUnit={machine.machineType.trackingUnit}
              accounts={accounts}
            />
          )}
        </div>
        <DataTable
          columns={columns}
          data={machine.oilChangeLogs}
          emptyState={
            <EmptyState
              icon={Wrench}
              title="No oil changes logged yet"
              description="Log an oil change to start tracking service history."
            />
          }
        />
      </div>
    </div>
  )
}

// ── Main Tabs Component ───────────────────────────────────────────────────────

export function MachineTabs({ machine, accounts, isAdmin }: Props) {
  return (
    <Tabs defaultValue="overview" className="flex-col">
      <TabsList className="w-full h-auto flex-wrap justify-start gap-0.5 p-1">
        <TabsTrigger value="overview" data-value="overview">Overview</TabsTrigger>
        <TabsTrigger value="emi">EMI</TabsTrigger>
        <TabsTrigger value="oil" data-value="oil">Oil Changes</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="expenses">Expenses</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab machine={machine} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="emi">
        <EmiTab machine={machine} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="oil">
        <OilChangesTab machine={machine} accounts={accounts} isAdmin={isAdmin} />
      </TabsContent>

      <TabsContent value="jobs">
        <EmptyState
          icon={ClipboardList}
          title="No jobs logged yet"
          description="Jobs will appear here once logging begins in Phase 3."
        />
      </TabsContent>

      <TabsContent value="expenses">
        <EmptyState
          icon={Receipt}
          title="No expenses logged yet"
          description="Machine expenses will appear here in Phase 3."
        />
      </TabsContent>
    </Tabs>
  )
}
