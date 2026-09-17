import { prisma } from "@/server/db/client";
import { signAccessToken } from "@/server/auth/tokens";
import { GET as listAdminProducts } from "@/app/api/admin/products/route";
import {
  GET as getAdminProduct,
  PATCH as patchAdminProduct,
} from "@/app/api/admin/products/[id]/route";
import { resetDatabase, seedAdmin, seedProduct } from "./support/db";
import { buildRequest } from "./support/request";

describe("admin products API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects an unauthenticated request to list products", async () => {
    const response = await listAdminProducts(
      buildRequest("http://localhost/api/admin/products"),
    );

    expect(response.status).toBe(401);
  });

  it("lists all products, including drafts, for an authenticated admin", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    await seedProduct({ slug: "draft-one", name: "Draft One", status: "DRAFT" });
    await seedProduct({
      slug: "published-one",
      name: "Published One",
      status: "PUBLISHED",
    });

    const response = await listAdminProducts(
      buildRequest("http://localhost/api/admin/products", {
        cookies: { access_token: accessToken },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toHaveLength(2);
    expect(body.products.map((p: { name: string }) => p.name).sort()).toEqual([
      "Draft One",
      "Published One",
    ]);
  });

  it("rejects an unauthenticated save", async () => {
    const product = await seedProduct();

    const response = await patchAdminProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}`, {
        method: "PATCH",
        body: { description: "x", seoTitle: "x", seoDescription: "x", status: "DRAFT" },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(401);
  });

  it("rejects an oversized description and leaves the stored product unchanged", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    const product = await seedProduct({ description: "original description" });

    const response = await patchAdminProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}`, {
        method: "PATCH",
        cookies: { access_token: accessToken },
        body: {
          description: "x".repeat(1001),
          seoTitle: "Valid title",
          seoDescription: "Valid description",
          status: "DRAFT",
        },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    // Array.isArray, not toBeInstanceOf(Array): the response body crosses a
    // realm boundary (Next's Response/JSON implementation), so it isn't the
    // same Array constructor as this test file's.
    expect(Array.isArray(body.issues)).toBe(true);

    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.description).toBe("original description");
  });

  it("rejects an empty required field the same way via a direct API call", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    const product = await seedProduct({ seoTitle: "original title" });

    const response = await patchAdminProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}`, {
        method: "PATCH",
        cookies: { access_token: accessToken },
        body: {
          description: "Valid description",
          seoTitle: "",
          seoDescription: "Valid SEO description",
          status: "DRAFT",
        },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(400);
    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.seoTitle).toBe("original title");
  });

  it("saves valid editable fields and persists them", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    const product = await seedProduct({ status: "DRAFT" });

    const response = await patchAdminProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}`, {
        method: "PATCH",
        cookies: { access_token: accessToken },
        body: {
          description: "Updated description",
          seoTitle: "Updated SEO title",
          seoDescription: "Updated SEO description",
          status: "PUBLISHED",
        },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product.status).toBe("PUBLISHED");

    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.description).toBe("Updated description");
    expect(stored.status).toBe("PUBLISHED");
  });

  it("404s a PATCH for an unknown product id", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);

    const response = await patchAdminProduct(
      buildRequest("http://localhost/api/admin/products/does-not-exist", {
        method: "PATCH",
        cookies: { access_token: accessToken },
        body: {
          description: "Valid description",
          seoTitle: "Valid title",
          seoDescription: "Valid SEO description",
          status: "DRAFT",
        },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );

    expect(response.status).toBe(404);
  });

  it("rejects a request with a garbage access token", async () => {
    const product = await seedProduct();

    const response = await getAdminProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}`, {
        cookies: { access_token: "not-a-valid-jwt" },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(401);
  });
});
