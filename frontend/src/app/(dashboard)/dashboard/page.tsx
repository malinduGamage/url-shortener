'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LinkIcon, LogOut, Copy, ExternalLink, BarChart2, PlusCircle, Activity } from 'lucide-react'

export default function Dashboard() {
  const [session, setSession] = useState<any>(null)
  const [urls, setUrls] = useState<any[]>([])
  const [analytics, setAnalytics] = useState<any[]>([])
  const [longUrl, setLongUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setSession(session)
        fetchData(session.user.id)
      }
    })
  }, [router])

  const fetchData = async (userId: string) => {
    // Fetch URLs
    const { data: urlData, error: urlError } = await supabase
      .from('urls')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (urlData) {
      setUrls(urlData)
      
      if (urlData.length > 0) {
        // Fetch Analytics for these URLs
        const urlIds = urlData.map(u => u.id)
        const { data: analyticsData } = await supabase
          .from('analytics')
          .select('url_id')
          .in('url_id', urlIds)
        
        if (analyticsData) {
          setAnalytics(analyticsData)
        }
      }
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCreateUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:8080'
    
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/urls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ longUrl })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create URL')
      }

      setLongUrl('')
      fetchData(session.user.id) // Refresh list
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Loading dashboard...</div>

  const totalClicks = analytics.length
  const getClicksForUrl = (id: number) => analytics.filter(a => a.url_id === id).length

  return (
    <div className="container">
      <nav className="nav">
        <Link href="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon className="text-accent" />
          <span>ShortLink<span className="text-accent">.</span></span>
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{session?.user.email}</span>
          <button onClick={handleSignOut} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </nav>

      <main style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '32px' }}>Dashboard</h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ padding: '16px', background: 'rgba(94, 92, 230, 0.1)', borderRadius: '12px' }}>
              <LinkIcon className="text-accent" size={32} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>Total Links</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{urls.length}</p>
            </div>
          </div>
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ padding: '16px', background: 'rgba(50, 215, 75, 0.1)', borderRadius: '12px' }}>
              <Activity style={{ color: 'var(--success)' }} size={32} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>Total Clicks</p>
              <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalClicks}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Create New Link</h2>
          {error && <div className="message-box error">{error}</div>}
          <form onSubmit={handleCreateUrl} style={{ display: 'flex', gap: '16px' }}>
            <input 
              type="url" 
              className="input-field" 
              style={{ marginBottom: 0, flex: 1 }}
              placeholder="https://your-long-url.com/very/long/path" 
              value={longUrl} 
              onChange={(e) => setLongUrl(e.target.value)} 
              required 
            />
            <button type="submit" className="btn-primary" disabled={creating} style={{ minWidth: '140px' }}>
              {creating ? 'Creating...' : <><PlusCircle size={18} /> Shorten</>}
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Your Links</h2>
          
          {urls.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
              <BarChart2 size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
              <p>You haven't created any links yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {urls.map(url => (
                <div key={url.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ overflow: 'hidden', paddingRight: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent)' }}>/{url.short_code}</span>
                      <a href={url.long_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }} title="Visit original URL">
                        <ExternalLink size={16} />
                      </a>
                    </div>
                    <p style={{ fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {url.long_url}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{getClicksForUrl(url.id)}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CLICKS</p>
                    </div>
                    <button 
                      className="btn-secondary" 
                      onClick={() => navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/${url.short_code}`)}
                      title="Copy short link"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
