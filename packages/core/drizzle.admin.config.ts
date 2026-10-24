import { defineConfig } from "drizzle-kit";

// The admin database (tokens, review queue, audit log); see src/admin-schema.ts.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/admin-schema.ts",
  out: "./drizzle-admin",
  casing: "snake_case",
});
