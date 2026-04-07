'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { LinkIcon } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) { setError(error.message) }
    else { setSuccess('Check your inbox to verify your account before signing in.') }
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
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Create an account</h1>
          <p style={{ fontSize: '0.9rem' }}>Start shortening links for free — no credit card required.</p>
        </div>

        <div className="glass-panel">
          {error   && <div className="message-box error">{error}</div>}
          {success && <div className="message-box success">{success}</div>}
          <form onSubmit={handleRegister}>
            <label className="label">Email</label>
            <input
              type="email" className="input-field"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
            <label className="label">Password</label>
            <input
              type="password" className="input-field"
              placeholder="Min. 6 characters"
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
            />
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={loading || !!success}>
              {loading ? 'Creating account…' : 'Get started'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
