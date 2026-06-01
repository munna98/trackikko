'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'

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

export default function SetPasswordPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const passwordValue = watch('password', '')

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

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: data.password }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setErrorMessage(body.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setDone(true)
      await new Promise((r) => setTimeout(r, 1200))
      router.push('/dashboard')
    } catch {
      setErrorMessage('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg bg-primary">
            <ShieldCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Set Your Password</h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Your account needs a private password before you continue.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-card-foreground mb-1">Password set!</h2>
            <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
            <Loader2 className="w-4 h-4 animate-spin mx-auto mt-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <p className="text-sm text-muted-foreground mb-6">
              Choose a strong password. Only you will know it — your admin cannot see it.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  New Password
                </label>
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
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
                {passwordValue.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor:
                              i <= strength ? strengthColor : 'var(--border)',
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                    style={{
                      borderColor: errors.confirmPassword ? 'var(--destructive)' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {errorMessage && (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {errorMessage}
                </div>
              )}

              <button
                id="set-password-btn"
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity duration-150 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Saving…' : 'Set Password & Continue'}
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
