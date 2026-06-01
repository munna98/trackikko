'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const editJobSchema = z.object({
  actualRate: z.coerce.number().min(0, 'Rate must be ≥ 0'),
  batha: z.coerce.number().min(0),
  bathaPaidBy: z.enum(['party', 'company']),
  date: z.string().min(1, 'Date is required'),
})

type EditJobValues = z.infer<typeof editJobSchema>

type JobEditSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  defaultValues: {
    actualRate: number
    batha: number
    bathaPaidBy: 'party' | 'company'
    date: string // ISO date string YYYY-MM-DD
  }
}

export function JobEditSheet({ open, onOpenChange, jobId, defaultValues }: JobEditSheetProps) {
  const router = useRouter()

  const form = useForm<EditJobValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editJobSchema) as any,
    defaultValues: {
      actualRate: defaultValues.actualRate,
      batha: defaultValues.batha,
      bathaPaidBy: defaultValues.bathaPaidBy,
      date: defaultValues.date,
    },
  })

  // Reset form when sheet opens with fresh defaults
  React.useEffect(() => {
    if (open) {
      form.reset({
        actualRate: defaultValues.actualRate,
        batha: defaultValues.batha,
        bathaPaidBy: defaultValues.bathaPaidBy,
        date: defaultValues.date,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: EditJobValues) {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Edit Job</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form id="job-edit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="actualRate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Actual Rate (₹)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="batha" render={({ field }) => (
                <FormItem>
                  <FormLabel>Batha (₹)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bathaPaidBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Batha Paid By</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select who pays Batha" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="party">Party (Direct on Site)</SelectItem>
                      <SelectItem value="company">Company (Party Refused)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            </form>
          </Form>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            id="job-edit-save-btn"
            type="submit"
            form="job-edit-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
