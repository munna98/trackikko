'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Banknote, Receipt, Plus, Settings, Check, Loader2, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SalaryAdvanceDialog } from '@/components/staff/salary-advance-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  pendingBathaTotal: number
  pendingBathaCount: number
  // Tab data
  advances: SalaryAdvanceRow[]
  payments: StaffPaymentRow[]
  accounts: AccountOption[]
  machines: { id: string; name: string }[]
  sites: { id: string; name: string }[]
  defaultMachineId: string | null
  defaultSiteId: string | null
  defaultAccountId: string | null
}

export function StaffTabs({
  staffId,
  isAdmin,
  advanceBalance,
  daysWorkedThisMonth,
  bathaThisMonth,
  pendingBathaTotal,
  pendingBathaCount,
  advances,
  payments,
  accounts,
  machines,
  sites,
  defaultMachineId,
  defaultSiteId,
  defaultAccountId,
}: StaffTabsProps) {
  const router = useRouter()
  const [selectedMachineId, setSelectedMachineId] = React.useState<string>(defaultMachineId || 'none')
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>(defaultSiteId || 'none')
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(defaultAccountId || 'none')
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Sync state if props change
  React.useEffect(() => {
    setSelectedMachineId(defaultMachineId || 'none')
    setSelectedSiteId(defaultSiteId || 'none')
    setSelectedAccountId(defaultAccountId || 'none')
  }, [defaultMachineId, defaultSiteId, defaultAccountId])

  async function handleSaveDefaults() {
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError(null)
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultMachineId: selectedMachineId === 'none' ? null : selectedMachineId,
          defaultSiteId: selectedSiteId === 'none' ? null : selectedSiteId,
          defaultAccountId: selectedAccountId === 'none' ? null : selectedAccountId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save defaults')
      }

      setSaveSuccess(true)
      router.refresh()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

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
        <TabsTrigger value="defaults" className="flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5" />
          Defaults
        </TabsTrigger>
      </TabsList>

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

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Batha Earned (Month)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-foreground">
                {formatINR(bathaThisMonth)}
              </p>
              <p className="text-xs text-muted-foreground">earned this month</p>
            </CardContent>
          </Card>

          <Card
            className={
              pendingBathaTotal > 0
                ? 'border-orange-200 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10'
                : ''
            }
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                Total Pending Batha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-bold ${
                  pendingBathaTotal > 0
                    ? 'text-orange-700 dark:text-orange-400'
                    : 'text-foreground'
                }`}
              >
                {formatINR(pendingBathaTotal)}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingBathaCount} unpaid job{pendingBathaCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>
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
        <PaymentsTab
          staffId={staffId}
          isAdmin={isAdmin}
          payments={payments}
        />
      </TabsContent>

      {/* ── Defaults ─────────────────────────────────────────── */}
      <TabsContent value="defaults">
        <Card className="max-w-2xl border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Default Job Settings
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Configure default options for this staff member. 
            </p>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="space-y-4">
              {/* Default Machine Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Default Machine</label>
                <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a default machine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className=" text-muted-foreground italic">
                      — No Default Machine —
                    </SelectItem>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id} >
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  The primary machine operated by this staff member.
                </p>
              </div>

              {/* Default Site Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Default Site</label>
                <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a default site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className=" text-muted-foreground italic">
                      — No Default Site —
                    </SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  The primary work site assigned to this staff member.
                </p>
              </div>

              {/* Default Account Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Default Account</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a default account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className=" text-muted-foreground italic">
                      — No Default Account —
                    </SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} className="">
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  The primary account for this staff member's expenses and advances.
                </p>
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
                ⚠️ {saveError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveDefaults}
                disabled={isSaving}
                className="font-semibold px-6 transition-all"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4 stroke-[3px]" />
                    Saved!
                  </>
                ) : (
                  'Save Defaults'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

// ── PaymentsTab ────────────────────────────────────────────────────────────────
type PaymentsTabProps = {
  staffId: string
  isAdmin: boolean
  payments: StaffPaymentRow[]
}

function PaymentsTab({ staffId, isAdmin, payments }: PaymentsTabProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [confirmId, setConfirmId] = React.useState<string | null>(null)

  async function handleDelete(paymentId: string) {
    setDeletingId(paymentId)
    try {
      const res = await fetch(`/api/staff/${staffId}/payments/${paymentId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
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
                {isAdmin && (
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => (
                <React.Fragment key={p.id}>
                  <tr className="bg-card hover:bg-muted/30 transition-colors">
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
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link href={`/dashboard/staff/${staffId}/edit-payment/${p.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit payment</span>
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setConfirmId(p.id)}
                            disabled={deletingId === p.id}
                          >
                            {deletingId === p.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            <span className="sr-only">Delete payment</span>
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {/* Inline delete confirmation row */}
                  {confirmId === p.id && (
                    <tr className="bg-destructive/5 border-t border-destructive/20">
                      <td colSpan={isAdmin ? 8 : 7} className="px-4 py-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                          <span className="text-sm font-medium text-destructive">
                            Delete this payment? This will reverse the account balance and restore advance deductions.
                          </span>
                          <div className="flex gap-2 ml-auto">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmId(null)}
                              disabled={!!deletingId}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(p.id)}
                              disabled={!!deletingId}
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              ) : null}
                              Yes, Delete
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
                {isAdmin && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
