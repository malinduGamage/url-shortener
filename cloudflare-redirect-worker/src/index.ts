export interface Env {
  URL_CACHE: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

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
          
          // Cache in KV
          // store URL and ID separated by pipe to save parsing time, or just store JSON
          ctx.waitUntil(env.URL_CACHE.put(shortCode, JSON.stringify({ longUrl, urlId }), { expirationTtl: 86400 }));
        }
      }
    } else {
      try {
        const parsed = JSON.parse(cachedLongUrl as string);
        longUrl = parsed.longUrl;
        urlId = parsed.urlId;
      } catch (e) {
        // Fallback if we accidentally stored just string
        longUrl = cachedLongUrl;
      }
    }

    if (!longUrl) {
      return new Response("URL Not Found", { status: 404 });
    }

    // 3. Log Analytics asynchronously
    if (urlId) {
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
            user_agent: request.headers.get('user-agent'),
            ip_address: request.headers.get('cf-connecting-ip'),
            visitor_country: request.headers.get('cf-ipcountry'),
            referer: request.headers.get('referer')
          })
        });
      };
      
      ctx.waitUntil(logAnalytics());
    }

    // 4. Redirect
    return Response.redirect(longUrl, 302);
  },
};
