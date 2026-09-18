import { jest } from "@jest/globals";
import {
  resolveShopifyClient,
  ShopifyAdminApiClient,
} from "@/server/services/shopify/shopify-client";
import {
  ShopifyClientError,
  ShopifyProductNotFoundError,
} from "@/server/services/shopify/types";
import type { ShopifyTokenProvider } from "@/server/services/shopify/token-provider";

// A fake satisfying just the shape ShopifyAdminApiClient actually calls
// (`get`) — same structural-typing approach used for the token-provider
// fakes in shopify-token-provider.test.ts.
function makeFakeHttpClient(get: (...args: unknown[]) => unknown) {
  return { get } as never;
}

function makeFakeTokenProvider(token = "fake-token"): ShopifyTokenProvider {
  return { getAccessToken: async () => token };
}

// Shaped like the Admin REST API's product resource
// (https://shopify.dev/docs/api/admin-rest/latest/resources/product) —
// snake_case wire format, distinct from this app's own camelCase
// ShopifyProductData that the client maps it into.
const REST_PRODUCT_FIXTURE = {
  id: 8325302452342,
  handle: "bluetooth-wireless-earbuds",
  title: "Bluetooth Wireless Earbuds",
  body_html: "<p>Compact true-wireless earbuds.</p>",
  vendor: "SoundWave",
  product_type: "Electronics",
  options: [{ name: "Color", values: ["Black", "White"] }],
};

describe("ShopifyAdminApiClient", () => {
  it("fetches a product and maps the REST response to ShopifyProductData", async () => {
    const get = jest.fn(async () => ({
      status: 200,
      data: { product: REST_PRODUCT_FIXTURE },
    }));
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider("shpat_abc123"),
      makeFakeHttpClient(get),
    );

    const result = await client.fetchProduct("8325302452342");

    expect(result).toEqual({
      id: 8325302452342,
      handle: "bluetooth-wireless-earbuds",
      title: "Bluetooth Wireless Earbuds",
      bodyHtml: "<p>Compact true-wireless earbuds.</p>",
      vendor: "SoundWave",
      productType: "Electronics",
      options: [{ name: "Color", values: ["Black", "White"] }],
    });
    expect(get).toHaveBeenCalledWith(
      "https://test-shop.myshopify.com/admin/api/2024-10/products/8325302452342.json",
      { headers: { "X-Shopify-Access-Token": "shpat_abc123" } },
    );
  });

  it("defaults optional fields to null/empty when the REST response omits them", async () => {
    const get = jest.fn(async () => ({
      status: 200,
      data: {
        product: {
          id: 111,
          handle: "bare-product",
          title: "Bare Product",
          body_html: null,
          vendor: null,
          product_type: null,
        },
      },
    }));
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider(),
      makeFakeHttpClient(get),
    );

    const result = await client.fetchProduct("111");

    expect(result.bodyHtml).toBeNull();
    expect(result.vendor).toBeNull();
    expect(result.productType).toBeNull();
    expect(result.options).toEqual([]);
  });

  it("throws ShopifyProductNotFoundError on a 404", async () => {
    const get = jest.fn(async () => ({ status: 404, data: {} }));
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider(),
      makeFakeHttpClient(get),
    );

    await expect(client.fetchProduct("missing")).rejects.toBeInstanceOf(
      ShopifyProductNotFoundError,
    );
  });

  it("throws ShopifyClientError on a non-2xx, non-404 status", async () => {
    const get = jest.fn(async () => ({ status: 500, data: {} }));
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider(),
      makeFakeHttpClient(get),
    );

    await expect(client.fetchProduct("1")).rejects.toBeInstanceOf(ShopifyClientError);
  });

  it("throws ShopifyClientError when the response shape is unexpected", async () => {
    const get = jest.fn(async () => ({ status: 200, data: { product: { handle: "x" } } }));
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider(),
      makeFakeHttpClient(get),
    );

    await expect(client.fetchProduct("1")).rejects.toBeInstanceOf(ShopifyClientError);
  });

  it("throws ShopifyClientError on a network failure", async () => {
    const get = jest.fn(async () => {
      throw new Error("network down");
    });
    const client = new ShopifyAdminApiClient(
      "test-shop.myshopify.com",
      makeFakeTokenProvider(),
      makeFakeHttpClient(get),
    );

    await expect(client.fetchProduct("1")).rejects.toBeInstanceOf(ShopifyClientError);
  });
});

describe("resolveShopifyClient", () => {
  const ENV_KEYS = [
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_ADMIN_API_TOKEN",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
  ] as const;
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it("returns null when SHOPIFY_STORE_DOMAIN is unset", () => {
    expect(resolveShopifyClient()).toBeNull();
  });

  it("returns null when a store domain is set but no credentials are", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "test-shop.myshopify.com";
    expect(resolveShopifyClient()).toBeNull();
  });

  it("prefers a static token when both auth methods are configured", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "test-shop.myshopify.com";
    process.env.SHOPIFY_ADMIN_API_TOKEN = "shpat_static";
    process.env.SHOPIFY_CLIENT_ID = "client-id";
    process.env.SHOPIFY_CLIENT_SECRET = "client-secret";

    expect(resolveShopifyClient()).toBeInstanceOf(ShopifyAdminApiClient);
  });

  it("falls back to the client-credentials pair when no static token is set", () => {
    process.env.SHOPIFY_STORE_DOMAIN = "test-shop.myshopify.com";
    process.env.SHOPIFY_CLIENT_ID = "client-id";
    process.env.SHOPIFY_CLIENT_SECRET = "client-secret";

    expect(resolveShopifyClient()).toBeInstanceOf(ShopifyAdminApiClient);
  });
});
