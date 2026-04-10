import { env } from 'cloudflare:workers';
import { createMcpAgent } from '@cloudflare/playwright-mcp';

export const PlaywrightMCP = createMcpAgent(env.BROWSER);

interface Env {
  BROWSER: any;
  SECRET_TOKEN?: string;
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // HEAD for MCP protocol discovery — no auth needed
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "MCP-Protocol-Version": "2025-06-18" },
      });
    }

    // Token authentication — checked via ?token= query param or Authorization: Bearer header
    if (env.SECRET_TOKEN) {
      const url = new URL(request.url);
      const queryToken = url.searchParams.get("token");
      const bearerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
      if ((queryToken || bearerToken) !== env.SECRET_TOKEN) {
        return new Response("Unauthorized", {
          status: 401,
          headers: { "WWW-Authenticate": "Bearer" },
        });
      }
    }

    const { pathname } = new URL(request.url);
    switch (pathname) {
      case "/sse":
      case "/sse/message":
        return PlaywrightMCP.serveSSE("/sse").fetch(request, env, ctx);
      case "/mcp":
        return PlaywrightMCP.serve("/mcp").fetch(request, env, ctx);
      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};
