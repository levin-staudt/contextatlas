import { expect, test } from "bun:test";
import worker from "../src";

test("redirects permanently and keeps path and query", () => {
  const res = worker.fetch(new Request("https://contextatlas.levinstaudt.workers.dev/llms/vercel.txt?x=1"), {
    TARGET_ORIGIN: "https://contextatlas.dev",
  });
  expect(res.status).toBe(301);
  expect(res.headers.get("location")).toBe("https://contextatlas.dev/llms/vercel.txt?x=1");
});
