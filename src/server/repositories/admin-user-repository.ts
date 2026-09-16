import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";

export interface AdminUserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

// Thin wrapper around Prisma so services depend on this interface rather
// than the ORM directly (see AGENTS.md — low coupling, unit-testable
// business logic via a fake/mock repository).
export class AdminUserRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  findByEmail(email: string): Promise<AdminUserRecord | null> {
    return this.db.adminUser.findUnique({ where: { email } });
  }

  findById(id: string): Promise<AdminUserRecord | null> {
    return this.db.adminUser.findUnique({ where: { id } });
  }
}

export const adminUserRepository = new AdminUserRepository();
