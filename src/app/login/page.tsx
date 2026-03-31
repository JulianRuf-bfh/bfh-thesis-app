'use client'
import { useState, useEffect } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { BFHLogo } from '@/components/BFHLogo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (session) router.replace('/')
  }, [session, router])

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email, password, redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password.')
    } else {
      router.replace('/')
    }
  }

  const isAzureEnabled =
    typeof window !== 'undefined' &&
    (window as any).__NEXT_DATA__?.props?.pageProps?.azureEnabled

  return (
    <div className="min-h-screen bg-bfh-gray-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BFHLogo size="lg" />
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold mb-1">Sign in</h1>
          <p className="text-sm text-bfh-gray-mid mb-6">
            Bachelor & Master Thesis Distribution System
          </p>

          {/* Azure AD SSO */}
          <button
            onClick={() => signIn('azure-ad', { callbackUrl: '/' })}
            className="btn-primary w-full mb-4 py-2.5 gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 21 21" fill="white">
              <path d="M10.5 0L0 10.5l10.5 10.5L21 10.5z" opacity=".5"/>
              <path d="M10.5 0v10.5H21z"/>
              <path d="M10.5 10.5V21L21 10.5z" opacity=".75"/>
              <path d="M0 10.5l10.5 10.5V10.5z"/>
            </svg>
            Sign in with BFH Microsoft Account
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-bfh-gray-border"/>
            <span className="text-xs text-bfh-gray-mid">or</span>
            <div className="flex-1 h-px bg-bfh-gray-border"/>
          </div>

          {/* Credentials fallback */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="firstname.lastname@bfh.ch"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-secondary w-full py-2.5">
              {loading ? 'Signing in…' : 'Sign in with email & password'}
            </button>
          </form>

          <p className="text-xs text-bfh-gray-mid mt-4 text-center">
            For local testing: use the seeded test accounts.<br/>
            Admin: <code>admin@bfh.ch</code> / <code>test1234</code>
          </p>
        </div>
      </div>
    </div>
  )
}
