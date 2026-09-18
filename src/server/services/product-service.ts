import {
  productRepository,
  type ProductRepository,
  type AdminProductListItem,
  type PublicProductListItem,
} from "@/server/repositories/product-repository";
import {
  productEditableFieldsSchema,
  type ProductEditableFields,
} from "@/lib/validation/product";
import type { Product } from "@/lib/types/product";

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found");
    this.name = "ProductNotFoundError";
  }
}

export class InvalidProductFieldsError extends Error {
  constructor(public readonly issues: string[]) {
    super("Invalid product fields");
    this.name = "InvalidProductFieldsError";
  }
}

// Business logic for admin/public product access, isolated from HTTP so it
// can be unit-tested with a fake repository (AGENTS.md testability principle).
export class ProductService {
  constructor(
    private readonly products: ProductRepository = productRepository,
  ) {}

  listForAdmin(): Promise<AdminProductListItem[]> {
    return this.products.listAll();
  }

  async getForAdmin(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) throw new ProductNotFoundError();
    return product;
  }

  async updateEditableFields(id: string, input: unknown): Promise<Product> {
    const existing = await this.products.findById(id);
    if (!existing) throw new ProductNotFoundError();

    const result = productEditableFieldsSchema.safeParse(input);
    if (!result.success) {
      throw new InvalidProductFieldsError(
        result.error.issues.map((issue) => issue.message),
      );
    }

    return this.products.updateEditableFields(id, result.data);
  }

  listPublished(): Promise<PublicProductListItem[]> {
    return this.products.listPublished();
  }

  async getPublishedBySlug(slug: string): Promise<Product> {
    const product = await this.products.findPublishedBySlug(slug);
    if (!product) throw new ProductNotFoundError();
    return product;
  }
}

export const productService = new ProductService();

export type { ProductEditableFields };
