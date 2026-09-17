import { prisma } from "@/server/db/client";
import { signAccessToken } from "@/server/auth/tokens";
import { POST as importProduct } from "@/app/api/admin/products/import/route";
import { ProductRepository } from "@/server/repositories/product-repository";
import { ShopifyImportService } from "@/server/services/shopify/import-service";
import type { ShopifyClient } from "@/server/services/shopify/types";
import { resetDatabase, seedAdmin, seedProduct } from "./support/db";
import { buildRequest } from "./support/request";

// Real product data pulled from a live Shopify trial store during
// development (via the connected Shopify MCP) — see AI-WORKLOG.md.
const REAL_EARBUDS_PRODUCT = {
  id: 8325302452342,
  handle: "bluetooth-wireless-earbuds",
  title: "Bluetooth Wireless Earbuds",
  bodyHtml:
    "<p>Compact true-wireless earbuds with <strong>active noise cancellation</strong>.</p>",
  vendor: "SoundWave",
  productType: "Electronics",
  options: [{ name: "Color", values: ["Black", "White"] }],
};

function makeFakeClient(): ShopifyClient {
  return { fetchProduct: async () => REAL_EARBUDS_PRODUCT };
}

describe("admin Shopify import route", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects an unauthenticated request", async () => {
    const response = await importProduct(
      buildRequest("http://localhost/api/admin/products/import", {
        method: "POST",
        body: { productId: "123" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects a missing productId", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);

    const response = await importProduct(
      buildRequest("http://localhost/api/admin/products/import", {
        method: "POST",
        cookies: { access_token: accessToken },
        body: {},
      }),
    );

    expect(response.status).toBe(400);
  });

  // The real singleton route has no SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_API_TOKEN
  // configured in this test environment (see tests/integration/support/setup-env.ts)
  // — this is also exactly what a reviewer's out-of-the-box environment looks
  // like, so this confirms the route reports that clearly instead of crashing.
  it("reports 503 when Shopify isn't configured", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);

    const response = await importProduct(
      buildRequest("http://localhost/api/admin/products/import", {
        method: "POST",
        cookies: { access_token: accessToken },
        body: { productId: "8325302452342" },
      }),
    );

    expect(response.status).toBe(503);
  });
});

// Exercises ShopifyImportService directly against the real repository (a
// real testcontainers Postgres), with only the Shopify network call faked
// — everything from mapping through the DB write is real.
describe("ShopifyImportService against a real database", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates a draft product from real Shopify product data", async () => {
    const service = new ShopifyImportService(new ProductRepository(), makeFakeClient());

    const product = await service.importProduct("8325302452342");

    expect(product.status).toBe("DRAFT");
    expect(product.slug).toBe("bluetooth-wireless-earbuds");
    expect(product.name).toBe("Bluetooth Wireless Earbuds");
    expect(product.characteristics).toEqual([
      { label: "Vendor", value: "SoundWave" },
      { label: "Type", value: "Electronics" },
      { label: "Color", value: "Black, White" },
    ]);
    expect(product.description).not.toContain("<");

    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.slug).toBe("bluetooth-wireless-earbuds");
  });

  it("appends a numeric suffix when the slug is already taken in the real database", async () => {
    await seedProduct({ slug: "bluetooth-wireless-earbuds" });
    const service = new ShopifyImportService(new ProductRepository(), makeFakeClient());

    const product = await service.importProduct("8325302452342");

    expect(product.slug).toBe("bluetooth-wireless-earbuds-2");
  });
});
