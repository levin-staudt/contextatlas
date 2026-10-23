// `bun run deploy`: start the deploy workflow on main and follow exactly that run until it finishes.
// Exits non-zero if the deploy fails, so agents can rely on the exit code.

function gh(args: string[]) {
  const result = Bun.spawnSync(["gh", ...args], { stdout: "pipe", stderr: "inherit" });
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1);
  return result.stdout.toString();
}

const ref = process.argv[2] ?? "main";
const before = new Set(
  (
    JSON.parse(
      gh(["run", "list", "--workflow", "deploy.yml", "--event", "workflow_dispatch", "--json", "databaseId"]),
    ) as {
      databaseId: number;
    }[]
  ).map((run) => run.databaseId),
);

gh(["workflow", "run", "deploy.yml", "--ref", ref]);
console.log(`Started deploy.yml on ${ref}, waiting for the run to appear...`);

let runId: number | undefined;
for (let attempt = 0; attempt < 60 && !runId; attempt++) {
  await Bun.sleep(2000);
  const runs = JSON.parse(
    gh(["run", "list", "--workflow", "deploy.yml", "--event", "workflow_dispatch", "--json", "databaseId"]),
  ) as { databaseId: number }[];
  runId = runs.find((run) => !before.has(run.databaseId))?.databaseId;
}
if (!runId) {
  console.error("The dispatched run did not show up within two minutes. Check `gh run list --workflow deploy.yml`.");
  process.exit(1);
}

const watch = Bun.spawnSync(["gh", "run", "watch", String(runId), "--exit-status"], {
  stdio: ["inherit", "inherit", "inherit"],
});
if (watch.exitCode !== 0) process.exit(watch.exitCode ?? 1);

// A skipped deploy job (no DEPLOY_SSH_HOST variable) still makes the run green, but nothing reached the VPS.
const { jobs } = JSON.parse(gh(["run", "view", String(runId), "--json", "jobs"])) as {
  jobs: { name: string; conclusion: string }[];
};
const deploy = jobs.find((job) => job.name === "deploy");
if (deploy?.conclusion !== "success") {
  console.error(
    `The deploy job did not run (${deploy?.conclusion ?? "missing"}). Is the DEPLOY_SSH_HOST variable set?`,
  );
  process.exit(1);
}

export {};
