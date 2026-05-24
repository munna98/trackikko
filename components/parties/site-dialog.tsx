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

const siteSchema = z.object({
  name: z.string().min(1, 'Site name is required'),
  location: z.string().optional(),
})

type SiteFormValues = z.infer<typeof siteSchema>

type Site = { id: string; name: string; location?: string }

type SiteDialogProps = {
  partyId: string
  defaultValues?: Site
  trigger?: React.ReactNode
}

export function SiteDialog({ partyId, defaultValues, trigger }: SiteDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const isEdit = Boolean(defaultValues?.id)

  const form = useForm<SiteFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(siteSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      location: defaultValues?.location ?? '',
    },
  })

  async function onSubmit(values: SiteFormValues) {
    const url = isEdit
      ? `/api/parties/${partyId}/sites/${defaultValues?.id}`
      : `/api/parties/${partyId}/sites`
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: values.name,
        location: values.location || null,
      }),
    })

    if (!res.ok) {
      const data = await res.json() as { error?: string }
      form.setError('root', { message: data.error ?? 'Something went wrong' })
      return
    }

    router.refresh()
    setOpen(false)
    form.reset()
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" id={isEdit ? `edit-site-${defaultValues?.id}` : 'add-site-btn'}>
            {isEdit ? (
              <><Pencil className="mr-2 h-4 w-4" />Edit</>
            ) : (
              <><Plus className="mr-2 h-4 w-4" />Add Site</>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Site' : 'Add Site'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Site Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g. Main Quarry Site" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                <FormControl><Input placeholder="e.g. NH-48, km 34" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Site'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
