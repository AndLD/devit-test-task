import type { AxiosResponse } from "axios";
import { httpClient } from "@/server/lib/http-client";
import {
  ShopifyClientError,
  ShopifyProductNotFoundError,
  type ShopifyClient,
  type ShopifyProductData,
} from "./types";
import {
  ClientCredentialsTokenProvider,
  StaticTokenProvider,
  type ShopifyTokenProvider,
} from "./token-provider";

const API_VERSION = "2024-10";

interface ShopifyRestProduct {
  id: number;
  handle: string;
  title: string;
  body_html: string | null;
  vendor: string | null;
  product_type: string | null;
  options?: { name: string; values: string[] }[];
}

// Real Shopify Admin API (REST) client. Needs SHOPIFY_STORE_DOMAIN (e.g.
// "my-shop.myshopify.com") and either SHOPIFY_ADMIN_API_TOKEN (a pre-2026
// legacy custom app's static token) or SHOPIFY_CLIENT_ID +
// SHOPIFY_CLIENT_SECRET (the current Dev Dashboard flow) — see
// .env.example and README's Shopify import section.
export class ShopifyAdminApiClient implements ShopifyClient {
  constructor(
    private readonly storeDomain: string,
    private readonly tokenProvider: ShopifyTokenProvider,
  ) {}

  async fetchProduct(productId: string): Promise<ShopifyProductData> {
    const url = `https://${this.storeDomain}/admin/api/${API_VERSION}/products/${productId}.json`;
    const accessToken = await this.tokenProvider.getAccessToken();

    let response: AxiosResponse;
    try {
      response = await httpClient.get(url, {
        headers: { "X-Shopify-Access-Token": accessToken },
      });
    } catch {
      throw new ShopifyClientError("Could not reach the Shopify Admin API.");
    }

    if (response.status === 404) {
      throw new ShopifyProductNotFoundError();
    }
    if (response.status < 200 || response.status >= 300) {
      throw new ShopifyClientError(
        `Shopify Admin API request failed with status ${response.status}.`,
      );
    }

    const product: ShopifyRestProduct | undefined = response.data?.product;
    if (!product || typeof product.id !== "number" || typeof product.title !== "string") {
      throw new ShopifyClientError("Shopify Admin API returned an unexpected response shape.");
    }

    return {
      id: product.id,
      handle: product.handle,
      title: product.title,
      bodyHtml: product.body_html ?? null,
      vendor: product.vendor ?? null,
      productType: product.product_type ?? null,
      options: (product.options ?? []).map((o) => ({ name: o.name, values: o.values })),
    };
  }
}

export function resolveShopifyClient(): ShopifyClient | null {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!storeDomain) return null;

  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (staticToken) {
    return new ShopifyAdminApiClient(storeDomain, new StaticTokenProvider(staticToken));
  }

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (clientId && clientSecret) {
    return new ShopifyAdminApiClient(
      storeDomain,
      new ClientCredentialsTokenProvider(storeDomain, clientId, clientSecret),
    );
  }

  return null;
}
