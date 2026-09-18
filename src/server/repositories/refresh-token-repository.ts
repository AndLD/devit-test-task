import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  adminUserId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export class RefreshTokenRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  create(params: {
    tokenHash: string;
    adminUserId: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    return this.db.refreshToken.create({ data: params });
  }

  findByTokenHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  revoke(id: string): Promise<RefreshTokenRecord> {
    return this.db.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
