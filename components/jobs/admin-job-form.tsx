'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import {
  type SerialMachine,
  type SerialSite,
  type SerialRateCard,
  findRateCard,
} from '@/components/jobs/operator-job-form'
import { formatINR } from '@/lib/utils'

export type SerialStaff = {
  id: string
  name: string
  roleId: string
  defaultMachineId: string | null
  defaultSiteId: string | null
}

const adminJobSchema = z
  .object({
    staffId: z.string().min(1, 'Select a staff member'),
    date: z.string().min(1, 'Date is required'),
    machineId: z.string().min(1, 'Select a machine'),
    mode: z.enum(['bucket', 'breaking']).optional().nullable(),
    siteId: z.string().min(1, 'Select a site'),
    startReading: z.coerce.number().optional().nullable(),
    closingReading: z.coerce.number().optional().nullable(),
    tripCount: z.coerce.number().int().min(0).optional().nullable(),
    actualRate: z.coerce.number().min(0, 'Rate is required'),
    batha: z.coerce.number().min(0).default(0),
    bathaPaidBy: z.enum(['party', 'company']).default('party'),
  })
  .superRefine((data, ctx) => {
    if (data.startReading != null && data.closingReading != null) {
      if (data.closingReading <= data.startReading) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Closing reading must be greater than start reading',
          path: ['closingReading'],
        })
      }
    }
  })

type AdminJobFormValues = z.infer<typeof adminJobSchema>

function today() {
  return new Date().toISOString().split('T')[0]
}

type AdminJobFormProps = {
  machines: SerialMachine[]
  sites: SerialSite[]
  rateCards: SerialRateCard[]
  staff: SerialStaff[]
}

export function AdminJobForm({ machines, sites, rateCards, staff }: AdminJobFormProps) {
  const router = useRouter()

  const form = useForm<AdminJobFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adminJobSchema) as any,
    defaultValues: {
      staffId: '',
      date: today(),
      machineId: '',
      mode: null,
      siteId: '',
      startReading: null,
      closingReading: null,
      tripCount: null,
      actualRate: 0,
      batha: 0,
      bathaPaidBy: 'party',
    },
  })

  const { isSubmitting, errors } = form.formState

  const watchedStaffId = form.watch('staffId')
  const watchedMachineId = form.watch('machineId')
  const watchedSiteId = form.watch('siteId')
  const watchedMode = form.watch('mode')
  const watchedActualRate = form.watch('actualRate')

  // Auto-fill defaults when selected staff changes
  React.useEffect(() => {
    if (watchedStaffId) {
      const selectedStaff = staff.find((s) => s.id === watchedStaffId)
      if (selectedStaff) {
        if (selectedStaff.defaultMachineId) {
          form.setValue('machineId', selectedStaff.defaultMachineId)
        }
        if (selectedStaff.defaultSiteId) {
          form.setValue('siteId', selectedStaff.defaultSiteId)
        }
      }
    }
  }, [watchedStaffId, staff, form])

  const selectedMachine = machines.find((m) => m.id === watchedMachineId)
  const selectedSite = sites.find((s) => s.id === watchedSiteId)
  const trackingUnit = selectedMachine?.trackingUnit ?? null
  const hasModes = selectedMachine?.hasModes ?? false

  React.useEffect(() => {
    if (selectedSite) form.setValue('batha', selectedSite.batha)
  }, [watchedSiteId, selectedSite, form])

  const rateCard = React.useMemo(() => {
    if (!watchedMachineId || !watchedSiteId || !selectedSite) return null
    return findRateCard(rateCards, watchedMachineId, selectedSite.partyId, watchedSiteId, watchedMode ?? null)
  }, [watchedMachineId, watchedSiteId, watchedMode, selectedSite, rateCards])

  React.useEffect(() => {
    if (rateCard) form.setValue('actualRate', rateCard.rate)
  }, [rateCard, form])

  React.useEffect(() => {
    if (!hasModes) form.setValue('mode', null)
  }, [watchedMachineId, hasModes, form])

  React.useEffect(() => {
    if (selectedMachine && selectedMachine.trackingUnit !== 'trips') {
      form.setValue('startReading', selectedMachine.currentMeterReading)
    } else {
      form.setValue('startReading', null)
    }
  }, [watchedMachineId, selectedMachine, form])

  const sitesByParty = React.useMemo(() => {
    const grouped = new Map<string, { partyName: string; sites: SerialSite[] }>()
    for (const site of sites) {
      if (!grouped.has(site.partyId)) grouped.set(site.partyId, { partyName: site.partyName, sites: [] })
      grouped.get(site.partyId)!.sites.push(site)
    }
    return Array.from(grouped.values())
  }, [sites])

  const quantity =
    trackingUnit === 'trips'
      ? (form.watch('tripCount') ?? 0)
      : Math.max(0, (form.watch('closingReading') ?? 0) - (form.watch('startReading') ?? 0))
  const estimatedAmount = quantity * (watchedActualRate || 0)

  async function onSubmit(values: AdminJobFormValues) {
    if (!selectedMachine) { form.setError('machineId', { message: 'Select a machine' }); return }
    if (selectedMachine.hasModes && !values.mode) { form.setError('mode', { message: 'Select a mode for this machine' }); return }
    if (selectedMachine.trackingUnit === 'trips') {
      if (values.tripCount == null) { form.setError('tripCount', { message: 'Trip count is required' }); return }
    } else {
      if (values.startReading == null) { form.setError('startReading', { message: 'Start reading is required' }); return }
      if (values.closingReading == null) { form.setError('closingReading', { message: 'Closing reading is required' }); return }
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
    router.push('/dashboard/jobs')
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Staff */}
        <FormField
          control={form.control}
          name="staffId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff Member <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem>
            <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Machine */}
        <FormField control={form.control} name="machineId" render={({ field }) => (
          <FormItem>
            <FormLabel>Machine <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select machine" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Mode */}
        {hasModes && (
          <FormField control={form.control} name="mode" render={({ field }) => (
            <FormItem>
              <FormLabel>Mode <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-3">
                  {(['bucket', 'breaking'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => field.onChange(m)}
                      className={`min-h-[48px] rounded-xl border-2 font-semibold text-sm capitalize transition-all
                        ${field.value === m
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                        }`}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {/* Site */}
        <FormField control={form.control} name="siteId" render={({ field }) => (
          <FormItem>
            <FormLabel>Site <span className="text-destructive">*</span></FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select party / site" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                {sitesByParty.map(({ partyName, sites: ps }) => (
                  <SelectGroup key={partyName}>
                    <SelectLabel>{partyName}</SelectLabel>
                    {ps.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Reading / Trips */}
        {trackingUnit === 'trips' ? (
          <FormField control={form.control} name="tripCount" render={({ field }) => (
            <FormItem>
              <FormLabel>Trips <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input inputMode="decimal" type="number" min={0} placeholder="0"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ) : trackingUnit !== null ? (
          <div className="grid grid-cols-2 gap-3 md:col-span-2">
            <FormField control={form.control} name="startReading" render={({ field }) => (
              <FormItem>
                <FormLabel>Start Reading <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input inputMode="decimal" type="number" min={0} step="any" placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="closingReading" render={({ field }) => (
              <FormItem>
                <FormLabel>Closing Reading <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input inputMode="decimal" type="number" min={0} step="any" placeholder="0"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        ) : null}

        {/* Rate */}
        <FormField control={form.control} name="actualRate" render={({ field }) => (
          <FormItem>
            <FormLabel>Rate (₹) <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input inputMode="decimal" type="number" min={0} step="any" placeholder="0"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Batha */}
        <FormField control={form.control} name="batha" render={({ field }) => (
          <FormItem>
            <FormLabel>Batha (₹)</FormLabel>
            <FormControl>
              <Input inputMode="decimal" type="number" min={0} placeholder="0"
                {...field}
                value={field.value ?? 0}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="bathaPaidBy" render={({ field }) => (
          <FormItem>
            <FormLabel>Batha Paid By <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => field.onChange('party')}
                  className={`min-h-[48px] rounded-xl border-2 font-semibold text-sm transition-all
                    ${field.value === 'party'
                      ? 'border-chart-5 bg-chart-5/10 text-chart-5'
                      : 'border-border bg-card text-muted-foreground hover:border-chart-5/40'
                    }`}>
                  Party
                </button>
                <button type="button" onClick={() => field.onChange('company')}
                  className={`min-h-[48px] rounded-xl border-2 font-semibold text-sm transition-all
                    ${field.value === 'company'
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border bg-card text-muted-foreground hover:border-destructive/40'
                    }`}>
                  Company
                </button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Live preview */}
        {quantity > 0 && watchedActualRate > 0 && (
          <div className="rounded-xl bg-muted px-4 py-3 flex items-center justify-between md:col-span-2">
            <span className="text-sm text-muted-foreground">
              {quantity.toLocaleString('en-IN')} {trackingUnit === 'trips' ? 'trips' : 'hrs'} × {formatINR(watchedActualRate)}
            </span>
            <span className="font-bold text-primary">{formatINR(estimatedAmount)}</span>
          </div>
        )}

        {errors.root && <p className="text-sm text-destructive md:col-span-2">{errors.root.message}</p>}

        <div className="flex gap-3 pt-4 border-t border-border mt-2 md:col-span-2">
          <Button
            type="button"
            variant="outline"
            className="px-4"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            id="admin-log-job-submit-btn"
            type="submit"
            className="flex-1 font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Job
          </Button>
        </div>
      </form>
    </Form>
  )
}
