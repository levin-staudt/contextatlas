// Progressive enhancement for the server-rendered pages: every page works without this script.

function $<T extends Element>(selector: string, root: ParentNode = document) {
  return root.querySelector<T>(selector);
}

function $$<T extends Element>(selector: string, root: ParentNode = document) {
  return [...root.querySelectorAll<T>(selector)];
}

function setupThemeToggle() {
  for (const button of $$<HTMLButtonElement>("[data-theme-toggle]")) {
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {}
    });
  }
}

/**
 * Copies `text()` on click and reports "copied" or "failed", then "idle" after a moment. Shared by the
 * copy buttons on /agent and the code blocks in the docs.
 */
function copyOnClick(
  button: HTMLButtonElement,
  text: () => string,
  show: (state: "copied" | "failed" | "idle") => void,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  button.addEventListener("click", async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(text());
      show("copied");
    } catch {
      show("failed");
    }
    timer = setTimeout(() => show("idle"), 2400);
  });
}

const clipboardBlocked = "Your browser blocked the clipboard. Select the text and copy it manually.";

function setupCopyButtons() {
  for (const button of $$<HTMLButtonElement>("[data-copy]")) {
    const source = $<HTMLElement>(`[data-copy-source="${button.dataset.copy}"]`);
    const status = button.parentElement?.querySelector<HTMLElement>("[data-copy-status]");
    const label = $<HTMLElement>("[data-copy-label]", button);
    copyOnClick(
      button,
      () => source?.textContent ?? "",
      (state) => {
        const copied = state === "copied";
        if (label) label.textContent = copied ? "Copied" : (button.dataset.label ?? "");
        $("[data-icon=copy]", button)?.classList.toggle("hidden", copied);
        $("[data-icon=check]", button)?.classList.toggle("hidden", !copied);
        if (status)
          status.textContent = copied ? "Paste it into your agent's chat." : state === "failed" ? clipboardBlocked : "";
      },
    );
  }
}

/** A copy button on every code block in the docs. */
function setupDocCodeBlocks() {
  for (const pre of $$<HTMLPreElement>("[data-doc] pre")) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy";
    button.className =
      "absolute right-2 top-2 rounded-full border border-contour bg-paper px-3 py-0.5 font-sans text-sm text-ink-soft hover:text-ink";
    copyOnClick(
      button,
      () => pre.textContent?.trimEnd() ?? "",
      (state) => {
        button.textContent = state === "copied" ? "Copied" : "Copy";
        button.title = state === "failed" ? clipboardBlocked : "";
      },
    );
    const wrapper = document.createElement("div");
    wrapper.className = "relative";
    pre.classList.add("pt-12");
    pre.replaceWith(wrapper);
    wrapper.append(pre, button);
  }
}

function setupPromptPicker() {
  const picker = $<HTMLElement>("[data-prompt-picker]");
  if (!picker) return;
  const prompt = $<HTMLElement>("[data-copy-source=prompt]", picker);
  const hint = $<HTMLElement>("[data-mode-hint]", picker);
  const ideaField = $<HTMLElement>("[data-idea-field]", picker);
  const idea = $<HTMLTextAreaElement>("textarea", picker);
  const buttons = $$<HTMLButtonElement>("[data-mode]", picker);
  if (!prompt || !hint || !ideaField || !idea) return;
  let mode = "existing";

  // split/join instead of replace(): replace() would expand $&, $' and $$ in what the user typed.
  function render() {
    if (!prompt) return;
    const { promptExisting = "", promptNew = "", ideaPlaceholder = "" } = prompt.dataset;
    prompt.textContent =
      mode === "existing"
        ? promptExisting
        : promptNew.split(ideaPlaceholder).join(idea?.value.trim() || ideaPlaceholder);
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      mode = button.dataset.mode ?? "existing";
      for (const other of buttons) other.setAttribute("aria-pressed", String(other === button));
      hint.textContent = button.dataset.hint ?? "";
      ideaField.hidden = mode !== "new";
      render();
    });
  }
  idea.addEventListener("input", render);
}

function setupSourceBrowser() {
  const browser = $<HTMLElement>("[data-source-browser]");
  if (!browser) return;
  const input = $<HTMLInputElement>("[data-search-input]", browser);
  const toggles = $$<HTMLButtonElement>("[data-kind-toggle]", browser);
  const regions = $$<HTMLElement>("[data-region]", browser);
  const empty = $<HTMLElement>("[data-empty]", browser);
  const count = $<HTMLElement>("[data-shown-count]", browser);
  const noun = $<HTMLElement>("[data-shown-noun]", browser);
  if (!input || !empty || !count || !noun) return;
  const hidden = new Set<string>();

  function apply() {
    const query = input?.value.trim().toLowerCase() ?? "";
    let shown = 0;
    for (const region of regions) {
      let regionShown = 0;
      for (const topic of $$<HTMLElement>("[data-topic]", region)) {
        const topicMatches = !query || (topic.dataset.search ?? "").includes(query);
        let topicShown = 0;
        for (const source of $$<HTMLElement>("[data-source]", topic)) {
          const visible =
            !hidden.has(source.dataset.kind ?? "") && (topicMatches || (source.dataset.search ?? "").includes(query));
          source.hidden = !visible;
          if (visible) topicShown++;
        }
        topic.hidden = topicShown === 0;
        regionShown += topicShown;
      }
      region.hidden = regionShown === 0;
      const link = $<HTMLElement>(`[data-region-link="${region.id}"]`);
      if (link) link.hidden = regionShown === 0;
      shown += regionShown;
    }
    if (count) count.textContent = String(shown);
    if (noun) noun.textContent = shown === 1 ? "source" : "sources";
    if (empty) {
      empty.hidden = shown > 0;
      const emptyQuery = $("[data-empty-query]", empty);
      if (emptyQuery) emptyQuery.textContent = input?.value.trim() ?? "";
    }
    const url = new URL(location.href);
    if (query) url.searchParams.set("q", input?.value.trim() ?? "");
    else url.searchParams.delete("q");
    history.replaceState(null, "", url);
  }

  input.value = new URL(location.href).searchParams.get("q") ?? input.value;
  input.addEventListener("input", apply);
  for (const toggle of toggles) {
    toggle.addEventListener("click", () => {
      const kind = toggle.dataset.kindToggle ?? "";
      if (hidden.has(kind)) hidden.delete(kind);
      else hidden.add(kind);
      toggle.setAttribute("aria-pressed", String(!hidden.has(kind)));
      apply();
    });
  }
  $("[data-reset]", browser)?.addEventListener("click", () => {
    input.value = "";
    hidden.clear();
    for (const toggle of toggles) toggle.setAttribute("aria-pressed", "true");
    apply();
  });
  if (input.value) apply();
}

setupThemeToggle();
setupCopyButtons();
setupDocCodeBlocks();
setupPromptPicker();
setupSourceBrowser();
