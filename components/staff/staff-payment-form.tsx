'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/utils'

const paymentSchema = z.object({
  periodFrom: z.string().min(1, 'Period from is required'),
  periodTo: z.string().min(1, 'Period to is required'),
  daysWorked: z.coerce.number().int().min(0, 'Days worked must be ≥ 0'),
  bathaTotal: z.coerce.number().min(0).default(0),
  salary: z.coerce.number().positive('Salary must be positive'),
  advancesDeducted: z.coerce.number().min(0).default(0),
  netPaid: z.coerce.number().min(0, 'Net paid must be ≥ 0'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

type AccountOption = { id: string; name: string; type: string }

type StaffPaymentFormProps = {
  staffId: string
  advanceBalance: number
  baseSalary?: number
  accounts: AccountOption[]
}

export function StaffPaymentForm({
  staffId,
  advanceBalance,
  baseSalary,
  accounts,
}: StaffPaymentFormProps) {
  const router = useRouter()
  const [suggestLoading, setSuggestLoading] = React.useState(false)
  const [suggestInfo, setSuggestInfo] = React.useState<string | null>(null)

  const form = useForm<PaymentFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      periodFrom: '',
      periodTo: '',
      daysWorked: 0,
      bathaTotal: 0,
      salary: baseSalary ?? undefined,
      advancesDeducted: advanceBalance,
      netPaid: 0,
      accountId: '',
      notes: '',
    },
  })

  // Auto-fetch batha + advance suggestion when both period dates are set
  const watchedFrom = form.watch('periodFrom')
  const watchedTo = form.watch('periodTo')

  React.useEffect(() => {
    if (!watchedFrom || !watchedTo || watchedFrom > watchedTo) return

    let cancelled = false
    setSuggestLoading(true)
    setSuggestInfo(null)

    fetch(`/api/staff/${staffId}/payments?from=${watchedFrom}&to=${watchedTo}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          bathaTotal: number
          advancesDeducted: number
          jobCount: number
        } | null) => {
          if (!data || cancelled) return
          form.setValue('bathaTotal', data.bathaTotal)
          form.setValue('advancesDeducted', data.advancesDeducted)
          form.setValue('daysWorked', data.jobCount)
          setSuggestInfo(
            `${data.jobCount} job day(s) found — batha auto-filled from job records`,
          )
        },
      )
      .finally(() => {
        if (!cancelled) setSuggestLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [watchedFrom, watchedTo, staffId, form])

  // Auto-compute netPaid = salary + bathaTotal − advancesDeducted
  const watchedSalary = form.watch('salary')
  const watchedBatha = form.watch('bathaTotal')
  const watchedDeducted = form.watch('advancesDeducted')

  React.useEffect(() => {
    const s = Number(watchedSalary) || 0
    const b = Number(watchedBatha) || 0
    const d = Number(watchedDeducted) || 0
    form.setValue('netPaid', Math.max(0, s + b - d))
  }, [watchedSalary, watchedBatha, watchedDeducted, form])

  async function onSubmit(values: PaymentFormValues) {
    if (values.periodFrom > values.periodTo) {
      form.setError('periodTo', {
        message: 'Period end must be after period start',
      })
      return
    }

    const res = await fetch(`/api/staff/${staffId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      form.setError('root', {
        message: data.error ?? 'Something went wrong',
      })
      return
    }

    router.push(`/dashboard/staff/${staffId}`)
    router.refresh()
  }

  const { isSubmitting, errors } = form.formState
  const watchedNetPaid = form.watch('netPaid')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* ── Left Column (Inputs) ───────────────────────────── */}
          <div className="lg:col-span-7 space-y-6">
            {/* ── Period ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Pay Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="periodFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      From <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="periodTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      To <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-suggest status */}
            {(suggestLoading || suggestInfo) && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                {suggestLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching job records for this period…
                  </>
                ) : (
                  <>
                    <Info className="h-4 w-4 text-primary" />
                    {suggestInfo}
                  </>
                )}
              </p>
            )}

            <FormField
              control={form.control}
              name="daysWorked"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>
                    Days Worked <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* ── Earnings ───────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Base Salary (₹) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    {baseSalary && (
                      <p className="text-xs text-muted-foreground">
                        Pre-filled from staff profile (₹{baseSalary.toLocaleString('en-IN')})
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathaTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batha Total (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        {...field}
                        value={field.value ?? 0}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Auto-filled from job records in the period
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Deductions ─────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Deductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="advancesDeducted"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Advances Deducted (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Pre-filled from current advance balance
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
          </div>

          {/* ── Right Column (Summary & Payment) ──────────────── */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* ── Summary / Payment ──────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Live summary card */}
            <div className="rounded-xl border border-border bg-muted/40 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Salary</p>
                <p className="font-semibold text-foreground">
                  {formatINR(Number(watchedSalary) || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">+ Batha</p>
                <p className="font-semibold text-foreground">
                  {formatINR(Number(watchedBatha) || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">
                  − Advances
                </p>
                <p className="font-semibold text-destructive">
                  {formatINR(Number(watchedDeducted) || 0)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">= Net Paid</p>
                <p className="text-xl font-bold text-foreground">
                  {formatINR(watchedNetPaid ?? 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="netPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Net Paid (₹) <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="0"
                        {...field}
                        value={field.value ?? 0}
                        className="font-semibold"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Auto-computed — edit to override
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Paid From Account <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger id="payment-account-select">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            No accounts available
                          </SelectItem>
                        ) : (
                          accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}{' '}
                              <span className="text-muted-foreground text-xs capitalize">
                                ({a.type})
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {errors.root && (
          <p className="text-sm text-destructive font-medium px-1">{errors.root.message}</p>
        )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || accounts.length === 0}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
