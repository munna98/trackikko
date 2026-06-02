'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowDownToLine } from 'lucide-react'
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

const advanceSchema = z.object({
  partyId: z.string().min(1, 'Party is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  accountId: z.string().min(1, 'Account is required'),
  notes: z.string().optional(),
})

type AdvanceFormValues = z.infer<typeof advanceSchema>

export type PartyOption = { id: string; name: string }
export type AccountOption = { id: string; name: string; type: string }

type GlobalPartyAdvanceDialogProps = {
  parties: PartyOption[]
  accounts: AccountOption[]
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function GlobalPartyAdvanceDialog({
  parties,
  accounts,
}: GlobalPartyAdvanceDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  const form = useForm<AdvanceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(advanceSchema) as any,
    defaultValues: {
      partyId: '',
      date: todayIso(),
      amount: 0,
      accountId: '',
      notes: '',
    },
  })

  async function onSubmit(values: AdvanceFormValues) {
    const { partyId, ...rest } = values
    const res = await fetch(`/api/parties/${partyId}/advances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    })

    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset({
      partyId: '',
      date: todayIso(),
      amount: 0,
      accountId: '',
      notes: '',
    })
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="log-party-advance-btn">
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          Log Advance
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Party Advance</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Party */}
            <FormField
              control={form.control}
              name="partyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Party <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger id="advance-party-select">
                        <SelectValue placeholder="Select party" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {parties.length === 0 ? (
                        <SelectItem value="__none" disabled>
                          No parties available
                        </SelectItem>
                      ) : (
                        parties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
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

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Amount (₹) <span className="text-destructive">*</span>
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

            {/* Account */}
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
                      <SelectTrigger id="advance-account-select">
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

            {/* Notes */}
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
              disabled={isSubmitting || accounts.length === 0 || parties.length === 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Advance
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
