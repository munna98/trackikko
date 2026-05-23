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

      // Sign in with Supabase
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Fetch user profile from DB via server action
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

      const user = await response.json()

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

      // Role-based redirect
      const roleId = user.roleId as string

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

      // admin or accountant
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 20% 10%, oklch(0.28 0.08 50 / 0.4) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, oklch(0.22 0.06 45 / 0.3) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(oklch(0.76 0.14 75) 1px, transparent 1px), linear-gradient(90deg, oklch(0.76 0.14 75) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ background: 'oklch(0.76 0.14 75)' }}>
            <Coffee className="w-8 h-8" style={{ color: 'oklch(0.12 0.03 50)' }} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'oklch(0.94 0.03 75)' }}>
            Trackikko
          </h1>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.05 65)' }}>
            Heavy Equipment Management
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-6 shadow-2xl"
          style={{
            background: 'oklch(0.17 0.04 45)',
            borderColor: 'oklch(0.28 0.05 50)',
          }}
        >
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'oklch(0.94 0.03 75)' }}>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: 'oklch(0.80 0.04 70)' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register('email')}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: 'oklch(0.22 0.04 48)',
                  borderWidth: '1px',
                  borderColor: errors.email ? 'oklch(0.55 0.22 25)' : 'oklch(0.28 0.05 50)',
                  color: 'oklch(0.94 0.03 75)',
                  '--tw-ring-color': 'oklch(0.76 0.14 75 / 0.5)',
                } as React.CSSProperties}
              />
              {errors.email && (
                <p className="text-xs" style={{ color: 'oklch(0.65 0.18 25)' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: 'oklch(0.80 0.04 70)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:ring-2"
                style={{
                  background: 'oklch(0.22 0.04 48)',
                  borderWidth: '1px',
                  borderColor: errors.password ? 'oklch(0.55 0.22 25)' : 'oklch(0.28 0.05 50)',
                  color: 'oklch(0.94 0.03 75)',
                  '--tw-ring-color': 'oklch(0.76 0.14 75 / 0.5)',
                } as React.CSSProperties}
              />
              {errors.password && (
                <p className="text-xs" style={{ color: 'oklch(0.65 0.18 25)' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
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

            {/* Submit */}
            <button
              id="sign-in-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background: loading ? 'oklch(0.65 0.10 75)' : 'oklch(0.76 0.14 75)',
                color: 'oklch(0.12 0.03 50)',
              }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: 'oklch(0.50 0.04 60)' }}>
            Accounts are created by your administrator.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'oklch(0.40 0.03 55)' }}>
          © {new Date().getFullYear()} Trackikko. All rights reserved.
        </p>
      </div>
    </main>
  )
}
