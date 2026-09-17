import {
  productRepository,
  type ProductRepository,
} from "@/server/repositories/product-repository";
import type { Product } from "@/lib/types/product";
import { mapShopifyProduct } from "./mapper";
import { resolveShopifyClient } from "./shopify-client";
import type { ShopifyClient } from "./types";

export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super("SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_API_TOKEN are not configured");
    this.name = "ShopifyNotConfiguredError";
  }
}

export class InvalidShopifyProductIdError extends Error {
  constructor() {
    super("Enter a numeric Shopify product ID, or its gid://shopify/Product/... form");
    this.name = "InvalidShopifyProductIdError";
  }
}

// Accepts a plain numeric ID or a full GID ("gid://shopify/Product/123") —
// the Admin REST API this app calls only accepts the numeric form.
export function normalizeShopifyProductId(input: string): string {
  const trimmed = input.trim();
  const gidMatch = trimmed.match(/^gid:\/\/shopify\/Product\/(\d+)$/);
  const numericId = gidMatch ? gidMatch[1] : trimmed;
  if (!/^\d+$/.test(numericId)) {
    throw new InvalidShopifyProductIdError();
  }
  return numericId;
}

export class ShopifyImportService {
  constructor(
    private readonly products: ProductRepository = productRepository,
    private readonly client: ShopifyClient | null = resolveShopifyClient(),
  ) {}

  async importProduct(rawProductId: string): Promise<Product> {
    if (!this.client) {
      throw new ShopifyNotConfiguredError();
    }
    const productId = normalizeShopifyProductId(rawProductId);

    const shopifyProduct = await this.client.fetchProduct(productId);
    const mapped = mapShopifyProduct(shopifyProduct);
    const slug = await this.uniqueSlug(mapped.slugBase);

    return this.products.create({
      slug,
      name: mapped.name,
      characteristics: mapped.characteristics,
      description: mapped.description,
      seoTitle: mapped.seoTitle,
      seoDescription: mapped.seoDescription,
      status: "DRAFT",
    });
  }

  // Shopify handles are already URL-safe, but could collide with an
  // existing product (a prior import, or a seeded one) — append -2, -3, ...
  // until free, same convention Shopify itself uses for handle conflicts.
  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (await this.products.findBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

export const shopifyImportService = new ShopifyImportService();
