import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/server/db/client";
import type { Product, ProductStatus } from "@/lib/types/product";

// Prisma's generated Product type stores `characteristics` as `Json`;
// this mapper is the one place that casts it to our domain shape, so the
// rest of the codebase never depends on Prisma's types directly.
function toDomainProduct(record: {
  id: string;
  slug: string;
  name: string;
  characteristics: unknown;
  description: string;
  seoTitle: string;
  seoDescription: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Product {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    characteristics: Array.isArray(record.characteristics)
      ? (record.characteristics as Product["characteristics"])
      : [],
    description: record.description,
    seoTitle: record.seoTitle,
    seoDescription: record.seoDescription,
    status: record.status as ProductStatus,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

// Derived from the canonical `Product` type rather than declared from
// scratch, so a field rename/removal on `Product` is a compile error here
// too — the admin and public list contracts can't silently drift out of
// sync with the domain model, even though they intentionally expose
// different fields to each other (public should never gain admin-only
// fields just because both views happened to grow the same field).
export type AdminProductListItem = Pick<Product, "id" | "name" | "status">;
export type PublicProductListItem = Pick<Product, "slug" | "name">;

export class ProductRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listAll(): Promise<AdminProductListItem[]> {
    const records = await this.db.product.findMany({
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" },
    });
    return records.map((r) => ({ ...r, status: r.status as ProductStatus }));
  }

  async findById(id: string): Promise<Product | null> {
    const record = await this.db.product.findUnique({ where: { id } });
    return record ? toDomainProduct(record) : null;
  }

  async listPublished(): Promise<PublicProductListItem[]> {
    return this.db.product.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findPublishedBySlug(slug: string): Promise<Product | null> {
    const record = await this.db.product.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
    return record ? toDomainProduct(record) : null;
  }

  async updateEditableFields(
    id: string,
    fields: {
      description: string;
      seoTitle: string;
      seoDescription: string;
      status: ProductStatus;
    },
  ): Promise<Product> {
    const record = await this.db.product.update({
      where: { id },
      data: fields,
    });
    return toDomainProduct(record);
  }
}

export const productRepository = new ProductRepository();
