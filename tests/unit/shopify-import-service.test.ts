import { jest } from "@jest/globals";
import {
  InvalidShopifyProductIdError,
  normalizeShopifyProductId,
  ShopifyImportService,
  ShopifyNotConfiguredError,
} from "@/server/services/shopify/import-service";
import type { ProductRepository } from "@/server/repositories/product-repository";
import type { ShopifyClient } from "@/server/services/shopify/types";
import { ShopifyProductNotFoundError } from "@/server/services/shopify/types";

describe("normalizeShopifyProductId", () => {
  it("accepts a plain numeric id", () => {
    expect(normalizeShopifyProductId("8325302452342")).toBe("8325302452342");
  });

  it("extracts the numeric id from a full GID", () => {
    expect(normalizeShopifyProductId("gid://shopify/Product/8325302452342")).toBe(
      "8325302452342",
    );
  });

  it("rejects anything else", () => {
    expect(() => normalizeShopifyProductId("bluetooth-wireless-earbuds")).toThrow(
      InvalidShopifyProductIdError,
    );
    expect(() => normalizeShopifyProductId("")).toThrow(InvalidShopifyProductIdError);
  });
});

const REAL_PRODUCT = {
  id: 8325302452342,
  handle: "bluetooth-wireless-earbuds",
  title: "Bluetooth Wireless Earbuds",
  bodyHtml: "<p>Great earbuds.</p>",
  vendor: "SoundWave",
  productType: "Electronics",
  options: [{ name: "Color", values: ["Black", "White"] }],
};

const defaultCreate: ProductRepository["create"] = async (data) => ({
  id: "new-product-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...data,
});

function makeFakeRepository(
  overrides: Partial<ProductRepository> = {},
): ProductRepository {
  return {
    findBySlug: jest.fn(async () => null),
    create: jest.fn(defaultCreate),
    ...overrides,
  } as unknown as ProductRepository;
}

function makeFakeClient(overrides: Partial<ShopifyClient> = {}): ShopifyClient {
  return {
    fetchProduct: jest.fn(async () => REAL_PRODUCT),
    ...overrides,
  } as ShopifyClient;
}

describe("ShopifyImportService", () => {
  it("throws ShopifyNotConfiguredError when no client is available", async () => {
    const service = new ShopifyImportService(makeFakeRepository(), null);

    await expect(service.importProduct("123")).rejects.toBeInstanceOf(
      ShopifyNotConfiguredError,
    );
  });

  it("creates the product with the Shopify handle as slug when free", async () => {
    const create = jest.fn(defaultCreate);
    const repository = makeFakeRepository({ create });
    const service = new ShopifyImportService(repository, makeFakeClient());

    const product = await service.importProduct("8325302452342");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "bluetooth-wireless-earbuds", status: "DRAFT" }),
    );
    expect(product.status).toBe("DRAFT");
  });

  it("appends a numeric suffix when the handle-derived slug is already taken", async () => {
    let calls = 0;
    const findBySlug = jest.fn(async () => {
      calls += 1;
      // Taken on the first check (the bare handle), free from then on.
      return calls === 1 ? ({ id: "existing" } as never) : null;
    });
    const create = jest.fn(defaultCreate);
    const repository = makeFakeRepository({ findBySlug, create });
    const service = new ShopifyImportService(repository, makeFakeClient());

    await service.importProduct("8325302452342");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "bluetooth-wireless-earbuds-2" }),
    );
  });

  it("propagates a not-found error from the client untouched", async () => {
    const client = makeFakeClient({
      fetchProduct: jest.fn(async () => {
        throw new ShopifyProductNotFoundError();
      }),
    });
    const service = new ShopifyImportService(makeFakeRepository(), client);

    await expect(service.importProduct("999")).rejects.toBeInstanceOf(
      ShopifyProductNotFoundError,
    );
  });
});
