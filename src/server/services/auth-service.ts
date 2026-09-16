import {
  adminUserRepository,
  type AdminUserRepository,
} from "@/server/repositories/admin-user-repository";
import {
  refreshTokenRepository,
  type RefreshTokenRepository,
} from "@/server/repositories/refresh-token-repository";
import { verifyPassword } from "@/server/auth/passwords";
import {
  hashRefreshToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/server/auth/tokens";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Invalid or expired refresh token");
    this.name = "InvalidRefreshTokenError";
  }
}

// Pure business logic for the access+refresh JWT auth pattern (AGENTS.md),
// deliberately free of any Next.js/HTTP concerns (cookies, requests) so it
// can be unit-tested with fake repositories.
export class AuthService {
  constructor(
    private readonly adminUsers: AdminUserRepository = adminUserRepository,
    private readonly refreshTokens: RefreshTokenRepository = refreshTokenRepository,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const admin = await this.adminUsers.findByEmail(email);
    if (!admin) throw new InvalidCredentialsError();

    const passwordMatches = await verifyPassword(password, admin.passwordHash);
    if (!passwordMatches) throw new InvalidCredentialsError();

    return this.issueTokens(admin.id);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) throw new InvalidRefreshTokenError();

    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new InvalidRefreshTokenError();
    }

    // Rotate: revoke the used refresh token and issue a new pair, so a
    // captured-but-already-used refresh token can't be replayed.
    await this.refreshTokens.revoke(stored.id);
    return this.issueTokens(stored.adminUserId);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.refreshTokens.findByTokenHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.refreshTokens.revoke(stored.id);
    }
  }

  private async issueTokens(adminUserId: string): Promise<AuthTokens> {
    const accessToken = await signAccessToken(adminUserId);
    const refresh = await signRefreshToken(adminUserId);
    await this.refreshTokens.create({
      tokenHash: hashRefreshToken(refresh.token),
      adminUserId,
      expiresAt: refresh.expiresAt,
    });
    return { accessToken, refreshToken: refresh.token };
  }
}

export const authService = new AuthService();
