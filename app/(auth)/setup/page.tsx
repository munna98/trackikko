'use client'

import { useState, forwardRef } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Building2, Wallet, CreditCard, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'

// --- Zod Schemas ---
const step1Schema = z.object({
  name: z.string().min(1, 'Business name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
})

const step2Schema = z.object({
  cashLabel: z.string().min(1, 'Account label is required'),
  cashBalance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Balance must be 0 or more'),
})

const step3Schema = z.object({
  bankLabel: z.string().min(1, 'Account label is required'),
  bankBalance: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Balance must be 0 or more'),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

const steps = [
  { label: 'Business', icon: Building2 },
  { label: 'Cash Account', icon: Wallet },
  { label: 'Bank Account', icon: CreditCard },
]

export default function SetupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)

  // Step 1 form
  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', phone: '', address: '' },
  })

  // Step 2 form
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { cashLabel: 'Petty Cash', cashBalance: '0' },
  })

  // Step 3 form
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { bankLabel: 'Bank Account', bankBalance: '0' },
  })

  // Step 1: Create business
  const handleStep1: SubmitHandler<Step1> = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/setup/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to create business')
      }
      const result = await res.json() as { businessId: string }
      setBusinessId(result.businessId)
      setCurrentStep(1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Create cash account
  const handleStep2: SubmitHandler<Step2> = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/setup/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name: data.cashLabel,
          type: 'cash',
          openingBalance: Number(data.cashBalance),
        }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to create account')
      }
      setCurrentStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Create bank account (optional)
  const handleStep3 = async (data: Step3 | null) => {
    if (data) {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/setup/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            name: data.bankLabel,
            type: 'bank',
            openingBalance: Number(data.bankBalance),
          }),
        })
        if (!res.ok) {
          const body = await res.json()
          throw new Error(body.error ?? 'Failed to create bank account')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setLoading(false)
        return
      } finally {
        setLoading(false)
      }
    }
    router.push('/dashboard')
  }

  const handleStep3Submit: SubmitHandler<Step3> = (data) => handleStep3(data)

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.28 0.08 50 / 0.4) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, oklch(0.22 0.06 45 / 0.3) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'oklch(0.94 0.03 75)' }}>
            Trackikko Setup
          </h1>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.05 65)' }}>
            Let&rsquo;s get your business configured
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === currentStep
            const isDone = idx < currentStep
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300"
                    style={{
                      background: isDone
                        ? 'oklch(0.76 0.14 75)'
                        : isActive
                        ? 'oklch(0.76 0.14 75 / 0.2)'
                        : 'oklch(0.22 0.04 48)',
                      border: isActive
                        ? '2px solid oklch(0.76 0.14 75)'
                        : isDone
                        ? '2px solid oklch(0.76 0.14 75)'
                        : '2px solid oklch(0.28 0.05 50)',
                      color: isDone
                        ? 'oklch(0.12 0.03 50)'
                        : isActive
                        ? 'oklch(0.76 0.14 75)'
                        : 'oklch(0.50 0.04 60)',
                    }}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isActive
                        ? 'oklch(0.76 0.14 75)'
                        : isDone
                        ? 'oklch(0.65 0.10 70)'
                        : 'oklch(0.45 0.04 55)',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className="w-8 h-0.5 rounded-full mb-4"
                    style={{
                      background:
                        idx < currentStep
                          ? 'oklch(0.76 0.14 75)'
                          : 'oklch(0.28 0.05 50)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 shadow-2xl"
          style={{
            background: 'oklch(0.17 0.04 45)',
            borderColor: 'oklch(0.28 0.05 50)',
          }}
        >
          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm mb-4"
              style={{
                background: 'oklch(0.22 0.06 25 / 0.4)',
                borderWidth: '1px',
                borderColor: 'oklch(0.55 0.22 25 / 0.5)',
                color: 'oklch(0.75 0.15 25)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Step 1 */}
          {currentStep === 0 && (
            <form onSubmit={form1.handleSubmit(handleStep1)} noValidate className="space-y-4">
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'oklch(0.94 0.03 75)' }}>
                Business Details
              </h2>

              <FieldGroup label="Business Name *" error={form1.formState.errors.name?.message}>
                <InputField id="bus-name" placeholder="e.g. Sharma Excavators" {...form1.register('name')} hasError={!!form1.formState.errors.name} />
              </FieldGroup>

              <FieldGroup label="Phone" error={undefined}>
                <InputField id="bus-phone" placeholder="+91 98765 43210" {...form1.register('phone')} hasError={false} />
              </FieldGroup>

              <FieldGroup label="Address" error={undefined}>
                <textarea
                  id="bus-address"
                  placeholder="Business address"
                  rows={2}
                  {...form1.register('address')}
                  className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 resize-none"
                  style={{
                    background: 'oklch(0.22 0.04 48)',
                    borderWidth: '1px',
                    borderColor: 'oklch(0.28 0.05 50)',
                    color: 'oklch(0.94 0.03 75)',
                  }}
                />
              </FieldGroup>

              <Btn type="submit" loading={loading} icon={<ChevronRight className="w-4 h-4" />} iconRight>
                Next
              </Btn>
            </form>
          )}

          {/* Step 2 */}
          {currentStep === 1 && (
            <form onSubmit={form2.handleSubmit(handleStep2)} noValidate className="space-y-4">
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'oklch(0.94 0.03 75)' }}>
                Cash Account
              </h2>
              <p className="text-sm mb-4" style={{ color: 'oklch(0.65 0.05 65)' }}>
                This will be your primary petty cash account.
              </p>

              <FieldGroup label="Account Label *" error={form2.formState.errors.cashLabel?.message}>
                <InputField id="cash-label" placeholder="Petty Cash" {...form2.register('cashLabel')} hasError={!!form2.formState.errors.cashLabel} />
              </FieldGroup>

              <FieldGroup label="Opening Balance (₹)" error={form2.formState.errors.cashBalance?.message}>
                <InputField id="cash-balance" type="number" placeholder="0" {...form2.register('cashBalance')} hasError={!!form2.formState.errors.cashBalance} />
              </FieldGroup>

              <div className="flex gap-3">
                <Btn type="button" variant="secondary" onClick={() => setCurrentStep(0)} icon={<ChevronLeft className="w-4 h-4" />}>
                  Back
                </Btn>
                <Btn type="submit" loading={loading} icon={<ChevronRight className="w-4 h-4" />} iconRight>
                  Next
                </Btn>
              </div>
            </form>
          )}

          {/* Step 3 */}
          {currentStep === 2 && (
            <form
              onSubmit={form3.handleSubmit(handleStep3Submit)}
              noValidate
              className="space-y-4"
            >
              <h2 className="text-lg font-semibold mb-2" style={{ color: 'oklch(0.94 0.03 75)' }}>
                Bank Account
              </h2>
              <p className="text-sm mb-4" style={{ color: 'oklch(0.65 0.05 65)' }}>
                Optional — you can skip this and add it later in Settings.
              </p>

              <FieldGroup label="Account Label *" error={form3.formState.errors.bankLabel?.message}>
                <InputField id="bank-label" placeholder="Bank Account" {...form3.register('bankLabel')} hasError={!!form3.formState.errors.bankLabel} />
              </FieldGroup>

              <FieldGroup label="Opening Balance (₹)" error={form3.formState.errors.bankBalance?.message}>
                <InputField id="bank-balance" type="number" placeholder="0" {...form3.register('bankBalance')} hasError={!!form3.formState.errors.bankBalance} />
              </FieldGroup>

              <div className="flex gap-3">
                <Btn type="button" variant="secondary" onClick={() => setCurrentStep(1)} icon={<ChevronLeft className="w-4 h-4" />}>
                  Back
                </Btn>
                <Btn type="button" variant="ghost" onClick={() => handleStep3(null)} loading={loading}>
                  Skip
                </Btn>
                <Btn type="submit" loading={loading} icon={<Check className="w-4 h-4" />} iconRight>
                  Finish
                </Btn>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

// ---- Shared mini-components ----

function FieldGroup({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: 'oklch(0.80 0.04 70)' }}>
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs" style={{ color: 'oklch(0.65 0.18 25)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

const InputField = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { hasError: boolean }
>(({ hasError, ...props }, ref) => (
  <input
    ref={ref}
    className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 border"
    style={{
      background: 'oklch(0.22 0.04 48)',
      borderColor: hasError ? 'oklch(0.55 0.22 25)' : 'oklch(0.28 0.05 50)',
      color: 'oklch(0.94 0.03 75)',
    }}
    {...props}
  />
))
InputField.displayName = 'InputField'

function Btn({
  children,
  loading,
  icon,
  iconRight,
  variant = 'primary',
  type = 'button',
  onClick,
}: {
  children: React.ReactNode
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'submit' | 'button'
  onClick?: () => void
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: loading ? 'oklch(0.65 0.10 75)' : 'oklch(0.76 0.14 75)',
      color: 'oklch(0.12 0.03 50)',
    },
    secondary: {
      background: 'oklch(0.22 0.04 48)',
      color: 'oklch(0.80 0.04 70)',
      border: '1px solid oklch(0.28 0.05 50)',
    },
    ghost: {
      background: 'transparent',
      color: 'oklch(0.65 0.05 65)',
    },
  }

  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      style={styles[variant]}
    >
      {loading && !iconRight && <Loader2 className="w-4 h-4 animate-spin" />}
      {!iconRight && !loading && icon}
      {children}
      {iconRight && !loading && icon}
      {loading && iconRight && <Loader2 className="w-4 h-4 animate-spin" />}
    </button>
  )
}
