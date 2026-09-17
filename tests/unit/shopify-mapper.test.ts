import { mapShopifyProduct, ShopifyMappingError } from "@/server/services/shopify/mapper";
import type { ShopifyProductData } from "@/server/services/shopify/types";

// Real product data pulled from a live Shopify trial store during
// development (via the connected Shopify MCP), not invented — see
// AI-WORKLOG.md for how it was created and fetched.
const REAL_EARBUDS_FIXTURE: ShopifyProductData = {
  id: 8325302452342,
  handle: "bluetooth-wireless-earbuds",
  title: "Bluetooth Wireless Earbuds",
  bodyHtml:
    "<p>Compact true-wireless earbuds with <strong>active noise cancellation</strong> and up to 24 hours of battery life with the charging case.</p><ul>\n<li>Bluetooth 5.3</li>\n<li>IPX4 water resistance</li>\n<li>Touch controls</li>\n</ul>",
  vendor: "SoundWave",
  productType: "Electronics",
  options: [{ name: "Color", values: ["Black", "White"] }],
};

describe("mapShopifyProduct", () => {
  it("maps a real Shopify product's HTML description to clean plain text", () => {
    const result = mapShopifyProduct(REAL_EARBUDS_FIXTURE);

    expect(result.description).not.toContain("<");
    expect(result.description).not.toContain(">");
    expect(result.description).toContain("Compact true-wireless earbuds");
    expect(result.description).toContain("active noise cancellation");
    expect(result.description).toContain("Bluetooth 5.3");
  });

  it("maps vendor, product type, and options to characteristics", () => {
    const result = mapShopifyProduct(REAL_EARBUDS_FIXTURE);

    expect(result.characteristics).toEqual([
      { label: "Vendor", value: "SoundWave" },
      { label: "Type", value: "Electronics" },
      { label: "Color", value: "Black, White" },
    ]);
  });

  it("uses the Shopify handle as the slug base and the title as the name", () => {
    const result = mapShopifyProduct(REAL_EARBUDS_FIXTURE);

    expect(result.slugBase).toBe("bluetooth-wireless-earbuds");
    expect(result.name).toBe("Bluetooth Wireless Earbuds");
  });

  it("derives non-empty SEO fields within the editor limits", () => {
    const result = mapShopifyProduct(REAL_EARBUDS_FIXTURE);

    expect(result.seoTitle.length).toBeGreaterThan(0);
    expect(result.seoTitle.length).toBeLessThanOrEqual(60);
    expect(result.seoDescription.length).toBeGreaterThan(0);
    expect(result.seoDescription.length).toBeLessThanOrEqual(160);
    expect(result.description.length).toBeLessThanOrEqual(1000);
  });

  it("falls back to the title when there's no description at all", () => {
    const result = mapShopifyProduct({
      ...REAL_EARBUDS_FIXTURE,
      bodyHtml: null,
    });

    expect(result.description).toBe("Bluetooth Wireless Earbuds");
  });

  it("skips vendor/productType/options that are absent", () => {
    const result = mapShopifyProduct({
      ...REAL_EARBUDS_FIXTURE,
      vendor: null,
      productType: null,
      options: [],
    });

    expect(result.characteristics).toEqual([]);
  });

  it("throws ShopifyMappingError when there's truly no usable content", () => {
    // An HTML body that strips down to nothing and an empty title leaves
    // every field empty — no amount of truncation fixes that.
    expect(() =>
      mapShopifyProduct({
        ...REAL_EARBUDS_FIXTURE,
        title: "",
        bodyHtml: "<p></p>",
      }),
    ).toThrow(ShopifyMappingError);
  });
});
