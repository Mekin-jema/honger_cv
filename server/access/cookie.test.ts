import { describe, expect, it } from "vitest";
import { readUnlock, signToken, unlockCodeId, unlockToken, verifyToken } from "./cookie";

describe("signed visitor tokens", () => {
  it("verifies its own tokens and rejects tampering", () => {
    const t = signToken("demo", "hello.world")!;
    expect(verifyToken("demo", t)).toBe("hello.world");
    expect(verifyToken("demo", t.replace("hello", "HELLO"))).toBeNull();
    expect(verifyToken("demo", `${t}x`)).toBeNull();
    expect(verifyToken("demo", "garbage")).toBeNull();
    expect(verifyToken("demo", undefined)).toBeNull();
  });

  it("never accepts a token made for another purpose", () => {
    const t = signToken("preview", "x")!;
    expect(verifyToken("unlock:job", t)).toBeNull();
  });
});

describe("unlock cookies", () => {
  it("unlock the persona they were issued for, until they expire", () => {
    const now = Date.now();
    const t = unlockToken("marriage", "code-1", 3, now)!;
    expect(unlockCodeId("marriage", t, 3, now)).toBe("code-1");
    expect(readUnlock("marriage", t, 3)).toBe(true);
    // Another persona, a reset epoch, an expired cookie, a revoked code: all locked.
    expect(readUnlock("job", t, 3)).toBe(false);
    expect(readUnlock("marriage", t, 4)).toBe(false);
    expect(unlockCodeId("marriage", t, 3, now + 8 * 86400_000)).toBeNull();
    expect(readUnlock("marriage", t, 3, new Set(["code-1"]))).toBe(false);
  });
});
