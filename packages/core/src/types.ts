export const sourceKinds = ["llms", "full", "docs", "mcp", "skill", "rules", "guide"] as const;
export type SourceKind = (typeof sourceKinds)[number];

export type Source = {
  kind: SourceKind;
  title: string;
  url: string;
};

export const signalTypes = ["file", "dependency", "env", "hint"] as const;
export type SignalType = (typeof signalTypes)[number];

/**
 * Evidence that a repo uses a topic. `contextatlas detect` (#13) checks `file`, `dependency` and `env`
 * signals mechanically; `hint` signals are plain-language clues for agents.
 *
 * - `file`: a glob relative to the repo root or a workspace package root. A trailing `/` means a
 *   directory, `**\/` matches at any depth, `{a,b}` matches either.
 * - `dependency`: a package name in package.json (dependencies, devDependencies, peer or optional).
 *   `*` matches any part of a name, e.g. `@vercel/*`.
 * - `env`: an environment variable name, found in `.env*` files, CI config or code.
 * - `hint`: anything else, for example a CLI used in scripts.
 */
export type Signal = {
  type: SignalType;
  pattern: string;
};

export type Topic = {
  id: string;
  name: string;
  /** Short role in a stack, e.g. "Hosting" or "Database". */
  role: string;
  /** Files, dependencies or config an agent can look for to detect this topic in a repo. */
  signals: Signal[];
  sources: Source[];
};

export type Region = {
  id: string;
  name: string;
  description: string;
  topics: Topic[];
};

export type Catalog = {
  updatedAt: string;
  regions: Region[];
};

/** A topic together with the region it belongs to, as returned by the API and MCP tools. */
export type TopicWithRegion = Topic & { region: { id: string; name: string } };
