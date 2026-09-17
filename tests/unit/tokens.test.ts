import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/server/auth/tokens";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "unit-test-access-secret";
  process.env.JWT_REFRESH_SECRET = "unit-test-refresh-secret";
});

describe("access tokens", () => {
  it("round-trips a valid token back to its subject", async () => {
    const token = await signAccessToken("admin-1");
    const payload = await verifyAccessToken(token);
    expect(payload?.sub).toBe("admin-1");
  });

  it("rejects a garbage token", async () => {
    expect(await verifyAccessToken("not-a-jwt")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signAccessToken("admin-1");
    const originalSecret = process.env.JWT_ACCESS_SECRET;
    process.env.JWT_ACCESS_SECRET = "a-different-secret";
    expect(await verifyAccessToken(token)).toBeNull();
    process.env.JWT_ACCESS_SECRET = originalSecret;
  });
});

describe("refresh tokens", () => {
  it("round-trips a valid token back to its subject", async () => {
    const { token } = await signRefreshToken("admin-1");
    const payload = await verifyRefreshToken(token);
    expect(payload?.sub).toBe("admin-1");
  });

  it("issues a unique jti and a ~7 day expiry", async () => {
    const a = await signRefreshToken("admin-1");
    const b = await signRefreshToken("admin-1");
    expect(a.jti).not.toBe(b.jti);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const delta = Math.abs(a.expiresAt.getTime() - (Date.now() + sevenDaysMs));
    expect(delta).toBeLessThan(5000);
  });
});

describe("hashRefreshToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashRefreshToken("some-token")).toBe(hashRefreshToken("some-token"));
  });

  it("differs for different inputs", () => {
    expect(hashRefreshToken("token-a")).not.toBe(hashRefreshToken("token-b"));
  });

  it("never stores the raw token value", () => {
    expect(hashRefreshToken("some-token")).not.toContain("some-token");
  });
});
