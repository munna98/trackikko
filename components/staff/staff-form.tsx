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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'] as const
const DESIGNATIONS = ['Operator', 'Driver', 'Supervisor', 'Assistant', 'Manager']
const ROLES = [
  { id: 'admin', label: 'Admin' },
  { id: 'accountant', label: 'Accountant' },
  { id: 'operator', label: 'Operator' },
] as const

const staffSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  roleId: z.enum(['admin', 'accountant', 'operator']),
  mobile: z.string().optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  designation: z.string().optional(),
  defaultBatha: z.coerce.number().min(0).default(0),
  salary: z.coerce.number().min(0).default(0),
})

type StaffFormValues = z.infer<typeof staffSchema>

type StaffFormProps = {
  defaultValues?: Partial<StaffFormValues> & { id?: string }
  onSuccess: (message?: string) => void
  currentUserId?: string
}

export function StaffForm({ defaultValues, onSuccess, currentUserId }: StaffFormProps) {
  const router = useRouter()
  const isEdit = Boolean(defaultValues?.id)
  const isSelf = isEdit && defaultValues?.id === currentUserId

  const form = useForm<StaffFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(staffSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      roleId: defaultValues?.roleId ?? 'operator',
      mobile: defaultValues?.mobile ?? '',
      address: defaultValues?.address ?? '',
      bloodGroup: defaultValues?.bloodGroup ?? '',
      designation: defaultValues?.designation ?? '',
      defaultBatha: defaultValues?.defaultBatha ?? 0,
      salary: defaultValues?.salary ?? 0,
    },
  })

  async function onSubmit(values: StaffFormValues) {
    const url = isEdit ? `/api/staff/${defaultValues?.id}` : '/api/staff'
    const method = isEdit ? 'PATCH' : 'POST'

    // Don't send email on edit
    const body = isEdit ? { ...values, email: undefined } : values

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
    onSuccess(isEdit ? undefined : `Invite sent to ${values.email}`)
  }

  const { isSubmitting, errors } = form.formState

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="e.g. Raju Singh" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  {...field}
                  readOnly={isEdit}
                  className={isEdit ? 'opacity-60 cursor-not-allowed' : ''}
                />
              </FormControl>
              {isEdit && <FormDescription>Email cannot be changed after creation.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="roleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSelf}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && <FormDescription>You cannot change your own role.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="mobile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+91 98765 43210" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input
                  list="designation-suggestions"
                  placeholder="Operator, Driver, Supervisor..."
                  {...field}
                />
              </FormControl>
              <datalist id="designation-suggestions">
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bloodGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Group <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {BLOOD_GROUPS.map((bg) => (
                    <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Salary (₹)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultBatha"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Batha (₹/day)</FormLabel>
                <FormControl>
                  <Input type="number" min={0} placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Textarea placeholder="Village, District, State" rows={2} {...field} />
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
          {isEdit ? 'Save Changes' : 'Send Invite'}
        </Button>
      </form>
    </Form>
  )
}
