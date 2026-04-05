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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
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
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Welcome back</h2>
          {error && <div className="message-box error">{error}</div>}
          <form onSubmit={handleLogin}>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem' }}>
            Don't have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
