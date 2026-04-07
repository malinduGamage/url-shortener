'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LinkIcon } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message) } else { router.push('/dashboard') }
    setLoading(false)
  }

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <LinkIcon size={15} className="text-accent" />
          <span>ShortLink<span className="text-accent">.</span></span>
        </Link>
      </nav>

      <div className="auth-container">
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Welcome back</h1>
          <p style={{ fontSize: '0.9rem' }}>Sign in to your account to continue.</p>
        </div>

        <div className="glass-panel">
          {error && <div className="message-box error">{error}</div>}
          <form onSubmit={handleLogin}>
            <label className="label">Email</label>
            <input
              type="email" className="input-field"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <label className="label">Password</label>
            <input
              type="password" className="input-field"
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required
            />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
