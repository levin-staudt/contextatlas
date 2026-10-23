import { Command } from "cmdk";
import { type MouseEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { DocHeading } from "../site";
import { SearchIcon } from "./icons";

const openEvent = "contextatlas:search";

type Props = {
  topics: { id: string; name: string; role: string; region: string }[];
  docs: { title: string; section: string; path: string; headings: DocHeading[] }[];
};

const pages = [
  { title: "The atlas", path: "/", keywords: ["home", "sources", "map"] },
  { title: "Agent prompt", path: "/agent", keywords: ["prompt", "llms.txt", "copy"] },
];

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return !!element && (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName));
}

/** The search button in the header. Without JavaScript it is a link to the search on the home page. */
export function SearchTrigger() {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  function open(event: MouseEvent) {
    event.preventDefault();
    window.dispatchEvent(new Event(openEvent));
  }
  return (
    // biome-ignore lint/a11y/useValidAnchor: a real link without JavaScript, the palette with it
    <a
      href="/#sources"
      onClick={open}
      aria-label="Search"
      aria-keyshortcuts="Meta+K Control+K /"
      className="flex items-center gap-2 rounded-full px-2 py-1 text-ink-soft no-underline hover:bg-paper-deep hover:text-ink sm:mr-1 sm:border sm:border-contour sm:px-3"
    >
      <SearchIcon />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden rounded border border-contour px-1.5 font-sans text-xs md:inline">
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </a>
  );
}

/**
 * ⌘K / Ctrl+K / "/" anywhere: jump to any tool, docs page or docs section. Everything it searches comes
 * with the page (root loader), so results appear as you type, without a request.
 */
export function CommandPalette({ topics, docs }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !isTyping(event.target))) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(openEvent, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(openEvent, onOpen);
    };
  }, []);

  function go(path: string) {
    setOpen(false);
    setQuery("");
    navigate(path);
  }

  const item =
    "flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-2 data-[selected=true]:bg-paper-deep data-[selected=true]:text-ink";
  const group =
    "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-sans [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-soft";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Search Context Atlas"
      overlayClassName="fixed inset-0 z-40 bg-ink/30"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-2xl"
    >
      <div className="flex items-center gap-3 border-b border-contour px-4">
        <SearchIcon className="size-5 shrink-0 text-ink-soft" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search tools, docs and sections…"
          className="w-full bg-transparent py-3.5 font-sans text-lg text-ink placeholder:text-ink-soft/70 focus:outline-none"
        />
        <kbd className="hidden rounded border border-contour px-1.5 font-sans text-xs text-ink-soft sm:inline">esc</kbd>
      </div>
      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2 font-sans">
        <Command.Empty className="px-3 py-6 text-center text-ink-soft">
          Nothing found. Try a product, a role such as “database”, or a docs topic.
        </Command.Empty>

        <Command.Group heading="Pages" className={group}>
          {pages.map((page) => (
            <Command.Item
              key={page.path}
              value={`${page.title} ${page.path} page`}
              keywords={page.keywords}
              onSelect={() => go(page.path)}
              className={item}
            >
              <span className="font-medium">{page.title}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Tools" className={group}>
          {topics.map((topic) => (
            <Command.Item
              key={topic.id}
              value={`${topic.name} ${topic.id}`}
              keywords={[topic.role, topic.region]}
              onSelect={() => go(`/#${topic.id}`)}
              className={item}
            >
              <span className="font-medium">{topic.name}</span>
              <span className="truncate text-sm text-ink-soft">
                {topic.role} · {topic.region}
              </span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading="Docs" className={group}>
          {docs.map((page) => (
            <Command.Item
              key={page.path}
              value={`${page.title} ${page.path}`}
              keywords={[page.section]}
              onSelect={() => go(page.path)}
              className={item}
            >
              <span className="font-medium">{page.title}</span>
              <span className="truncate text-sm text-ink-soft">{page.section}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {query.trim() && (
          <Command.Group heading="Sections" className={group}>
            {docs.flatMap((page) =>
              page.headings.map((heading) => (
                <Command.Item
                  key={`${page.path}#${heading.id}`}
                  value={`${heading.text} ${page.path}#${heading.id}`}
                  keywords={[page.title]}
                  onSelect={() => go(`${page.path}#${heading.id}`)}
                  className={item}
                >
                  <span className="font-medium">{heading.text}</span>
                  <span className="truncate text-sm text-ink-soft">{page.title}</span>
                </Command.Item>
              )),
            )}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
