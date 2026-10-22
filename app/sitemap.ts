import type { MetadataRoute } from "next";
import { allTopics, siteUrl, updatedAt } from "@/lib/atlas";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/agent", "/llms.txt", "/atlas.json", ...allTopics.map((topic) => `/llms/${topic.id}.txt`)];
  return paths.map((path) => ({ url: `${siteUrl}${path}`, lastModified: updatedAt }));
}
