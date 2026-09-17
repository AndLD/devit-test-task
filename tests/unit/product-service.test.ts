import { jest } from "@jest/globals";
import {
  InvalidProductFieldsError,
  ProductNotFoundError,
  ProductService,
} from "@/server/services/product-service";
import type { ProductRepository } from "@/server/repositories/product-repository";
import type { Product } from "@/lib/types/product";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "product-1",
    name: "Product One",
    characteristics: [],
    description: "Original description",
    seoTitle: "Original SEO title",
    seoDescription: "Original SEO description",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// A fake satisfying the same shape as ProductRepository (structural typing) —
// no DB, no mocking framework, exactly the testability the repository/
// service split in AGENTS.md is meant to buy.
function makeFakeRepository(
  overrides: Partial<ProductRepository> = {},
): ProductRepository {
  return {
    listAll: jest.fn(async () => []),
    findById: jest.fn(async () => null),
    listPublished: jest.fn(async () => []),
    findPublishedBySlug: jest.fn(async () => null),
    updateEditableFields: jest.fn(async () => makeProduct()),
    ...overrides,
  } as unknown as ProductRepository;
}

describe("ProductService.getForAdmin", () => {
  it("returns the product when found", async () => {
    const product = makeProduct();
    const repo = makeFakeRepository({ findById: jest.fn(async () => product) });
    const service = new ProductService(repo);

    await expect(service.getForAdmin("product-1")).resolves.toBe(product);
  });

  it("throws ProductNotFoundError when missing", async () => {
    const repo = makeFakeRepository({ findById: jest.fn(async () => null) });
    const service = new ProductService(repo);

    await expect(service.getForAdmin("missing")).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });
});

describe("ProductService.updateEditableFields", () => {
  it("rejects invalid fields without touching the repository", async () => {
    const updateEditableFields =
      jest.fn<ProductRepository["updateEditableFields"]>();
    const repo = makeFakeRepository({
      findById: jest.fn(async () => makeProduct()),
      updateEditableFields,
    });
    const service = new ProductService(repo);

    await expect(
      service.updateEditableFields("product-1", {
        description: "x".repeat(1001),
        seoTitle: "Valid",
        seoDescription: "Valid",
        status: "DRAFT",
      }),
    ).rejects.toBeInstanceOf(InvalidProductFieldsError);
    expect(updateEditableFields).not.toHaveBeenCalled();
  });

  it("throws ProductNotFoundError for a missing product before validating", async () => {
    const repo = makeFakeRepository({ findById: jest.fn(async () => null) });
    const service = new ProductService(repo);

    await expect(
      service.updateEditableFields("missing", {}),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("passes validated fields through to the repository", async () => {
    const updated = makeProduct({ description: "New description" });
    const updateEditableFields = jest.fn(async () => updated);
    const repo = makeFakeRepository({
      findById: jest.fn(async () => makeProduct()),
      updateEditableFields,
    });
    const service = new ProductService(repo);

    const result = await service.updateEditableFields("product-1", {
      description: "New description",
      seoTitle: "New SEO title",
      seoDescription: "New SEO description",
      status: "PUBLISHED",
    });

    expect(result).toBe(updated);
    expect(updateEditableFields).toHaveBeenCalledWith("product-1", {
      description: "New description",
      seoTitle: "New SEO title",
      seoDescription: "New SEO description",
      status: "PUBLISHED",
    });
  });
});

describe("ProductService.getPublishedBySlug", () => {
  it("throws ProductNotFoundError when the repository returns null (draft or unknown)", async () => {
    const repo = makeFakeRepository({ findPublishedBySlug: jest.fn(async () => null) });
    const service = new ProductService(repo);

    await expect(service.getPublishedBySlug("draft-slug")).rejects.toBeInstanceOf(
      ProductNotFoundError,
    );
  });

  it("returns the product for a published slug", async () => {
    const product = makeProduct({ status: "PUBLISHED" });
    const repo = makeFakeRepository({
      findPublishedBySlug: jest.fn(async () => product),
    });
    const service = new ProductService(repo);

    await expect(service.getPublishedBySlug("product-1")).resolves.toBe(product);
  });
});
