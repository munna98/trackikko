'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatINR, formatDate } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Zod Schema ───────────────────────────────────────────────────────────────

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
    // We can't check trackingUnit here without machine data, so validation
    // for reading/trip is handled in onSubmit with machine lookup
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

// ── Success State ─────────────────────────────────────────────────────────────

type SuccessInfo = {
  machineName: string
  siteName: string
  partyName: string
  quantity: number
  unit: string
  amount: number
}

function SuccessState({ info, onReset }: { info: SuccessInfo; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-chart-5/15 flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-chart-5" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">Job logged ✓</p>
        <p className="text-sm text-muted-foreground mt-1">
          {info.machineName} · {info.partyName} · {info.siteName}
        </p>
        <p className="text-base font-semibold text-primary mt-1">
          {info.quantity.toLocaleString('en-IN')} {info.unit} · {formatINR(info.amount)}
        </p>
      </div>
      <Button id="log-another-btn" variant="outline" onClick={onReset} className="min-h-[48px] px-8">
        Log Another
      </Button>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

type OperatorJobFormProps = {
  machines: SerialMachine[]
  sites: SerialSite[]
  rateCards: SerialRateCard[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function OperatorJobForm({ machines, sites, rateCards }: OperatorJobFormProps) {
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
  const watchedSiteId = form.watch('siteId')
  const watchedMode = form.watch('mode')

  const selectedMachine = machines.find((m) => m.id === watchedMachineId)
  const selectedSite = sites.find((s) => s.id === watchedSiteId)
  const trackingUnit = selectedMachine?.trackingUnit ?? null
  const hasModes = selectedMachine?.hasModes ?? false

  // Auto-fill batha when site changes
  React.useEffect(() => {
    if (selectedSite) {
      form.setValue('batha', selectedSite.batha)
    }
  }, [watchedSiteId, selectedSite, form])

  // Auto-fill rate when machine/site/mode changes
  const rateCard = React.useMemo(() => {
    if (!watchedMachineId || !watchedSiteId || !selectedSite) return null
    return findRateCard(rateCards, watchedMachineId, selectedSite.partyId, watchedSiteId, watchedMode ?? null)
  }, [watchedMachineId, watchedSiteId, watchedMode, selectedSite, rateCards])

  React.useEffect(() => {
    if (rateCard) {
      form.setValue('actualRate', rateCard.rate)
    }
  }, [rateCard, form])

  // Reset mode when machine changes and new machine has no modes
  React.useEffect(() => {
    if (!hasModes) {
      form.setValue('mode', null)
    }
  }, [watchedMachineId, hasModes, form])

  // Group sites by party
  const sitesByParty = React.useMemo(() => {
    const grouped = new Map<string, { partyName: string; sites: SerialSite[] }>()
    for (const site of sites) {
      if (!grouped.has(site.partyId)) {
        grouped.set(site.partyId, { partyName: site.partyName, sites: [] })
      }
      grouped.get(site.partyId)!.sites.push(site)
    }
    return Array.from(grouped.values())
  }, [sites])

  async function onSubmit(values: OperatorJobFormValues) {
    if (!selectedMachine) {
      form.setError('machineId', { message: 'Select a machine' })
      return
    }

    // Validate reading/trip based on machine type
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

    // Compute success info
    const quantity =
      selectedMachine.trackingUnit === 'trips'
        ? (values.tripCount ?? 0)
        : (values.closingReading ?? 0) - (values.startReading ?? 0)
    const amount = quantity * values.actualRate

    setSuccessInfo({
      machineName: selectedMachine.name,
      siteName: selectedSite?.name ?? '',
      partyName: selectedSite?.partyName ?? '',
      quantity,
      unit: selectedMachine.trackingUnit === 'trips' ? 'trips' : 'hrs',
      amount,
    })
  }

  function handleReset() {
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

  if (successInfo) {
    return <SuccessState info={successInfo} onReset={handleReset} />
  }

  const watchedActualRate = form.watch('actualRate')
  const quantity =
    trackingUnit === 'trips'
      ? (form.watch('tripCount') ?? 0)
      : Math.max(0, (form.watch('closingReading') ?? 0) - (form.watch('startReading') ?? 0))
  const estimatedAmount = quantity * (watchedActualRate || 0)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

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

        {/* Reading / Trips — dynamic */}
        {trackingUnit === 'trips' ? (
          <FormField
            control={form.control}
            name="tripCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Trips <span className="text-destructive">*</span></FormLabel>
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

        {/* Rate — auto-filled or editable */}
        <FormField
          control={form.control}
          name="actualRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate (₹) <span className="text-destructive">*</span></FormLabel>
              {rateCard ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <span className="text-sm font-semibold text-primary">
                      {formatINR(rateCard.rate)} / {rateCard.rateType === 'per_hour' ? 'hr' : 'trip'}
                    </span>
                    <span className="text-xs text-muted-foreground">— from rate card</span>
                  </div>
                  <Input
                    inputMode="decimal"
                    type="number"
                    min={0}
                    placeholder="Override rate"
                    className="min-h-[48px]"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </div>
              ) : watchedSiteId && watchedMachineId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                    <span className="text-xs text-destructive">No rate card found — enter rate manually</span>
                  </div>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      type="number"
                      min={0}
                      placeholder="Enter rate"
                      className="min-h-[48px]"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </div>
              ) : (
                <FormControl>
                  <Input
                    inputMode="decimal"
                    type="number"
                    min={0}
                    placeholder="Select machine & site first"
                    className="min-h-[48px]"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
              )}
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
          <div className="rounded-xl bg-muted px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {quantity.toLocaleString('en-IN')} {trackingUnit === 'trips' ? 'trips' : 'hrs'} × {formatINR(watchedActualRate)}
            </span>
            <span className="font-bold text-primary">{formatINR(estimatedAmount)}</span>
          </div>
        )}

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <Button
          id="log-job-submit-btn"
          type="submit"
          className="w-full min-h-[52px] text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Log Job
        </Button>
      </form>
    </Form>
  )
}
