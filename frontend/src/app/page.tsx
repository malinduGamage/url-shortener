import Link from 'next/link'
import { ArrowRight, LinkIcon, Zap, BarChart2, Shield } from 'lucide-react'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="container">
        {/* Nav */}
        <nav className="nav">
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LinkIcon size={16} className="text-accent" />
            <span>ShortLink<span className="text-accent">.</span></span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/login" className="btn-secondary" style={{ padding: '8px 16px' }}>Log in</Link>
            <Link href="/register" className="btn-primary" style={{ padding: '8px 16px' }}>Get started</Link>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding: '100px 0 80px', maxWidth: '680px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '5px 12px', background: 'rgba(245,158,11,0.1)',
            borderRadius: '100px', marginBottom: '28px',
            border: '1px solid rgba(245,158,11,0.2)',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#F59E0B', letterSpacing: '0.02em' }}>Edge-powered redirects</span>
          </div>

          <h1 style={{ fontSize: '3.5rem', marginBottom: '20px' }}>
            Links built for<br /><span className="text-accent">performance.</span>
          </h1>
          <p style={{ fontSize: '1.125rem', marginBottom: '36px', maxWidth: '480px', lineHeight: 1.7 }}>
            A minimal URL shortener with deep analytics, instant edge caching, and a clean dashboard that doesn't get in the way.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '12px 24px', fontSize: '0.9375rem' }}>
              Start for free <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: '12px 24px', fontSize: '0.9375rem' }}>
              Sign in
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="divider" />

        {/* Features */}
        <section style={{ padding: '64px 0 100px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--border)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[
            {
              icon: <Zap size={20} className="text-accent" />,
              title: 'Edge Caching',
              desc: 'Redirects served in milliseconds via Cloudflare KV at the edge — globally.',
            },
            {
              icon: <BarChart2 size={20} className="text-accent" />,
              title: 'Deep Analytics',
              desc: 'Track clicks by country, device, browser, OS, and referrer with rich charts.',
            },
            {
              icon: <Shield size={20} className="text-accent" />,
              title: 'Secure by Design',
              desc: 'JWT authentication, RLS policies, and Cloudflare origin protection built in.',
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} style={{ background: 'var(--surface)', padding: '32px 28px' }}>
              <div style={{ marginBottom: '14px' }}>{icon}</div>
              <h3 style={{ marginBottom: '8px' }}>{title}</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
