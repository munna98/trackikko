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

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  appliesTo: z.enum(['machine', 'staff', 'other']).nullable().optional(),
})

type CategoryFormValues = z.infer<typeof categorySchema>

type Category = { id: string; name: string; appliesTo: string | null }

type ExpenseCategoryDialogProps = {
  defaultValues?: Category
}

export function ExpenseCategoryDialog({ defaultValues }: ExpenseCategoryDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  const form = useForm<CategoryFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(categorySchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      appliesTo: (defaultValues?.appliesTo as 'machine' | 'staff' | 'other' | null) ?? null,
    },
  })

  async function onSubmit(values: CategoryFormValues) {
    const url = isEdit
      ? `/api/settings/expense-categories/${defaultValues?.id}`
      : '/api/settings/expense-categories'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: values.name, appliesTo: values.appliesTo ?? null }),
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
        <Button size="sm" id={isEdit ? `edit-category-${defaultValues?.id}` : 'add-category-btn'}>
          {isEdit ? <><Pencil className="mr-2 h-4 w-4" />Edit</> : <><Plus className="mr-2 h-4 w-4" />Add Category</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Expense Category'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Fuel, Maintenance" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="appliesTo" render={({ field }) => (
              <FormItem>
                <FormLabel>Applies To</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                  value={field.value ?? '__none__'}
                >
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Any" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Any</SelectItem>
                    <SelectItem value="machine">Machine</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Category'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
