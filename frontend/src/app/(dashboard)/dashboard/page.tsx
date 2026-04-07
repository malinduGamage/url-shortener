'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LinkIcon, LogOut, Copy, ExternalLink,
  BarChart2, PlusCircle, Activity, TrendingUp, Globe
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UrlRow {
  id: number
  short_code: string
  long_url: string
  created_at: string
}

interface AnalyticsRow {
  url_id: number
  created_at: string
  visitor_country: string | null
}

type Range = '7d' | '30d' | 'all'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#5e5ce6'
const PALETTE = ['#5e5ce6', '#32d74b', '#ff9f0a', '#ff453a', '#64d2ff', '#bf5af2']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByRange(rows: AnalyticsRow[], range: Range): AnalyticsRow[] {
  if (range === 'all') return rows
  const days = range === '7d' ? 7 : 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return rows.filter(r => new Date(r.created_at) >= cutoff)
}

function buildTimeSeries(rows: AnalyticsRow[], range: Range) {
  const days = range === 'all' ? 90 : range === '30d' ? 30 : 7
  const map: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    map[d.toISOString().slice(0, 10)] = 0
  }
  rows.forEach(r => {
    const day = r.created_at.slice(0, 10)
    if (day in map) map[day] = (map[day] || 0) + 1
  })
  return Object.entries(map).map(([date, clicks]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    clicks,
  }))
}

function topCountries(rows: AnalyticsRow[], limit = 6) {
  const grouped: Record<string, number> = {}
  rows.forEach(r => {
    const c = r.visitor_country || 'Unknown'
    grouped[c] = (grouped[c] || 0) + 1
  })
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }))
}

function clicksPerLink(urls: UrlRow[], analytics: AnalyticsRow[]) {
  return urls.map(u => ({
    ...u,
    clicks: analytics.filter(a => a.url_id === u.id).length,
  })).sort((a, b) => b.clicks - a.clicks)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 16px', fontSize: '0.875rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>{payload[0].value} clicks</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [session, setSession] = useState<any>(null)
  const [urls, setUrls] = useState<UrlRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [longUrl, setLongUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState<Range>('30d')
  const router = useRouter()

  const fetchData = useCallback(async (userId: string) => {
    const { data: urlData } = await supabase
      .from('urls')
      .select('id, short_code, long_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (urlData) {
      setUrls(urlData)
      if (urlData.length > 0) {
        const urlIds = urlData.map((u: UrlRow) => u.id)
        const { data: analyticsData } = await supabase
          .from('analytics')
          .select('url_id, created_at, visitor_country')
          .in('url_id', urlIds)
        if (analyticsData) setAnalytics(analyticsData)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setSession(session)
      fetchData(session.user.id)
    })
  }, [router, fetchData])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleCreateUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    const gatewayUrl = (process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:8080').replace(/\/$/, '')
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ longUrl }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create URL') }
      setLongUrl('')
      fetchData(session.user.id)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '12px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    )
  }

  const RANGE_BUTTONS: Range[] = ['7d', '30d', 'all']
  const filteredAnalytics = filterByRange(analytics, range)
  const timeSeries = buildTimeSeries(filteredAnalytics, range)
  const countriesData = topCountries(filteredAnalytics)
  const urlsWithClicks = clicksPerLink(urls, analytics)
  const filteredUrlsWithClicks = clicksPerLink(urls, filteredAnalytics)
  const totalClicks = filteredAnalytics.length
  const topLink = urlsWithClicks[0]

  const redirectBase = process.env.NEXT_PUBLIC_REDIRECT_BASE || ''

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .range-btn { padding: 6px 16px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .range-btn:hover { border-color: var(--border-hover); color: var(--text-main); }
        .range-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
        .link-card { background: var(--panel-bg); backdrop-filter: blur(12px); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; transition: border-color 0.2s, transform 0.2s; }
        .link-card:hover { border-color: var(--border-hover); transform: translateY(-1px); }
        .recharts-text { fill: #8e8e93 !important; font-size: 12px !important; }
      `}</style>

      <div className="container">
        {/* Nav */}
        <nav className="nav">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <LinkIcon className="text-accent" size={20} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>ShortLink<span className="text-accent">.</span></span>
          </Link>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{session?.user.email}</span>
            <button onClick={handleSignOut} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </nav>

        <main style={{ paddingBottom: '80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
            <h1 style={{ fontSize: '2rem', margin: 0 }}>Dashboard</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              {RANGE_BUTTONS.map(r => (
                <button key={r} className={`range-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
                  {r === 'all' ? 'All time' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Total Links', value: urls.length, icon: <LinkIcon className="text-accent" size={24} />, color: 'rgba(94,92,230,0.12)' },
              { label: 'Total Clicks', value: totalClicks.toLocaleString(), icon: <Activity style={{ color: 'var(--success)' }} size={24} />, color: 'rgba(50,215,75,0.1)' },
              { label: 'Top Link Clicks', value: filteredUrlsWithClicks[0]?.clicks ?? 0, icon: <TrendingUp style={{ color: '#ff9f0a' }} size={24} />, color: 'rgba(255,159,10,0.1)' },
              { label: 'Top Country', value: countriesData[0]?.name || '—', icon: <Globe style={{ color: '#64d2ff' }} size={24} />, color: 'rgba(100,210,255,0.1)' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '14px', background: color, borderRadius: '12px', flexShrink: 0 }}>{icon}</div>
                <div>
                  <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Overview */}
          {analytics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Clicks Chart */}
              <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={16} className="text-accent" /> Clicks Over Time
                </h2>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={timeSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8e8e93' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8e8e93' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="clicks" stroke={ACCENT} strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Top Countries */}
              <div className="glass-panel">
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} className="text-accent" /> Top Countries
                </h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={countriesData} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#8e8e93' }} width={85} tickLine={false} axisLine={false} />
                    <Tooltip content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.875rem' }}>
                          <p style={{ color: 'var(--text-main)' }}>{payload[0].payload.name}: <b>{payload[0].value}</b></p>
                        </div>
                      ) : null}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                      {countriesData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Create New Link */}
          <div className="glass-panel" style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Create New Link</h2>
            {error && <div className="message-box error">{error}</div>}
            <form onSubmit={handleCreateUrl} style={{ display: 'flex', gap: '12px' }}>
              <input
                type="url"
                className="input-field"
                style={{ marginBottom: 0, flex: 1 }}
                placeholder="https://your-long-url.com/very/long/path"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" disabled={creating} style={{ minWidth: '130px', flexShrink: 0 }}>
                {creating ? 'Creating...' : <><PlusCircle size={16} /> Shorten</>}
              </button>
            </form>
          </div>

          {/* Links List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Your Links</h2>
            {urls.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-muted)' }}>
                <BarChart2 size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                <p>No links yet. Create your first one above!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {urlsWithClicks.map(url => {
                  const filteredClicks = filteredUrlsWithClicks.find(u => u.id === url.id)?.clicks ?? 0
                  return (
                    <div key={url.id} className="link-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        {/* URL info */}
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <a
                              href={`${redirectBase}/${url.short_code}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)', textDecoration: 'none' }}
                            >
                              {(redirectBase || 'https://example.com')}/{url.short_code}
                            </a>
                            <a href={url.long_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }} title="Visit original">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                          <p style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '500px' }}>
                            {url.long_url}
                          </p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{filteredClicks}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>clicks</p>
                          </div>
                          <Link
                            href={`/analytics/${url.id}`}
                            className="btn-secondary"
                            style={{ padding: '8px 14px', fontSize: '0.8rem', gap: '6px' }}
                          >
                            <BarChart2 size={14} /> Analytics
                          </Link>
                          <button
                            className="btn-secondary"
                            style={{ padding: '8px 12px' }}
                            onClick={() => {
                              navigator.clipboard.writeText(`${redirectBase}/${url.short_code}`)
                              alert('Copied!')
                            }}
                            title="Copy short link"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
