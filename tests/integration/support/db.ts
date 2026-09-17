import { prisma } from "@/server/db/client";
import { hashPassword } from "@/server/auth/passwords";
import type { ProductStatus } from "@/lib/types/product";

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "RefreshToken", "AdminUser", "Product" RESTART IDENTITY CASCADE',
  );
}

export async function seedAdmin(
  overrides: Partial<{ email: string; password: string }> = {},
) {
  const email = overrides.email ?? "admin@test.local";
  const password = overrides.password ?? "test-password-123";
  const passwordHash = await hashPassword(password);
  const admin = await prisma.adminUser.create({ data: { email, passwordHash } });
  return { id: admin.id, email, password };
}

export async function seedProduct(
  overrides: Partial<{
    slug: string;
    name: string;
    characteristics: unknown;
    description: string;
    seoTitle: string;
    seoDescription: string;
    status: ProductStatus;
  }> = {},
) {
  return prisma.product.create({
    data: {
      slug: overrides.slug ?? "test-product",
      name: overrides.name ?? "Test Product",
      characteristics: (overrides.characteristics ?? []) as never,
      description: overrides.description ?? "A test product description.",
      seoTitle: overrides.seoTitle ?? "Test Product — SEO title",
      seoDescription: overrides.seoDescription ?? "Test product SEO description.",
      status: overrides.status ?? "DRAFT",
    },
  });
}
