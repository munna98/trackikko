'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR, formatDate, cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BookOpen,
  Truck,
  Users,
  FileBarChart2,
  Printer,
  X,
  Wallet,
  BadgeDollarSign,
  ArrowDownLeft,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReportsClientProps = {
  // P&L
  totalRevenue: number
  totalExpenses: number
  totalSalaryPaid: number
  totalCompanyBatha: number
  monthlyBreakdown: {
    month: string
    revenue: number
    expenses: number
    salaryPaid: number
    companyBatha: number
  }[]
  // Party Ledger
  ledgerEntries: {
    id: string
    date: string
    type: string
    entryType: string
    amount: number
    description: string | null
    runningBalance: number
  }[]
  openingBalance: number
  // Machine Summary
  machineSummary: {
    machineId: string
    machineName: string
    jobCount: number
    totalQty: number
    totalRevenue: number
    totalExpenses: number
  }[]
  // Staff Summary
  staffSummary: {
    staffId: string
    staffName: string
    jobCount: number
    partyBatha: number
    companyBatha: number
    salary: number
    bathaSettled: number
    advancesGiven: number
    netPaid: number
  }[]
  // Filter options
  parties: { id: string; name: string }[]
  machines: { id: string; name: string }[]
  // Current filters
  currentReport: string
  currentFrom: string
  currentTo: string
  currentPartyId: string
  defaultFrom: string
  defaultTo: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REPORT_TABS = [
  { id: 'pl', label: 'P&L', icon: TrendingUp },
  { id: 'party', label: 'Party Ledger', icon: BookOpen },
  { id: 'machine', label: 'Machine Summary', icon: Truck },
  { id: 'staff', label: 'Staff Summary', icon: Users },
] as const

function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

const LEDGER_TYPE_LABEL: Record<string, string> = {
  job: 'Job Billed',
  expense: 'Expense',
  salary_advance: 'Salary Advance',
  party_advance: 'Advance Received',
  party_settlement: 'Settlement',
  party_writeoff: 'Write-off',
  staff_payment: 'Staff Payment',
  oil_change: 'Oil Change',
  emi_payment: 'EMI Payment',
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  id,
  label,
  value,
  sub,
  icon: Icon,
  valueClass = 'text-card-foreground',
  iconClass = 'text-primary',
}: {
  id: string
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  valueClass?: string
  iconClass?: string
}) {
  return (
    <div id={id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
          <Icon className={cn('w-4 h-4', iconClass)} />
        </div>
      </div>
      <div>
        <p className={cn('text-2xl font-bold leading-tight', valueClass)}>{value}</p>
        {sub && <p className="text-xs mt-0.5 text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ── Print hint ────────────────────────────────────────────────────────────────

function PrintHint() {
  return (
    <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground/70">
      <Printer className="w-3.5 h-3.5" />
      <span>Use Ctrl+P / browser print to save or export this report.</span>
    </div>
  )
}

// ── P&L Panel ─────────────────────────────────────────────────────────────────

type MonthRow = ReportsClientProps['monthlyBreakdown'][number]

function PLPanel({
  totalRevenue,
  totalExpenses,
  totalSalaryPaid,
  totalCompanyBatha,
  monthlyBreakdown,
}: {
  totalRevenue: number
  totalExpenses: number
  totalSalaryPaid: number
  totalCompanyBatha: number
  monthlyBreakdown: MonthRow[]
}) {
  const totalOutgoing = totalExpenses + totalSalaryPaid + totalCompanyBatha
  const netProfit = totalRevenue - totalOutgoing

  const columns: ColumnDef<MonthRow>[] = [
    {
      accessorKey: 'month',
      header: 'Month',
      cell: ({ getValue }) => (
        <span className="font-medium text-foreground">{formatMonth(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-chart-1">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'expenses',
      header: 'Expenses',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-destructive">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'salaryPaid',
      header: 'Net Staff Pay',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-orange-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'companyBatha',
      header: 'Batha',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-violet-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      id: 'profit',
      header: 'Net Profit',
      cell: ({ row }) => {
        const r = row.original
        const profit =
          r.revenue - r.expenses - r.salaryPaid - r.companyBatha
        return (
          <span className={cn('text-sm font-bold', profit >= 0 ? 'text-chart-2' : 'text-destructive')}>
            {formatINR(profit)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      {/* Stat cards — row 1: revenue & outgoings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          id="pl-revenue"
          label="Revenue"
          value={formatINR(totalRevenue)}
          sub="jobs billed"
          icon={TrendingUp}
          iconClass="text-chart-1"
          valueClass="text-chart-1"
        />
        <StatCard
          id="pl-expenses"
          label="Expenses"
          value={formatINR(totalExpenses)}
          sub="costs logged"
          icon={TrendingDown}
          iconClass="text-destructive"
          valueClass="text-destructive"
        />
        <StatCard
          id="pl-salary"
          label="Net Staff Pay"
          value={formatINR(totalSalaryPaid)}
          sub="salary + batha − advances"
          icon={Wallet}
          iconClass="text-orange-500"
          valueClass="text-orange-500"
        />
        <StatCard
          id="pl-batha"
          label="Company Batha"
          value={formatINR(totalCompanyBatha)}
          sub="paid by company"
          icon={BadgeDollarSign}
          iconClass="text-violet-500"
          valueClass="text-violet-500"
        />
        <StatCard
          id="pl-profit"
          label="Net Profit"
          value={formatINR(netProfit)}
          sub={netProfit >= 0 ? 'profit' : 'loss'}
          icon={DollarSign}
          iconClass={netProfit >= 0 ? 'text-chart-2' : 'text-destructive'}
          valueClass={netProfit >= 0 ? 'text-chart-2' : 'text-destructive'}
        />
      </div>

      {/* Monthly breakdown */}
      {monthlyBreakdown.length === 0 ? (
        <EmptyState
          icon={FileBarChart2}
          title="No data for this period"
          description="No jobs or expenses were found in the selected date range."
        />
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Monthly Breakdown
            </p>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {monthlyBreakdown.map((row) => {
                const profit =
                  row.revenue - row.expenses - row.salaryPaid - row.companyBatha
                return (
                  <div
                    key={row.month}
                    className="rounded-2xl border border-border bg-card p-4"
                  >
                    <p className="font-semibold text-sm text-card-foreground mb-3">
                      {formatMonth(row.month)}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
                        <p className="text-sm font-semibold text-chart-1">{formatINR(row.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expenses</p>
                        <p className="text-sm font-semibold text-destructive">{formatINR(row.expenses)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net Staff Pay</p>
                        <p className="text-sm font-semibold text-orange-500">{formatINR(row.salaryPaid)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Batha</p>
                        <p className="text-sm font-semibold text-violet-500">{formatINR(row.companyBatha)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net</p>
                        <p className={cn('text-sm font-bold', profit >= 0 ? 'text-chart-2' : 'text-destructive')}>
                          {formatINR(profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop: data table */}
            <div className="hidden md:block">
              <DataTable columns={columns} data={monthlyBreakdown} />
            </div>
          </div>

          {/* Total footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">
              {monthlyBreakdown.length} month{monthlyBreakdown.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-muted-foreground">
                Outgoing: <span className="font-semibold text-destructive">{formatINR(totalOutgoing)}</span>
              </span>
              <span className={cn('font-bold text-lg', netProfit >= 0 ? 'text-chart-2' : 'text-destructive')}>
                Net: {formatINR(netProfit)}
              </span>
            </div>
          </div>
        </>
      )}

      <PrintHint />
    </div>
  )
}

// ── Party Ledger Panel ────────────────────────────────────────────────────────

type LedgerEntry = ReportsClientProps['ledgerEntries'][number]

function PartyLedgerPanel({
  ledgerEntries,
  openingBalance,
  parties,
  currentPartyId,
  onPartyChange,
}: {
  ledgerEntries: LedgerEntry[]
  openingBalance: number
  parties: { id: string; name: string }[]
  currentPartyId: string
  onPartyChange: (partyId: string) => void
}) {
  const totalDebits = ledgerEntries
    .filter((e) => e.entryType === 'debit')
    .reduce((s, e) => s + e.amount, 0)
  const totalCredits = ledgerEntries
    .filter((e) => e.entryType === 'credit')
    .reduce((s, e) => s + e.amount, 0)
  const closingBalance =
    ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].runningBalance : openingBalance

  const columns: ColumnDef<LedgerEntry>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(String(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium text-foreground">
          {LEDGER_TYPE_LABEL[String(getValue())] ?? String(getValue())}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v ? (
          <span className="text-sm text-muted-foreground max-w-[200px] truncate block">{v}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      },
    },
    {
      id: 'debit',
      header: 'Debit',
      cell: ({ row }) =>
        row.original.entryType === 'debit' ? (
          <span className="text-sm font-semibold text-chart-1">{formatINR(row.original.amount)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      id: 'credit',
      header: 'Credit',
      cell: ({ row }) =>
        row.original.entryType === 'credit' ? (
          <span className="text-sm font-semibold text-chart-2">{formatINR(row.original.amount)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: 'runningBalance',
      header: 'Balance',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return (
          <span className={cn('text-sm font-bold', v > 0 ? 'text-chart-1' : v < 0 ? 'text-chart-2' : 'text-muted-foreground')}>
            {formatINR(v)}
          </span>
        )
      },
    },
  ]

  const partySelector = (
    <Select
      value={currentPartyId || '_none'}
      onValueChange={(v) => onPartyChange(v === '_none' ? '' : v)}
    >
      <SelectTrigger className="w-52" id="party-select">
        <SelectValue placeholder="Select a party…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Select a party…</SelectItem>
        {parties.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (!currentPartyId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{partySelector}</div>
        <EmptyState
          icon={BookOpen}
          title="Select a party"
          description="Choose a party from the dropdown above to view their account statement."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">{partySelector}</div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          id="ledger-debits"
          label="Total Billed"
          value={formatINR(totalDebits)}
          sub="debits"
          icon={TrendingUp}
          iconClass="text-chart-1"
          valueClass="text-chart-1"
        />
        <StatCard
          id="ledger-credits"
          label="Total Received"
          value={formatINR(totalCredits)}
          sub="credits"
          icon={TrendingDown}
          iconClass="text-chart-2"
          valueClass="text-chart-2"
        />
        <StatCard
          id="ledger-balance"
          label="Closing Balance"
          value={formatINR(closingBalance)}
          sub={closingBalance > 0 ? 'outstanding' : closingBalance < 0 ? 'overpaid' : 'settled'}
          icon={DollarSign}
          iconClass={closingBalance > 0 ? 'text-destructive' : 'text-chart-2'}
          valueClass={closingBalance > 0 ? 'text-destructive' : closingBalance < 0 ? 'text-chart-2' : 'text-muted-foreground'}
        />
        <StatCard
          id="ledger-count"
          label="Transactions"
          value={ledgerEntries.length.toString()}
          sub="in period"
          icon={FileBarChart2}
          iconClass="text-primary"
        />
      </div>

      {/* Ledger table */}
      {ledgerEntries.length === 0 && openingBalance === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No transactions"
          description="No ledger entries found for this party in the selected date range."
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening Balance</p>
                <p className="text-[10px] text-muted-foreground">
                  Before{' '}
                  {new Date(ledgerEntries[0]?.date ?? new Date()).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className={cn('text-sm font-bold', openingBalance > 0 ? 'text-chart-1' : openingBalance < 0 ? 'text-chart-2' : 'text-muted-foreground')}>
                {formatINR(openingBalance)}
              </span>
            </div>

            {ledgerEntries.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-card-foreground">
                      {LEDGER_TYPE_LABEL[e.type] ?? e.type}
                    </p>
                    {e.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0 ml-2">
                    {formatDate(e.date)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className={cn('text-sm font-semibold', e.entryType === 'debit' ? 'text-chart-1' : 'text-chart-2')}>
                    {e.entryType === 'debit' ? 'Dr' : 'Cr'} {formatINR(e.amount)}
                  </span>
                  <span className={cn('text-sm font-bold', e.runningBalance > 0 ? 'text-destructive' : 'text-chart-2')}>
                    Bal: {formatINR(e.runningBalance)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <div className="rounded-t-xl border border-b-0 border-border bg-muted/40 px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Opening Balance (brought forward)</span>
              <span className={cn('text-sm font-bold', openingBalance > 0 ? 'text-chart-1' : openingBalance < 0 ? 'text-chart-2' : 'text-muted-foreground')}>
                {formatINR(openingBalance)}
              </span>
            </div>
            <DataTable columns={columns} data={ledgerEntries} className="rounded-t-none" />
          </div>

          {/* Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {ledgerEntries.length} transactions
            </span>
            <span className={cn('font-bold text-lg', closingBalance > 0 ? 'text-destructive' : 'text-chart-2')}>
              Balance: {formatINR(closingBalance)}
            </span>
          </div>
        </>
      )}

      <PrintHint />
    </div>
  )
}

// ── Machine Summary Panel ─────────────────────────────────────────────────────

type MachineRow = ReportsClientProps['machineSummary'][number]

function MachineSummaryPanel({ machineSummary }: { machineSummary: MachineRow[] }) {
  const totalRevenue = machineSummary.reduce((s, m) => s + m.totalRevenue, 0)
  const totalExpenses = machineSummary.reduce((s, m) => s + m.totalExpenses, 0)

  const columns: ColumnDef<MachineRow>[] = [
    {
      accessorKey: 'machineName',
      header: 'Machine',
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'jobCount',
      header: 'Jobs',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{Number(getValue())}</span>
      ),
    },
    {
      accessorKey: 'totalQty',
      header: 'Qty',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {Number(getValue()).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      accessorKey: 'totalRevenue',
      header: 'Revenue',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-chart-1">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      accessorKey: 'totalExpenses',
      header: 'Expenses',
      cell: ({ getValue }) => (
        <span className="text-sm font-semibold text-destructive">{formatINR(Number(getValue()))}</span>
      ),
    },
    {
      id: 'net',
      header: 'Net',
      cell: ({ row }) => {
        const net = row.original.totalRevenue - row.original.totalExpenses
        return (
          <span className={cn('text-sm font-bold', net >= 0 ? 'text-chart-2' : 'text-destructive')}>
            {formatINR(net)}
          </span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          id="machine-revenue"
          label="Total Revenue"
          value={formatINR(totalRevenue)}
          sub="all machines"
          icon={TrendingUp}
          iconClass="text-chart-1"
          valueClass="text-chart-1"
        />
        <StatCard
          id="machine-expenses"
          label="Total Expenses"
          value={formatINR(totalExpenses)}
          sub="against machines"
          icon={TrendingDown}
          iconClass="text-destructive"
          valueClass="text-destructive"
        />
        <StatCard
          id="machine-net"
          label="Net Contribution"
          value={formatINR(totalRevenue - totalExpenses)}
          sub="revenue minus costs"
          icon={DollarSign}
          iconClass={totalRevenue - totalExpenses >= 0 ? 'text-chart-2' : 'text-destructive'}
          valueClass={totalRevenue - totalExpenses >= 0 ? 'text-chart-2' : 'text-destructive'}
        />
      </div>

      {machineSummary.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No machine data"
          description="No jobs were logged for any machine in the selected date range."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {machineSummary.map((m) => {
              const net = m.totalRevenue - m.totalExpenses
              return (
                <div key={m.machineId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <p className="font-semibold text-sm text-card-foreground">{m.machineName}</p>
                    <span className="text-xs text-muted-foreground">{m.jobCount} jobs</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Revenue</p>
                      <p className="text-sm font-semibold text-chart-1">{formatINR(m.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Expenses</p>
                      <p className="text-sm font-semibold text-destructive">{formatINR(m.totalExpenses)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net</p>
                      <p className={cn('text-sm font-bold', net >= 0 ? 'text-chart-2' : 'text-destructive')}>
                        {formatINR(net)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden md:block">
            <DataTable columns={columns} data={machineSummary} />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {machineSummary.length} machine{machineSummary.length !== 1 ? 's' : ''}
            </span>
            <span className={cn('font-bold text-lg', totalRevenue - totalExpenses >= 0 ? 'text-chart-2' : 'text-destructive')}>
              Net: {formatINR(totalRevenue - totalExpenses)}
            </span>
          </div>
        </>
      )}

      <PrintHint />
    </div>
  )
}

// ── Staff Summary Panel ───────────────────────────────────────────────────────

type StaffRow = ReportsClientProps['staffSummary'][number]

function StaffSummaryPanel({ staffSummary }: { staffSummary: StaffRow[] }) {
  const totalSalary = staffSummary.reduce((s, r) => s + r.salary, 0)
  const totalCompanyBatha = staffSummary.reduce((s, r) => s + r.companyBatha, 0)
  const totalAdvancesGiven = staffSummary.reduce((s, r) => s + r.advancesGiven, 0)
  const totalNetPaid = staffSummary.reduce((s, r) => s + r.netPaid, 0)

  const columns: ColumnDef<StaffRow>[] = [
    {
      accessorKey: 'staffName',
      header: 'Operator',
      cell: ({ getValue }) => (
        <span className="font-semibold text-foreground">{String(getValue())}</span>
      ),
    },
    {
      accessorKey: 'jobCount',
      header: 'Jobs',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{Number(getValue())}</span>
      ),
    },
    {
      accessorKey: 'partyBatha',
      header: 'Party Batha',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-medium text-muted-foreground">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'companyBatha',
      header: 'Co. Batha',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-violet-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'salary',
      header: 'Salary',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-orange-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'bathaSettled',
      header: 'Batha Settled',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-chart-5">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: 'advancesGiven',
      header: 'Advances Given',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-semibold text-yellow-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },

    {
      accessorKey: 'netPaid',
      header: 'Net Paid',
      cell: ({ getValue }) => {
        const v = Number(getValue())
        return v > 0 ? (
          <span className="text-sm font-bold text-red-500">{formatINR(v)}</span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          id="staff-salary"
          label="Total Salary"
          value={formatINR(totalSalary)}
          sub="salary after deductions"
          icon={Wallet}
          iconClass="text-orange-500"
          valueClass="text-orange-500"
        />
        <StatCard
          id="staff-co-batha"
          label="Company Batha"
          value={formatINR(totalCompanyBatha)}
          sub="paid by company"
          icon={BadgeDollarSign}
          iconClass="text-violet-500"
          valueClass="text-violet-500"
        />
        <StatCard
          id="staff-advances-given"
          label="Advances Given"
          value={formatINR(totalAdvancesGiven)}
          sub="salary advances"
          icon={ArrowDownLeft}
          iconClass="text-yellow-500"
          valueClass="text-yellow-500"
        />
        <StatCard
          id="staff-net"
          label="Total Net Paid"
          value={formatINR(totalNetPaid)}
          sub="cash paid out"
          icon={DollarSign}
          iconClass="text-red-500"
          valueClass="text-red-500"
        />
      </div>

      {staffSummary.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff data"
          description="No jobs, payments, or advances found for any staff in the selected date range."
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {staffSummary.map((s) => (
              <div key={s.staffId} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-sm text-card-foreground">{s.staffName}</p>
                  <span className="text-xs text-muted-foreground">{s.jobCount} jobs</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Party Batha</p>
                    <p className="text-sm font-medium text-muted-foreground">
                      {s.partyBatha > 0 ? formatINR(s.partyBatha) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Co. Batha</p>
                    <p className="text-sm font-semibold text-violet-500">
                      {s.companyBatha > 0 ? formatINR(s.companyBatha) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Salary</p>
                    <p className="text-sm font-semibold text-orange-500">
                      {s.salary > 0 ? formatINR(s.salary) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Batha Settled</p>
                    <p className="text-sm font-semibold text-chart-5">
                      {s.bathaSettled > 0 ? formatINR(s.bathaSettled) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Advances Given</p>
                    <p className="text-sm font-semibold text-yellow-500">
                      {s.advancesGiven > 0 ? formatINR(s.advancesGiven) : '—'}
                    </p>
                  </div>

                  <div className="col-span-2 pt-1 border-t border-border mt-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Net Paid</p>
                    <p className="text-sm font-bold text-red-500">
                      {s.netPaid > 0 ? formatINR(s.netPaid) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <DataTable columns={columns} data={staffSummary} />
          </div>

          {/* Footer */}
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">
              {staffSummary.length} staff member{staffSummary.length !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">
                Advances out: <span className="font-semibold text-yellow-500">{formatINR(totalAdvancesGiven)}</span>
              </span>
              <span className="font-bold text-lg text-red-500">{formatINR(totalNetPaid)} net paid</span>
            </div>
          </div>
        </>
      )}

      <PrintHint />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReportsClient({
  totalRevenue,
  totalExpenses,
  totalSalaryPaid,
  totalCompanyBatha,
  monthlyBreakdown,
  ledgerEntries,
  openingBalance,
  machineSummary,
  staffSummary,
  parties,
  currentReport,
  currentFrom,
  currentTo,
  currentPartyId,
  defaultFrom,
  defaultTo,
}: ReportsClientProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [from, setFrom] = React.useState(currentFrom || defaultFrom)
  const [to, setTo] = React.useState(currentTo || defaultTo)

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = {
      report: currentReport,
      from,
      to,
      partyId: currentPartyId,
      ...overrides,
    }
    if (vals.report && vals.report !== 'pl') params.set('report', vals.report)
    if (vals.from) params.set('from', vals.from)
    if (vals.to) params.set('to', vals.to)
    if (vals.partyId) params.set('partyId', vals.partyId)
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function switchTab(tabId: string) {
    router.push(buildUrl({ report: tabId }))
  }

  function applyDates(newFrom: string, newTo: string) {
    router.push(buildUrl({ from: newFrom, to: newTo }))
  }

  function handlePartyChange(partyId: string) {
    router.push(buildUrl({ partyId }))
  }

  function clearDates() {
    setFrom(defaultFrom)
    setTo(defaultTo)
    router.push(buildUrl({ from: defaultFrom, to: defaultTo }))
  }

  const hasCustomDates = currentFrom !== defaultFrom || currentTo !== defaultTo

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Financial and operational reports — P&L, party ledgers, machine summaries, staff payments."
      />

      {/* ── Tab strip ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit flex-wrap">
        {REPORT_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => switchTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap',
              currentReport === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          id="filter-from"
          type="date"
          className="w-36 h-9"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value)
            applyDates(e.target.value, to)
          }}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          id="filter-to"
          type="date"
          className="w-36 h-9"
          value={to}
          onChange={(e) => {
            setTo(e.target.value)
            applyDates(from, e.target.value)
          }}
        />
        {hasCustomDates && (
          <Button
            id="filter-clear-btn"
            variant="ghost"
            size="sm"
            onClick={clearDates}
            className="text-muted-foreground gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Reset dates
          </Button>
        )}
      </div>

      {/* ── Report content ──────────────────────────────────────────────────── */}
      {currentReport === 'pl' && (
        <PLPanel
          totalRevenue={totalRevenue}
          totalExpenses={totalExpenses}
          totalSalaryPaid={totalSalaryPaid}
          totalCompanyBatha={totalCompanyBatha}
          monthlyBreakdown={monthlyBreakdown}
        />
      )}

      {currentReport === 'party' && (
        <PartyLedgerPanel
          ledgerEntries={ledgerEntries}
          openingBalance={openingBalance}
          parties={parties}
          currentPartyId={currentPartyId}
          onPartyChange={handlePartyChange}
        />
      )}

      {currentReport === 'machine' && (
        <MachineSummaryPanel machineSummary={machineSummary} />
      )}

      {currentReport === 'staff' && (
        <StaffSummaryPanel staffSummary={staffSummary} />
      )}
    </div>
  )
}
