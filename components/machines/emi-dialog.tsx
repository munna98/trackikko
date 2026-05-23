'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, addMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn, formatDate } from '@/lib/utils'

const emiSchema = z.object({
  financierName: z.string().min(1, 'Financier name is required'),
  monthlyAmount: z.coerce.number().positive('Amount must be positive'),
  totalInstallments: z.coerce.number().int().min(1, 'At least 1 installment'),
  startDate: z.date().refine((d) => !isNaN(d.getTime()), { message: 'Start date is required' }),
})

type EmiFormValues = z.infer<typeof emiSchema>

type EmiDialogProps = {
  machineId: string
}

export function EmiDialog({ machineId }: EmiDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<EmiFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(emiSchema) as any,
    defaultValues: {
      financierName: '',
      monthlyAmount: 0,
      totalInstallments: 12,
    },
  })

  const watchedStart = form.watch('startDate')
  const watchedInstallments = form.watch('totalInstallments')
  const estimatedCompletion =
    watchedStart && watchedInstallments > 0
      ? formatDate(addMonths(watchedStart, watchedInstallments))
      : null

  async function onSubmit(values: EmiFormValues) {
    const res = await fetch(`/api/machines/${machineId}/emis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...values,
        startDate: format(values.startDate, 'yyyy-MM-dd'),
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset()
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" id="add-emi-btn">
          <Plus className="mr-2 h-4 w-4" />
          Add EMI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add EMI</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="financierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Financier Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HDFC Bank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthlyAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Amount (₹) <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="25000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalInstallments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Installments <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date <span className="text-destructive">*</span></FormLabel>
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

            {estimatedCompletion && (
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Estimated completion: </span>
                <span className="font-medium text-foreground">{estimatedCompletion}</span>
              </div>
            )}

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add EMI
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
