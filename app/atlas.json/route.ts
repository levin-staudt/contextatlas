import { kinds, regions, updatedAt } from "@/lib/atlas";
import { agentCacheControl, topicUrl } from "@/lib/prompt";

export const dynamic = "force-static";

export function GET() {
  const data = {
    updatedAt,
    kinds,
    regions: regions.map((region) => ({
      ...region,
      topics: region.topics.map((topic) => ({ ...topic, llmsTxt: topicUrl(topic) })),
    })),
  };
  return Response.json(data, { headers: { "cache-control": agentCacheControl } });
}
