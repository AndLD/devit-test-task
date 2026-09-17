import { jest } from "@jest/globals";
import {
  AuthService,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from "@/server/services/auth-service";
import type { AdminUserRepository } from "@/server/repositories/admin-user-repository";
import type { RefreshTokenRepository } from "@/server/repositories/refresh-token-repository";
import { hashPassword } from "@/server/auth/passwords";
import { hashRefreshToken } from "@/server/auth/tokens";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "unit-test-access-secret";
  process.env.JWT_REFRESH_SECRET = "unit-test-refresh-secret";
});

function makeFakeAdminUsers(
  overrides: Partial<AdminUserRepository> = {},
): AdminUserRepository {
  return {
    findByEmail: jest.fn(async () => null),
    findById: jest.fn(async () => null),
    ...overrides,
  } as unknown as AdminUserRepository;
}

function makeFakeRefreshTokens(
  overrides: Partial<RefreshTokenRepository> = {},
): RefreshTokenRepository {
  return {
    create: jest.fn(async () => ({
      id: "rt-1",
      tokenHash: "hash",
      adminUserId: "admin-1",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      revokedAt: null,
    })),
    findByTokenHash: jest.fn(async () => null),
    revoke: jest.fn(async () => ({
      id: "rt-1",
      tokenHash: "hash",
      adminUserId: "admin-1",
      expiresAt: new Date(),
      revokedAt: new Date(),
    })),
    ...overrides,
  } as unknown as RefreshTokenRepository;
}

describe("AuthService.login", () => {
  it("throws InvalidCredentialsError for an unknown email", async () => {
    const service = new AuthService(makeFakeAdminUsers(), makeFakeRefreshTokens());

    await expect(
      service.login("nobody@example.com", "anything"),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError for a wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    const adminUsers = makeFakeAdminUsers({
      findByEmail: jest.fn(async () => ({
        id: "admin-1",
        email: "admin@example.com",
        passwordHash,
      })),
    });
    const service = new AuthService(adminUsers, makeFakeRefreshTokens());

    await expect(
      service.login("admin@example.com", "wrong-password"),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("issues a token pair and stores the hashed refresh token on success", async () => {
    const passwordHash = await hashPassword("correct-password");
    const adminUsers = makeFakeAdminUsers({
      findByEmail: jest.fn(async () => ({
        id: "admin-1",
        email: "admin@example.com",
        passwordHash,
      })),
    });
    const create = jest.fn(async () => ({
      id: "rt-1",
      tokenHash: "hash",
      adminUserId: "admin-1",
      expiresAt: new Date(),
      revokedAt: null,
    }));
    const service = new AuthService(adminUsers, makeFakeRefreshTokens({ create }));

    const tokens = await service.login("admin@example.com", "correct-password");

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        adminUserId: "admin-1",
        tokenHash: hashRefreshToken(tokens.refreshToken),
      }),
    );
  });
});

describe("AuthService.refresh", () => {
  it("throws InvalidRefreshTokenError for a malformed token", async () => {
    const service = new AuthService(makeFakeAdminUsers(), makeFakeRefreshTokens());

    await expect(service.refresh("not-a-jwt")).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it("throws InvalidRefreshTokenError when the stored token was revoked", async () => {
    const adminUsers = makeFakeAdminUsers();
    const { signRefreshToken } = await import("@/server/auth/tokens");
    const { token } = await signRefreshToken("admin-1");
    const refreshTokens = makeFakeRefreshTokens({
      findByTokenHash: jest.fn(async () => ({
        id: "rt-1",
        tokenHash: hashRefreshToken(token),
        adminUserId: "admin-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: new Date(),
      })),
    });
    const service = new AuthService(adminUsers, refreshTokens);

    await expect(service.refresh(token)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });

  it("rotates the token: revokes the old one and issues a new pair", async () => {
    const { signRefreshToken } = await import("@/server/auth/tokens");
    const { token } = await signRefreshToken("admin-1");
    const revoke = jest.fn(async () => ({
      id: "rt-1",
      tokenHash: hashRefreshToken(token),
      adminUserId: "admin-1",
      expiresAt: new Date(),
      revokedAt: new Date(),
    }));
    const refreshTokens = makeFakeRefreshTokens({
      findByTokenHash: jest.fn(async () => ({
        id: "rt-1",
        tokenHash: hashRefreshToken(token),
        adminUserId: "admin-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
      })),
      revoke,
    });
    const service = new AuthService(makeFakeAdminUsers(), refreshTokens);

    const newTokens = await service.refresh(token);

    expect(revoke).toHaveBeenCalledWith("rt-1");
    expect(newTokens.refreshToken).not.toBe(token);
  });
});

describe("AuthService.logout", () => {
  it("revokes the matching stored refresh token", async () => {
    const { signRefreshToken } = await import("@/server/auth/tokens");
    const { token } = await signRefreshToken("admin-1");
    const revoke = jest.fn(async () => ({
      id: "rt-1",
      tokenHash: hashRefreshToken(token),
      adminUserId: "admin-1",
      expiresAt: new Date(),
      revokedAt: new Date(),
    }));
    const refreshTokens = makeFakeRefreshTokens({
      findByTokenHash: jest.fn(async () => ({
        id: "rt-1",
        tokenHash: hashRefreshToken(token),
        adminUserId: "admin-1",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
      })),
      revoke,
    });
    const service = new AuthService(makeFakeAdminUsers(), refreshTokens);

    await service.logout(token);

    expect(revoke).toHaveBeenCalledWith("rt-1");
  });

  it("is a no-op when the refresh token isn't found", async () => {
    const revoke = jest.fn<RefreshTokenRepository["revoke"]>();
    const refreshTokens = makeFakeRefreshTokens({
      findByTokenHash: jest.fn(async () => null),
      revoke,
    });
    const service = new AuthService(makeFakeAdminUsers(), refreshTokens);

    await service.logout("unknown-token");

    expect(revoke).not.toHaveBeenCalled();
  });
});
