'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const rateCardSchema = z.object({
  machineId: z.string().min(1, 'Select a machine'),
  siteId: z.string().optional(),
  mode: z.enum(['bucket', 'breaking']).optional(),
  rateType: z.enum(['per_hour', 'per_trip']),
  rate: z.coerce.number().positive('Rate must be positive'),
})

type RateCardFormValues = z.infer<typeof rateCardSchema>

type Machine = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
}

type Site = { id: string; name: string }

type RateCardDialogProps = {
  partyId: string
  machines: Machine[]
  sites: Site[]
}

export function RateCardDialog({ partyId, machines, sites }: RateCardDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<RateCardFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(rateCardSchema) as any,
    defaultValues: {
      machineId: '',
      siteId: '__all__',
      rateType: 'per_hour',
      rate: 0,
    },
  })

  const watchedMachineId = form.watch('machineId')
  const selectedMachine = machines.find((m) => m.id === watchedMachineId)

  React.useEffect(() => {
    if (!selectedMachine) return
    const rt = selectedMachine.trackingUnit === 'trips' ? 'per_trip' : 'per_hour'
    form.setValue('rateType', rt)
    form.setValue('mode', undefined)
  }, [watchedMachineId, selectedMachine, form])

  const showModeSelector = Boolean(selectedMachine?.hasModes)

  async function onSubmit(values: RateCardFormValues) {
    const res = await fetch(`/api/parties/${partyId}/rate-cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId: values.machineId,
        siteId: values.siteId && values.siteId !== '__all__' ? values.siteId : null,
        mode: values.mode ?? null,
        rateType: values.rateType,
        rate: values.rate,
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset({ machineId: '', siteId: '__all__', rateType: 'per_hour', rate: 0 })
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" id="add-rate-card-btn">
          <Plus className="mr-2 h-4 w-4" />Add Rate Card
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Rate Card</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            {/* Machine */}
            <FormField control={form.control} name="machineId" render={({ field }) => (
              <FormItem>
                <FormLabel>Machine <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select machine" /></SelectTrigger>
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

            {/* Site */}
            <FormField control={form.control} name="siteId" render={({ field }) => (
              <FormItem>
                <FormLabel>Site</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? '__all__'}>
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue placeholder="All sites" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__all__">All sites</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Mode */}
            {showModeSelector && (
              <FormField control={form.control} name="mode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode <span className="text-destructive">*</span></FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(['bucket', 'breaking'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => field.onChange(m)}
                        className={cn(
                          'rounded-xl border-2 p-2.5 text-sm font-medium transition-all capitalize',
                          field.value === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Rate Type — read-only */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Rate Type</p>
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {form.watch('rateType') === 'per_hour' ? 'Per Hour' : 'Per Trip'}
              </div>
            </div>

            {/* Rate */}
            <FormField control={form.control} name="rate" render={({ field }) => (
              <FormItem>
                <FormLabel>Rate (₹) <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input type="number" min={0.01} step={0.01} placeholder="0" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Rate Card
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
