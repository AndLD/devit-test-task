import { z } from "zod";
import { PRODUCT_CONTENT_LIMITS } from "./product-limits";

// Shared between the client form, the server API, and the LLM suggestion
// service (see src/server/services/llm/) so invalid data is rejected the
// same way regardless of entry point (including direct API calls or a
// misbehaving/unusual LLM response). See product-limits.ts for the limits.
export const productContentFieldsSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(PRODUCT_CONTENT_LIMITS.description),
  seoTitle: z
    .string()
    .trim()
    .min(1, "SEO title is required")
    .max(PRODUCT_CONTENT_LIMITS.seoTitle),
  seoDescription: z
    .string()
    .trim()
    .min(1, "SEO description is required")
    .max(PRODUCT_CONTENT_LIMITS.seoDescription),
});

export type ProductContentFields = z.infer<typeof productContentFieldsSchema>;

export const productEditableFieldsSchema = productContentFieldsSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type ProductEditableFields = z.infer<typeof productEditableFieldsSchema>;
