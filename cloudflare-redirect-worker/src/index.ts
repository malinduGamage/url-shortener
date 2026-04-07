export interface Env {
  URL_CACHE: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// ---------------------------------------------------------------------------
// Lightweight UA parser — no external deps, runs fine at the edge
// ---------------------------------------------------------------------------

function parseDeviceType(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome\/\d/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/trident\/|msie /i.test(ua)) return 'IE';
  return 'Other';
}

function parseOS(ua: string): string {
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function parseRefererDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    // Strip www. prefix for clean grouping
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const shortCode = url.pathname.slice(1); // Remove leading slash

    if (!shortCode) {
      return new Response("Not Found", { status: 404 });
    }

    // 1. Check KV Cache
    const cachedLongUrl = await env.URL_CACHE.get(shortCode);
    let longUrl = cachedLongUrl;
    let urlId = null;

    if (!longUrl) {
      // 2. Fetch from Supabase if not in cache
      const supabaseApiUrl = `${env.SUPABASE_URL}/rest/v1/urls?short_code=eq.${shortCode}&select=id,long_url`;
      const response = await fetch(supabaseApiUrl, {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && data.length > 0) {
          longUrl = data[0].long_url;
          urlId = data[0].id;

          // Cache in KV (store JSON with both longUrl and urlId)
          ctx.waitUntil(env.URL_CACHE.put(shortCode, JSON.stringify({ longUrl, urlId }), { expirationTtl: 86400 }));
        }
      }
    } else {
      try {
        const parsed = JSON.parse(cachedLongUrl as string);
        longUrl = parsed.longUrl;
        urlId = parsed.urlId;
      } catch {
        // Fallback if we accidentally stored just a string
        longUrl = cachedLongUrl;
      }
    }

    if (!longUrl) {
      return new Response("URL Not Found", { status: 404 });
    }

    // 3. Log Analytics asynchronously
    if (urlId) {
      const rawUA = request.headers.get('user-agent') || '';
      const rawReferer = request.headers.get('referer');

      const logAnalytics = async () => {
        const analyticsApiUrl = `${env.SUPABASE_URL}/rest/v1/analytics`;
        await fetch(analyticsApiUrl, {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            url_id: urlId,
            // Raw fields (kept for backwards compatibility)
            user_agent: rawUA,
            ip_address: request.headers.get('cf-connecting-ip'),
            visitor_country: request.headers.get('cf-ipcountry'),
            referer: rawReferer,
            // Parsed / enriched fields
            device_type: parseDeviceType(rawUA),
            browser: parseBrowser(rawUA),
            os: parseOS(rawUA),
            referer_domain: parseRefererDomain(rawReferer),
          })
        });
      };

      ctx.waitUntil(logAnalytics());
    }

    // 4. Redirect
    return Response.redirect(longUrl, 302);
  },
};
