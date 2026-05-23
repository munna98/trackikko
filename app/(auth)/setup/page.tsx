'use client'

import { useState, forwardRef } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Building2, Wallet, CreditCard, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'

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

  const form1 = useForm<Step1>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: '', phone: '', address: '' },
  })
  const form2 = useForm<Step2>({
    resolver: zodResolver(step2Schema),
    defaultValues: { cashLabel: 'Petty Cash', cashBalance: '0' },
  })
  const form3 = useForm<Step3>({
    resolver: zodResolver(step3Schema),
    defaultValues: { bankLabel: 'Bank Account', bankBalance: '0' },
  })

  const handleStep1: SubmitHandler<Step1> = async (data) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/setup/business', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const b = await res.json() as { error?: string }; throw new Error(b.error ?? 'Failed') }
      const result = await res.json() as { businessId: string }
      setBusinessId(result.businessId)
      setCurrentStep(1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  const handleStep2: SubmitHandler<Step2> = async (data) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/setup/account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name: data.cashLabel, type: 'cash', openingBalance: Number(data.cashBalance) }),
      })
      if (!res.ok) { const b = await res.json() as { error?: string }; throw new Error(b.error ?? 'Failed') }
      setCurrentStep(2)
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  const handleStep3 = async (data: Step3 | null) => {
    if (data) {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/setup/account', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, name: data.bankLabel, type: 'bank', openingBalance: Number(data.bankBalance) }),
        })
        if (!res.ok) { const b = await res.json() as { error?: string }; throw new Error(b.error ?? 'Failed') }
      } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); setLoading(false); return }
      finally { setLoading(false) }
    }
    router.push('/dashboard')
  }

  const handleStep3Submit: SubmitHandler<Step3> = (data) => handleStep3(data)

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Trackikko Setup</h1>
          <p className="text-sm mt-1 text-muted-foreground">Let&rsquo;s get your business configured</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = idx === currentStep
            const isDone = idx < currentStep
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300
                    ${isDone ? 'bg-primary border-primary text-primary-foreground' : isActive ? 'bg-primary/20 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
                    {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-primary' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                    {step.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-8 h-0.5 rounded-full mb-4 ${idx < currentStep ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive mb-4" role="alert">
              {error}
            </div>
          )}

          {currentStep === 0 && (
            <form onSubmit={form1.handleSubmit(handleStep1)} noValidate className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground mb-2">Business Details</h2>
              <Field label="Business Name *" error={form1.formState.errors.name?.message}>
                <TextInput id="bus-name" placeholder="e.g. Sharma Excavators" hasError={!!form1.formState.errors.name} {...form1.register('name')} />
              </Field>
              <Field label="Phone">
                <TextInput id="bus-phone" placeholder="+91 98765 43210" hasError={false} {...form1.register('phone')} />
              </Field>
              <Field label="Address">
                <textarea id="bus-address" rows={2} placeholder="Business address" {...form1.register('address')}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring resize-none" />
              </Field>
              <Btn type="submit" loading={loading} icon={<ChevronRight className="w-4 h-4" />} iconRight>Next</Btn>
            </form>
          )}

          {currentStep === 1 && (
            <form onSubmit={form2.handleSubmit(handleStep2)} noValidate className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground mb-2">Cash Account</h2>
              <p className="text-sm text-muted-foreground mb-4">Your primary petty cash account.</p>
              <Field label="Account Label *" error={form2.formState.errors.cashLabel?.message}>
                <TextInput id="cash-label" placeholder="Petty Cash" hasError={!!form2.formState.errors.cashLabel} {...form2.register('cashLabel')} />
              </Field>
              <Field label="Opening Balance (₹)" error={form2.formState.errors.cashBalance?.message}>
                <TextInput id="cash-balance" type="number" placeholder="0" hasError={!!form2.formState.errors.cashBalance} {...form2.register('cashBalance')} />
              </Field>
              <div className="flex gap-3">
                <Btn type="button" variant="secondary" onClick={() => setCurrentStep(0)} icon={<ChevronLeft className="w-4 h-4" />}>Back</Btn>
                <Btn type="submit" loading={loading} icon={<ChevronRight className="w-4 h-4" />} iconRight>Next</Btn>
              </div>
            </form>
          )}

          {currentStep === 2 && (
            <form onSubmit={form3.handleSubmit(handleStep3Submit)} noValidate className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground mb-2">Bank Account</h2>
              <p className="text-sm text-muted-foreground mb-4">Optional — add later in Settings.</p>
              <Field label="Account Label *" error={form3.formState.errors.bankLabel?.message}>
                <TextInput id="bank-label" placeholder="Bank Account" hasError={!!form3.formState.errors.bankLabel} {...form3.register('bankLabel')} />
              </Field>
              <Field label="Opening Balance (₹)" error={form3.formState.errors.bankBalance?.message}>
                <TextInput id="bank-balance" type="number" placeholder="0" hasError={!!form3.formState.errors.bankBalance} {...form3.register('bankBalance')} />
              </Field>
              <div className="flex gap-3">
                <Btn type="button" variant="secondary" onClick={() => setCurrentStep(1)} icon={<ChevronLeft className="w-4 h-4" />}>Back</Btn>
                <Btn type="button" variant="ghost" onClick={() => handleStep3(null)} loading={loading}>Skip</Btn>
                <Btn type="submit" loading={loading} icon={<Check className="w-4 h-4" />} iconRight>Finish</Btn>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError: boolean }>(
  ({ hasError, ...props }, ref) => (
    <input ref={ref}
      className="w-full rounded-lg border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring"
      style={{ borderColor: hasError ? 'var(--destructive)' : 'var(--input)' }}
      {...props} />
  )
)
TextInput.displayName = 'TextInput'

function Btn({ children, loading, icon, iconRight, variant = 'primary', type = 'button', onClick }: {
  children: React.ReactNode; loading?: boolean; icon?: React.ReactNode; iconRight?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'; type?: 'submit' | 'button'; onClick?: () => void
}) {
  return (
    <button type={type} disabled={loading} onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed
        ${variant === 'primary' ? 'bg-primary text-primary-foreground hover:opacity-90' : ''}
        ${variant === 'secondary' ? 'bg-muted border border-border text-foreground hover:bg-accent' : ''}
        ${variant === 'ghost' ? 'text-muted-foreground hover:text-foreground' : ''}`}>
      {loading && !iconRight && <Loader2 className="w-4 h-4 animate-spin" />}
      {!iconRight && !loading && icon}
      {children}
      {iconRight && !loading && icon}
      {loading && iconRight && <Loader2 className="w-4 h-4 animate-spin" />}
    </button>
  )
}
