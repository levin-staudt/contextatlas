import { allTopics, findTopic } from "@/lib/atlas";
import { agentCacheControl, buildTopicTxt } from "@/lib/prompt";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allTopics.map((topic) => ({ file: `${topic.id}.txt` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const topic = file.endsWith(".txt") ? findTopic(file.slice(0, -".txt".length)) : undefined;
  if (!topic) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
  return new Response(buildTopicTxt(topic), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": agentCacheControl },
  });
}
