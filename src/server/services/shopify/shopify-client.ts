import {
  ShopifyClientError,
  ShopifyProductNotFoundError,
  type ShopifyClient,
  type ShopifyProductData,
} from "./types";

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
// "my-shop.myshopify.com") and SHOPIFY_ADMIN_API_TOKEN — see .env.example
// and README's Shopify import section.
export class ShopifyAdminApiClient implements ShopifyClient {
  constructor(
    private readonly storeDomain: string,
    private readonly accessToken: string,
  ) {}

  async fetchProduct(productId: string): Promise<ShopifyProductData> {
    const url = `https://${this.storeDomain}/admin/api/${API_VERSION}/products/${productId}.json`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "X-Shopify-Access-Token": this.accessToken },
      });
    } catch {
      throw new ShopifyClientError("Could not reach the Shopify Admin API.");
    }

    if (response.status === 404) {
      throw new ShopifyProductNotFoundError();
    }
    if (!response.ok) {
      throw new ShopifyClientError(
        `Shopify Admin API request failed with status ${response.status}.`,
      );
    }

    const payload = await response.json().catch(() => null);
    const product: ShopifyRestProduct | undefined = payload?.product;
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
  const accessToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!storeDomain || !accessToken) return null;
  return new ShopifyAdminApiClient(storeDomain, accessToken);
}
