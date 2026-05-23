'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn, formatDate } from '@/lib/utils'

const scheduleSchema = z.object({
  intervalUnits: z.coerce.number().positive('Interval must be positive'),
  alertBeforeUnits: z.coerce.number().min(0).default(20),
  lastChangedAtReading: z.coerce.number().min(0),
  lastChangedDate: z.date().refine((d) => !isNaN(d.getTime()), { message: 'Date is required' }),
  notes: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

type OilScheduleFormProps = {
  machineId: string
  trackingUnit: 'hours' | 'trips' | 'km'
  defaultValues?: Partial<Omit<ScheduleFormValues, 'lastChangedDate'>> & {
    lastChangedDate?: Date
  }
  onSuccess?: () => void
}

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }

export function OilScheduleForm({ machineId, trackingUnit, defaultValues, onSuccess }: OilScheduleFormProps) {
  const router = useRouter()
  const unit = UNIT_LABEL[trackingUnit] ?? ''

  const form = useForm<ScheduleFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(scheduleSchema) as any,
    defaultValues: {
      intervalUnits: defaultValues?.intervalUnits ?? 0,
      alertBeforeUnits: defaultValues?.alertBeforeUnits ?? 20,
      lastChangedAtReading: defaultValues?.lastChangedAtReading ?? 0,
      lastChangedDate: defaultValues?.lastChangedDate,
      notes: defaultValues?.notes ?? '',
    },
  })

  async function onSubmit(values: ScheduleFormValues) {
    const res = await fetch(`/api/machines/${machineId}/oil-schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        lastChangedDate: format(values.lastChangedDate, 'yyyy-MM-dd'),
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    onSuccess?.()
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="intervalUnits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Change every ({unit}) <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="number" min={1} placeholder={trackingUnit === 'hours' ? '250' : '5000'} {...field} />
              </FormControl>
              <FormDescription>Oil change interval in {unit}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alertBeforeUnits"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alert before ({unit})</FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="20" {...field} />
              </FormControl>
              <FormDescription>Show &quot;due soon&quot; warning this many {unit} before due</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastChangedAtReading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Changed at Reading ({unit}) <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="number" min={0} placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastChangedDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Changed Date <span className="text-destructive">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? formatDate(field.value) : 'Pick a date'}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Oil type, service notes..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Schedule
        </Button>
      </form>
    </Form>
  )
}
