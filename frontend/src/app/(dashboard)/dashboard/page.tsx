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
interface UrlRow { id: number; short_code: string; long_url: string; created_at: string }
interface AnalyticsRow { url_id: number; created_at: string; visitor_country: string | null }
type Range = '7d' | '30d' | 'all'

// ─── Palette ──────────────────────────────────────────────────────────────────
const ACCENT   = '#F59E0B'
const PALETTE  = ['#F59E0B', '#34D399', '#60A5FA', '#F87171', '#A78BFA', '#FB923C']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function filterByRange(rows: AnalyticsRow[], range: Range) {
  if (range === 'all') return rows
  const days = range === '7d' ? 7 : 30
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
  return rows.filter(r => new Date(r.created_at) >= cutoff)
}

function buildTimeSeries(rows: AnalyticsRow[], range: Range) {
  const days = range === 'all' ? 90 : range === '30d' ? 30 : 7
  const map: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    map[d.toISOString().slice(0, 10)] = 0
  }
  rows.forEach(r => { const day = r.created_at.slice(0, 10); if (day in map) map[day]++ })
  return Object.entries(map).map(([date, clicks]) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), clicks,
  }))
}

function topCountries(rows: AnalyticsRow[], limit = 6) {
  const g: Record<string, number> = {}
  rows.forEach(r => { const c = r.visitor_country || 'Unknown'; g[c] = (g[c] || 0) + 1 })
  return Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }))
}

function clicksPerLink(urls: UrlRow[], analytics: AnalyticsRow[]) {
  return urls.map(u => ({ ...u, clicks: analytics.filter(a => a.url_id === u.id).length }))
    .sort((a, b) => b.clicks - a.clicks)
}

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8125rem' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</p>
      <p style={{ color: '#FAFAFA', fontWeight: 600 }}>{payload[0].value} clicks</p>
    </div>
  )
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + '…' : str
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [session, setSession] = useState<any>(null)
  const [urls, setUrls] = useState<UrlRow[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [longUrl, setLongUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [range, setRange] = useState<Range>('30d')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const router = useRouter()

  const fetchData = useCallback(async (userId: string) => {
    const { data: urlData } = await supabase
      .from('urls').select('id, short_code, long_url, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false })
    if (urlData) {
      setUrls(urlData)
      if (urlData.length > 0) {
        const urlIds = urlData.map((u: UrlRow) => u.id)
        const { data: aData } = await supabase
          .from('analytics').select('url_id, created_at, visitor_country').in('url_id', urlIds)
        if (aData) setAnalytics(aData)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setSession(session); fetchData(session.user.id)
    })
  }, [router, fetchData])

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/') }

  const handleCreateUrl = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError('')
    const gatewayUrl = (process.env.NEXT_PUBLIC_API_GATEWAY || 'http://localhost:8080').replace(/\/$/, '')
    try {
      const res = await fetch(`${gatewayUrl}/api/v1/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ longUrl }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create URL') }
      setLongUrl(''); fetchData(session.user.id)
    } catch (err: any) { setError(err.message) }
    finally { setCreating(false) }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '10px' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</span>
    </div>
  )

  const RANGES: Range[] = ['7d', '30d', 'all']
  const filtered     = filterByRange(analytics, range)
  const timeSeries   = buildTimeSeries(filtered, range)
  const countries    = topCountries(filtered)
  const urlsClicks   = clicksPerLink(urls, analytics)
  const filteredUrls = clicksPerLink(urls, filtered)
  const redirectBase = (process.env.NEXT_PUBLIC_REDIRECT_BASE || '').replace(/\/$/, '')

  const statCards = [
    { label: 'Total Links',   value: urls.length,              color: 'rgba(245,158,11,0.1)',  icon: <LinkIcon   size={18} style={{ color: ACCENT }}          /> },
    { label: 'Clicks',        value: filtered.length,          color: 'rgba(52,211,153,0.1)',  icon: <Activity   size={18} style={{ color: '#34D399' }}       /> },
    { label: 'Top Performer', value: filteredUrls[0]?.clicks ?? 0, color: 'rgba(96,165,250,0.1)', icon: <TrendingUp size={18} style={{ color: '#60A5FA' }}  /> },
    { label: 'Top Country',   value: countries[0]?.name || '—', color: 'rgba(167,139,250,0.1)', icon: <Globe     size={18} style={{ color: '#A78BFA' }}      /> },
  ]

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Nav */}
      <nav className="nav">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
          <LinkIcon size={16} className="text-accent" />
          <span className="nav-brand">ShortLink<span className="text-accent">.</span></span>
        </Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{session?.user.email}</span>
          <button onClick={handleSignOut} className="btn-ghost" style={{ fontSize: '0.8125rem' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </nav>

      <main style={{ paddingTop: '36px' }}>
        {/* Page header + range */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontSize: '1.5rem' }}>Dashboard</h1>
          <div style={{ display: 'flex', gap: '6px' }}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '5px 14px', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', fontWeight: 500,
                background: range === r ? ACCENT : 'transparent',
                color: range === r ? '#09090B' : 'var(--text-muted)',
                border: range === r ? `1px solid ${ACCENT}` : '1px solid var(--border)',
              }}>
                {r === 'all' ? 'All time' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {statCards.map(({ label, value, color, icon }) => (
            <div key={label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ padding: '10px', background: color, borderRadius: '8px', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', color: 'var(--text-muted)' }}>{label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts — only if data exists */}
        {analytics.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '12px', marginBottom: '28px' }}>
            {/* Clicks over time */}
            <div className="glass-panel">
              <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Clicks over time</p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={timeSeries} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="amberGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.22} />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="clicks" stroke={ACCENT} strokeWidth={1.5} fill="url(#amberGrad)" dot={false} activeDot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top countries */}
            <div className="glass-panel">
              <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Top countries</p>
              {countries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {countries.map(({ name, value }, i) => {
                    const pct = Math.round((value / filtered.length) * 100)
                    return (
                      <div key={name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-main)' }}>{name}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                        <div style={{ height: '3px', borderRadius: '2px', background: 'var(--surface-2)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: PALETTE[i % PALETTE.length], borderRadius: '2px', transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : <p style={{ fontSize: '0.875rem' }}>No data yet.</p>}
            </div>
          </div>
        )}

        {/* Create Link */}
        <div className="glass-panel" style={{ marginBottom: '28px' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>New link</p>
          {error && <div className="message-box error">{error}</div>}
          <form onSubmit={handleCreateUrl} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="url" className="input-field"
              style={{ marginBottom: 0, flex: 1 }}
              placeholder="https://example.com/your/long/url"
              value={longUrl} onChange={e => setLongUrl(e.target.value)} required
            />
            <button type="submit" className="btn-primary" disabled={creating} style={{ flexShrink: 0, minWidth: '110px' }}>
              {creating ? 'Creating…' : <><PlusCircle size={15} /> Shorten</>}
            </button>
          </form>
        </div>

        {/* Links list */}
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Your links ({urls.length})
          </p>
          {urls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No links yet — create one above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {urlsClicks.map((url, idx) => {
                const filteredClicks = filteredUrls.find(u => u.id === url.id)?.clicks ?? 0
                const shortUrl = `${redirectBase}/${url.short_code}`
                return (
                  <div key={url.id} style={{
                    background: 'var(--surface)',
                    padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                    borderBottom: idx < urlsClicks.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}>
                    {/* URL info — long URL primary, short URL secondary */}
                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      {/* Primary: actual destination */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <a
                          href={url.long_url} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-main)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '520px' }}
                          title={url.long_url}
                        >
                          {truncate(url.long_url.replace(/^https?:\/\//, ''), 60)}
                        </a>
                        <ExternalLink size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      </div>
                      {/* Secondary: short link */}
                      <a
                        href={shortUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.8rem', color: ACCENT, textDecoration: 'none', fontWeight: 500, letterSpacing: '-0.01em' }}
                      >
                        {shortUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{filteredClicks}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>clicks</p>
                      </div>
                      <Link href={`/analytics/${url.id}`} className="btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
                        <BarChart2 size={13} /> Analytics
                      </Link>
                      <button
                        className="btn-ghost"
                        style={{ padding: '7px 10px' }}
                        onClick={() => { navigator.clipboard.writeText(shortUrl); setCopiedId(url.id); setTimeout(() => setCopiedId(null), 2000) }}
                        title="Copy short link"
                      >
                        {copiedId === url.id
                          ? <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>Copied!</span>
                          : <Copy size={14} />
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
