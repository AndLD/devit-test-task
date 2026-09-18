import { prisma } from "@/server/db/client";
import { GET as listProducts } from "@/app/api/products/route";
import { GET as getProductBySlug } from "@/app/api/products/[slug]/route";
import { resetDatabase, seedProduct } from "./support/db";
import { buildRequest } from "./support/request";

describe("public products API", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists only published products", async () => {
    await seedProduct({ slug: "draft-product", status: "DRAFT" });
    await seedProduct({
      slug: "published-product",
      name: "Published Product",
      status: "PUBLISHED",
    });

    const response = await listProducts();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.products).toEqual([
      { slug: "published-product", name: "Published Product" },
    ]);
  });

  it("returns the full product for a published slug", async () => {
    await seedProduct({
      slug: "usb-hub",
      name: "USB Hub",
      description: "A hub.",
      seoTitle: "USB Hub SEO",
      seoDescription: "USB Hub SEO description.",
      status: "PUBLISHED",
    });

    const response = await getProductBySlug(
      buildRequest("http://localhost/api/products/usb-hub"),
      { params: Promise.resolve({ slug: "usb-hub" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.product).toMatchObject({
      slug: "usb-hub",
      name: "USB Hub",
      seoTitle: "USB Hub SEO",
    });
  });

  it("404s a draft slug via the public API — drafts must never be reachable", async () => {
    await seedProduct({ slug: "secret-draft", status: "DRAFT" });

    const response = await getProductBySlug(
      buildRequest("http://localhost/api/products/secret-draft"),
      { params: Promise.resolve({ slug: "secret-draft" }) },
    );

    expect(response.status).toBe(404);
  });

  it("404s an unknown slug", async () => {
    const response = await getProductBySlug(
      buildRequest("http://localhost/api/products/does-not-exist"),
      { params: Promise.resolve({ slug: "does-not-exist" }) },
    );

    expect(response.status).toBe(404);
  });
});
