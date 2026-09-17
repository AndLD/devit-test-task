import { prisma } from "@/server/db/client";
import { signAccessToken } from "@/server/auth/tokens";
import { POST as suggestForProduct } from "@/app/api/admin/products/[id]/suggest/route";
import { resetDatabase, seedAdmin, seedProduct } from "./support/db";
import { buildRequest } from "./support/request";

describe("admin product suggestion API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("rejects an unauthenticated request", async () => {
    const product = await seedProduct();

    const response = await suggestForProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}/suggest`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    expect(response.status).toBe(401);
  });

  it("404s for an unknown product id", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);

    const response = await suggestForProduct(
      buildRequest("http://localhost/api/admin/products/does-not-exist/suggest", {
        method: "POST",
        cookies: { access_token: accessToken },
      }),
      { params: Promise.resolve({ id: "does-not-exist" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns a mocked suggestion when no OPENAI_API_KEY is configured (the test environment's default)", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    const product = await seedProduct({
      name: "Test Widget",
      characteristics: [{ label: "Color", value: "Black" }],
    });

    const response = await suggestForProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}/suggest`, {
        method: "POST",
        cookies: { access_token: accessToken },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mocked).toBe(true);
    expect(typeof body.suggestion.description).toBe("string");
    expect(body.suggestion.description.length).toBeGreaterThan(0);
    expect(body.suggestion.description.length).toBeLessThanOrEqual(1000);
    expect(body.suggestion.seoTitle.length).toBeGreaterThan(0);
    expect(body.suggestion.seoTitle.length).toBeLessThanOrEqual(60);
    expect(body.suggestion.seoDescription.length).toBeGreaterThan(0);
    expect(body.suggestion.seoDescription.length).toBeLessThanOrEqual(160);
  });

  it("never modifies the stored product — generation is read-only", async () => {
    const admin = await seedAdmin();
    const accessToken = await signAccessToken(admin.id);
    const product = await seedProduct({ description: "original description" });

    await suggestForProduct(
      buildRequest(`http://localhost/api/admin/products/${product.id}/suggest`, {
        method: "POST",
        cookies: { access_token: accessToken },
      }),
      { params: Promise.resolve({ id: product.id }) },
    );

    const stored = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(stored.description).toBe("original description");
  });
});
