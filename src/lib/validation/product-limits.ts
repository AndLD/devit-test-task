// Field limits from PROJECT-REQUIREMENTS.md — description up to 1000 chars,
// SEO title up to 60, SEO description up to 160, all three non-empty. The
// single source of truth for these numbers: the Zod schema (product.ts),
// the admin editor form, the LLM suggestion prompt/validation, and the
// Shopify import mapper all import from here instead of repeating the
// literals, so a future limit change can't drift between them. Kept
// dependency-free (no Zod import) so client components can use it without
// pulling the Zod-based schema module into the browser bundle.
export const PRODUCT_CONTENT_LIMITS = {
  description: 1000,
  seoTitle: 60,
  seoDescription: 160,
} as const;
