import { MockLlmProvider } from "@/server/services/llm/mock-provider";

describe("MockLlmProvider", () => {
  const provider = new MockLlmProvider();

  it("is flagged as mocked", () => {
    expect(provider.mocked).toBe(true);
  });

  it("generates non-empty content within the editor limits, mentioning the product name", async () => {
    const result = await provider.generate({
      name: "USB-C Hub 7-in-1",
      characteristics: [
        { label: "Ports", value: "HDMI, 3x USB-A, SD, microSD, USB-C PD" },
        { label: "Max resolution", value: "4K @ 60Hz" },
      ],
    });

    expect(result.description.length).toBeGreaterThan(0);
    expect(result.description.length).toBeLessThanOrEqual(1000);
    expect(result.seoTitle.length).toBeGreaterThan(0);
    expect(result.seoTitle.length).toBeLessThanOrEqual(60);
    expect(result.seoDescription.length).toBeGreaterThan(0);
    expect(result.seoDescription.length).toBeLessThanOrEqual(160);

    expect(result.description).toContain("USB-C Hub 7-in-1");
    expect(result.seoTitle).toContain("USB-C Hub 7-in-1");
  });

  it("still produces valid, non-empty content with no characteristics", async () => {
    const result = await provider.generate({ name: "Mystery Box", characteristics: [] });

    expect(result.description.length).toBeGreaterThan(0);
    expect(result.seoTitle.length).toBeGreaterThan(0);
    expect(result.seoDescription.length).toBeGreaterThan(0);
  });

  it("truncates instead of exceeding the limit for a very long name", async () => {
    const result = await provider.generate({
      name: "x".repeat(200),
      characteristics: [],
    });

    expect(result.seoTitle.length).toBeLessThanOrEqual(60);
    expect(result.description.length).toBeLessThanOrEqual(1000);
    expect(result.seoDescription.length).toBeLessThanOrEqual(160);
  });
});
