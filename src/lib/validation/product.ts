import { z } from "zod";

// Field limits from PROJECT-REQUIREMENTS.md — description up to 1000 chars,
// SEO title up to 60, SEO description up to 160, all three non-empty.
// Shared between the client form, the server API, and the LLM suggestion
// service (see src/server/services/llm/) so invalid data is rejected the
// same way regardless of entry point (including direct API calls or a
// misbehaving/unusual LLM response).
export const productContentFieldsSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(1000),
  seoTitle: z.string().trim().min(1, "SEO title is required").max(60),
  seoDescription: z
    .string()
    .trim()
    .min(1, "SEO description is required")
    .max(160),
});

export type ProductContentFields = z.infer<typeof productContentFieldsSchema>;

export const productEditableFieldsSchema = productContentFieldsSchema.extend({
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

export type ProductEditableFields = z.infer<typeof productEditableFieldsSchema>;
