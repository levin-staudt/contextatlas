// `bun run indexnow`: tell Bing, Yandex and the other IndexNow engines that every URL in the live
// sitemap changed, so they recrawl without anyone opening Bing Webmaster Tools. The deploy workflow
// runs it after each deploy. Google does not take part in IndexNow; it reads the sitemap from robots.txt.
//
// Reads SITE_URL (default https://contextatlas.dev). Exits 0 with a warning when the ping fails,
// because a deploy must not turn red over it.

import { indexNowKey } from "../packages/core/src/site";

const siteUrl = (process.env.SITE_URL ?? "https://contextatlas.dev").replace(/\/$/, "");
const host = new URL(siteUrl).host;

const sitemap = await fetch(`${siteUrl}/sitemap.xml`);
if (!sitemap.ok) {
  console.error(`::warning::${siteUrl}/sitemap.xml answered ${sitemap.status}; IndexNow was not pinged.`);
  process.exit(0);
}
const urlList = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] as string);

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key: indexNowKey, keyLocation: `${siteUrl}/${indexNowKey}.txt`, urlList }),
});
// 200 and 202 both mean accepted; 202 while the key is still being checked.
if (res.ok) console.log(`IndexNow: submitted ${urlList.length} URLs for ${host} (${res.status})`);
else console.error(`::warning::IndexNow answered ${res.status}: ${await res.text()}`);
