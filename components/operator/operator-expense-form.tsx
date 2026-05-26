'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
import { formatINR } from '@/lib/utils'

export type SerialCategory = {
  id: string
  name: string
  appliesTo: 'machine' | 'staff' | 'other' | null
}

export type SerialMachine = {
  id: string
  name: string
}

export type SerialAccount = {
  id: string
  name: string
  type: string
}

const operatorExpenseSchema = z.object({
  expenseCategoryId: z.string().min(1, 'Select a category'),
  machineId: z.string().optional().nullable(),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  accountId: z.string().min(1, 'Select an account'),
  notes: z.string().optional(),
})

export type OperatorExpenseFormValues = z.infer<typeof operatorExpenseSchema>

type Step = 1 | 2 | 3

const STEP_META: Record<Step, { label: string; progress: number }> = {
  1: { label: 'What was it for?', progress: 50 },
  2: { label: 'Amount & Account', progress: 100 },
  3: { label: 'Done!', progress: 100 },
}

type SuccessInfo = {
  categoryName: string
  amount: number
  date: string
}

function SuccessCard({ info, onReset }: { info: SuccessInfo; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-5 py-4">
      <div className="w-20 h-20 rounded-full bg-chart-5/15 flex items-center justify-center ring-4 ring-chart-5/20">
        <CheckCircle2 className="w-10 h-10 text-chart-5" />
      </div>

      <div className="space-y-1">
        <p className="text-xl font-bold text-foreground">Expense Logged!</p>
        <p className="text-sm text-muted-foreground">{info.categoryName}</p>
        <p className="text-xs text-muted-foreground">{info.date}</p>
      </div>

      <div className="w-full rounded-2xl bg-muted px-5 py-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Amount Spent</span>
        <span className="text-lg font-bold text-destructive">{formatINR(info.amount)}</span>
      </div>

      <Button
        className="w-full min-h-[52px] text-base font-semibold"
        onClick={onReset}
      >
        Log Another
      </Button>
    </div>
  )
}

type OperatorExpenseFormProps = {
  categories: SerialCategory[]
  machines: SerialMachine[]
  accounts: SerialAccount[]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export function OperatorExpenseForm({ categories, machines, accounts }: OperatorExpenseFormProps) {
  const [step, setStep] = React.useState<Step>(1)
  const [successInfo, setSuccessInfo] = React.useState<SuccessInfo | null>(null)

  const form = useForm<OperatorExpenseFormValues>({
    resolver: zodResolver(operatorExpenseSchema),
    defaultValues: {
      expenseCategoryId: '',
      machineId: null,
      date: today(),
      amount: 0,
      accountId: '',
      notes: '',
    },
  })

  const { isSubmitting, errors } = form.formState
  const watchedCategoryId = form.watch('expenseCategoryId')
  const watchedMachineId = form.watch('machineId')
  
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId)
  const selectedMachine = machines.find((m) => m.id === watchedMachineId)

  React.useEffect(() => {
    if (selectedCategory) {
      if (selectedCategory.appliesTo !== 'machine' && selectedCategory.appliesTo !== null) {
        form.setValue('machineId', null)
      }
    }
  }, [selectedCategory, form])

  async function handleNextStep() {
    const baseFields: (keyof OperatorExpenseFormValues)[] = ['expenseCategoryId', 'date']
    const valid = await form.trigger(baseFields)
    if (!valid) return

    if (selectedCategory?.appliesTo === 'machine' && !form.getValues('machineId')) {
      form.setError('machineId', { message: 'Machine is required for this category' })
      return
    }

    setStep(2)
  }

  function handleBack() {
    setStep(1)
  }

  async function onSubmit(values: OperatorExpenseFormValues) {
    if (!selectedCategory) return

    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    setSuccessInfo({
      categoryName: selectedCategory.name,
      amount: values.amount,
      date: new Date(values.date).toLocaleDateString('en-IN'),
    })
    setStep(3)
  }

  function handleReset() {
    setStep(1)
    setSuccessInfo(null)
    form.reset({
      expenseCategoryId: '',
      machineId: null,
      date: today(),
      amount: 0,
      accountId: '',
      notes: '',
    })
  }

  const { label, progress } = STEP_META[step]

  return (
    <div className="space-y-6">
      {step < 3 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{label}</span>
            <span className="text-muted-foreground">Step {step} of 2</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      {step === 3 && successInfo && (
        <SuccessCard info={successInfo} onReset={handleReset} />
      )}

      {step < 3 && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="expenseCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full min-h-[48px]">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="min-h-[44px]">
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

                {(selectedCategory?.appliesTo === 'machine' || selectedCategory?.appliesTo === null) && (
                  <FormField
                    control={form.control}
                    name="machineId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Machine {selectedCategory?.appliesTo === 'machine' && <span className="text-destructive">*</span>}</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === '_none' ? null : v)} value={field.value || '_none'}>
                          <FormControl>
                            <SelectTrigger className="w-full min-h-[48px]">
                              <SelectValue placeholder="Select machine" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="_none" className="min-h-[44px]">None</SelectItem>
                            {machines.map((m) => (
                              <SelectItem key={m.id} value={m.id} className="min-h-[44px]">
                                {m.name}
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
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="date" className="min-h-[48px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  id="step1-next-btn"
                  type="button"
                  className="w-full min-h-[52px] text-base font-semibold"
                  onClick={handleNextStep}
                >
                  Continue
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                {selectedCategory && (
                  <div className="rounded-xl bg-muted px-4 py-2.5 flex flex-col justify-center text-sm text-muted-foreground min-h-[48px]">
                    <span className="font-medium text-foreground truncate">{selectedCategory.name}</span>
                    {selectedMachine && (
                      <span className="text-xs mt-0.5 truncate">{selectedMachine.name}</span>
                    )}
                  </div>
                )}

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
                          className="min-h-[48px]"
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
                          <SelectTrigger className="w-full min-h-[48px]">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              No accounts available
                            </SelectItem>
                          ) : (
                            accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id} className="min-h-[44px]">
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
                    <FormItem>
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
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                )}

                <div className="flex gap-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[52px] px-4"
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    id="record-expense-submit-btn"
                    type="submit"
                    className="flex-1 min-h-[52px] text-base font-semibold"
                    disabled={isSubmitting || accounts.length === 0}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Log Expense
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      )}
    </div>
  )
}
