import { productContentFieldsSchema } from "@/lib/validation/product";
import { PRODUCT_CONTENT_LIMITS as LIMITS } from "@/lib/validation/product-limits";
import { MockLlmProvider } from "./mock-provider";
import { OpenAiProvider } from "./openai-provider";
import type { LlmProvider, ProductSuggestion, ProductSuggestionInput } from "./types";
import { LlmProviderError } from "./types";

export class InvalidSuggestionError extends Error {
  constructor() {
    super("The generated suggestion was empty or unusable");
    this.name = "InvalidSuggestionError";
  }
}

// OPENAI_API_KEY present → the real API (PROJECT-REQUIREMENTS.md's "real
// mode"); absent → the mock provider, so the whole suggest/apply flow is
// reproducibly testable without an API key. Never both at once, and the
// choice is surfaced to the client via the response's `mocked` flag rather
// than silently swapped.
function resolveProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAiProvider(apiKey) : new MockLlmProvider();
}

// A real LLM's response is inherently unpredictable, so it's validated
// against the same limits as a manual save (see AGENTS.md) before ever
// reaching the client: trimmed and truncated to fit rather than rejected
// outright when merely too long (still useful to the user), but rejected
// if a field comes back empty — no amount of truncation fixes that, and
// showing an empty suggestion as a "preview" would be worse than an error.
function sanitize(raw: ProductSuggestion): ProductSuggestion {
  const candidate = {
    description: raw.description.trim().slice(0, LIMITS.description),
    seoTitle: raw.seoTitle.trim().slice(0, LIMITS.seoTitle),
    seoDescription: raw.seoDescription.trim().slice(0, LIMITS.seoDescription),
  };

  const result = productContentFieldsSchema.safeParse(candidate);
  if (!result.success) {
    throw new InvalidSuggestionError();
  }
  return result.data;
}

export class SuggestionService {
  constructor(private readonly provider: LlmProvider = resolveProvider()) {}

  async generate(
    input: ProductSuggestionInput,
  ): Promise<{ suggestion: ProductSuggestion; mocked: boolean }> {
    const raw = await this.provider.generate(input);
    const suggestion = sanitize(raw);
    return { suggestion, mocked: this.provider.mocked };
  }
}

export const suggestionService = new SuggestionService();

export { LlmProviderError };
export type { ProductSuggestionInput };
