import { describe, expect, it } from "vitest";
import { cloudinaryCredentials } from "./cloudinary-config";

describe("cloudinaryCredentials", () => {
  it("reads credentials from CLOUDINARY_URL", () => {
    expect(cloudinaryCredentials({ CLOUDINARY_URL: "cloudinary://key:secret@demo" })).toEqual({
      cloud_name: "demo",
      api_key: "key",
      api_secret: "secret",
    });
  });

  it("uses explicit credentials and rejects a mismatched URL cloud", () => {
    expect(
      cloudinaryCredentials({
        NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "other",
        CLOUDINARY_URL: "cloudinary://key:secret@demo",
      }),
    ).toBeNull();
  });
});