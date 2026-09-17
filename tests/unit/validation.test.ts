import { productEditableFieldsSchema } from "@/lib/validation/product";
import { loginSchema } from "@/lib/validation/auth";

describe("productEditableFieldsSchema", () => {
  const valid = {
    description: "A valid description.",
    seoTitle: "A valid SEO title",
    seoDescription: "A valid SEO description.",
    status: "DRAFT" as const,
  };

  it("accepts a valid payload", () => {
    expect(productEditableFieldsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a description over 1000 characters", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      description: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a description of exactly 1000 characters", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      description: "x".repeat(1000),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a seoTitle over 60 characters", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      seoTitle: "x".repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a seoDescription over 160 characters", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      seoDescription: "x".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it.each(["description", "seoTitle", "seoDescription"] as const)(
    "rejects an empty %s",
    (field) => {
      const result = productEditableFieldsSchema.safeParse({
        ...valid,
        [field]: "",
      });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a whitespace-only field", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      description: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a status outside DRAFT/PUBLISHED", () => {
    const result = productEditableFieldsSchema.safeParse({
      ...valid,
      status: "ARCHIVED",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid email/password", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "anything",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "anything",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "admin@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
