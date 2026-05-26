'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn, formatDate } from '@/lib/utils'

const oilChangeSchema = z.object({
  date: z.date().refine((d) => !isNaN(d.getTime()), { message: 'Date is required' }),
  readingAtChange: z.coerce.number().min(0, 'Reading is required'),
  oilType: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  accountId: z.string().optional(),
  notes: z.string().optional(),
})

type OilChangeFormValues = z.infer<typeof oilChangeSchema>

type Account = {
  id: string
  name: string
  type: string
}

type OilChangeDialogProps = {
  machineId: string
  trackingUnit: 'hours' | 'trips' | 'km'
  accounts: Account[]
  logId?: string
  defaultValues?: Partial<OilChangeFormValues>
  trigger?: React.ReactNode
  lastChangedAtReading?: number
}

const UNIT_LABEL: Record<string, string> = { hours: 'hrs', trips: 'trips', km: 'km' }

export function OilChangeDialog({ machineId, trackingUnit, accounts, logId, defaultValues, trigger, lastChangedAtReading }: OilChangeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const unit = UNIT_LABEL[trackingUnit] ?? ''
  const isEdit = Boolean(logId)

  const form = useForm<OilChangeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(oilChangeSchema) as any,
    defaultValues: {
      date: defaultValues?.date ?? new Date(),
      readingAtChange: defaultValues?.readingAtChange ?? 0,
      oilType: defaultValues?.oilType ?? '',
      cost: defaultValues?.cost,
      accountId: defaultValues?.accountId ?? '',
      notes: defaultValues?.notes ?? '',
    },
  })

  const watchedCost = form.watch('cost')
  const hasCost = watchedCost !== undefined && watchedCost > 0

  async function onSubmit(values: OilChangeFormValues) {
    if (!isEdit && lastChangedAtReading !== undefined && values.readingAtChange <= lastChangedAtReading) {
      form.setError('readingAtChange', { 
        message: `Must be greater than last changed reading (${lastChangedAtReading.toLocaleString('en-IN')} ${unit})` 
      })
      return
    }

    const url = isEdit ? `/api/machines/${machineId}/oil-changes/${logId}` : `/api/machines/${machineId}/oil-changes`
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
        cost: values.cost || null,
        accountId: values.accountId || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset({ date: new Date(), readingAtChange: 0 })
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" id="log-oil-change-btn">
            <Plus className="mr-2 h-4 w-4" />
            Log Oil Change
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Oil Change' : 'Log Oil Change'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
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
              name="readingAtChange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reading at Change ({unit}) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="oilType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Oil Type <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 15W40" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost (₹) <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={0} placeholder="0" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasCost && accounts.length > 0 && (
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any notes..." rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Log Oil Change'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
