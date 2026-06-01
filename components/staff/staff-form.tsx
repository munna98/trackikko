'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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

const slugify = (str: string) => {
  return str.toLowerCase().trim().split(' ')[0].replace(/[^a-z0-9]/g, '') || ''
}

const getStaffSchema = (isEdit: boolean) => z.object({
  name: z.string().min(1, 'Name is required'),
  roleId: z.enum(['admin', 'accountant', 'operator']),
  email: z.string().optional().or(z.literal('')),
  username: z.string().optional().or(z.literal('')),
  password: z.string().optional().or(z.literal('')),
  pin: z.string().optional().or(z.literal('')),
  resetCredentials: z.boolean().optional(),
  mobile: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  bloodGroup: z.string().optional().or(z.literal('')),
  designation: z.string().optional().or(z.literal('')),
  baseSalary: z.coerce
    .number()
    .positive('Base salary must be positive')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v === '' || v == null ? null : Number(v))),
}).superRefine((data, ctx) => {
  // Check if role is admin or accountant
  if (data.roleId === 'admin' || data.roleId === 'accountant') {
    if (!data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required',
      })
    } else {
      const emailRes = z.string().email().safeParse(data.email)
      if (!emailRes.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Enter a valid email',
        })
      }
    }
  }

  // Username validation for operator (both creation and edit mode)
  if (data.roleId === 'operator') {
    if (!data.username) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['username'],
        message: 'Username is required',
      })
    } else if (!/^[a-z0-9_]+$/.test(data.username)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['username'],
        message: 'Username must contain only letters, numbers, or underscores',
      })
    }
  }

  // Password / PIN validation
  if (!isEdit) {
    if (data.roleId === 'operator') {
      if (!data.pin) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pin'],
          message: 'PIN is required',
        })
      } else if (!/^\d{4}$/.test(data.pin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pin'],
          message: 'PIN must be exactly 4 digits (numeric only)',
        })
      }
    } else {
      if (!data.password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password is required',
        })
      } else if (data.password.length < 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password must be at least 6 characters',
        })
      }
    }
  } else {
    // Edit mode with credentials reset toggled
    if (data.resetCredentials) {
      if (data.roleId === 'operator') {
        if (!data.pin) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pin'],
            message: 'New PIN is required',
          })
        } else if (!/^\d{4}$/.test(data.pin)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pin'],
            message: 'PIN must be exactly 4 digits (numeric only)',
          })
        }
      } else {
        if (!data.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'New password is required',
          })
        } else if (data.password.length < 6) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['password'],
            message: 'Password must be at least 6 characters',
          })
        }
      }
    }
  }
})

type StaffFormValues = z.infer<ReturnType<typeof getStaffSchema>>

export type StaffDefaultValues = {
  id?: string
  name?: string
  email?: string | null
  username?: string | null
  roleId?: 'admin' | 'accountant' | 'operator'
  mobile?: string | null
  address?: string | null
  bloodGroup?: string | null
  designation?: string | null
  baseSalary?: number | null
}

type StaffFormProps = {
  defaultValues?: StaffDefaultValues
  onSuccess: (message?: string) => void
  currentUserId?: string
}

export function StaffForm({ defaultValues, onSuccess, currentUserId }: StaffFormProps) {
  const router = useRouter()
  const isEdit = Boolean(defaultValues?.id)
  const isSelf = isEdit && defaultValues?.id === currentUserId
  const prevNameRef = React.useRef('')

  const schema = React.useMemo(() => getStaffSchema(isEdit), [isEdit])

  const form = useForm<StaffFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
      username: defaultValues?.username ?? '',
      roleId: defaultValues?.roleId ?? 'operator',
      password: '',
      pin: '',
      resetCredentials: false,
      mobile: defaultValues?.mobile ?? '',
      address: defaultValues?.address ?? '',
      bloodGroup: defaultValues?.bloodGroup ?? '',
      designation: defaultValues?.designation ?? '',
      baseSalary: defaultValues?.baseSalary ?? undefined,
    },
  })

  const nameValue = form.watch('name')
  const roleIdValue = form.watch('roleId')
  const resetCredentialsValue = form.watch('resetCredentials')

  React.useEffect(() => {
    if (!isEdit && roleIdValue === 'operator' && nameValue !== undefined) {
      const currentUsername = form.getValues('username')
      const prevGenerated = slugify(prevNameRef.current)
      if (!currentUsername || currentUsername === prevGenerated) {
        form.setValue('username', slugify(nameValue))
      }
      prevNameRef.current = nameValue
    }
  }, [nameValue, roleIdValue, isEdit, form])

  async function onSubmit(values: StaffFormValues) {
    try {
      if (isEdit && values.resetCredentials) {
        // If resetting credentials, hit reset-password endpoint first
        const credRes = await fetch(`/api/staff/${defaultValues?.id}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newPassword: values.roleId === 'operator' ? values.pin : values.password,
          }),
        })

        if (!credRes.ok) {
          const data = await credRes.json() as { error?: string }
          form.setError('root', { message: data.error ?? 'Failed to reset credentials' })
          return
        }
      }

      const url = isEdit ? `/api/staff/${defaultValues?.id}` : '/api/staff'
      const method = isEdit ? 'PATCH' : 'POST'

      // Map pin to password field for API endpoint during operator creation
      const password = values.roleId === 'operator' ? values.pin : values.password

      // Remove password/pin/resetCredentials from profile payload
      const payload = {
        name: values.name,
        roleId: values.roleId,
        username: values.roleId === 'operator' ? (values.username || null) : null,
        email: values.email || undefined,
        mobile: values.mobile || null,
        address: values.address || null,
        bloodGroup: values.bloodGroup || null,
        designation: values.designation || null,
        baseSalary: values.baseSalary ?? null,
        ...(!isEdit && { password }), // Only sent on create
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        form.setError('root', { message: data.error ?? 'Something went wrong' })
        return
      }

      const data = await res.json() as { username?: string }

      router.refresh()

      if (isEdit) {
        onSuccess(values.resetCredentials ? 'Changes saved and credentials reset successfully!' : 'Changes saved successfully!')
      } else {
        if (values.roleId === 'operator') {
          onSuccess(`Operator created! Username is "${data.username ?? values.username}" and PIN is "${values.pin}"`)
        } else {
          onSuccess(`Staff member created successfully!`)
        }
      }
    } catch (err) {
      console.error('[onSubmit StaffForm]', err)
      form.setError('root', { message: 'An unexpected error occurred' })
    }
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

        {/* Email field (only for admin and accountant) */}
        {(roleIdValue === 'admin' || roleIdValue === 'accountant') && (
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
        )}

        {/* Username field (only for operator) */}
        {roleIdValue === 'operator' && (
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. raju"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  {isEdit ? 'Used by operator to log in.' : 'Auto-generated from name. Used by operator to log in.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Security Credentials Section */}
        {!isEdit ? (
          <>
            {roleIdValue === 'operator' ? (
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Login PIN <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="4 digit PIN (e.g. 1234)"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Operator will type this on the numeric pad to log in.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 6 characters"
                        {...field}
                      />
                    </FormControl>
                    {roleIdValue === 'admin' && (
                      <FormDescription className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                        Admin will be forced to change this on their first login.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        ) : (
          <div className="space-y-4 border border-border/60 rounded-xl p-4 bg-muted/20">
            <FormField
              control={form.control}
              name="resetCredentials"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">Reset {roleIdValue === 'operator' ? 'PIN' : 'Password'}</FormLabel>
                    <FormDescription className="text-xs">
                      Enable this to reset security credentials.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {resetCredentialsValue && (
              <>
                {roleIdValue === 'operator' ? (
                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New PIN <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="4 digit PIN (e.g. 5678)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="At least 6 characters"
                            {...field}
                          />
                        </FormControl>
                        {roleIdValue === 'admin' && (
                          <FormDescription className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                            Admin will be forced to change this on next login.
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}
          </div>
        )}

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
          name="baseSalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Base Salary (₹) <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 15000"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormDescription className="text-xs">
                Auto-populated in Record Payment form.
              </FormDescription>
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
          {isEdit ? 'Save Changes' : 'Create Staff Member'}
        </Button>
      </form>
    </Form>
  )
}
