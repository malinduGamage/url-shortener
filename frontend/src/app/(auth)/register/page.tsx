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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Check your email inbox to verify your account before logging in!')
    }
    setLoading(false)
  }

  return (
    <div className="container">
      <nav className="nav" style={{ padding: '24px 0' }}>
        <Link href="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon className="text-accent" />
          <span>ShortLink<span className="text-accent">.</span></span>
        </Link>
      </nav>
      <div className="auth-container">
        <div className="glass-panel">
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Create an Account</h2>
          {error && <div className="message-box error">{error}</div>}
          {success && <div className="message-box success">{success}</div>}
          <form onSubmit={handleRegister}>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading || !!success}>
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem' }}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
