'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil } from 'lucide-react'
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

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['cash', 'bank']),
  openingBalance: z.coerce.number().default(0),
})

type AccountFormValues = z.infer<typeof accountSchema>

type AccountDialogProps = {
  defaultValues?: { id: string; name: string; type: 'cash' | 'bank'; currentBalance: number }
}

export function AccountDialog({ defaultValues }: AccountDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  const form = useForm<AccountFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(accountSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: defaultValues?.type ?? 'cash',
      openingBalance: 0,
    },
  })

  async function onSubmit(values: AccountFormValues) {
    const url = isEdit ? `/api/settings/accounts/${defaultValues?.id}` : '/api/settings/accounts'
    const method = isEdit ? 'PATCH' : 'POST'
    const body = isEdit ? { name: values.name } : values

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    if (!isEdit) form.reset()
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" id={isEdit ? `edit-account-${defaultValues?.id}` : 'add-account-btn'}>
          {isEdit ? (
            <><Pencil className="mr-2 h-4 w-4" />Edit</>
          ) : (
            <><Plus className="mr-2 h-4 w-4" />Add Account</>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Account' : 'Add Account'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Account Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Petty Cash / SBI Current" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {!isEdit && (
              <>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="openingBalance" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opening Balance (₹)</FormLabel>
                    <FormControl><Input type="number" min={0} placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}

            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Account'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
