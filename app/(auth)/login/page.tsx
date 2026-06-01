'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import logoImg from '@/public/logo.png'
import { Loader2, Delete } from 'lucide-react'

// ─── Schemas ────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  login: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const operatorSchema = z.object({
  login: z.string().min(1, 'Username is required'),
  password: z.string().length(4, 'PIN must be exactly 4 digits'),
})

type EmailForm = z.infer<typeof emailSchema>
type OperatorForm = z.infer<typeof operatorSchema>

// ─── PIN Pad ─────────────────────────────────────────────────────────────────

function PinPad({ pin, onChange }: { pin: string; onChange: (p: string) => void }) {
  const MAX = 4
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']

  const press = (key: string) => {
    if (key === 'back') { onChange(pin.slice(0, -1)); return }
    if (key === 'clear') { onChange(''); return }
    if (pin.length < MAX) onChange(pin + key)
  }

  return (
    <div className="space-y-3">
      {/* PIN display */}
      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: MAX }).map((_, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border-2 transition-all duration-150"
            style={{
              backgroundColor: i < pin.length ? 'var(--primary)' : 'transparent',
              borderColor: i < pin.length ? 'var(--primary)' : 'var(--border)',
            }}
          />
        ))}
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className="flex items-center justify-center h-14 rounded-xl border border-border bg-card text-foreground font-semibold text-lg transition-all duration-100 active:scale-95 hover:bg-muted hover:border-ring"
            style={{ fontSize: key === 'back' || key === 'clear' ? '0.7rem' : undefined }}
          >
            {key === 'back' ? <Delete className="w-5 h-5" /> : key === 'clear' ? 'CLR' : key}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'email' | 'operator'>('email')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pin, setPin] = useState('')

  // Email form
  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) })

  // Operator form
  const operatorForm = useForm<OperatorForm>({ resolver: zodResolver(operatorSchema) })

  const handleRedirect = (roleId: string, businessId: string | null, mustChangePassword: boolean) => {
    if (mustChangePassword) { router.push('/set-password'); return }
    if (roleId === 'master_admin') { router.push('/master'); return }
    if (!businessId) { router.push('/setup'); return }
    if (roleId === 'operator') { router.push('/operator/my-records'); return }
    router.push('/dashboard')
  }

  // Email login submit
  const onEmailSubmit = async (data: EmailForm) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: data.login, password: data.password }),
      })
      if (!res.ok) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }
      const result = await res.json() as { roleId: string; businessId: string | null; mustChangePassword: boolean }
      handleRedirect(result.roleId, result.businessId, result.mustChangePassword)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // Operator login submit
  const onOperatorSubmit = async (data: OperatorForm) => {
    if (pin.length < 4) {
      operatorForm.setError('password', { message: 'Enter at least 4 digits' })
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: data.login, password: pin }),
      })
      if (!res.ok) {
        setError('Invalid username or PIN')
        setLoading(false)
        return
      }
      const result = await res.json() as { roleId: string; businessId: string | null; mustChangePassword: boolean }
      handleRedirect(result.roleId, result.businessId, result.mustChangePassword)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const switchMode = (next: 'email' | 'operator') => {
    setMode(next)
    setError(null)
    setPin('')
    emailForm.reset()
    operatorForm.reset()
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src={logoImg} alt="Trackikko Logo" className="h-16 w-auto object-contain" priority />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Trackikko</h1>
          <p className="text-sm mt-1 text-muted-foreground">Heavy Equipment Management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-6 text-card-foreground">
            {mode === 'email' ? 'Sign in to your account' : 'Operator Login'}
          </h2>

          {/* ── EMAIL MODE ─────────────────────────────────────────── */}
          {mode === 'email' && (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Email address</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...emailForm.register('login')}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                  style={{ borderColor: emailForm.formState.errors.login ? 'var(--destructive)' : undefined }}
                />
                {emailForm.formState.errors.login && (
                  <p className="text-xs text-destructive">{emailForm.formState.errors.login.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...emailForm.register('password')}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                  style={{ borderColor: emailForm.formState.errors.password ? 'var(--destructive)' : undefined }}
                />
                {emailForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{emailForm.formState.errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              <button
                id="sign-in-btn"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── OPERATOR MODE ──────────────────────────────────────── */}
          {mode === 'operator' && (
            <form onSubmit={operatorForm.handleSubmit(onOperatorSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-sm font-medium text-foreground">Username</label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="e.g. raju01"
                  {...operatorForm.register('login')}
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                  style={{ borderColor: operatorForm.formState.errors.login ? 'var(--destructive)' : undefined }}
                />
                {operatorForm.formState.errors.login && (
                  <p className="text-xs text-destructive">{operatorForm.formState.errors.login.message}</p>
                )}
              </div>

              {/* Hidden field to carry pin value for form validation */}
              <input type="hidden" value={pin} {...operatorForm.register('password')} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">PIN</label>
                <PinPad pin={pin} onChange={(p) => { setPin(p); operatorForm.setValue('password', p) }} />
                {operatorForm.formState.errors.password && (
                  <p className="text-xs text-destructive text-center">{operatorForm.formState.errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}

              <button
                id="operator-sign-in-btn"
                type="submit"
                disabled={loading || pin.length < 4}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          )}

          {/* ── Mode toggle ────────────────────────────────────────── */}
          <div className="mt-5 pt-4 border-t border-border text-center">
            {mode === 'email' ? (
              <button
                type="button"
                onClick={() => switchMode('operator')}
                className="text-xs text-primary hover:underline underline-offset-2 transition-colors"
              >
                I'm an Operator → Login with PIN
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('email')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to email login
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs mt-6 text-muted-foreground/50">
          Accounts are created by your administrator.
        </p>
        <p className="text-center text-xs mt-2 text-muted-foreground/50">
          © {new Date().getFullYear()} Trackikko. All rights reserved.
        </p>
      </div>
    </main>
  )
}
