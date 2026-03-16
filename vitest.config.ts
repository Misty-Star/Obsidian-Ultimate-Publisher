import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      obsidian: resolve(__dirname, "tests/support/obsidian.ts"),
    },
  },
  test: {
    include: ["tests/**/*.spec.ts"],
    pool: "threads",
    maxWorkers: 1,
  },
});
