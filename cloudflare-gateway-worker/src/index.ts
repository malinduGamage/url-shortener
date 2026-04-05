export interface Env {
  SPRING_BOOT_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
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

    // Only proxy /api/* requests
    if (url.pathname.startsWith('/api/')) {
      const parsedHeaders = new Headers(request.headers);
      // Enforce auth only for creating URLs
      if (request.method === 'POST' && url.pathname.includes('/urls')) {
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

      const backendUrl = env.SPRING_BOOT_URL + url.pathname + url.search;
      const proxyRequest = new Request(backendUrl, {
        method: request.method,
        headers: parsedHeaders,
        body: request.body
      });
      
      try {
        const response = await fetch(proxyRequest);
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
