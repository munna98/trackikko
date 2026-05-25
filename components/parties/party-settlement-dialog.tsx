'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import { formatINR } from '@/lib/utils'

const settlementSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amountReceived: z.coerce.number().min(0, 'Amount must be ≥ 0'),
  writeoffAmount: z.coerce.number().min(0).default(0),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type SettlementFormValues = z.infer<typeof settlementSchema>

type AccountOption = { id: string; name: string; type: string }

type PartySettlementDialogProps = {
  partyId: string
  runningBalance: number
  accounts: AccountOption[]
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function PartySettlementDialog({
  partyId,
  runningBalance,
  accounts,
}: PartySettlementDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<SettlementFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settlementSchema) as any,
    defaultValues: {
      date: todayIso(),
      amountReceived: 0,
      writeoffAmount: 0,
      accountId: '',
      notes: '',
    },
  })

  const watchedReceived = form.watch('amountReceived')
  const watchedWriteoff = form.watch('writeoffAmount')
  const balanceAfter = runningBalance - (Number(watchedReceived) || 0) - (Number(watchedWriteoff) || 0)

  async function onSubmit(values: SettlementFormValues) {
    const res = await fetch(`/api/parties/${partyId}/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset({
      date: todayIso(),
      amountReceived: 0,
      writeoffAmount: 0,
      accountId: '',
      notes: '',
    })
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" id="record-settlement-btn">
          <CheckCircle className="mr-2 h-4 w-4" />
          Record Settlement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Settlement</DialogTitle>
        </DialogHeader>

        {/* Current balance */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 mb-2">
          <p className="text-xs text-muted-foreground mb-0.5">Current Balance</p>
          <p className={`text-xl font-bold ${runningBalance > 0 ? 'text-destructive' : runningBalance < 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {runningBalance > 0
              ? `${formatINR(runningBalance)} Dr`
              : runningBalance < 0
              ? `${formatINR(Math.abs(runningBalance))} Cr`
              : 'Settled'}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Date <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amountReceived"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount Received (₹) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="writeoffAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Writeoff Amount (₹){' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      placeholder="0"
                      {...field}
                      value={field.value ?? 0}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Bad debt / amount waived off
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Balance preview */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Balance after settlement: </span>
              <span
                className={`font-semibold ${
                  balanceAfter > 0
                    ? 'text-destructive'
                    : balanceAfter < 0
                    ? 'text-amber-500'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {balanceAfter === 0
                  ? 'Settled ✓'
                  : balanceAfter > 0
                  ? `${formatINR(balanceAfter)} Dr`
                  : `${formatINR(Math.abs(balanceAfter))} Cr`}
              </span>
            </div>

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Received In Account <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger id="settlement-account-select">
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
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}{' '}
                            <span className="text-muted-foreground text-xs capitalize">
                              ({a.type})
                            </span>
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
                  <FormLabel>
                    Notes{' '}
                    <span className="text-muted-foreground text-xs">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes…"
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

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || accounts.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Settlement
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
