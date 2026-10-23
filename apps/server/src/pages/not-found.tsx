import { Layout } from "./layout";

export function NotFoundPage({ path }: { path: string }) {
  return (
    <Layout title="Not found · Context Atlas" path={path}>
      <main class="mx-auto max-w-7xl px-4 pt-8 sm:px-8 sm:pt-16">
        <h1 class="text-[2.75rem] font-extrabold leading-none tracking-tight sm:text-7xl">Off the map</h1>
        <p class="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft sm:text-xl">
          There is nothing at <span class="text-ink [overflow-wrap:anywhere]">{path}</span>.{" "}
          <a href="/" class="text-ink underline underline-offset-4">
            Back to the atlas
          </a>
          .
        </p>
      </main>
    </Layout>
  );
}
