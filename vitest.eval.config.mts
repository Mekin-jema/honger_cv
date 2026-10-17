import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// `npm run eval`: asks the persona's AI the questions in evals/<persona>.json with the real model.
// Separate from `npm test` (which never calls a model).
export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": path.join(root, "test/empty.ts"),
    },
  },
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    testTimeout: 15 * 60_000,
  },
});
