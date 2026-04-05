# Scalable URL Shortener with Cloudflare Edge Caching

A modern, high-performance URL shortening service built with a geographically distributed architecture across Cloudflare and Google Cloud Platform.

## 🌍 Live Project
The project is currently accessible at: [https://url-shortener-tau-five.vercel.app/](https://url-shortener-tau-five.vercel.app/)

## 🏗️ System Architecture
For a deep dive into the architecture, components, and security model, please see the [System Design Document](SYSTEM_DESIGN.md).

## 🚀 Technology Stack
- **Edge Routing & Caching**: [Cloudflare Workers](https://workers.cloudflare.com/) (Gateway and Redirect services)
- **Edge Storage**: [Cloudflare KV](https://www.cloudflare.com/products/workers-kv/) (Caching redirects)
- **Backend**: [Spring Boot 3](https://spring.io/projects/spring-boot) (GCP Cloud Run)
- **Frontend**: [Next.js](https://nextjs.org/) (Vercel)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL)

## 🏗️ Local Development

### 1. Spring Boot Backend
```bash
cd url-shortening-service
mvn spring-boot:run
```

### 2. Cloudflare Workers
Requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) CLI.
```bash
cd cloudflare-gateway-worker
npx wrangler dev
```

### 3. Frontend
```bash
cd frontend
npm run dev
```

## 🔒 Security Policy
All backend communication is secured via:
- **JWT Authentication**: Validated at the Cloudflare Edge against Supabase.
- **Origin Secret**: A shared secret header ensuring only trusted traffic from Cloudflare reaches the GCP origin.
