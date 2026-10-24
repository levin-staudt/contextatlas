/** The q value the Accept header gives a media type (exact or `type/*`), 0 when it is not listed. */
function quality(accept: string, type: string) {
  let best = 0;
  for (const part of accept.split(",")) {
    const [range = "", ...params] = part.trim().toLowerCase().split(";");
    const name = range.trim();
    if (name !== type && name !== `${type.split("/")[0]}/*`) continue;
    const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
    const value = q ? Number(q.slice(2)) : 1;
    if (Number.isFinite(value)) best = Math.max(best, value);
  }
  return best;
}

/**
 * True when the client asks for Markdown more than for HTML, e.g. `Accept: text/markdown` or
 * `text/markdown, text/html;q=0.9`. Browsers send `text/html` first and never get Markdown.
 */
export function prefersMarkdown(accept: string | undefined) {
  if (!accept) return false;
  const markdown = quality(accept, "text/markdown");
  return markdown > 0 && markdown > quality(accept, "text/html");
}
