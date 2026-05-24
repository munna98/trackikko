'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const machineTypeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  trackingUnit: z.enum(['hours', 'trips', 'km']),
  hasModes: z.boolean().default(false),
  isBillable: z.boolean().default(true),
})

type MachineTypeFormValues = z.infer<typeof machineTypeSchema>

type MachineTypeRow = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
  hasModes: boolean
  isBillable: boolean
}

type MachineTypeDialogProps = {
  defaultValues?: MachineTypeRow
}

export function MachineTypeDialog({ defaultValues }: MachineTypeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  const form = useForm<MachineTypeFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(machineTypeSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      trackingUnit: defaultValues?.trackingUnit ?? 'hours',
      hasModes: defaultValues?.hasModes ?? false,
      isBillable: defaultValues?.isBillable ?? true,
    },
  })

  async function onSubmit(values: MachineTypeFormValues) {
    const url = isEdit
      ? `/api/settings/machine-types/${defaultValues?.id}`
      : '/api/settings/machine-types'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
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
        <Button size="sm" id={isEdit ? `edit-machine-type-${defaultValues?.id}` : 'add-machine-type-btn'}>
          {isEdit ? <><Pencil className="mr-2 h-4 w-4" />Edit</> : <><Plus className="mr-2 h-4 w-4" />Add Machine Type</>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Machine Type' : 'Add Machine Type'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Excavator, Tipper" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="trackingUnit" render={({ field }) => (
              <FormItem>
                <FormLabel>Tracking Unit <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="trips">Trips</SelectItem>
                    <SelectItem value="km">KM</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hasModes" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Has Modes</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Supports bucket/breaking modes (Excavator only)</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="isBillable" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Is Billable</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">Jobs generate revenue (turn off for Car/Bike)</p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )} />
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Machine Type'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
