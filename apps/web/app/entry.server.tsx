import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

// apps/server takes the context from the build it loads, so both sides use this one copy.
export { siteContext } from "./site";

/**
 * Renders a page with web streams (Bun has no Node stream bridge to worry about). Every page waits for
 * all of its content: the data is in memory, so streaming gains nothing, and crawlers, agents and the
 * CDN cache always get the complete HTML.
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  responseHeaders.set("content-type", "text/html; charset=utf-8");
  if (request.method.toUpperCase() === "HEAD") {
    return new Response(null, { status: responseStatusCode, headers: responseHeaders });
  }

  let status = responseStatusCode;
  const body = await renderToReadableStream(<ServerRouter context={routerContext} url={request.url} />, {
    signal: AbortSignal.timeout(5_000),
    onError(error: unknown) {
      status = 500;
      console.error(error);
    },
  });
  await body.allReady;
  return new Response(body, { headers: responseHeaders, status });
}
