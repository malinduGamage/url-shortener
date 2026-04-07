'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, LinkIcon, ExternalLink, Copy,
  Globe, Monitor, Smartphone, Tablet, BarChart2, Clock
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UrlRow {
  id: number
  short_code: string
  long_url: string
  created_at: string
}

interface AnalyticsRow {
  created_at: string
  visitor_country: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  referer_domain: string | null
}

type Range = '7d' | '30d' | 'all'

// ─── Colour palette ───────────────────────────────────────────────────────────

const ACCENT = '#5e5ce6'
const PALETTE = ['#5e5ce6', '#32d74b', '#ff9f0a', '#ff453a', '#64d2ff', '#bf5af2', '#ff6b6b', '#ffd60a']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item) || 'Unknown'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

function toBarData(grouped: Record<string, number>, limit = 10) {
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }))
}

function filterByRange(rows: AnalyticsRow[], range: Range): AnalyticsRow[] {
  if (range === 'all') return rows
  const days = range === '7d' ? 7 : 30
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return rows.filter(r => new Date(r.created_at) >= cutoff)
}

function buildTimeSeries(rows: AnalyticsRow[], range: Range): { date: string; clicks: number }[] {
  const days = range === 'all' ? 90 : range === '30d' ? 30 : 7
  const map: Record<string, number> = {}

  // Pre-fill all dates so gaps show as 0
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ padding: '14px', background: 'rgba(94,92,230,0.12)', borderRadius: '12px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '0.8rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
        <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{value}</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
      {children}
    </h2>
  )
}

function BarList({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map(({ name, value }, i) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-main)' }}>{name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{value} · {pct}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                borderRadius: '999px',
                background: PALETTE[i % PALETTE.length],
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )
      })}
      {data.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet for this period.</p>}
    </div>
  )
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

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 16px', fontSize: '0.875rem' }}>
      <p style={{ color: 'var(--text-main)', fontWeight: 600 }}>{payload[0].name}: {payload[0].value}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [urlData, setUrlData] = useState<UrlRow | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [range, setRange] = useState<Range>('30d')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Fetch URL metadata
    const { data: url } = await supabase
      .from('urls')
      .select('id, short_code, long_url, created_at')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single()

    if (!url) { router.push('/dashboard'); return }
    setUrlData(url)

    // Fetch all analytics for this URL
    const { data: rows } = await supabase
      .from('analytics')
      .select('created_at, visitor_country, device_type, browser, os, referer_domain')
      .eq('url_id', id)
      .order('created_at', { ascending: true })

    setAnalytics(rows || [])
    setLoading(false)
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '12px' }}>
        <div style={{ width: '20px', height: '20px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading analytics...</span>
      </div>
    )
  }

  const filtered = filterByRange(analytics, range)
  const totalClicks = filtered.length
  const timeSeries = buildTimeSeries(filtered, range)

  const countriesData = toBarData(groupBy(filtered, r => r.visitor_country || 'Unknown'))
  const devicesGrouped = groupBy(filtered, r => r.device_type || 'Unknown')
  const devicesData = toBarData(devicesGrouped)
  const browserData = toBarData(groupBy(filtered, r => r.browser || 'Unknown'))
  const osData = toBarData(groupBy(filtered, r => r.os || 'Unknown'))
  const referrerData = toBarData(groupBy(filtered, r => r.referer_domain || 'Direct'))

  const shortUrl = `${process.env.NEXT_PUBLIC_REDIRECT_BASE || ''}/${urlData?.short_code}`
  const redirectBase = process.env.NEXT_PUBLIC_REDIRECT_BASE || 'https://example.com'

  const RANGE_BUTTONS: Range[] = ['7d', '30d', 'all']

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .range-btn { padding: 6px 16px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text-muted); font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .range-btn:hover { border-color: var(--border-hover); color: var(--text-main); }
        .range-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
        .recharts-text { fill: #8e8e93 !important; font-size: 12px !important; }
        .recharts-cartesian-axis-line, .recharts-cartesian-axis-tick-line { display: none; }
      `}</style>

      <div className="container" style={{ paddingBottom: '80px' }}>
        {/* Nav */}
        <nav className="nav">
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.875rem', transition: 'color 0.2s' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon className="text-accent" size={18} />
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>ShortLink<span className="text-accent">.</span></span>
          </div>
        </nav>

        {/* Header */}
        <div className="glass-panel" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <a
                  href={`${redirectBase}/${urlData?.short_code}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {shortUrl}
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(shortUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', display: 'flex' }}
                  title="Copy"
                >
                  <Copy size={16} />
                </button>
                {copied && <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Copied!</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a href={urlData?.long_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '500px' }}>
                  {urlData?.long_url}
                </a>
                <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Created {new Date(urlData?.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Range selector */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {RANGE_BUTTONS.map(r => (
                <button key={r} className={`range-btn${range === r ? ' active' : ''}`} onClick={() => setRange(r)}>
                  {r === 'all' ? 'All time' : r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard label="Total Clicks" value={totalClicks.toLocaleString()} icon={<BarChart2 className="text-accent" size={24} />} />
          <StatCard label="Top Country" value={countriesData[0]?.name || '—'} icon={<Globe className="text-accent" size={24} />} />
          <StatCard label="Top Device" value={devicesData[0]?.name || '—'} icon={<Monitor className="text-accent" size={24} />} />
          <StatCard label="Tracked Since" value={new Date(urlData?.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} icon={<Clock className="text-accent" size={24} />} />
        </div>

        {/* Clicks Over Time */}
        <div className="glass-panel" style={{ marginBottom: '24px' }}>
          <SectionTitle><BarChart2 size={16} className="text-accent" /> Clicks Over Time</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8e8e93' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8e8e93' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="clicks" stroke={ACCENT} strokeWidth={2} fill="url(#clickGrad)" dot={false} activeDot={{ r: 4, fill: ACCENT }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Two column: Countries + Devices */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          {/* Top Countries */}
          <div className="glass-panel">
            <SectionTitle><Globe size={16} className="text-accent" /> Top Countries</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={countriesData.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#8e8e93' }} width={90} tickLine={false} axisLine={false} />
                <Tooltip content={({ active, payload }) =>
                  active && payload?.length ? (
                    <div style={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 14px', fontSize: '0.875rem' }}>
                      <p style={{ color: 'var(--text-main)' }}>{payload[0].payload.name}: <b>{payload[0].value}</b></p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14}>
                  {countriesData.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {countriesData.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>}
          </div>

          {/* Device Breakdown */}
          <div className="glass-panel">
            <SectionTitle>
              {devicesData[0]?.name === 'mobile' ? <Smartphone size={16} className="text-accent" /> : <Monitor size={16} className="text-accent" />}
              {' '}Device Breakdown
            </SectionTitle>
            {devicesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={devicesData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {devicesData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>}
          </div>
        </div>

        {/* Browser, OS, Referrers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          <div className="glass-panel">
            <SectionTitle>Browser</SectionTitle>
            <BarList data={browserData} total={totalClicks} />
          </div>
          <div className="glass-panel">
            <SectionTitle>Operating System</SectionTitle>
            <BarList data={osData} total={totalClicks} />
          </div>
          <div className="glass-panel">
            <SectionTitle><ExternalLink size={14} className="text-accent" /> Top Referrers</SectionTitle>
            <BarList data={referrerData} total={totalClicks} />
          </div>
        </div>
      </div>
    </>
  )
}
