export interface Env {
  SPRING_BOOT_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CLOUDFLARE_ORIGIN_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }


    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/+/g, '/'); // Normalize // to /

    // Only proxy /api/* requests
    if (normalizedPath.startsWith('/api/')) {
      const parsedHeaders = new Headers(request.headers);
      // Enforce auth only for creating URLs
      if (request.method === 'POST' && normalizedPath.includes('/urls')) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), { 
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        // Validate with Supabase Auth
        const authResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'apikey': env.SUPABASE_ANON_KEY,
            'Authorization': authHeader
          }
        });
        
        if (!authResponse.ok) {
          return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), { 
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        const user: any = await authResponse.json();
        // Pass X-User-Id downstream
        parsedHeaders.set('X-User-Id', user.id);
      }

      // Strip the /api prefix before sending to the backend
      const backendPath = normalizedPath.replace(/^\/api/, '');
      const backendUrl = env.SPRING_BOOT_URL + backendPath + url.search;
      // Inject the origin secret to verify this request came from Cloudflare
      parsedHeaders.set('X-Cloudflare-Secret', env.CLOUDFLARE_ORIGIN_SECRET);

      const proxyRequest = new Request(backendUrl, {
        method: request.method,
        headers: parsedHeaders,
        body: request.body
      });
      
      try {
        const response = await fetch(proxyRequest);
        const contentType = response.headers.get('Content-Type') || '';
        
        // If backend returned HTML (like a default error page), wrap it in JSON
        if (!contentType.includes('application/json') && !response.ok) {
           return new Response(JSON.stringify({ error: `Backend error (${response.status})` }), { 
             status: response.status, 
             headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
           });
        }

        // Copy response and add CORS headers
        const newResponse = new Response(response.body, response);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newResponse.headers.set(key, value);
        });
        return newResponse;
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Backend unreachable' }), { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  },
};
