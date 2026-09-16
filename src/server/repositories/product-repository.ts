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

export interface ProductListItem {
  id: string;
  name: string;
  status: ProductStatus;
}

export class ProductRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listAll(): Promise<ProductListItem[]> {
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

  async listPublished(): Promise<ProductListItem[]> {
    const records = await this.db.product.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, name: true, status: true },
      orderBy: { name: "asc" },
    });
    return records.map((r) => ({ ...r, status: r.status as ProductStatus }));
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
