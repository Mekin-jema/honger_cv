import { describe, expect, it } from "vitest";
import { withBase } from "./utils";

describe("withBase", () => {
  it("preserves external image URLs while prefixing local paths", () => {
    const previousBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
    process.env.NEXT_PUBLIC_BASE_PATH = "/app";
    try {
      expect(withBase("https://res.cloudinary.com/demo/image/upload/photo.webp")).toBe(
        "https://res.cloudinary.com/demo/image/upload/photo.webp",
      );
      expect(withBase("/images/mekin.png")).toBe("/app/images/mekin.png");
    } finally {
      if (previousBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
      else process.env.NEXT_PUBLIC_BASE_PATH = previousBasePath;
    }
  });
});
