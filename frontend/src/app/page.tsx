import Link from 'next/link'
import { ArrowRight, LinkIcon, Zap, BarChart2 } from 'lucide-react'

export default function Home() {
  return (
    <main>
      <div className="container">
        <nav className="nav">
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon className="text-accent" />
            <span>ShortLink<span className="text-accent">.</span></span>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <Link href="/login" className="btn-secondary">Log in</Link>
            <Link href="/register" className="btn-primary">Sign up free</Link>
          </div>
        </nav>

        <section style={{ padding: '120px 0', textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', background: 'rgba(94, 92, 230, 0.1)', color: 'var(--accent)', borderRadius: '24px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '24px' }}>
            Lightning fast edge routing ⚡️
          </div>
          <h1 style={{ fontSize: '4rem', lineHeight: 1.1, marginBottom: '24px' }}>
            Short links, <span className="text-accent">big results.</span>
          </h1>
          <p style={{ fontSize: '1.25rem', marginBottom: '40px', color: 'var(--text-muted)' }}>
            A premium URL shortener that gives you comprehensive analytics, instant edge redirects, and complete control over your links.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link href="/register" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.125rem' }}>
              Start for free <ArrowRight size={20} />
            </Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', paddingBottom: '120px' }}>
          <div className="glass-card">
            <Zap className="text-accent" size={32} style={{ marginBottom: '16px' }} />
            <h3>Edge Caching</h3>
            <p>Your redirects happen in milliseconds via Cloudflare KV cache for maximum performance.</p>
          </div>
          <div className="glass-card">
            <BarChart2 className="text-accent" size={32} style={{ marginBottom: '16px' }} />
            <h3>Advanced Analytics</h3>
            <p>Track exactly where your users are coming from with detailed device and country metrics.</p>
          </div>
          <div className="glass-card">
            <LinkIcon className="text-accent" size={32} style={{ marginBottom: '16px' }} />
            <h3>Brand Control</h3>
            <p>Customize your URLs to maintain your brand presence everywhere you build links.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
