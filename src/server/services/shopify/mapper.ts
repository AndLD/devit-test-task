import { productContentFieldsSchema } from "@/lib/validation/product";
import type { ProductCharacteristic } from "@/lib/types/product";
import type { ShopifyProductData } from "./types";

const LIMITS = { description: 1000, seoTitle: 60, seoDescription: 160 } as const;

// Shopify's product description is HTML (see the real "Bluetooth Wireless
// Earbuds" test fixture pulled from a live store during development, which
// has <p>/<strong>/<ul><li> tags) — this app stores/renders description as
// plain text everywhere (see AGENTS.md: product content must never execute
// as third-party code), so it's stripped rather than stored as-is.
function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max).trim() : value;
}

export class ShopifyMappingError extends Error {
  constructor() {
    super("The Shopify product has no usable content to import");
    this.name = "ShopifyMappingError";
  }
}

export interface MappedShopifyProduct {
  slugBase: string;
  name: string;
  characteristics: ProductCharacteristic[];
  description: string;
  seoTitle: string;
  seoDescription: string;
}

// Product-level options (e.g. "Color: Black, White") plus vendor/product
// type, when present — Shopify's variant-level data doesn't map cleanly
// onto this app's single flat list of {label, value} characteristics, so
// this favors the attributes a shopper would actually recognize as
// "characteristics" over a literal field-for-field dump.
function buildCharacteristics(data: ShopifyProductData): ProductCharacteristic[] {
  const characteristics: ProductCharacteristic[] = [];
  if (data.vendor) characteristics.push({ label: "Vendor", value: data.vendor });
  if (data.productType) characteristics.push({ label: "Type", value: data.productType });
  for (const option of data.options) {
    if (option.values.length > 0) {
      characteristics.push({ label: option.name, value: option.values.join(", ") });
    }
  }
  return characteristics;
}

// Shopify's default product resource doesn't include this app's separate
// SEO title/description fields (those live behind metafields this app
// doesn't request), so they're derived from the title/description —
// truncated/validated by sanitize() below just like everything else.
export function mapShopifyProduct(data: ShopifyProductData): MappedShopifyProduct {
  const description = stripHtml(data.bodyHtml ?? "") || data.title;
  const characteristics = buildCharacteristics(data);

  const candidate = {
    description: truncate(description, LIMITS.description),
    seoTitle: truncate(data.title, LIMITS.seoTitle),
    seoDescription: truncate(description, LIMITS.seoDescription),
  };

  const result = productContentFieldsSchema.safeParse(candidate);
  if (!result.success) {
    throw new ShopifyMappingError();
  }

  return {
    slugBase: data.handle,
    name: data.title,
    characteristics,
    ...result.data,
  };
}
