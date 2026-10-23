// `react-router build` writes build/server/index.js. apps/server imports it for the binary and casts it to ServerBuild.
declare const build: Record<string, unknown>;
export = build;
