'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'

const partySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  mobile: z.string().optional(),
  address: z.string().optional(),
  gstNo: z.string().optional(),
  balanceType: z.enum(['debit', 'credit']),
  balanceAmount: z.coerce.number().min(0).default(0),
})

type PartyFormValues = z.infer<typeof partySchema>

type PartyFormProps = {
  defaultValues?: Partial<PartyFormValues> & { id?: string; runningBalance?: number; openingBalance?: number }
  onSuccess: () => void
}

export function PartyForm({ defaultValues, onSuccess }: PartyFormProps) {
  const router = useRouter()
  const isEdit = Boolean(defaultValues?.id)

  // Derive initial balanceType/amount from openingBalance
  const initBalance = defaultValues?.openingBalance ?? 0
  const initType: 'debit' | 'credit' = initBalance >= 0 ? 'debit' : 'credit'
  const initAmount = Math.abs(initBalance)

  const form = useForm<PartyFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(partySchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      mobile: defaultValues?.mobile ?? '',
      address: defaultValues?.address ?? '',
      gstNo: defaultValues?.gstNo ?? '',
      balanceType: initType,
      balanceAmount: initAmount,
    },
  })

  const watchedType = form.watch('balanceType')
  const { isSubmitting, errors } = form.formState

  async function onSubmit(values: PartyFormValues) {
    const signedBalance = values.balanceType === 'debit' ? values.balanceAmount : -values.balanceAmount
    const url = isEdit ? `/api/parties/${defaultValues?.id}` : '/api/parties'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        mobile: values.mobile || null,
        address: values.address || null,
        gstNo: values.gstNo || null,
        openingBalance: signedBalance,
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Party Name <span className="text-destructive">*</span></FormLabel>
            <FormControl><Input placeholder="e.g. Sharma Constructions" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="mobile" render={({ field }) => (
          <FormItem>
            <FormLabel>Mobile <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
            <FormControl><Input placeholder="+91 98765 43210" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="gstNo" render={({ field }) => (
          <FormItem>
            <FormLabel>GST Number <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
            <FormControl><Input placeholder="27AABCU9603R1ZX" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
            <FormControl><Textarea placeholder="Full address…" rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Opening Balance */}
        <div className="space-y-3">
          <FormLabel>Opening Balance</FormLabel>
          <FormField control={form.control} name="balanceType" render={({ field }) => (
            <FormItem>
              <div className="grid grid-cols-2 gap-2">
                {(['debit', 'credit'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => field.onChange(type)}
                    className={cn(
                      'rounded-xl border-2 p-3 text-sm font-medium transition-all text-left',
                      field.value === type
                        ? type === 'debit'
                          ? 'border-destructive bg-destructive/10 text-destructive'
                          : 'border-amber-500 bg-amber-500/10 text-amber-600'
                        : 'border-border bg-background text-muted-foreground hover:border-muted-foreground'
                    )}
                  >
                    <p className="font-semibold">{type === 'debit' ? 'Debit (Dr)' : 'Credit (Cr)'}</p>
                    <p className="text-xs mt-0.5 opacity-70">
                      {type === 'debit' ? 'They owe us' : 'We owe them'}
                    </p>
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="balanceAmount" render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...field}
                  className={cn(
                    watchedType === 'debit' ? 'border-destructive/50 focus-visible:ring-destructive/30' :
                    watchedType === 'credit' ? 'border-amber-500/50 focus-visible:ring-amber-500/30' : ''
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Party'}
        </Button>
      </form>
    </Form>
  )
}
