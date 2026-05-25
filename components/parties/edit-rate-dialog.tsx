'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import { formatINR } from '@/lib/utils'

const editRateSchema = z.object({
  rate: z.coerce.number().positive('Rate must be positive'),
})

type EditRateFormValues = z.infer<typeof editRateSchema>

type EditRateDialogProps = {
  partyId: string
  rateCardId: string
  currentRate: number
  rateType: string
}

export function EditRateDialog({ partyId, rateCardId, currentRate, rateType }: EditRateDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<EditRateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editRateSchema) as any,
    defaultValues: { rate: currentRate },
  })

  // Reset to currentRate whenever dialog opens
  React.useEffect(() => {
    if (open) form.reset({ rate: currentRate })
  }, [open, currentRate, form])

  async function onSubmit(values: EditRateFormValues) {
    const res = await fetch(`/api/parties/${partyId}/rate-cards/${rateCardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: values.rate }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
  }

  const { isSubmitting, errors } = form.formState
  const unitLabel = rateType === 'per_hour' ? 'hr' : 'trip'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          id={`edit-rate-${rateCardId}`}
          className="text-xs"
        >
          <Pencil className="mr-1.5 h-3 w-3" />Edit Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Edit Rate</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
            {/* Current rate — read-only reference */}
            <div className="rounded-lg bg-muted/60 border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Current rate</p>
              <p className="text-lg font-semibold text-muted-foreground">
                {formatINR(currentRate)}
                <span className="text-xs font-normal ml-1">/ {unitLabel}</span>
              </p>
            </div>

            {/* New rate */}
            <FormField control={form.control} name="rate" render={({ field }) => (
              <FormItem>
                <FormLabel>New Rate (₹ / {unitLabel}) <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder={String(currentRate)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Rate
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
