/** Agent files and pages change with the catalog, so CDNs keep them for a day; deploys purge the CDN cache. */
export const agentCacheControl = "public, max-age=3600, s-maxage=86400";
export const pageCacheControl = "public, max-age=0, s-maxage=86400";
/** Search results are cheap to compute and not covered by the CDN cache rule. */
export const searchCacheControl = "public, max-age=300";
export const noStore = "no-store";
