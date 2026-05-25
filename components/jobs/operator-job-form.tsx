'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatINR } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerialMachine = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
}

export type SerialSite = {
  id: string
  name: string
  partyId: string
  partyName: string
  batha: number
}

export type SerialRateCard = {
  machineId: string
  partyId: string
  siteId: string | null
  mode: 'bucket' | 'breaking' | null
  rateType: 'per_hour' | 'per_trip'
  rate: number
}

// ── Rate card lookup (client-side) ───────────────────────────────────────────

export function findRateCard(
  rateCards: SerialRateCard[],
  machineId: string,
  partyId: string,
  siteId: string,
  mode: 'bucket' | 'breaking' | null
): SerialRateCard | null {
  const candidates = rateCards.filter(
    (rc) => rc.machineId === machineId && rc.partyId === partyId
  )
  const priorities = [
    (c: SerialRateCard) => c.siteId === siteId && c.mode === mode,
    (c: SerialRateCard) => c.siteId === null && c.mode === mode,
    (c: SerialRateCard) => c.siteId === siteId && c.mode === null,
    (c: SerialRateCard) => c.siteId === null && c.mode === null,
  ]
  for (const p of priorities) {
    const found = candidates.find(p)
    if (found) return found
  }
  return null
}

// ── Zod Schema ────────────────────────────────────────────────────────────────

export const operatorJobSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    machineId: z.string().min(1, 'Select a machine'),
    mode: z.enum(['bucket', 'breaking']).optional().nullable(),
    siteId: z.string().min(1, 'Select a site'),
    startReading: z.coerce.number().optional().nullable(),
    closingReading: z.coerce.number().optional().nullable(),
    tripCount: z.coerce.number().int().min(0).optional().nullable(),
    actualRate: z.coerce.number().min(0, 'Rate is required'),
    batha: z.coerce.number().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.machineId && data.startReading != null && data.closingReading != null) {
      if (data.closingReading <= data.startReading) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Closing reading must be greater than start reading',
          path: ['closingReading'],
        })
      }
    }
  })

export type OperatorJobFormValues = z.infer<typeof operatorJobSchema>

// ── Step config ───────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3

const STEP_META: Record<Step, { label: string; progress: number }> = {
  1: { label: 'Job Details',  progress: 33  },
  2: { label: 'Work & Rate', progress: 66  },
  3: { label: 'Done!',        progress: 100 },
}

// ── Success card ──────────────────────────────────────────────────────────────

type SuccessInfo = {
  machineName: string
  siteName: string
  partyName: string
  quantity: number
  unit: string
  amount: number
  batha: number
}

function SuccessCard({ info, onReset }: { info: SuccessInfo; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-chart-5/15 flex items-center justify-center ring-4 ring-chart-5/20">
        <CheckCircle2 className="w-10 h-10 text-chart-5" />
      </div>

      {/* Headline */}
      <div className="space-y-1">
        <p className="text-xl font-bold text-foreground">Job Logged!</p>
        <p className="text-sm text-muted-foreground">
          {info.machineName} &middot; {info.partyName}
        </p>
        <p className="text-sm text-muted-foreground">{info.siteName}</p>
      </div>

      {/* Summary pill */}
      <div className="w-full rounded-2xl bg-muted px-5 py-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Quantity</span>
          <span className="font-semibold text-foreground">
            {info.quantity.toLocaleString('en-IN')} {info.unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-lg font-bold text-primary">{formatINR(info.amount)}</span>
        </div>
        {info.batha > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-2 mt-1">
            <span className="text-sm text-muted-foreground">Batha</span>
            <span className="font-medium text-chart-5">+{formatINR(info.batha)}</span>
          </div>
        )}
      </div>

      <Button
        id="log-another-btn"
        className="w-full min-h-[52px] text-base font-semibold"
        onClick={onReset}
      >
        Log Another Job
      </Button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type OperatorJobFormProps = {
  machines: SerialMachine[]
  sites: SerialSite[]
  rateCards: SerialRateCard[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function OperatorJobForm({ machines, sites, rateCards }: OperatorJobFormProps) {
  const [step, setStep] = React.useState<Step>(1)
  const [successInfo, setSuccessInfo] = React.useState<SuccessInfo | null>(null)

  const form = useForm<OperatorJobFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(operatorJobSchema) as any,
    defaultValues: {
      date: today(),
      machineId: '',
      mode: null,
      siteId: '',
      startReading: null,
      closingReading: null,
      tripCount: null,
      actualRate: 0,
      batha: 0,
    },
  })

  const { isSubmitting, errors } = form.formState

  const watchedMachineId = form.watch('machineId')
  const watchedSiteId    = form.watch('siteId')
  const watchedMode      = form.watch('mode')
  const watchedActualRate = form.watch('actualRate')

  const selectedMachine = machines.find((m) => m.id === watchedMachineId)
  const selectedSite    = sites.find((s) => s.id === watchedSiteId)
  const trackingUnit    = selectedMachine?.trackingUnit ?? null
  const hasModes        = selectedMachine?.hasModes ?? false

  // Auto-fill batha from site
  React.useEffect(() => {
    if (selectedSite) form.setValue('batha', selectedSite.batha)
  }, [watchedSiteId, selectedSite, form])

  // Auto-fill rate from rate card
  const rateCard = React.useMemo(() => {
    if (!watchedMachineId || !watchedSiteId || !selectedSite) return null
    return findRateCard(rateCards, watchedMachineId, selectedSite.partyId, watchedSiteId, watchedMode ?? null)
  }, [watchedMachineId, watchedSiteId, watchedMode, selectedSite, rateCards])

  React.useEffect(() => {
    if (rateCard) form.setValue('actualRate', rateCard.rate)
  }, [rateCard, form])

  // Reset mode when machine without modes is selected
  React.useEffect(() => {
    if (!hasModes) form.setValue('mode', null)
  }, [watchedMachineId, hasModes, form])

  // Group sites by party
  const sitesByParty = React.useMemo(() => {
    const grouped = new Map<string, { partyName: string; sites: SerialSite[] }>()
    for (const site of sites) {
      if (!grouped.has(site.partyId)) grouped.set(site.partyId, { partyName: site.partyName, sites: [] })
      grouped.get(site.partyId)!.sites.push(site)
    }
    return Array.from(grouped.values())
  }, [sites])

  // Live estimate
  const quantity =
    trackingUnit === 'trips'
      ? (form.watch('tripCount') ?? 0)
      : Math.max(0, (form.watch('closingReading') ?? 0) - (form.watch('startReading') ?? 0))
  const estimatedAmount = quantity * (watchedActualRate || 0)

  // ── Step navigation ──────────────────────────────────────────────────────────

  async function handleNextStep() {
    // Validate step 1 fields
    const baseFields: (keyof OperatorJobFormValues)[] = ['date', 'machineId', 'siteId']
    const valid = await form.trigger(baseFields)
    if (!valid) return

    // Mode is a conditional required — validate manually
    if (hasModes && !form.getValues('mode')) {
      form.setError('mode', { message: 'Select a mode for this machine' })
      return
    }

    setStep(2)
  }

  function handleBack() {
    setStep(1)
  }

  // ── Submission ───────────────────────────────────────────────────────────────

  async function onSubmit(values: OperatorJobFormValues) {
    if (!selectedMachine) {
      form.setError('machineId', { message: 'Select a machine' })
      return
    }

    if (selectedMachine.hasModes && !values.mode) {
      form.setError('mode', { message: 'Select a mode for this machine' })
      return
    }

    if (selectedMachine.trackingUnit === 'trips') {
      if (values.tripCount == null || values.tripCount < 0) {
        form.setError('tripCount', { message: 'Trip count is required' })
        return
      }
    } else {
      if (values.startReading == null) {
        form.setError('startReading', { message: 'Start reading is required' })
        return
      }
      if (values.closingReading == null) {
        form.setError('closingReading', { message: 'Closing reading is required' })
        return
      }
    }

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    const qty =
      selectedMachine.trackingUnit === 'trips'
        ? (values.tripCount ?? 0)
        : (values.closingReading ?? 0) - (values.startReading ?? 0)

    setSuccessInfo({
      machineName: selectedMachine.name,
      siteName: selectedSite?.name ?? '',
      partyName: selectedSite?.partyName ?? '',
      quantity: qty,
      unit: selectedMachine.trackingUnit === 'trips' ? 'trips' : 'hrs',
      amount: qty * values.actualRate,
      batha: values.batha,
    })
    setStep(3)
  }

  function handleReset() {
    setStep(1)
    setSuccessInfo(null)
    form.reset({
      date: today(),
      machineId: '',
      mode: null,
      siteId: '',
      startReading: null,
      closingReading: null,
      tripCount: null,
      actualRate: 0,
      batha: 0,
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const { label, progress } = STEP_META[step]

  return (
    <div className="space-y-6">

      {/* ── Step progress ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">{label}</span>
          <span className="text-muted-foreground">Step {step} of 3</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* ── Step 3: Success ─────────────────────────────────────────── */}
      {step === 3 && successInfo && (
        <SuccessCard info={successInfo} onReset={handleReset} />
      )}

      {/* ── Steps 1 & 2: Form ───────────────────────────────────────── */}
      {step < 3 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* ══════════════════════════════════════════════════════════
                STEP 1 — Job Details
            ══════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" className="min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Machine */}
                <FormField
                  control={form.control}
                  name="machineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Machine <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full min-h-[48px]">
                            <SelectValue placeholder="Select machine" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {machines.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mode — only for hasModes machines */}
                {hasModes && (
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mode <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            {(['bucket', 'breaking'] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => field.onChange(m)}
                                className={`min-h-[56px] rounded-xl border-2 font-semibold text-sm capitalize transition-all
                                  ${field.value === m
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                                  }`}
                              >
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Site — grouped by party */}
                <FormField
                  control={form.control}
                  name="siteId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full min-h-[48px]">
                            <SelectValue placeholder="Select party / site" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                          {sitesByParty.map(({ partyName, sites: partySites }) => (
                            <SelectGroup key={partyName}>
                              <SelectLabel>{partyName}</SelectLabel>
                              {partySites.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="min-h-[44px]">
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Next button */}
                <Button
                  id="step1-next-btn"
                  type="button"
                  className="w-full min-h-[52px] text-base font-semibold"
                  onClick={handleNextStep}
                >
                  Continue
                </Button>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                STEP 2 — Work & Rate
            ══════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <>
                {/* Context recap chip */}
                {selectedMachine && selectedSite && (
                  <div className="rounded-xl bg-muted px-4 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground truncate">{selectedMachine.name}</span>
                    <span>&middot;</span>
                    <span className="truncate">{selectedSite.partyName} · {selectedSite.name}</span>
                  </div>
                )}

                {/* Reading / Trips */}
                {trackingUnit === 'trips' ? (
                  <FormField
                    control={form.control}
                    name="tripCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Trips <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            inputMode="decimal"
                            type="number"
                            min={0}
                            placeholder="0"
                            className="min-h-[48px]"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : trackingUnit !== null ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Reading <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              inputMode="decimal"
                              type="number"
                              min={0}
                              step="any"
                              placeholder="0"
                              className="min-h-[48px]"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="closingReading"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closing Reading <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input
                              inputMode="decimal"
                              type="number"
                              min={0}
                              step="any"
                              placeholder="0"
                              className="min-h-[48px]"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : null}

                {/* Rate */}
                <FormField
                  control={form.control}
                  name="actualRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate (₹) <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Rate"
                          className="min-h-[48px]"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Batha */}
                <FormField
                  control={form.control}
                  name="batha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batha (₹)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          type="number"
                          min={0}
                          placeholder="0"
                          className="min-h-[48px]"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Live amount preview */}
                {quantity > 0 && watchedActualRate > 0 && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {quantity.toLocaleString('en-IN')}&nbsp;{trackingUnit === 'trips' ? 'trips' : 'hrs'} × {formatINR(watchedActualRate)}
                    </span>
                    <span className="font-bold text-primary text-base">{formatINR(estimatedAmount)}</span>
                  </div>
                )}

                {errors.root && (
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                )}

                {/* Back + Submit */}
                <div className="flex gap-3 pt-1">
                  <Button
                    id="step2-back-btn"
                    type="button"
                    variant="outline"
                    className="min-h-[52px] px-4"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    id="log-job-submit-btn"
                    type="submit"
                    className="flex-1 min-h-[52px] text-base font-semibold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Job
                  </Button>
                </div>
              </>
            )}

          </form>
        </Form>
      )}
    </div>
  )
}
