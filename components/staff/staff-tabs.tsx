'use client'

import * as React from 'react'
import Link from 'next/link'
import { Banknote, Receipt, Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SalaryAdvanceDialog } from '@/components/staff/salary-advance-dialog'
import { Button } from '@/components/ui/button'
import { formatINR, formatDate } from '@/lib/utils'

type AccountOption = { id: string; name: string; type: string }

type SalaryAdvanceRow = {
  id: string
  date: string
  amount: number
  accountName: string
  notes: string | null
}

type StaffPaymentRow = {
  id: string
  periodFrom: string
  periodTo: string
  daysWorked: number
  bathaTotal: number
  salary: number
  advancesDeducted: number
  netPaid: number
  accountName: string
  notes: string | null
}

type StaffTabsProps = {
  staffId: string
  isAdmin: boolean
  // Overview stat data (serialised from server)
  advanceBalance: number
  daysWorkedThisMonth: number
  bathaThisMonth: number
  // Tab data
  advances: SalaryAdvanceRow[]
  payments: StaffPaymentRow[]
  accounts: AccountOption[]
}

export function StaffTabs({
  staffId,
  isAdmin,
  advanceBalance,
  daysWorkedThisMonth,
  bathaThisMonth,
  advances,
  payments,
  accounts,
}: StaffTabsProps) {
  return (
    <Tabs defaultValue="overview" className="flex-col">
      <TabsList className="w-full h-auto flex-wrap justify-start gap-0.5 p-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="advances">
          Advances
          {advances.length > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {advances.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="payments">
          Payments
          {payments.length > 0 && (
            <span className="ml-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 leading-none">
              {payments.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Overview ─────────────────────────────────────────── */}
      <TabsContent value="overview">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card
            className={
              advanceBalance > 0
                ? 'border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10'
                : ''
            }
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Advance Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-bold ${
                  advanceBalance > 0
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-foreground'
                }`}
              >
                {formatINR(advanceBalance)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Days Worked (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">{daysWorkedThisMonth}</p>
              <p className="text-xs text-muted-foreground">jobs this month</p>
            </CardContent>
          </Card>
        </div>

        {bathaThisMonth > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Batha Earned This Month</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {formatINR(bathaThisMonth)}
            </p>
          </div>
        )}
      </TabsContent>

      {/* ── Advances ─────────────────────────────────────────── */}
      <TabsContent value="advances">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <SalaryAdvanceDialog staffId={staffId} accounts={accounts} />
            </div>
          )}

          {advances.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No advances recorded"
              description="Salary advances paid to this staff member will appear here."
              action={
                isAdmin ? (
                  <SalaryAdvanceDialog staffId={staffId} accounts={accounts} />
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Account
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {advances.map((a) => (
                    <tr
                      key={a.id}
                      className="bg-card hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(a.date)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-700 dark:text-amber-400">
                        {formatINR(a.amount)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {a.accountName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                        {a.notes ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      Total ({advances.length})
                    </td>
                    <td className="px-4 py-2.5 font-bold text-amber-700 dark:text-amber-400">
                      {formatINR(advances.reduce((s, a) => s + a.amount, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Payments ─────────────────────────────────────────── */}
      <TabsContent value="payments">
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" asChild>
                <Link href={`/dashboard/staff/${staffId}/record-payment`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Link>
              </Button>
            </div>
          )}

          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments recorded"
              description="Salary payments made to this staff member will appear here."
              action={
                isAdmin ? (
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/staff/${staffId}/record-payment`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Record Payment
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Period
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Days
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Salary
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                      Batha
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                      Adv. Ded.
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Net Paid
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                      Account
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="bg-card hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.periodFrom)}{' '}
                        <span className="text-xs">→</span>{' '}
                        {formatDate(p.periodTo)}
                      </td>
                      <td className="px-4 py-3 text-foreground">{p.daysWorked}</td>
                      <td className="px-4 py-3 text-foreground hidden sm:table-cell">
                        {formatINR(p.salary)}
                      </td>
                      <td className="px-4 py-3 text-foreground hidden sm:table-cell">
                        {p.bathaTotal > 0 ? formatINR(p.bathaTotal) : '—'}
                      </td>
                      <td className="px-4 py-3 text-destructive hidden md:table-cell">
                        {p.advancesDeducted > 0
                          ? `−${formatINR(p.advancesDeducted)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatINR(p.netPaid)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {p.accountName}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border bg-muted/30">
                  <tr>
                    <td className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      Total ({payments.length})
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {payments.reduce((s, p) => s + p.daysWorked, 0)} days
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground hidden sm:table-cell">
                      {formatINR(payments.reduce((s, p) => s + p.salary, 0))}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground hidden sm:table-cell">
                      {formatINR(payments.reduce((s, p) => s + p.bathaTotal, 0))}
                    </td>
                    <td className="px-4 py-2.5 text-destructive font-medium hidden md:table-cell">
                      {formatINR(payments.reduce((s, p) => s + p.advancesDeducted, 0))}
                    </td>
                    <td className="px-4 py-2.5 font-bold text-foreground">
                      {formatINR(payments.reduce((s, p) => s + p.netPaid, 0))}
                    </td>
                    <td className="hidden lg:table-cell" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
