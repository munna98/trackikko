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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const machineSchema = z.object({
  machineTypeId: z.string().min(1, 'Select a machine type'),
  name: z.string().min(1, 'Name is required'),
  identifier: z.string().optional(),
  capacity: z.string().optional(),
  currentMeterReading: z.coerce.number().min(0),
})

type MachineFormValues = z.infer<typeof machineSchema>

type MachineType = {
  id: string
  name: string
  trackingUnit: 'hours' | 'trips' | 'km'
}

type MachineFormProps = {
  machineTypes: MachineType[]
  defaultValues?: Partial<MachineFormValues> & { id?: string }
  onSuccess: () => void
}

const READING_LABELS: Record<string, string> = {
  hours: 'Opening Hours (hrs)',
  trips: 'Opening Trips',
  km: 'Opening KM',
}

export function MachineForm({ machineTypes, defaultValues, onSuccess }: MachineFormProps) {
  const router = useRouter()
  const isEdit = Boolean(defaultValues?.id)

  const form = useForm<MachineFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(machineSchema) as any,
    defaultValues: {
      machineTypeId: defaultValues?.machineTypeId ?? '',
      name: defaultValues?.name ?? '',
      identifier: defaultValues?.identifier ?? '',
      capacity: defaultValues?.capacity ?? '',
      currentMeterReading: defaultValues?.currentMeterReading ?? 0,
    },
  })

  const watchedTypeId = form.watch('machineTypeId')
  const selectedType = machineTypes.find((t) => t.id === watchedTypeId)
  const readingLabel = selectedType ? (READING_LABELS[selectedType.trackingUnit] ?? 'Opening Reading') : 'Opening Reading'

  async function onSubmit(values: MachineFormValues) {
    const url = isEdit ? `/api/machines/${defaultValues?.id}` : '/api/machines'
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
    onSuccess()
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Machine Type — read-only on edit */}
        <FormField
          control={form.control}
          name="machineTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Type <span className="text-destructive">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isEdit}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select machine type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {machineTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Machine Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g. Hitachi 140" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Identifier <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input placeholder="Registration number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input placeholder="140T / 10 Wheeler" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentMeterReading"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{readingLabel} <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input type="number" min={0} step="any" placeholder="0" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save Changes' : 'Add Machine'}
        </Button>
      </form>
    </Form>
  )
}
