// `bun dev`: runs `src/dev.ts` (seed, then serve with Vite for the pages) and restarts it whenever the
// server or packages/core changes. `bun --watch` alone does not follow the workspace import into
// packages/core, so catalog edits would not re-seed. Docs pages are compiled at startup, so their edits
// restart it too. Edits in apps/web need no restart: Vite hot-reloads them.
import { type FSWatcher, watch } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const watched = [
  join(root, "src"),
  join(root, "../../packages/core/src"),
  join(root, "../../packages/core/drizzle"),
  join(root, "../../packages/core/drizzle-admin"),
  join(root, "../../packages/core/docs"),
];

let child: ReturnType<typeof Bun.spawn> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
// Restarts run one after another, so two quick changes never spawn two servers.
let restarting: Promise<void> = Promise.resolve();

function start() {
  restarting = restarting.then(async () => {
    if (child) {
      child.kill();
      await child.exited;
    }
    child = Bun.spawn(["bun", "src/dev.ts"], { cwd: root, stdio: ["inherit", "inherit", "inherit"] });
  });
  return restarting;
}

const watchers: FSWatcher[] = watched.map((dir) =>
  watch(dir, { recursive: true }, (_event, file) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`Changed ${file}, restarting`);
      void start();
    }, 100);
  }),
);

process.on("SIGTERM", () => {
  for (const watcher of watchers) watcher.close();
  child?.kill();
  process.exit(0);
});

await start();
