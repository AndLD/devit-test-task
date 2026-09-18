export interface ShopifyProductOption {
  name: string;
  values: string[];
}

// The subset of Shopify's Admin API product resource this app actually
// uses — see https://shopify.dev/docs/api/admin-rest/latest/resources/product.
export interface ShopifyProductData {
  id: number;
  handle: string;
  title: string;
  bodyHtml: string | null;
  vendor: string | null;
  productType: string | null;
  options: ShopifyProductOption[];
}

export class ShopifyClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShopifyClientError";
  }
}

export class ShopifyProductNotFoundError extends Error {
  constructor() {
    super("Shopify product not found");
    this.name = "ShopifyProductNotFoundError";
  }
}

// Implemented by the real Admin API-backed client; a fake satisfying the
// same shape is used in tests (see AGENTS.md's testability principle) —
// there's no mock/simulated mode in the app itself, unlike the LLM bonus,
// since PROJECT-REQUIREMENTS.md doesn't ask for one here.
export interface ShopifyClient {
  fetchProduct(productId: string): Promise<ShopifyProductData>;
}
