'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, LinkIcon, ExternalLink, Copy, Globe, Monitor, BarChart2, Clock } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────
interface UrlRow { id: number; short_code: string; long_url: string; created_at: string }
interface AnalyticsRow {
  created_at: string; visitor_country: string | null
  device_type: string | null; browser: string | null
  os: string | null; referer_domain: string | null
}
type Range = '7d' | '30d' | 'all'

// ─── Palette ──────────────────────────────────────────────────────────────────
const ACCENT  = '#F59E0B'
const PALETTE = ['#F59E0B', '#34D399', '#60A5FA', '#F87171', '#A78BFA', '#FB923C', '#F472B6', '#4ADE80']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => { const k = key(item) || 'Unknown'; acc[k] = (acc[k] || 0) + 1; return acc }, {} as Record<string, number>)
}
function toBarData(grouped: Record<string, number>, limit = 8) {
  return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }))
}
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
function truncate(str: string, n: number) { return str.length > n ? str.slice(0, n) + '…' : str }

// ─── Shared tooltip ───────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8125rem' }}>
      {label && <p style={{ color: '#71717A', marginBottom: '2px' }}>{label}</p>}
      <p style={{ color: '#FAFAFA', fontWeight: 600 }}>{payload[0].value} clicks</p>
    </div>
  )
}

// ─── Bar list (browser/OS/referrer) ──────────────────────────────────────────
function BarList({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  if (data.length === 0) return <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No data yet.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map(({ name, value }, i) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '5px' }}>
              <span style={{ color: 'var(--text-main)' }}>{name}</span>
              <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{value} · {pct}%</span>
            </div>
            <div style={{ height: '3px', borderRadius: '2px', background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: PALETTE[i % PALETTE.length], borderRadius: '2px', transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '20px' }}>
      {children}
    </p>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
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
    const { data: url } = await supabase.from('urls').select('id, short_code, long_url, created_at')
      .eq('id', id).eq('user_id', session.user.id).single()
    if (!url) { router.push('/dashboard'); return }
    setUrlData(url)
    const { data: rows } = await supabase.from('analytics')
      .select('created_at, visitor_country, device_type, browser, os, referer_domain')
      .eq('url_id', id).order('created_at', { ascending: true })
    setAnalytics(rows || [])
    setLoading(false)
  }, [id, router])

  useEffect(() => { loadData() }, [loadData])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '10px' }}>
      <div style={{ width: '18px', height: '18px', border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</span>
    </div>
  )

  const filtered     = filterByRange(analytics, range)
  const timeSeries   = buildTimeSeries(filtered, range)
  const totalClicks  = filtered.length
  const countries    = toBarData(groupBy(filtered, r => r.visitor_country || 'Unknown'))
  const devicesRaw   = groupBy(filtered, r => r.device_type || 'Unknown')
  const devicesData  = toBarData(devicesRaw)
  const browserData  = toBarData(groupBy(filtered, r => r.browser || 'Unknown'))
  const osData       = toBarData(groupBy(filtered, r => r.os || 'Unknown'))
  const referrerData = toBarData(groupBy(filtered, r => r.referer_domain || 'Direct'))

  const redirectBase = (process.env.NEXT_PUBLIC_REDIRECT_BASE || '').replace(/\/$/, '')
  const shortUrl = `${redirectBase}/${urlData?.short_code}`
  const RANGES: Range[] = ['7d', '30d', 'all']

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Nav */}
      <nav className="nav">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', transition: 'color 0.15s' }}>
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <LinkIcon size={15} className="text-accent" />
          <span className="nav-brand">ShortLink<span className="text-accent">.</span></span>
        </div>
      </nav>

      <main style={{ paddingTop: '36px' }}>
        {/* Header card */}
        <div className="glass-panel" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              {/* Primary — actual URL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <a
                  href={urlData?.long_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', textDecoration: 'none' }}
                  title={urlData?.long_url}
                >
                  {truncate((urlData?.long_url || '').replace(/^https?:\/\//, ''), 72)}
                </a>
                <ExternalLink size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
              {/* Secondary — short link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a href={shortUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: ACCENT, fontWeight: 500 }}>
                  {shortUrl.replace(/^https?:\/\//, '')}
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(shortUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '2px' }}
                >
                  <Copy size={13} />
                </button>
                {copied && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 500 }}>Copied!</span>}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Created {new Date(urlData?.created_at || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Range selector */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {RANGES.map(r => (
                <button key={r} onClick={() => setRange(r)} style={{
                  padding: '5px 14px', borderRadius: '6px', fontSize: '0.8125rem', cursor: 'pointer',
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
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Clicks',   value: totalClicks.toLocaleString(), icon: <BarChart2 size={18} style={{ color: ACCENT }} />,         color: 'rgba(245,158,11,0.1)' },
            { label: 'Top Country',    value: countries[0]?.name || '—',    icon: <Globe     size={18} style={{ color: '#60A5FA' }} />,       color: 'rgba(96,165,250,0.1)' },
            { label: 'Top Device',     value: devicesData[0]?.name || '—',  icon: <Monitor   size={18} style={{ color: '#34D399' }} />,       color: 'rgba(52,211,153,0.1)' },
            { label: 'Tracked Since',  value: new Date(urlData?.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), icon: <Clock size={18} style={{ color: '#A78BFA' }} />, color: 'rgba(167,139,250,0.1)' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ padding: '10px', background: color, borderRadius: '8px', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px', color: 'var(--text-muted)' }}>{label}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Clicks over time */}
        <div className="glass-panel" style={{ marginBottom: '16px' }}>
          <SectionLabel>Clicks over time</SectionLabel>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timeSeries} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={ACCENT} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={ACCENT} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#52525B' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="clicks" stroke={ACCENT} strokeWidth={1.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Countries + Devices */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {/* Countries bar chart */}
          <div className="glass-panel">
            <SectionLabel>Top countries</SectionLabel>
            {countries.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={countries} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} width={82} tickLine={false} axisLine={false} />
                  <Tooltip content={({ active, payload }) => active && payload?.length
                    ? <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8125rem' }}>
                        <p style={{ color: '#FAFAFA' }}>{payload[0].payload.name}: <b>{payload[0].value}</b></p>
                      </div> : null}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>
                    {countries.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No data yet.</p>}
          </div>

          {/* Device donut */}
          <div className="glass-panel">
            <SectionLabel>Device breakdown</SectionLabel>
            {devicesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={devicesData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4}>
                    {devicesData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => active && payload?.length
                    ? <div style={{ background: '#111113', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8125rem' }}>
                        <p style={{ color: '#FAFAFA' }}>{payload[0].name}: <b>{payload[0].value}</b></p>
                      </div> : null}
                  />
                  <Legend iconType="circle" iconSize={7} formatter={v => <span style={{ color: '#71717A', fontSize: '0.8rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No data yet.</p>}
          </div>
        </div>

        {/* Browser, OS, Referrers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div className="glass-panel"><SectionLabel>Browser</SectionLabel><BarList data={browserData} total={totalClicks} /></div>
          <div className="glass-panel"><SectionLabel>Operating system</SectionLabel><BarList data={osData} total={totalClicks} /></div>
          <div className="glass-panel"><SectionLabel>Top referrers</SectionLabel><BarList data={referrerData} total={totalClicks} /></div>
        </div>
      </main>
    </div>
  )
}
