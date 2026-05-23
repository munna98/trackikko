'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Coffee } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })

      if (!response.ok) {
        setError('Account not set up. Contact your admin.')
        setLoading(false)
        return
      }

      const user = await response.json() as {
        id: string
        email: string
        isActive: boolean
        roleId: string
        businessId: string | null
      } | null

      if (!user) {
        setError('Account not set up. Contact your admin.')
        setLoading(false)
        return
      }

      if (!user.isActive) {
        setError('Your account has been deactivated.')
        setLoading(false)
        return
      }

      const roleId = user.roleId

      if (roleId === 'master_admin') {
        router.push('/master')
        return
      }

      if (!user.businessId) {
        router.push('/setup')
        return
      }

      if (roleId === 'operator') {
        router.push('/operator/log-job')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 10%, color-mix(in oklch, var(--primary) 15%, transparent) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, color-mix(in oklch, var(--secondary) 10%, transparent) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg bg-primary">
            <Coffee className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Trackikko
          </h1>
          <p className="text-sm mt-1 text-muted-foreground">
            Heavy Equipment Management
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-6 text-card-foreground">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                style={{ borderColor: errors.email ? 'var(--destructive)' : undefined }}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-ring focus:border-ring"
                style={{ borderColor: errors.password ? 'var(--destructive)' : undefined }}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Submit */}
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

          <p className="text-center text-xs mt-5 text-muted-foreground">
            Accounts are created by your administrator.
          </p>
        </div>

        <p className="text-center text-xs mt-6 text-muted-foreground/50">
          © {new Date().getFullYear()} Trackikko. All rights reserved.
        </p>
      </div>
    </main>
  )
}
