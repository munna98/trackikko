'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

export type SerialCategory = {
  id: string
  name: string
  appliesTo: 'machine' | 'staff' | 'other' | null
}

export type SerialMachine = {
  id: string
  name: string
}

export type SerialStaff = {
  id: string
  name: string
}

export type SerialAccount = {
  id: string
  name: string
  type: string
}

const expenseSchema = z.object({
  expenseCategoryId: z.string().min(1, 'Category is required'),
  date: z.string().min(1, 'Date is required'),
  machineId: z.string().optional().nullable(),
  staffId: z.string().optional().nullable(),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

type AdminExpenseFormProps = {
  categories: SerialCategory[]
  machines: SerialMachine[]
  staffList: SerialStaff[]
  accounts: SerialAccount[]
  initialData?: ExpenseFormValues & { id: string }
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function AdminExpenseForm({ categories, machines, staffList, accounts, initialData }: AdminExpenseFormProps) {
  const router = useRouter()

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData || {
      expenseCategoryId: '',
      date: todayIso(),
      machineId: null,
      staffId: null,
      amount: 0,
      accountId: '',
      notes: '',
    },
  })

  const { isSubmitting, errors } = form.formState
  const watchedCategoryId = form.watch('expenseCategoryId')
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId)

  async function onSubmit(values: ExpenseFormValues) {
    if (selectedCategory?.appliesTo === 'machine' && !values.machineId) {
      form.setError('machineId', { message: 'Machine is required for this category' })
      return
    }
    if (selectedCategory?.appliesTo === 'staff' && !values.staffId) {
      form.setError('staffId', { message: 'Staff is required for this category' })
      return
    }

    const url = initialData ? `/api/expenses/${initialData.id}` : '/api/expenses'
    const method = initialData ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.push('/dashboard/expenses')
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <FormField
          control={form.control}
          name="expenseCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{c.name}</span>
                        {c.appliesTo && (
                          <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                            {c.appliesTo}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine {selectedCategory?.appliesTo === 'machine' && <span className="text-destructive">*</span>}</FormLabel>
              <Select onValueChange={(v) => field.onChange(v === '_none' ? null : v)} value={field.value || '_none'}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select machine" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {machines.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="staffId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Staff {selectedCategory?.appliesTo === 'staff' && <span className="text-destructive">*</span>}</FormLabel>
              <Select onValueChange={(v) => field.onChange(v === '_none' ? null : v)} value={field.value || '_none'}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (₹) <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  inputMode="decimal"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid From Account <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.length === 0 ? (
                    <SelectItem value="__none" disabled>No accounts available</SelectItem>
                  ) : (
                    accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} <span className="text-muted-foreground capitalize">({a.type})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Notes <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any additional notes..."
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p className="text-sm text-destructive md:col-span-2">{errors.root.message}</p>
        )}

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
            id="log-expense-submit-btn"
            type="submit"
            className="flex-1 font-semibold"
            disabled={isSubmitting || accounts.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
