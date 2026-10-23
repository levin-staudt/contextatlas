import { type MouseEvent, useEffect, useRef, useState } from "react";
import { matchPath, PrefetchPageLinks, useNavigate } from "react-router";
import { pageRoutes } from "../pages";
import { clipboardBlocked } from "./copy";

/** Paths rendered by this app; everything else (llms.txt, .md, /api, /mcp) is a file for agents. */
export function isPagePath(path: string) {
  if (/\.[^/]*$/.test(path)) return false;
  return pageRoutes.some((route) => matchPath(route.path, path));
}

function pageHref(anchor: HTMLAnchorElement | null) {
  if (!anchor || anchor.target || anchor.hasAttribute("download")) return undefined;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin || !isPagePath(url.pathname)) return undefined;
  // A #section on the same page: the browser scrolls there without a navigation.
  if (url.pathname === location.pathname && url.search === location.search && url.hash) return undefined;
  return url.pathname + url.search + url.hash;
}

/**
 * A docs page body: HTML compiled from MDX on the server. Links to other pages navigate client-side and
 * are prefetched on hover, like <Link>; code blocks get a copy button once JavaScript runs.
 */
export function DocContent({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [prefetch, setPrefetch] = useState<string>();

  useEffect(() => {
    const root = ref.current;
    if (!root || !html) return;
    for (const pre of root.querySelectorAll("pre")) addCopyButton(pre);
  }, [html]);

  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const href = pageHref((event.target as Element).closest("a"));
    if (!href) return;
    event.preventDefault();
    navigate(href);
  }

  function onPointerOver(event: MouseEvent<HTMLDivElement>) {
    const href = pageHref((event.target as Element).closest("a"));
    if (href) setPrefetch(href.split("#")[0]);
  }

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: delegates clicks on the links inside */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: links handle Enter themselves and bubble a click */}
      <div
        ref={ref}
        className="doc mt-10"
        onClick={onClick}
        onPointerOver={onPointerOver}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: our own MDX, compiled on the server
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {prefetch && <PrefetchPageLinks page={prefetch} />}
    </>
  );
}

function addCopyButton(pre: HTMLPreElement) {
  if (pre.parentElement?.dataset.codeBlock !== undefined) return;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Copy";
  button.className =
    "absolute right-2 top-2 rounded-full border border-contour bg-paper px-3 py-0.5 font-sans text-sm text-ink-soft opacity-80 hover:text-ink hover:opacity-100 focus-visible:opacity-100";
  let timer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener("click", async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(pre.textContent?.trimEnd() ?? "");
      button.textContent = "Copied";
      button.title = "";
    } catch {
      button.textContent = "Copy failed";
      button.title = clipboardBlocked;
    }
    timer = setTimeout(() => {
      button.textContent = "Copy";
    }, 2000);
  });
  const wrapper = document.createElement("div");
  wrapper.className = "relative";
  wrapper.dataset.codeBlock = "";
  pre.classList.add("pt-12");
  pre.replaceWith(wrapper);
  wrapper.append(pre, button);
}
