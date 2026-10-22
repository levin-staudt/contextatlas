import { agentCacheControl, buildLlmsTxt } from "@/lib/prompt";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": agentCacheControl },
  });
}
