'use client'

import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Coffee, Eye, EyeOff, ShieldCheck } from 'lucide-react'

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>
type PageState = 'loading' | 'ready' | 'success' | 'error'

function SetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const passwordValue = watch('password', '')

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      // ── Strategy 1: PKCE flow — ?code= in query string ──────────────────
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setPageState('error')
          setErrorMessage('Your invite link has expired or is invalid. Please ask your admin to resend the invite.')
          return
        }
        setPageState('ready')
        return
      }

      // ── Strategy 2: Implicit flow — #access_token= in the URL hash ───────
      // We manually parse the hash because onAuthStateChange can fire before
      // our listener is registered, causing us to miss the SIGNED_IN event.
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ''))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            setPageState('error')
            setErrorMessage('Your invite link has expired or is invalid. Please ask your admin to resend the invite.')
            return
          }
          // Clear the hash from the URL so tokens aren't visible / reused
          window.history.replaceState(null, '', window.location.pathname)
          setPageState('ready')
          return
        }
      }

      // ── Strategy 3: Session already exists (e.g. page refresh) ──────────
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setPageState('ready')
        return
      }

      // Nothing worked — link is expired or invalid
      setPageState('error')
      setErrorMessage('Your invite link has expired or is invalid. Please ask your admin to resend the invite.')
    }

    void init()
  }, [searchParams])

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({ password: data.password })
      if (updateError) {
        setErrorMessage(updateError.message)
        setSubmitting(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setPageState('success')
      await new Promise((r) => setTimeout(r, 1200))

      if (!session?.user?.email) { router.push('/dashboard'); return }

      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email }),
      })

      if (!response.ok) { router.push('/dashboard'); return }

      const user = await response.json() as {
        id: string; email: string; isActive: boolean
        roleId: string; businessId: string | null
      } | null

      if (!user || !user.isActive) { router.push('/login'); return }
      if (user.roleId === 'master_admin') { router.push('/master'); return }
      if (!user.businessId) { router.push('/setup'); return }
      if (user.roleId === 'operator') { router.push('/operator/my-records'); return }
      router.push('/dashboard')
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const getStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }
  const strength = getStrength(passwordValue)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength]
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][strength]

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg bg-primary">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Trackikko</h1>
          <p className="text-sm mt-1 text-muted-foreground">Heavy Equipment Management</p>
        </div>

        {pageState === 'loading' && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Verifying your invite…</p>
          </div>
        )}

        {pageState === 'error' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Already have a password?{' '}
              <a href="/login" className="text-primary underline underline-offset-2 hover:opacity-80">Sign in</a>
            </p>
          </div>
        )}

        {pageState === 'success' && (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground mb-1">Password set!</h2>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
            <Loader2 className="w-4 h-4 animate-spin mx-auto mt-4 text-muted-foreground" />
          </div>
        )}

        {pageState === 'ready' && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-1 text-card-foreground">Set your password</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Create a password to secure your Trackikko account.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">New Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                    style={{ borderColor: errors.password ? 'var(--destructive)' : undefined }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                {passwordValue.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{ backgroundColor: i <= strength ? strengthColor : 'var(--border)' }} />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                    style={{ borderColor: errors.confirmPassword ? 'var(--destructive)' : undefined }}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>

              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive" role="alert">
                  {errorMessage}
                </div>
              )}

              <button id="set-password-btn" type="submit" disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Setting password…' : 'Set Password & Continue'}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs mt-6 text-muted-foreground/50">
          © {new Date().getFullYear()} Trackikko. All rights reserved.
        </p>
      </div>
    </main>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      </main>
    }>
      <SetPasswordInner />
    </Suspense>
  )
}
