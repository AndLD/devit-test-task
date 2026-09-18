import {
  InvalidSuggestionError,
  SuggestionService,
} from "@/server/services/llm/suggestion-service";
import type { LlmProvider, ProductSuggestion } from "@/server/services/llm/types";

function makeFakeProvider(
  mocked: boolean,
  generate: () => Promise<ProductSuggestion>,
): LlmProvider {
  return { mocked, generate };
}

const VALID_INPUT = { name: "Test Product", characteristics: [] };

describe("SuggestionService", () => {
  it("passes through a valid suggestion and reports whether it was mocked", async () => {
    const provider = makeFakeProvider(true, async () => ({
      description: "A fine product.",
      seoTitle: "Fine product",
      seoDescription: "Buy the fine product today.",
    }));
    const service = new SuggestionService(provider);

    const { suggestion, mocked } = await service.generate(VALID_INPUT);

    expect(mocked).toBe(true);
    expect(suggestion).toEqual({
      description: "A fine product.",
      seoTitle: "Fine product",
      seoDescription: "Buy the fine product today.",
    });
  });

  it("truncates a too-long field rather than rejecting it outright", async () => {
    const provider = makeFakeProvider(false, async () => ({
      description: "x".repeat(1500),
      seoTitle: "y".repeat(100),
      seoDescription: "z".repeat(200),
    }));
    const service = new SuggestionService(provider);

    const { suggestion } = await service.generate(VALID_INPUT);

    expect(suggestion.description).toHaveLength(1000);
    expect(suggestion.seoTitle).toHaveLength(60);
    expect(suggestion.seoDescription).toHaveLength(160);
  });

  it("rejects a suggestion with an empty field — no amount of truncation fixes that", async () => {
    const provider = makeFakeProvider(false, async () => ({
      description: "A fine product.",
      seoTitle: "   ",
      seoDescription: "Buy it.",
    }));
    const service = new SuggestionService(provider);

    await expect(service.generate(VALID_INPUT)).rejects.toBeInstanceOf(
      InvalidSuggestionError,
    );
  });

  it("propagates a provider error untouched", async () => {
    const boom = new Error("provider exploded");
    const provider = makeFakeProvider(false, async () => {
      throw boom;
    });
    const service = new SuggestionService(provider);

    await expect(service.generate(VALID_INPUT)).rejects.toBe(boom);
  });
});
