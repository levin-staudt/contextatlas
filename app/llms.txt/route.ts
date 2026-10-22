import { buildAgentPrompt } from "@/lib/prompt";

export const dynamic = "force-static";

export function GET() {
  const body = `# Context Atlas

> A map of llms.txt files, docs, MCP servers, agent skills and rule files that teach coding agents a software stack. The prompt below tells an agent how to detect the stack of a repository and which sources to read for each tool.

${buildAgentPrompt()}`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
